"use client";

import type { SessionRecord, SessionMode, UserProgress } from "./types";
import { createClient } from "./supabase/client";
import {
  getProgress,
  getSessions,
  saveProgress,
  upsertSessionLocalOnly,
} from "./storage";

export async function pullCloudData(): Promise<{
  progress: UserProgress | null;
  sessions: SessionRecord[];
}> {
  const supabase = createClient();
  if (!supabase) return { progress: null, sessions: [] };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { progress: null, sessions: [] };

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("learning_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  const progress: UserProgress | null = profile
    ? {
        xp: profile.xp ?? 0,
        streak: profile.streak ?? 0,
        lastStudyDate: profile.last_study_date ?? null,
        sessionsCompleted: profile.sessions_completed ?? 0,
        correctAnswers: profile.correct_answers ?? 0,
        totalAnswers: profile.total_answers ?? 0,
      }
    : null;

  const sessions: SessionRecord[] = (rows ?? []).map((row) => ({
    pack: row.pack,
    completedModes: (row.completed_modes ?? []) as SessionMode[],
    quizScore: row.quiz_score,
    xpEarned: row.xp_earned ?? 0,
    updatedAt: row.updated_at,
  }));

  return { progress, sessions };
}

/** Merge local + cloud on login: keep the higher XP / newer sessions. */
export async function mergeOnLogin() {
  const cloud = await pullCloudData();
  const localProgress = getProgress();
  const localSessions = getSessions();

  let mergedProgress = localProgress;
  if (cloud.progress) {
    mergedProgress = {
      xp: Math.max(localProgress.xp, cloud.progress.xp),
      streak: Math.max(localProgress.streak, cloud.progress.streak),
      lastStudyDate:
        (localProgress.lastStudyDate || "") >
        (cloud.progress.lastStudyDate || "")
          ? localProgress.lastStudyDate
          : cloud.progress.lastStudyDate,
      sessionsCompleted: Math.max(
        localProgress.sessionsCompleted,
        cloud.progress.sessionsCompleted
      ),
      correctAnswers: Math.max(
        localProgress.correctAnswers,
        cloud.progress.correctAnswers
      ),
      totalAnswers: Math.max(
        localProgress.totalAnswers,
        cloud.progress.totalAnswers
      ),
    };
  }
  saveProgress(mergedProgress);

  const byId = new Map<string, SessionRecord>();
  for (const s of [...cloud.sessions, ...localSessions]) {
    const existing = byId.get(s.pack.id);
    if (!existing || existing.updatedAt < s.updatedAt) {
      byId.set(s.pack.id, s);
    }
  }
  const mergedSessions = Array.from(byId.values()).sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : -1
  );
  for (const s of mergedSessions) {
    upsertSessionLocalOnly(s);
  }

  await pushProgress(mergedProgress);
  await Promise.all(mergedSessions.map((s) => pushSession(s)));

  return { progress: mergedProgress, sessions: mergedSessions };
}

export async function pushProgress(progress: UserProgress) {
  const supabase = createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    display_name:
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "Studente",
    xp: progress.xp,
    streak: progress.streak,
    last_study_date: progress.lastStudyDate,
    sessions_completed: progress.sessionsCompleted,
    correct_answers: progress.correctAnswers,
    total_answers: progress.totalAnswers,
    updated_at: new Date().toISOString(),
  });
}

export async function pushSession(record: SessionRecord) {
  const supabase = createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("learning_sessions").upsert(
    {
      user_id: user.id,
      pack_id: record.pack.id,
      pack: record.pack,
      completed_modes: record.completedModes,
      quiz_score: record.quizScore,
      xp_earned: record.xpEarned,
      updated_at: record.updatedAt,
    },
    { onConflict: "user_id,pack_id" }
  );
}
