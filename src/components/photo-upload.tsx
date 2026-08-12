"use client";

import { useRef } from "react";
import {
  Camera,
  Image as ImageIcon,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { Button } from "./ui/button";

export type PhotoItem = {
  id: string;
  file: File;
  preview: string;
};

type Props = {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  disabled?: boolean;
};

/**
 * Solo upload/preview. Niente OCR: le foto si salvano su disco
 * e Claude/Grok le leggono dai path (molto meglio per appunti).
 */
export function PhotoUpload({ photos, onChange, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | File[] | null) {
    if (!list || disabled) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    const next = [...photos];
    for (const file of files) {
      next.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    onChange(next);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  function remove(id: string) {
    const target = photos.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.preview);
    onChange(photos.filter((p) => p.id !== id));
  }

  function clearAll() {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    onChange([]);
  }

  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Foto appunti
          </p>
          <p className="text-xs text-zinc-500">
            Si salvano sul PC e le legge l&apos;AI (Claude Code) dai file. Meglio
            dell&apos;OCR per scritto a mano e schemi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={disabled}
            onChange={(e) => addFiles(e.target.files)}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={disabled}
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            <UploadSimple className="h-4 w-4" />
            Carica
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Scatta
          </Button>
          {photos.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={clearAll}
            >
              <Trash className="h-4 w-4" />
              Togli tutte
            </Button>
          )}
        </div>
      </div>

      {photos.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {photos.map((p, i) => (
            <li
              key={p.id}
              className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.preview}
                alt={`Appunto ${i + 1}`}
                className="h-36 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute right-2 top-2 rounded-full bg-zinc-900/70 p-1 text-white hover:bg-zinc-900"
                aria-label="Rimuovi foto"
              >
                <X className="h-3.5 w-3.5" weight="bold" />
              </button>
              <div className="flex items-center gap-1.5 p-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                <ImageIcon className="h-3.5 w-3.5" />
                Foto {i + 1} · {(p.file.size / 1024).toFixed(0)} KB
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
