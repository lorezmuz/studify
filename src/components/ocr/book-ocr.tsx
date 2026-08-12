"use client";

import { useCallback, useRef, useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  SpinnerGap,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type Props = {
  onText: (text: string) => void;
};

export function BookOcr({ onText }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOcr = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      setProgress(0);
      setStatus("Carico il motore OCR (gratis, nel browser)...");

      if (preview) URL.revokeObjectURL(preview);
      const url = URL.createObjectURL(file);
      setPreview(url);

      try {
        const Tesseract = await import("tesseract.js");
        setStatus("Leggo il testo dalla pagina...");

        const result = await Tesseract.recognize(file, "ita+eng", {
          logger: (m) => {
            if (
              m.status === "recognizing text" &&
              typeof m.progress === "number"
            ) {
              setProgress(Math.round(m.progress * 100));
              setStatus(`OCR in corso... ${Math.round(m.progress * 100)}%`);
            } else if (m.status) {
              setStatus(m.status);
            }
          },
        });

        const text = result.data.text?.trim() || "";
        if (!text) {
          setError(
            "Nessun testo trovato. Prova una foto più nitida, dritta e con buona luce."
          );
          return;
        }

        onText(text);
        setStatus(`Estratti ${text.length} caratteri. Puoi correggerli sotto.`);
        setProgress(100);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "OCR non riuscito. Riprova con un'altra immagine."
        );
      } finally {
        setBusy(false);
      }
    },
    [onText, preview]
  );

  function onFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Carica un'immagine (JPG, PNG, WEBP...).");
      return;
    }
    void runOcr(file);
  }

  function clear() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setProgress(0);
    setStatus(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Foto / scansione pagina
          </p>
          <p className="text-xs text-zinc-500">
            OCR gratis nel browser (Tesseract). Il testo resta sul tuo
            dispositivo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <UploadSimple className="h-4 w-4" />
            Carica
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Scatta
          </Button>
          {preview && (
            <Button type="button" size="sm" variant="ghost" onClick={clear}>
              <Trash className="h-4 w-4" />
              Pulisci
            </Button>
          )}
        </div>
      </div>

      {preview && (
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Anteprima pagina"
            className="max-h-48 w-full object-contain bg-white dark:bg-zinc-950"
          />
        </div>
      )}

      {busy && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <SpinnerGap className="h-4 w-4 animate-spin" />
            {status || "OCR..."}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!busy && status && !error && (
        <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
          <ImageIcon className="h-3.5 w-3.5" />
          {status}
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
