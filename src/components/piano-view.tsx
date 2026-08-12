"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FilePdf,
  Fire,
  SpinnerGap,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { badgeCountdown } from "@/lib/dates";
import type { FlashcardRow, PianoRow, QuizRow } from "@/lib/piano-types";
import type { RoadmapNode, RoadmapProgress } from "@/lib/roadmap";
import { buildPianoPdf } from "@/lib/pdf-export";
import {
  playChest,
  playComplete,
  playError,
  playXp,
} from "@/lib/sounds";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { StudyMarkdown } from "./study-markdown";
import { StudyPath } from "./study-path";

type Section = { title: string; body: string };

export function PianoView({ id }: { id: string }) {
  const [piano, setPiano] = useState<PianoRow | null>(null);
  const [flashcard, setFlashcard] = useState<FlashcardRow[]>([]);
  const [quiz, setQuiz] = useState<QuizRow[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapNode[]>([]);
  const [progress, setProgress] = useState<RoadmapProgress>({
    completedIds: [],
    xp: 0,
    lastDayCompleted: 0,
  });
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<RoadmapNode | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xpToast, setXpToast] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/piani/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore");
    setPiano(data.piano);
    setFlashcard(data.flashcard || []);
    setQuiz(data.quiz || []);
    setRoadmap(data.roadmap || []);
    setProgress(
      data.progress || { completedIds: [], xp: 0, lastDayCompleted: 0 }
    );
    setSections(data.sections || []);
  }, [id]);

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load]);

  const lastQuiz = quiz[quiz.length - 1];
  const currentNode = useMemo(
    () => roadmap.find((n) => n.status === "current") || null,
    [roadmap]
  );

  async function retryGenerate() {
    if (!piano) return;
    setRetrying(true);
    setError(null);
    try {
      const res = await fetch("/api/genera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pianoId: piano.id, importOnly: true }),
      });
      let data = await res.json();
      if (!res.ok) {
        const res2 = await fetch("/api/genera", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pianoId: piano.id }),
        });
        data = await res2.json();
        if (!res2.ok) throw new Error(data.error || "Generazione fallita");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setRetrying(false);
    }
  }

  async function completeActive() {
    if (!active || active.status === "locked") return;
    const res = await fetch(`/api/piani/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: active.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      playError();
      setError(data.error || "Impossibile completare");
      return;
    }
    if (active.type === "chest") playChest();
    else playComplete();
    playXp();
    setRoadmap(data.roadmap);
    setProgress(data.progress);
    setXpToast(data.xpGain);
    setTimeout(() => setXpToast(null), 1800);
    setActive(null);
  }

  async function downloadPdf() {
    if (!piano?.riassunto) return;
    setPdfLoading(true);
    try {
      const quizData =
        lastQuiz
          ? (JSON.parse(lastQuiz.domande_json) as {
              domanda: string;
              opzioni: string[];
              risposta_corretta: number;
            }[])
          : [];
      const blob = buildPianoPdf({
        materia: piano.materia,
        argomenti: piano.argomenti,
        dataEsame: piano.data_esame,
        votoObiettivo: piano.voto_obiettivo,
        riassunto: piano.riassunto,
        flashcard: flashcard.map((f) => ({
          fronte: f.fronte,
          retro: f.retro,
        })),
        quiz: quizData,
        roadmap: roadmap.map((n) => ({
          day: n.day,
          title: n.title,
          type: n.type,
          description: n.description,
        })),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studify-${piano.materia}-${piano.id}.pdf`.replace(
        /\s+/g,
        "-"
      );
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF fallito");
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-500">
        <SpinnerGap className="h-5 w-5 animate-spin" />
        Carico piano...
      </div>
    );
  }

  if (!piano) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-lg font-semibold">Piano non trovato</p>
        <Link href="/" className="mt-4 inline-flex">
          <Button variant="secondary">Torna ai piani</Button>
        </Link>
      </div>
    );
  }

  const badge = badgeCountdown(piano.data_esame);

  const activeSection =
    active?.type === "read" && active.sectionIndex != null
      ? sections[active.sectionIndex]
      : null;

  return (
    <div className="relative mx-auto max-w-lg px-4 pb-24 pt-6">
      {xpToast != null && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-2xl bg-amber-400 px-4 py-2 text-sm font-bold text-amber-950 shadow-lg">
          +{xpToast} XP
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Piani
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">
            <Fire weight="fill" className="h-3.5 w-3.5" />
            {progress.xp} XP
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1">{badge.label}</span>
        </div>
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
        {piano.materia}
        {piano.voto_obiettivo ? ` · obiettivo ${piano.voto_obiettivo}/10` : ""}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {piano.argomenti}
      </h1>

      {piano.stato === "errore" && (
        <Card className="mt-4 border-rose-200 p-4 dark:border-rose-900">
          <div className="flex gap-2 text-sm text-rose-700 dark:text-rose-200">
            <WarningCircle weight="fill" className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Generazione fallita</p>
              <p className="mt-1 text-xs">{piano.errore}</p>
              <Button
                className="mt-3"
                size="sm"
                onClick={retryGenerate}
                disabled={retrying}
              >
                {retrying ? "Riprovo..." : "Riprova / importa file"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {piano.stato === "pronto" && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={downloadPdf}
              disabled={pdfLoading}
            >
              {pdfLoading ? (
                <SpinnerGap className="h-4 w-4 animate-spin" />
              ) : (
                <FilePdf className="h-4 w-4" />
              )}
              Scarica PDF
            </Button>
            {currentNode && (
              <Button size="sm" onClick={() => setActive(currentNode)}>
                Continua: {currentNode.title.slice(0, 28)}
              </Button>
            )}
          </div>

          <div className="mt-6">
            <StudyPath
              nodes={roadmap}
              unitTitle={piano.argomenti}
              unitSubtitle={`${piano.materia} · percorso fino all'esame`}
              xp={progress.xp}
              onSelect={setActive}
            />
          </div>
        </>
      )}

      {/* Lesson sheet */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                  Giorno {active.day} · {active.type}
                </p>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {active.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="mb-4 text-sm text-zinc-500">{active.description}</p>

              {active.type === "read" && activeSection && (
                <div>
                  <h3 className="mb-2 text-base font-semibold">
                    {activeSection.title}
                  </h3>
                  <StudyMarkdown text={activeSection.body} />
                </div>
              )}

              {active.type === "read" && !activeSection && piano.riassunto && (
                <StudyMarkdown text={piano.riassunto.slice(0, 4000)} />
              )}

              {active.type === "review" && piano.riassunto && (
                <StudyMarkdown
                  text={
                    sections
                      .slice(0, 3)
                      .map((s) => `## ${s.title}\n\n${s.body.slice(0, 800)}`)
                      .join("\n\n") || piano.riassunto.slice(0, 3000)
                  }
                />
              )}

              {active.type === "flashcards" && (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-600">
                    Apri la sessione flashcard per il ripasso spaced repetition.
                  </p>
                  <Link href={`/piani/${id}/flashcard`}>
                    <Button className="w-full">Apri flashcard</Button>
                  </Link>
                </div>
              )}

              {active.type === "quiz" && (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-600">
                    Allenati con il quiz del piano.
                  </p>
                  {lastQuiz ? (
                    <Link href={`/piani/${id}/quiz?qid=${lastQuiz.id}`}>
                      <Button className="w-full">Apri quiz</Button>
                    </Link>
                  ) : (
                    <p className="text-sm text-rose-600">Nessun quiz disponibile</p>
                  )}
                </div>
              )}

              {active.type === "chest" && (
                <div className="rounded-2xl bg-amber-50 p-6 text-center dark:bg-amber-950/40">
                  <p className="text-3xl">🎁</p>
                  <p className="mt-2 font-bold text-amber-900 dark:text-amber-100">
                    Baule del checkpoint
                  </p>
                  <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/80">
                    Completa per guadagnare XP extra e sbloccare il giorno
                    successivo.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
              {active.status !== "done" ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={completeActive}
                  disabled={active.status === "locked"}
                >
                  Completa e guadagna XP
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => setActive(null)}
                >
                  Già completato
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
