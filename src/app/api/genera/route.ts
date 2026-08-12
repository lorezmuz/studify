import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type Database from "better-sqlite3";
import {
  generaMaterialeStudio,
  isProviderId,
  type ProviderId,
  type StudyMaterial,
} from "@/lib/ai-providers";
import { extractAndParseJson } from "@/lib/json-repair";
import { getDb } from "@/lib/db";
import { buildRoadmap } from "@/lib/roadmap";

export const runtime = "nodejs";
export const maxDuration = 600;

/** Grok a volte scrive il JSON su file nella cartella upload invece che su stdout */
function loadMaterialFromUploadDir(pianoId: string): StudyMaterial | null {
  const dataRoot = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
  const dir = path.join(dataRoot, "uploads", pianoId);
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      f,
      t: fs.statSync(path.join(dir, f)).mtimeMs,
    }))
    .sort((a, b) => b.t - a.t);

  for (const { f } of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const parsed = extractAndParseJson(raw) as StudyMaterial;
      if (
        parsed?.riassunto &&
        Array.isArray(parsed.flashcard) &&
        parsed.flashcard.length >= 5 &&
        Array.isArray(parsed.quiz) &&
        parsed.quiz.length >= 5
      ) {
        console.log(`[genera] recuperato materiale da file ${f}`);
        return parsed;
      }
    } catch {
      /* prova il prossimo */
    }
  }
  return null;
}

function saveMaterial(
  db: Database.Database,
  pianoId: string,
  materia: string,
  provider: string,
  material: StudyMaterial,
  dataEsame?: string | null
) {
  const roadmap = buildRoadmap({
    riassunto: material.riassunto,
    dataEsame: dataEsame ?? null,
    hasQuiz: material.quiz.length > 0,
    hasFlashcards: material.flashcard.length > 0,
  });
  const progress = { completedIds: [] as string[], xp: 0, lastDayCompleted: 0 };

  const insertCard = db.prepare(
    `INSERT INTO flashcard (id, piano_id, fronte, retro) VALUES (?, ?, ?, ?)`
  );
  const insertQuiz = db.prepare(
    `INSERT INTO quiz (id, piano_id, numero, domande_json) VALUES (?, ?, 1, ?)`
  );

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE piani SET riassunto = ?, ai_provider = ?, stato = 'pronto', errore = NULL,
       roadmap_json = ?, progress_json = ? WHERE id = ?`
    ).run(
      material.riassunto,
      provider,
      JSON.stringify(roadmap),
      JSON.stringify(progress),
      pianoId
    );

    db.prepare(`DELETE FROM flashcard WHERE piano_id = ?`).run(pianoId);
    db.prepare(
      `DELETE FROM quiz_risultati WHERE quiz_id IN (SELECT id FROM quiz WHERE piano_id = ?)`
    ).run(pianoId);
    db.prepare(`DELETE FROM quiz WHERE piano_id = ?`).run(pianoId);

    for (const c of material.flashcard) {
      insertCard.run(nanoid(12), pianoId, c.fronte, c.retro);
    }
    insertQuiz.run(nanoid(12), pianoId, JSON.stringify(material.quiz));
  });
  tx();

  db.prepare(
    `INSERT INTO preferenze_materia (materia, provider_preferito)
     VALUES (?, ?)
     ON CONFLICT(materia) DO UPDATE SET provider_preferito = excluded.provider_preferito`
  ).run(materia.toLowerCase(), provider);

  return NextResponse.json({
    ok: true,
    id: pianoId,
    stato: "pronto",
    flashcard: material.flashcard.length,
    quiz: material.quiz.length,
    roadmapDays: roadmap.length,
  });
}

export async function POST(request: Request) {
  const db = getDb();
  let pianoId = "";

  try {
    const body = await request.json();
    pianoId = String(body.pianoId || "");
    if (!pianoId) {
      return NextResponse.json({ error: "pianoId mancante" }, { status: 400 });
    }

    const piano = db
      .prepare(`SELECT * FROM piani WHERE id = ?`)
      .get(pianoId) as
      | {
          id: string;
          materia: string;
          argomenti: string;
          voto_obiettivo: number | null;
          ai_provider: string;
          stato: string;
          data_esame: string | null;
        }
      | undefined;

    if (!piano) {
      return NextResponse.json({ error: "Piano non trovato" }, { status: 404 });
    }

    // Solo import da file già generato (zero token)
    if (body.importOnly) {
      const fromFile = loadMaterialFromUploadDir(pianoId);
      if (!fromFile) {
        return NextResponse.json(
          { error: "Nessun JSON valido nella cartella upload di questo piano" },
          { status: 404 }
        );
      }
      return saveMaterial(
        db,
        pianoId,
        piano.materia,
        piano.ai_provider || "grok",
        fromFile,
        (piano as { data_esame?: string | null }).data_esame
      );
    }

    db.prepare(
      `UPDATE piani SET stato = 'generando', errore = NULL WHERE id = ?`
    ).run(pianoId);

    const provider: ProviderId = isProviderId(piano.ai_provider)
      ? piano.ai_provider
      : isProviderId(String(body.aiProvider || ""))
        ? (body.aiProvider as ProviderId)
        : "claude";

    const extraContext =
      typeof body.extraContext === "string" ? body.extraContext : undefined;

    const imagePaths = Array.isArray(body.imagePaths)
      ? (body.imagePaths as unknown[])
          .map((p) => String(p))
          .filter((p) => p.length > 0 && !p.includes(".."))
      : undefined;

    // 1) file già scritto da Grok  2) CLI  3) file dopo errore CLI
    const existing = loadMaterialFromUploadDir(pianoId);
    let material: StudyMaterial;
    if (existing) {
      material = existing;
    } else {
      try {
        material = await generaMaterialeStudio(provider, {
          materia: piano.materia,
          argomenti: piano.argomenti,
          votoObiettivo: piano.voto_obiettivo || 7,
          extraContext,
          imagePaths,
        });
      } catch (err) {
        const recovered = loadMaterialFromUploadDir(pianoId);
        if (recovered) {
          console.warn("[genera] CLI fallita ma file recuperato", err);
          material = recovered;
        } else {
          throw err;
        }
      }
    }

    return saveMaterial(
      db,
      pianoId,
      piano.materia,
      provider,
      material,
      piano.data_esame
    );
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Generazione fallita";
    if (pianoId) {
      try {
        getDb()
          .prepare(`UPDATE piani SET stato = 'errore', errore = ? WHERE id = ?`)
          .run(msg.slice(0, 2000), pianoId);
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json({ error: msg, stato: "errore" }, { status: 500 });
  }
}
