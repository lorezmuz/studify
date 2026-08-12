import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  buildExtraQuizPrompt,
  generaConAI,
  isProviderId,
  type ProviderId,
} from "@/lib/ai-providers";
import { extractAndParseJson } from "@/lib/json-repair";
import { getDb, type PianoRow, type QuizDomanda, type QuizRow } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: pianoId } = await ctx.params;
  const db = getDb();
  const piano = db.prepare(`SELECT * FROM piani WHERE id = ?`).get(pianoId) as
    | PianoRow
    | undefined;
  if (!piano || piano.stato !== "pronto" || !piano.riassunto) {
    return NextResponse.json({ error: "Piano non pronto" }, { status: 400 });
  }

  const existing = db
    .prepare(`SELECT * FROM quiz WHERE piano_id = ? ORDER BY numero ASC`)
    .all(pianoId) as QuizRow[];

  const domandeGiaFatte: string[] = [];
  for (const q of existing) {
    try {
      const ds = JSON.parse(q.domande_json) as QuizDomanda[];
      ds.forEach((d) => domandeGiaFatte.push(d.domanda));
    } catch {
      /* ignore */
    }
  }

  const provider: ProviderId = isProviderId(piano.ai_provider)
    ? piano.ai_provider
    : "claude";

  try {
    const prompt = buildExtraQuizPrompt({
      materia: piano.materia,
      argomenti: piano.argomenti,
      riassunto: piano.riassunto,
      domandeGiaFatte,
    });
    const raw = await generaConAI(provider, prompt);
    const parsed = extractAndParseJson(raw) as { quiz?: QuizDomanda[] };
    if (!parsed.quiz?.length) throw new Error("Quiz vuoto dalla AI");

    const quiz = parsed.quiz.slice(0, 12).map((q) => {
      const opzioni = Array.isArray(q.opzioni) ? q.opzioni.slice(0, 4) : [];
      while (opzioni.length < 4) opzioni.push(`Opzione ${opzioni.length + 1}`);
      return {
        domanda: String(q.domanda || ""),
        opzioni,
        risposta_corretta: Math.min(
          3,
          Math.max(0, Number(q.risposta_corretta) || 0)
        ),
      };
    });

    const numero =
      (
        db
          .prepare(
            `SELECT COALESCE(MAX(numero), 0) as m FROM quiz WHERE piano_id = ?`
          )
          .get(pianoId) as { m: number }
      ).m + 1;

    const id = nanoid(12);
    db.prepare(
      `INSERT INTO quiz (id, piano_id, numero, domande_json) VALUES (?, ?, ?, ?)`
    ).run(id, pianoId, numero, JSON.stringify(quiz));

    return NextResponse.json({ id, numero, quiz });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Generazione quiz fallita",
      },
      { status: 500 }
    );
  }
}
