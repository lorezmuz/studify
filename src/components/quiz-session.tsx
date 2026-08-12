"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, SpinnerGap } from "@phosphor-icons/react";
import type { QuizDomanda, QuizRow } from "@/lib/piano-types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function QuizSession({ pianoId }: { pianoId: string }) {
  const search = useSearchParams();
  const qid = search.get("qid");

  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [domande, setDomande] = useState<QuizDomanda[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{
    punteggio: number;
    corrette: number;
    totali: number;
    feedback_ai: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/piani/${pianoId}`)
      .then((r) => r.json())
      .then((d) => {
        const list = (d.quiz || []) as QuizRow[];
        const q =
          (qid && list.find((x) => x.id === qid)) || list[list.length - 1];
        if (!q) return;
        setQuiz(q);
        const ds = JSON.parse(q.domande_json) as QuizDomanda[];
        setDomande(ds);
        setAnswers(ds.map(() => null));
      })
      .finally(() => setLoading(false));
  }, [pianoId, qid]);

  async function finishWith(finalAnswers: (number | null)[]) {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risposte: finalAnswers.map((a) => (a === null ? -1 : a)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit fallito");
      setResult(data);
      setFinished(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (selected === null) return;
    const nextAnswers = [...answers];
    nextAnswers[index] = selected;
    setAnswers(nextAnswers);
    setSelected(null);
    if (index + 1 >= domande.length) {
      void finishWith(nextAnswers);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center gap-2 py-24 text-sm text-zinc-500">
        <SpinnerGap className="h-5 w-5 animate-spin" />
        Carico quiz...
      </div>
    );
  }

  if (!quiz || !domande.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p>Nessun quiz disponibile.</p>
        <Link href={`/piani/${pianoId}`} className="mt-4 inline-flex">
          <Button variant="secondary">Torna al piano</Button>
        </Link>
      </div>
    );
  }

  if (finished && result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-semibold">Quiz #{quiz.numero}</h1>
          <p className="mt-4 text-5xl font-semibold text-emerald-600">
            {result.punteggio}%
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            {result.corrette}/{result.totali} corrette
          </p>
          {result.feedback_ai && (
            <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-left text-sm leading-relaxed text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Feedback AI
              </p>
              {result.feedback_ai}
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href={`/piani/${pianoId}`}>
              <Button>Torna al piano</Button>
            </Link>
            <Link href={`/piani/${pianoId}/flashcard`}>
              <Button variant="secondary">Flashcard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const q = domande[index];

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        href={`/piani/${pianoId}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Piano
      </Link>

      <p className="mt-4 text-sm text-zinc-500">
        Quiz #{quiz.numero} · Domanda {index + 1}/{domande.length}
      </p>

      <Card className="mt-4 p-6 md:p-8">
        <h2 className="text-lg font-semibold leading-snug">{q.domanda}</h2>
        <div className="mt-5 grid gap-2">
          {q.opzioni.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm transition",
                selected === i
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                  : "border-zinc-200 hover:border-emerald-400 dark:border-zinc-700"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        {error && (
          <p className="mt-3 text-sm text-rose-600">{error}</p>
        )}
        <div className="mt-5 flex justify-end">
          <Button onClick={next} disabled={selected === null || submitting}>
            {submitting
              ? "Calcolo..."
              : index + 1 >= domande.length
                ? "Termina"
                : "Prossima"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
