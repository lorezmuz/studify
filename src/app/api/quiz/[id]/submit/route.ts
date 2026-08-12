import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  buildFeedbackPrompt,
  generaConAI,
  isProviderId,
  type ProviderId,
} from "@/lib/ai-providers";
import { getDb, type PianoRow, type QuizDomanda, type QuizRow } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: quizId } = await ctx.params;
  const body = await request.json();
  const risposte = Array.isArray(body.risposte) ? (body.risposte as number[]) : [];

  const db = getDb();
  const quiz = db.prepare(`SELECT * FROM quiz WHERE id = ?`).get(quizId) as
    | QuizRow
    | undefined;
  if (!quiz) {
    return NextResponse.json({ error: "Quiz non trovato" }, { status: 404 });
  }

  const domande = JSON.parse(quiz.domande_json) as QuizDomanda[];
  let corrette = 0;
  const sbagli: { domanda: string; data: string; corretta: string }[] = [];

  domande.forEach((d, i) => {
    const scelta = risposte[i];
    if (scelta === d.risposta_corretta) {
      corrette++;
    } else {
      sbagli.push({
        domanda: d.domanda,
        data:
          typeof scelta === "number" && d.opzioni[scelta]
            ? d.opzioni[scelta]
            : "(nessuna)",
        corretta: d.opzioni[d.risposta_corretta] || "",
      });
    }
  });

  const punteggio = Math.round((corrette / Math.max(1, domande.length)) * 100);

  const piano = db
    .prepare(`SELECT * FROM piani WHERE id = ?`)
    .get(quiz.piano_id) as PianoRow | undefined;

  let feedback_ai: string | null = null;
  if (sbagli.length > 0 && piano) {
    try {
      const provider: ProviderId = isProviderId(piano.ai_provider)
        ? piano.ai_provider
        : "claude";
      feedback_ai = await generaConAI(
        provider,
        buildFeedbackPrompt({
          argomenti: piano.argomenti,
          sbagli: sbagli.slice(0, 8),
        }),
        { timeoutMs: 120_000 }
      );
    } catch (e) {
      feedback_ai =
        e instanceof Error
          ? `Feedback AI non disponibile: ${e.message}`
          : "Feedback AI non disponibile.";
    }
  } else if (sbagli.length === 0) {
    feedback_ai = "Ottimo: tutte le risposte corrette. Ripassa le flashcard in scadenza per fissare.";
  }

  const resultId = nanoid(12);
  db.prepare(
    `INSERT INTO quiz_risultati (id, quiz_id, punteggio, risposte_date_json, feedback_ai)
     VALUES (?, ?, ?, ?, ?)`
  ).run(resultId, quizId, punteggio, JSON.stringify(risposte), feedback_ai);

  return NextResponse.json({
    punteggio,
    corrette,
    totali: domande.length,
    feedback_ai,
    sbagli,
  });
}
