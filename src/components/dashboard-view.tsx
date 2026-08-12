"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Fire,
  Lightning,
  Plus,
  BookOpenText,
  Target,
  CloudCheck,
  SignIn,
} from "@phosphor-icons/react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSessions } from "@/lib/storage";
import type { SessionRecord } from "@/lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function DashboardView() {
  const { user, progress, configured } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    setSessions(getSessions());
    const onFocus = () => setSessions(getSessions());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, progress]);

  const accuracy =
    progress.totalAnswers > 0
      ? Math.round((progress.correctAnswers / progress.totalAnswers) * 100)
      : 0;

  const greetingName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {greetingName ? `Ciao, ${greetingName}` : "La tua area studio"}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {user ? (
              <>
                <CloudCheck
                  weight="fill"
                  className="h-4 w-4 text-emerald-600"
                />
                Progressi sincronizzati su Supabase
              </>
            ) : configured ? (
              <>
                Modalità ospite su questo dispositivo.{" "}
                <Link
                  href="/auth/login"
                  className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Accedi per il cloud
                </Link>
              </>
            ) : (
              <>Progressi salvati in locale (configura Supabase per il cloud).</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!user && configured && (
            <Link href="/auth/signup">
              <Button variant="secondary">
                <SignIn className="h-4 w-4" />
                Crea account
              </Button>
            </Link>
          )}
          <Link href="/learn/new">
            <Button>
              <Plus weight="bold" className="h-4 w-4" />
              Nuovo percorso
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<Lightning weight="fill" className="h-5 w-5 text-emerald-600" />}
          label="XP totali"
          value={String(progress.xp)}
        />
        <Stat
          icon={<Fire weight="fill" className="h-5 w-5 text-amber-500" />}
          label="Streak"
          value={`${progress.streak} giorni`}
        />
        <Stat
          icon={<BookOpenText weight="fill" className="h-5 w-5 text-sky-600" />}
          label="Percorsi"
          value={String(progress.sessionsCompleted)}
        />
        <Stat
          icon={<Target weight="fill" className="h-5 w-5 text-rose-500" />}
          label="Accuratezza quiz"
          value={`${accuracy}%`}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Percorsi recenti
        </h2>
        {sessions.length === 0 ? (
          <Card className="mt-4 p-8 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Nessun percorso ancora. Incolla una pagina del libro e inizia.
            </p>
            <Link href="/learn/new" className="mt-4 inline-flex">
              <Button>Crea il primo</Button>
            </Link>
          </Card>
        ) : (
          <div className="mt-4 grid gap-3">
            {sessions.map((session) => (
              <Link key={session.pack.id} href={`/learn/${session.pack.id}`}>
                <Card className="p-5 transition hover:border-emerald-400/60 hover:shadow-md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                        {session.pack.subject} · {session.pack.level}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {session.pack.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {session.completedModes.length}/6 modalità ·{" "}
                        {session.quizScore !== null
                          ? `quiz ${session.quizScore}%`
                          : "quiz non fatto"}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Continua
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </div>
    </Card>
  );
}
