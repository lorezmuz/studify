"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SpinnerGap, Sparkle } from "@phosphor-icons/react";
import { PhotoUpload, type PhotoItem } from "./photo-upload";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function NuovoPianoForm() {
  const router = useRouter();
  const [materia, setMateria] = useState("");
  const [argomenti, setArgomenti] = useState("");
  const [dataEsame, setDataEsame] = useState("");
  const [votoObiettivo, setVotoObiettivo] = useState(7);
  const [aiProvider, setAiProvider] = useState<"claude" | "grok">("claude");
  const [extraContext, setExtraContext] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!materia.trim()) return;
    const t = setTimeout(() => {
      fetch(`/api/preferenze?materia=${encodeURIComponent(materia.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.provider === "claude" || d.provider === "grok") {
            setAiProvider(d.provider);
          }
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [materia]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!materia.trim() || !argomenti.trim()) {
      setError("Compila materia e argomenti.");
      return;
    }

    setLoading(true);
    setPhase("Creo il piano...");
    let pianoId: string | null = null;
    try {
      const create = await fetch("/api/piani", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materia: materia.trim(),
          argomenti: argomenti.trim(),
          dataEsame: dataEsame || null,
          votoObiettivo,
          aiProvider,
        }),
      });
      const created = await create.json();
      if (!create.ok) throw new Error(created.error || "Creazione fallita");
      pianoId = created.id as string;

      let imagePaths: string[] = [];
      if (photos.length > 0) {
        setPhase(`Carico ${photos.length} foto sul server...`);
        const form = new FormData();
        form.append("pianoId", pianoId);
        for (const p of photos) {
          form.append("files", p.file, p.file.name);
        }
        const up = await fetch("/api/upload", { method: "POST", body: form });
        const upData = await up.json();
        if (!up.ok) throw new Error(upData.error || "Upload foto fallito");
        imagePaths = upData.paths || [];
      }

      setPhase(
        `Genero con ${aiProvider === "claude" ? "Claude Code" : "Grok"}${
          imagePaths.length ? ` (legge ${imagePaths.length} foto)` : ""
        }... può richiedere alcuni minuti`
      );

      const gen = await fetch("/api/genera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pianoId,
          aiProvider,
          extraContext: extraContext.trim() || undefined,
          imagePaths: imagePaths.length ? imagePaths : undefined,
        }),
      });
      const genData = await gen.json();
      if (!gen.ok) throw new Error(genData.error || "Generazione fallita");

      router.push(`/piani/${pianoId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      // Se il piano è stato creato ma upload/genera falliscono, non resti "generando" per sempre
      if (pianoId) {
        try {
          await fetch(`/api/piani/${pianoId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stato: "errore", errore: msg }),
          });
        } catch {
          /* ignore */
        }
      }
      setError(msg);
      setLoading(false);
      setPhase("");
    }
  }

  return (
    <Card className="p-6 md:p-8">
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Materia">
          <input
            value={materia}
            onChange={(e) => setMateria(e.target.value)}
            placeholder="Es. Storia, Latino, Matematica..."
            className={inputClass}
            required
            disabled={loading}
          />
        </Field>

        <Field label="Argomenti">
          <textarea
            value={argomenti}
            onChange={(e) => setArgomenti(e.target.value)}
            rows={4}
            placeholder="Es. Rivoluzione francese, Napoleone — oppure 1ª declinazione latina..."
            className={inputClass + " py-3"}
            required
            disabled={loading}
          />
        </Field>

        <Field label="Foto appunti (opzionale)">
          <PhotoUpload
            photos={photos}
            onChange={setPhotos}
            disabled={loading}
          />
        </Field>

        <Field label="Note testuali (opzionale)">
          <textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            rows={3}
            placeholder="Eventuale testo da aggiungere alle foto..."
            className={inputClass + " py-3"}
            disabled={loading}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data esame / verifica">
            <input
              type="date"
              value={dataEsame}
              onChange={(e) => setDataEsame(e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </Field>
          <Field label={`Voto obiettivo: ${votoObiettivo}/10`}>
            <input
              type="range"
              min={1}
              max={10}
              value={votoObiettivo}
              onChange={(e) => setVotoObiettivo(Number(e.target.value))}
              className="w-full accent-emerald-600"
              disabled={loading}
            />
          </Field>
        </div>

        <Field label="Genera con">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "claude" as const, label: "Claude Code" },
                { id: "grok" as const, label: "Grok" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={loading}
                onClick={() => setAiProvider(p.id)}
                className={`h-12 rounded-2xl border text-sm font-medium transition ${
                  aiProvider === p.id
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Con le foto, Claude Code di solito le apre dai path. Grok può
            variare a seconda del CLI.
          </p>
        </Field>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <SpinnerGap className="h-5 w-5 animate-spin" />
              {phase || "Lavoro..."}
            </>
          ) : (
            <>
              <Sparkle weight="fill" className="h-5 w-5" />
              Genera piano di studio
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950 disabled:opacity-60";
