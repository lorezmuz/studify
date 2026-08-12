"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  ChatCircleDots,
  GameController,
  MagicWand,
  PlayCircle,
  Question,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  WarningCircle,
} from "@phosphor-icons/react";
import type {
  LearningPack,
  SessionMode,
  SessionRecord,
  UserProgress,
} from "@/lib/types";
import {
  addXp,
  markSessionCompleted,
  recordQuizResult,
  upsertSession,
} from "@/lib/storage";
import { cn, youtubeSearchUrl } from "@/lib/utils";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

const tabs: { id: SessionMode; label: string; icon: typeof BookOpenText }[] = [
  { id: "lesson", label: "Lezione", icon: BookOpenText },
  { id: "quiz", label: "Quiz", icon: Question },
  { id: "tutor", label: "Tutor", icon: ChatCircleDots },
  { id: "videos", label: "Video", icon: PlayCircle },
  { id: "game", label: "Gioco", icon: GameController },
  { id: "playground", label: "Playground", icon: MagicWand },
];

export function SessionPlayer({
  initial,
}: {
  initial: SessionRecord;
}) {
  const [record, setRecord] = useState(initial);
  const [mode, setMode] = useState<SessionMode>("lesson");
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const pack = record.pack;

  useEffect(() => {
    try {
      setWarn(sessionStorage.getItem(`volentieri_warn_${pack.id}`));
      setSource(sessionStorage.getItem(`volentieri_src_${pack.id}`));
    } catch {
      /* ignore */
    }
  }, [pack.id]);

  function persist(next: SessionRecord) {
    setRecord(next);
    upsertSession(next);
  }

  function completeMode(m: SessionMode, extra?: Partial<SessionRecord>) {
    const completed = Array.from(new Set([...record.completedModes, m]));
    const next: SessionRecord = {
      ...record,
      ...extra,
      completedModes: completed,
      updatedAt: new Date().toISOString(),
    };
    persist(next);

    if (completed.length >= tabs.length && record.completedModes.length < tabs.length) {
      setProgress(markSessionCompleted());
    } else {
      setProgress(addXp(8));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {warn && (
        <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <WarningCircle weight="fill" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Attenzione sul contenuto</p>
            <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">{warn}</p>
            <p className="mt-2 text-xs">
              Tip: argomenti stretti funzionano meglio (es.{" "}
              <em>1ª declinazione rosa</em>, non{" "}
              <em>tutto il latino di 2 anni</em>).{" "}
              <Link href="/settings" className="underline underline-offset-2">
                Impostazioni AI
              </Link>{" "}
              ·{" "}
              <Link href="/learn/new" className="underline underline-offset-2">
                Nuovo percorso
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium capitalize text-emerald-700 dark:text-emerald-400">
            {pack.subject} · {pack.level}
            {source ? ` · fonte: ${source}` : ""}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {pack.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {pack.hook}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            Progresso percorso
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${(record.completedModes.length / tabs.length) * 100}%`,
              }}
            />
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {record.completedModes.length}/{tabs.length} modalità
            {progress ? ` · ${progress.xp} XP totali` : ""}
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const done = record.completedModes.includes(tab.id);
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-medium transition",
                active
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              )}
            >
              <tab.icon weight={active ? "fill" : "regular"} className="h-4 w-4" />
              {tab.label}
              {done && <CheckCircle weight="fill" className="h-4 w-4 opacity-80" />}
            </button>
          );
        })}
      </div>

      {mode === "lesson" && (
        <LessonView pack={pack} onComplete={() => completeMode("lesson")} />
      )}
      {mode === "quiz" && (
        <QuizView
          pack={pack}
          existingScore={record.quizScore}
          onComplete={(score) => {
            setProgress(recordQuizResult(score.correct, score.total));
            completeMode("quiz", {
              quizScore: Math.round((score.correct / score.total) * 100),
              xpEarned: record.xpEarned + score.correct * 12,
            });
          }}
        />
      )}
      {mode === "tutor" && (
        <TutorView pack={pack} onComplete={() => completeMode("tutor")} />
      )}
      {mode === "videos" && (
        <VideosView pack={pack} onComplete={() => completeMode("videos")} />
      )}
      {mode === "game" && (
        <GameView pack={pack} onComplete={() => completeMode("game")} />
      )}
      {mode === "playground" && (
        <PlaygroundView
          pack={pack}
          onComplete={() => completeMode("playground")}
        />
      )}
    </div>
  );
}

function LessonView({
  pack,
  onComplete,
}: {
  pack: LearningPack;
  onComplete: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
      <Card className="space-y-6 p-6 md:p-8">
        <div>
          <h2 className="text-xl font-semibold">Riassunto</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {pack.summary}
          </p>
        </div>
        {pack.lessonSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {section.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {section.body}
            </p>
          </div>
        ))}
        <Button onClick={onComplete}>
          Ho capito, continua
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Card>
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-semibold">Punti chiave</h3>
          <ul className="mt-3 space-y-2">
            {pack.keyPoints.map((point) => (
              <li
                key={point}
                className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
              >
                {point}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Analogia</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {pack.analogy}
          </p>
        </Card>
        {pack.sourcePreview && (
          <Card className="p-5">
            <h3 className="font-semibold">Dalla tua fonte</h3>
            <p className="mt-2 text-sm italic leading-relaxed text-zinc-500">
              &ldquo;{pack.sourcePreview}
              {pack.sourcePreview.length >= 280 ? "..." : ""}&rdquo;
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function QuizView({
  pack,
  existingScore,
  onComplete,
}: {
  pack: LearningPack;
  existingScore: number | null;
  onComplete: (score: { correct: number; total: number }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => pack.quiz.map(() => null)
  );
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [reported, setReported] = useState(false);
  const q = pack.quiz[index];

  const correctCount = answers.reduce<number>((acc, ans, i) => {
    if (ans === null) return acc;
    return acc + (ans === pack.quiz[i].correctIndex ? 1 : 0);
  }, 0);

  function choose(i: number) {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = i;
      return next;
    });
  }

  function next() {
    if (index + 1 >= pack.quiz.length) {
      const finalAnswers = [...answers];
      if (selected !== null) finalAnswers[index] = selected;
      const totalCorrect = finalAnswers.reduce<number>((acc, ans, i) => {
        if (ans === null) return acc;
        return acc + (ans === pack.quiz[i].correctIndex ? 1 : 0);
      }, 0);
      setFinished(true);
      if (!reported) {
        setReported(true);
        onComplete({ correct: totalCorrect, total: pack.quiz.length });
      }
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  }

  if (finished) {
    const score = Math.round((correctCount / pack.quiz.length) * 100);
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <h2 className="text-2xl font-semibold">Quiz completato</h2>
        <p className="mt-3 text-4xl font-semibold text-emerald-600">{score}%</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {correctCount} risposte corrette su {pack.quiz.length}
        </p>
        {existingScore !== null && (
          <p className="mt-1 text-xs text-zinc-500">
            Punteggio registrato: {existingScore}%
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl p-6 md:p-8">
      <div className="mb-4 flex items-center justify-between text-sm text-zinc-500">
        <span>
          Domanda {index + 1}/{pack.quiz.length}
        </span>
        <span>{correctCount} corrette</span>
      </div>
      <h2 className="text-xl font-semibold leading-snug">{q.prompt}</h2>
      <div className="mt-5 grid gap-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex;
          const isSelected = selected === i;
          return (
            <button
              key={opt}
              onClick={() => choose(i)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm transition",
                !revealed &&
                  "border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50 dark:border-zinc-700 dark:hover:bg-emerald-950/30",
                revealed &&
                  isCorrect &&
                  "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
                revealed &&
                  isSelected &&
                  !isCorrect &&
                  "border-rose-400 bg-rose-50 dark:bg-rose-950/30",
                revealed && !isCorrect && !isSelected && "opacity-60"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200">
          {q.explanation}
        </div>
      )}
      {revealed && (
        <div className="mt-5 flex justify-end">
          <Button onClick={next}>
            {index + 1 >= pack.quiz.length ? "Vedi risultato" : "Prossima"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}

function TutorView({
  pack,
  onComplete,
}: {
  pack: LearningPack;
  onComplete: () => void;
}) {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content: `Ciao! Sono il tuo tutor su "${pack.title}". Dimmi cosa non ti è chiaro o chiedimi di farti una domanda per allenarti.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const context = useMemo(
    () =>
      [
        pack.summary,
        ...pack.keyPoints,
        ...pack.lessonSections.map((s) => `${s.title}: ${s.body}`),
      ].join("\n"),
    [pack]
  );

  async function send() {
    if (!input.trim() || loading) return;
    const nextMessages = [
      ...messages,
      { role: "user" as const, content: input.trim() },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const { configForRequest } = await import("@/lib/ai-settings");
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: pack.title,
          context,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          ai: configForRequest(),
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply || data.error || "Errore di risposta",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Connessione fallita. Riprova." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex min-h-[520px] flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              m.role === "assistant"
                ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                : "ml-auto bg-emerald-600 text-white"
            )}
          >
            {m.content}
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Es. perché succede questo? fammi un esempio..."
            className="h-11 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-950"
          />
          <Button onClick={send} disabled={loading}>
            Invia
          </Button>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onComplete}>
            Segna tutor come fatto
          </Button>
        </div>
      </div>
    </Card>
  );
}

function VideosView({
  pack,
  onComplete,
}: {
  pack: LearningPack;
  onComplete: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {pack.videos.map((video) => (
          <Card key={video.query} className="p-5">
            <h3 className="text-lg font-semibold">{video.title}</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {video.why}
            </p>
            <a
              href={youtubeSearchUrl(video.query)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex"
            >
              <Button variant="secondary">
                <PlayCircle weight="fill" className="h-4 w-4" />
                Cerca su YouTube
              </Button>
            </a>
          </Card>
        ))}
      </div>
      <Button onClick={onComplete}>Ho guardato / prosegui</Button>
    </div>
  );
}

function GameView({
  pack,
  onComplete,
}: {
  pack: LearningPack;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<string | boolean | null>(null);
  const round = pack.games[index];

  function answer(value: string | boolean) {
    setPicked(value);
    setRevealed(true);
  }

  function next() {
    if (index + 1 >= pack.games.length) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
    setRevealed(false);
    setPicked(null);
  }

  const isTrueFalse = round.type === "truefalse";

  return (
    <Card className="mx-auto max-w-2xl p-6 md:p-8">
      <p className="text-sm text-zinc-500">
        Round {index + 1}/{pack.games.length} · {round.type}
      </p>
      <h2 className="mt-2 text-xl font-semibold">{round.prompt}</h2>

      {isTrueFalse ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => answer(val)}
              disabled={revealed}
              className={cn(
                "rounded-2xl border px-4 py-4 font-medium",
                revealed &&
                  val === round.answer &&
                  "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
                revealed &&
                  picked === val &&
                  val !== round.answer &&
                  "border-rose-400 bg-rose-50"
              )}
            >
              {val ? "Vero" : "Falso"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {round.items.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-700"
            >
              {item}
            </div>
          ))}
          {!revealed && (
            <Button className="mt-3" onClick={() => answer("seen")}>
              Mostra soluzione
            </Button>
          )}
        </div>
      )}

      {revealed && (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/60">
            {round.explanation}
          </div>
          {!isTrueFalse && Array.isArray(round.answer) && (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Ordine / abbinamento corretto:
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {round.answer.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </div>
          )}
          <Button onClick={next}>
            {index + 1 >= pack.games.length ? "Completa gioco" : "Prossimo round"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}

function PlaygroundView({
  pack,
  onComplete,
}: {
  pack: LearningPack;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const challenge = pack.playground[index];

  function next() {
    if (index + 1 >= pack.playground.length) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
    setAnswer("");
    setShowHint(false);
    setShowSample(false);
  }

  return (
    <Card className="mx-auto max-w-2xl p-6 md:p-8">
      <p className="text-sm text-zinc-500">
        Sfida {index + 1}/{pack.playground.length}
      </p>
      <h2 className="mt-2 text-xl font-semibold">{challenge.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {challenge.prompt}
      </p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={6}
        placeholder="Scrivi qui la tua risposta..."
        className="mt-4 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-950"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowHint(true)}>
          Mostra indizio
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowSample(true)}
        >
          Esempio di risposta
        </Button>
        <Button size="sm" onClick={next} disabled={answer.trim().length < 12}>
          {index + 1 >= pack.playground.length ? "Completa" : "Prossima sfida"}
        </Button>
      </div>
      {showHint && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Indizio: {challenge.hint}
        </p>
      )}
      {showSample && (
        <p className="mt-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200">
          Esempio: {challenge.sampleAnswer}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
        <ArrowLeft className="h-3.5 w-3.5" />
        Scrivi almeno qualche riga per sbloccare il prosegui
      </div>
    </Card>
  );
}
