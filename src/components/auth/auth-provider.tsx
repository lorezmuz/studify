"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { mergeOnLogin } from "@/lib/sync";
import { getProgress, subscribeProgress } from "@/lib/storage";
import type { UserProgress } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  progress: UserProgress;
  refreshProgress: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<UserProgress>({
    xp: 0,
    streak: 0,
    lastStudyDate: null,
    sessionsCompleted: 0,
    correctAnswers: 0,
    totalAnswers: 0,
  });
  const configured = isSupabaseConfigured();

  const refreshProgress = useCallback(() => {
    setProgress(getProgress());
  }, []);

  useEffect(() => {
    setProgress(getProgress());
    return subscribeProgress(setProgress);
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) {
        void mergeOnLogin().then(({ progress: p }) => setProgress(p));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" && nextSession?.user) {
        void mergeOnLogin().then(({ progress: p }) => setProgress(p));
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      configured,
      progress,
      refreshProgress,
      signOut,
    }),
    [user, session, loading, configured, progress, refreshProgress, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
