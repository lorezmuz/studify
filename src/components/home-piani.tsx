"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarBlank,
  Plus,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { badgeCountdown } from "@/lib/dates";
import type { PianoRow } from "@/lib/piano-types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function HomePiani() {
  const [piani, setPiani] = useState<PianoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/piani")
      .then((r) => r.json())
      .then((d) => setPiani(d.piani || []))
      .catch(() => setPiani([]))
      .finally(() => setLoading(false));
  }, []);

  const attivi = piani.filter((p) => {
    const b = badgeCountdown(p.data_esame);
    return !b.past;
  });
  const archivio = piani.filter((p) => badgeCountdown(p.data_esame).past);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            I tuoi piani Studify
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Roadmap giorno per giorno, flashcard e quiz. Generati in locale con
            Claude o Grok. Ordinati per urgenza esame.
          </p>
        </div>
        <Link href="/nuovo">
          <Button>
            <Plus weight="bold" className="h-4 w-4" />
            Nuovo piano
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="mt-16 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <SpinnerGap className="h-5 w-5 animate-spin" />
          Carico piani...
        </div>
      ) : piani.length === 0 ? (
        <Card className="mt-10 p-10 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Nessun piano ancora. Crea il primo con materia, argomenti e data
            esame.
          </p>
          <Link href="/nuovo" className="mt-5 inline-flex">
            <Button>Crea piano</Button>
          </Link>
        </Card>
      ) : (
        <>
          <section className="mt-8 grid gap-3">
            {attivi.map((p) => (
              <PianoCard key={p.id} piano={p} />
            ))}
          </section>
          {archivio.length > 0 && (
            <section className="mt-12">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Archiviati
              </h2>
              <div className="mt-3 grid gap-3 opacity-70">
                {archivio.map((p) => (
                  <PianoCard key={p.id} piano={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PianoCard({ piano }: { piano: PianoRow }) {
  const badge = badgeCountdown(piano.data_esame);
  return (
    <Link href={`/piani/${piano.id}`}>
      <Card className="p-5 transition hover:border-emerald-400/50 hover:shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                {piano.materia}
              </span>
              <StatoBadge stato={piano.stato} />
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  badge.urgent
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                    : badge.past
                      ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                }`}
              >
                <CalendarBlank className="h-3.5 w-3.5" />
                {badge.label}
              </span>
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {piano.argomenti}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {piano.ai_provider}
              {piano.voto_obiettivo ? ` · obiettivo ${piano.voto_obiettivo}/10` : ""}
              {piano.data_esame ? ` · esame ${piano.data_esame}` : ""}
            </p>
            {piano.stato === "errore" && piano.errore && (
              <p className="mt-2 flex items-start gap-1 text-xs text-rose-600 dark:text-rose-400">
                <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {piano.errore.slice(0, 160)}
              </p>
            )}
          </div>
          <span className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Apri
          </span>
        </div>
      </Card>
    </Link>
  );
}

function StatoBadge({ stato }: { stato: string }) {
  if (stato === "pronto")
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        pronto
      </span>
    );
  if (stato === "generando")
    return (
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800 dark:bg-sky-950 dark:text-sky-200">
        generando
      </span>
    );
  return (
    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-800 dark:bg-rose-950 dark:text-rose-200">
      errore
    </span>
  );
}
