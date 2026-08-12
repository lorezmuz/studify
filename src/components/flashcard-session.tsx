"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, SpinnerGap } from "@phosphor-icons/react";
import type { FlashcardRow } from "@/lib/piano-types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function FlashcardSession({ pianoId }: { pianoId: string }) {
  const [cards, setCards] = useState<FlashcardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/piani/${pianoId}`)
      .then((r) => r.json())
      .then((d) => {
        const all = (d.flashcard || []) as FlashcardRow[];
        const today = new Date().toISOString().slice(0, 10);
        const due = all.filter((c) => c.prossima_revisione <= today);
        setCards(due.length ? due : all);
      })
      .finally(() => setLoading(false));
  }, [pianoId]);

  const current = cards[index];
  const progress = useMemo(
    () => (cards.length ? ((index) / cards.length) * 100 : 0),
    [cards.length, index]
  );

  async function rate(valutazione: number) {
    if (!current || saving) return;
    setSaving(true);
    try {
      await fetch(`/api/flashcard/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valutazione }),
      });
      setDone((d) => d + 1);
      setFlipped(false);
      if (index + 1 >= cards.length) {
        setIndex(cards.length);
      } else {
        setIndex((i) => i + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center gap-2 py-24 text-sm text-zinc-500">
        <SpinnerGap className="h-5 w-5 animate-spin" />
        Carico flashcard...
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p>Nessuna flashcard su questo piano.</p>
        <Link href={`/piani/${pianoId}`} className="mt-4 inline-flex">
          <Button variant="secondary">Torna al piano</Button>
        </Link>
      </div>
    );
  }

  if (index >= cards.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Sessione completata</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Hai rivisto {done} carte. Le prossime date di ripasso sono aggiornate
          (SM-2).
        </p>
        <Link href={`/piani/${pianoId}`} className="mt-6 inline-flex">
          <Button>Torna al piano</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        href={`/piani/${pianoId}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Piano
      </Link>

      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
        <span>
          Carta {index + 1}/{cards.length}
        </span>
        <span>Spaced repetition</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="mt-8 w-full text-left"
      >
        <Card className="flex min-h-[220px] flex-col justify-center p-8 transition hover:border-emerald-400/50">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {flipped ? "Retro" : "Fronte"} · tap per girare
          </p>
          <p className="mt-3 text-lg font-medium leading-relaxed text-zinc-900 dark:text-zinc-50">
            {flipped ? current.retro : current.fronte}
          </p>
        </Card>
      </button>

      {flipped && (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { v: 1, label: "No" },
            { v: 2, label: "Difficile" },
            { v: 3, label: "Ok" },
            { v: 4, label: "Facile" },
          ].map((b) => (
            <Button
              key={b.v}
              variant={b.v === 1 ? "danger" : b.v === 4 ? "primary" : "secondary"}
              size="sm"
              disabled={saving}
              onClick={() => rate(b.v)}
            >
              {b.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
