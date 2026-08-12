"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Cpu, GearSix, SpinnerGap, Sparkle } from "@phosphor-icons/react";
import type { LearningPack, Subject } from "@/lib/types";
import {
  configForRequest,
  describeConfig,
  getUserAiConfig,
} from "@/lib/ai-settings";
import { upsertSession } from "@/lib/storage";
import { BookOcr } from "@/components/ocr/book-ocr";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const subjects: { value: Subject; label: string }[] = [
  { value: "matematica", label: "Matematica" },
  { value: "italiano", label: "Italiano" },
  { value: "storia", label: "Storia" },
  { value: "geografia", label: "Geografia" },
  { value: "scienze", label: "Scienze" },
  { value: "fisica", label: "Fisica" },
  { value: "chimica", label: "Chimica" },
  { value: "inglese", label: "Inglese" },
  { value: "altro", label: "Altro" },
];

export function CreateSessionForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [bookText, setBookText] = useState("");
  const [subject, setSubject] = useState<Subject>("scienze");
  const [level, setLevel] = useState<"media" | "superiore">("media");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLabel, setAiLabel] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setAiLabel(describeConfig(getUserAiConfig()));
    refresh();
    window.addEventListener("volentieri:ai-config", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("volentieri:ai-config", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!topic.trim() && !bookText.trim()) {
      setError("Scrivi un argomento, incolla testo o scatta una pagina del libro.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          bookText,
          subject,
          level,
          ai: configForRequest(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore di generazione");

      const pack = data.pack as LearningPack;
      // Persist optional quality warning for the session UI
      if (data.warning || data.source === "demo") {
        try {
          sessionStorage.setItem(
            `volentieri_warn_${pack.id}`,
            data.warning ||
              "Percorso offline / senza AI completa. Controlla Impostazioni AI se ti aspettavi il modello."
          );
          sessionStorage.setItem(`volentieri_src_${pack.id}`, data.source || "demo");
        } catch {
          /* ignore */
        }
      } else {
        try {
          sessionStorage.setItem(`volentieri_src_${pack.id}`, data.source || "ai");
        } catch {
          /* ignore */
        }
      }

      upsertSession({
        pack,
        completedModes: [],
        quizScore: null,
        xpEarned: 0,
        updatedAt: new Date().toISOString(),
      });
      router.push(`/learn/${pack.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Qualcosa è andato storto");
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <div className="flex items-start gap-2">
          <Cpu weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong className="font-semibold">La tua AI:</strong>{" "}
            {aiLabel || "Ollama · locale"}
          </span>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
        >
          <GearSix className="h-3.5 w-3.5" />
          Cambia provider / API key
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Argomento
          </label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Es. Rivoluzione Francese, equazioni di secondo grado..."
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Pagina del libro
          </label>
          <BookOcr
            onText={(text) => {
              setBookText((prev) => (prev ? `${prev}\n\n${text}` : text));
              if (!topic.trim()) {
                const firstLine = text
                  .split("\n")
                  .map((l) => l.trim())
                  .find((l) => l.length > 8);
                if (firstLine) setTopic(firstLine.slice(0, 80));
              }
            }}
          />
          <textarea
            value={bookText}
            onChange={(e) => setBookText(e.target.value)}
            rows={7}
            placeholder="Incolla il testo, oppure usa OCR da foto qui sopra..."
            className="w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p className="text-xs text-zinc-500">
            L&apos;AI userà questo testo per spiegarti proprio quella pagina.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Materia
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-950"
            >
              {subjects.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Livello
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["media", "superiore"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLevel(item)}
                  className={`h-12 rounded-2xl border text-sm font-medium capitalize transition ${
                    level === item
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <SpinnerGap className="h-5 w-5 animate-spin" />
              Sto costruendo il percorso (può richiedere un minuto)...
            </>
          ) : (
            <>
              <Sparkle weight="fill" className="h-5 w-5" />
              Trasforma in studio interattivo
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
