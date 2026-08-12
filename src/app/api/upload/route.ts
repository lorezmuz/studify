import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILES = 20;
const MAX_BYTES = 12 * 1024 * 1024; // 12MB each
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

/**
 * Salva le foto su disco e restituisce i path assoluti.
 * L'AI (Claude Code) le legge dai path — meglio dell'OCR per appunti/scritto a mano.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const pianoId = String(form.get("pianoId") || "").trim();
    if (!pianoId) {
      return NextResponse.json({ error: "pianoId mancante" }, { status: 400 });
    }

    const db = getDb();
    const piano = db.prepare(`SELECT id FROM piani WHERE id = ?`).get(pianoId);
    if (!piano) {
      return NextResponse.json({ error: "Piano non trovato" }, { status: 404 });
    }

    const files = form
      .getAll("files")
      .filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f);

    if (!files.length) {
      return NextResponse.json({ error: "Nessun file" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Massimo ${MAX_FILES} foto per piano` },
        { status: 400 }
      );
    }

    const dataRoot = process.env.DATA_DIR
      ? path.resolve(process.env.DATA_DIR)
      : path.join(process.cwd(), "data");
    const dir = path.join(dataRoot, "uploads", pianoId);
    fs.mkdirSync(dir, { recursive: true });

    const saved: { name: string; path: string; size: number }[] = [];

    for (const file of files) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `File troppo grande: ${file.name} (max 12MB)` },
          { status: 400 }
        );
      }
      const type = file.type || "application/octet-stream";
      if (!ALLOWED.has(type) && !file.name.match(/\.(jpe?g|png|webp|gif|heic)$/i)) {
        return NextResponse.json(
          { error: `Tipo non supportato: ${file.name}` },
          { status: 400 }
        );
      }

      const ext =
        path.extname(file.name) ||
        (type.includes("png")
          ? ".png"
          : type.includes("webp")
            ? ".webp"
            : ".jpg");
      const safeName = `${nanoid(8)}${ext.toLowerCase()}`;
      const abs = path.join(dir, safeName);
      const buf = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(abs, buf);
      saved.push({ name: file.name, path: abs, size: file.size });
    }

    return NextResponse.json({
      ok: true,
      count: saved.length,
      files: saved,
      // path assoluti per il CLI sulla stessa macchina
      paths: saved.map((s) => s.path),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload fallito" },
      { status: 500 }
    );
  }
}
