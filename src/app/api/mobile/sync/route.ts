import { NextResponse } from "next/server";
import {
  getDb,
  type FlashcardRow,
  type PianoRow,
  type QuizRow,
} from "@/lib/db";
import {
  applyProgress,
  buildRoadmap,
  extractSections,
  type RoadmapNode,
  type RoadmapProgress,
} from "@/lib/roadmap";
import { withCors } from "@/lib/cors";

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
      progress = { ...progress, ...JSON.parse(piano.progress_json) };
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

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/**
 * Bundle completo per cache mobile.
 * Query opzionale: ?id=xxx per un solo piano.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const onlyId = url.searchParams.get("id");
    const db = getDb();

    let piani = db
      .prepare(
        `SELECT * FROM piani
         WHERE stato = 'pronto'
         ORDER BY
           CASE WHEN data_esame IS NULL THEN 1 ELSE 0 END,
           data_esame ASC,
           creato_il DESC`
      )
      .all() as PianoRow[];

    if (onlyId) {
      piani = piani.filter((p) => p.id === onlyId);
    }

    const bundle = piani.map((piano) => {
      const flashcard = db
        .prepare(`SELECT * FROM flashcard WHERE piano_id = ? ORDER BY id`)
        .all(piano.id) as FlashcardRow[];
      const quiz = db
        .prepare(`SELECT * FROM quiz WHERE piano_id = ? ORDER BY numero ASC`)
        .all(piano.id) as QuizRow[];
      const risultati = db
        .prepare(
          `SELECT r.* FROM quiz_risultati r
           INNER JOIN quiz q ON q.id = r.quiz_id
           WHERE q.piano_id = ?
           ORDER BY r.completato_il DESC
           LIMIT 20`
        )
        .all(piano.id) as Record<string, unknown>[];

      const { roadmap, progress, sections } = ensureRoadmap(
        piano,
        quiz.length > 0,
        flashcard.length > 0
      );

      return {
        piano,
        flashcard,
        quiz,
        risultati,
        roadmap,
        progress,
        sections,
      };
    });

    return withCors(
      NextResponse.json({
        ok: true,
        syncedAt: new Date().toISOString(),
        count: bundle.length,
        piani: bundle,
      })
    );
  } catch (e) {
    console.error(e);
    return withCors(
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Sync fallito" },
        { status: 500 }
      )
    );
  }
}
