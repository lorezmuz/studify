"use client";

import type { SessionRecord, UserProgress } from "./types";
import { todayKey } from "./utils";

const PROGRESS_KEY = "volentieri_progress";
const SESSIONS_KEY = "volentieri_sessions";

const defaultProgress: UserProgress = {
  xp: 0,
  streak: 0,
  lastStudyDate: null,
  sessionsCompleted: 0,
  correctAnswers: 0,
  totalAnswers: 0,
};

type ProgressListener = (progress: UserProgress) => void;
const listeners = new Set<ProgressListener>();

export function subscribeProgress(listener: ProgressListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(progress: UserProgress) {
  listeners.forEach((l) => l(progress));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("volentieri:progress", { detail: progress })
    );
  }
}

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function getProgress(): UserProgress {
  if (!canUseStorage()) return defaultProgress;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? { ...defaultProgress, ...JSON.parse(raw) } : defaultProgress;
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(progress: UserProgress) {
  if (!canUseStorage()) return;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  notify(progress);
  // Fire-and-forget cloud sync
  void import("./sync").then((m) => m.pushProgress(progress)).catch(() => {});
}

export function getSessions(): SessionRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export function getSession(id: string): SessionRecord | null {
  return getSessions().find((s) => s.pack.id === id) ?? null;
}

/** Local only - used during merge to avoid recursive cloud pushes. */
export function upsertSessionLocalOnly(record: SessionRecord) {
  if (!canUseStorage()) return;
  const sessions = getSessions().filter((s) => s.pack.id !== record.pack.id);
  sessions.unshift(record);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 40)));
}

export function upsertSession(record: SessionRecord) {
  upsertSessionLocalOnly(record);
  void import("./sync").then((m) => m.pushSession(record)).catch(() => {});
}

export function addXp(amount: number): UserProgress {
  const progress = getProgress();
  const today = todayKey();
  let streak = progress.streak;

  if (progress.lastStudyDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    streak = progress.lastStudyDate === yKey ? progress.streak + 1 : 1;
  }

  const next: UserProgress = {
    ...progress,
    xp: progress.xp + amount,
    streak,
    lastStudyDate: today,
  };
  saveProgress(next);
  return next;
}

export function recordQuizResult(correct: number, total: number) {
  const progress = getProgress();
  const next: UserProgress = {
    ...progress,
    correctAnswers: progress.correctAnswers + correct,
    totalAnswers: progress.totalAnswers + total,
  };
  saveProgress(next);
  return addXp(correct * 12 + (correct === total ? 25 : 0));
}

export function markSessionCompleted() {
  const progress = getProgress();
  const next: UserProgress = {
    ...progress,
    sessionsCompleted: progress.sessionsCompleted + 1,
  };
  saveProgress(next);
  return addXp(30);
}
