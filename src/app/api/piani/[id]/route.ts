import { NextResponse } from "next/server";
import { getDb, type FlashcardRow, type PianoRow, type QuizRow } from "@/lib/db";
import {
  applyProgress,
  buildRoadmap,
  extractSections,
  type RoadmapNode,
  type RoadmapProgress,
} from "@/lib/roadmap";

export const runtime = "nodejs";

function ensureRoadmap(piano: PianoRow, hasQuiz: boolean, hasFlash: boolean) {
  let roadmap: RoadmapNode[] = [];
  let progress: RoadmapProgress = {
    completedIds: [],
    xp: 0,
    lastDayCompleted: 0,
  };

  try {
    if (piano.progress_json) {
      progress = {
        ...progress,
        ...JSON.parse(piano.progress_json),
      };
    }
  } catch {
    /* ignore */
  }

  try {
    if (piano.roadmap_json) {
      roadmap = JSON.parse(piano.roadmap_json) as RoadmapNode[];
    }
  } catch {
    roadmap = [];
  }

  if ((!roadmap.length || !piano.roadmap_json) && piano.riassunto) {
    roadmap = buildRoadmap({
      riassunto: piano.riassunto,
      dataEsame: piano.data_esame,
      hasQuiz,
      hasFlashcards: hasFlash,
    });
    const db = getDb();
    db.prepare(
      `UPDATE piani SET roadmap_json = ?, progress_json = ? WHERE id = ?`
    ).run(JSON.stringify(roadmap), JSON.stringify(progress), piano.id);
  }

  roadmap = applyProgress(roadmap, progress);
  const sections = piano.riassunto ? extractSections(piano.riassunto) : [];

  return { roadmap, progress, sections };
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const db = getDb();
  const piano = db.prepare(`SELECT * FROM piani WHERE id = ?`).get(id) as
    | PianoRow
    | undefined;
  if (!piano) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  const flashcard = db
    .prepare(`SELECT * FROM flashcard WHERE piano_id = ? ORDER BY id`)
    .all(id) as FlashcardRow[];
  const quiz = db
    .prepare(`SELECT * FROM quiz WHERE piano_id = ? ORDER BY numero ASC`)
    .all(id) as QuizRow[];

  const { roadmap, progress, sections } = ensureRoadmap(
    piano,
    quiz.length > 0,
    flashcard.length > 0
  );

  return NextResponse.json({
    piano,
    flashcard,
    quiz,
    roadmap,
    progress,
    sections,
  });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await request.json();
  const db = getDb();
  const piano = db.prepare(`SELECT id FROM piani WHERE id = ?`).get(id);
  if (!piano) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  if (body.stato === "errore") {
    const err =
      typeof body.errore === "string" ? body.errore.slice(0, 2000) : "Errore";
    db.prepare(`UPDATE piani SET stato = 'errore', errore = ? WHERE id = ?`).run(
      err,
      id
    );
    return NextResponse.json({ ok: true, id, stato: "errore" });
  }

  return NextResponse.json({ error: "Update non supportato" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const db = getDb();
  db.prepare(`DELETE FROM piani WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}
