import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb, type FlashcardRow, type PianoRow } from "@/lib/db";
import {
  applyProgress,
  completeNode,
  type RoadmapNode,
  type RoadmapProgress,
} from "@/lib/roadmap";
import { addDaysISO, aggiornaSM2 } from "@/lib/sm2";
import { withCors } from "@/lib/cors";

export const runtime = "nodejs";

type Mutation =
  | {
      type: "complete_node";
      pianoId: string;
      nodeId: string;
      clientId?: string;
    }
  | {
      type: "flashcard";
      flashcardId: string;
      valutazione: number;
      clientId?: string;
    }
  | {
      type: "quiz_result";
      quizId: string;
      risposte: number[];
      punteggio?: number;
      clientId?: string;
    }
  | {
      type: "progress";
      pianoId: string;
      progress: RoadmapProgress;
      clientId?: string;
    };

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/**
 * Applica mutazioni accumulate offline dal client mobile.
 * Body: { mutations: Mutation[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mutations = Array.isArray(body.mutations)
      ? (body.mutations as Mutation[])
      : [];

    if (!mutations.length) {
      return withCors(
        NextResponse.json({ ok: true, applied: 0, results: [] })
      );
    }

    const db = getDb();
    const results: { clientId?: string; ok: boolean; error?: string; data?: unknown }[] =
      [];

    for (const m of mutations) {
      try {
        if (m.type === "complete_node") {
          const piano = db
            .prepare(`SELECT * FROM piani WHERE id = ?`)
            .get(m.pianoId) as PianoRow | undefined;
          if (!piano?.roadmap_json) {
            results.push({
              clientId: m.clientId,
              ok: false,
              error: "Roadmap assente",
            });
            continue;
          }
          let nodes = JSON.parse(piano.roadmap_json) as RoadmapNode[];
          let progress: RoadmapProgress = {
            completedIds: [],
            xp: 0,
            lastDayCompleted: 0,
          };
          try {
            if (piano.progress_json) progress = JSON.parse(piano.progress_json);
          } catch {
            /* ignore */
          }
          const current = applyProgress(nodes, progress).find(
            (n) => n.id === m.nodeId
          );
          if (!current || current.status === "locked") {
            // già fatto o non valido: non fallire hard
            results.push({
              clientId: m.clientId,
              ok: true,
              data: { skipped: true },
            });
            continue;
          }
          const result = completeNode(nodes, progress, m.nodeId);
          db.prepare(
            `UPDATE piani SET roadmap_json = ?, progress_json = ? WHERE id = ?`
          ).run(
            JSON.stringify(result.nodes),
            JSON.stringify(result.progress),
            m.pianoId
          );
          results.push({
            clientId: m.clientId,
            ok: true,
            data: { progress: result.progress },
          });
        } else if (m.type === "flashcard") {
          const val = Number(m.valutazione);
          if (![1, 2, 3, 4].includes(val)) {
            results.push({
              clientId: m.clientId,
              ok: false,
              error: "valutazione 1-4",
            });
            continue;
          }
          const card = db
            .prepare(`SELECT * FROM flashcard WHERE id = ?`)
            .get(m.flashcardId) as FlashcardRow | undefined;
          if (!card) {
            results.push({
              clientId: m.clientId,
              ok: false,
              error: "Flashcard non trovata",
            });
            continue;
          }
          const next = aggiornaSM2(
            card.livello,
            card.intervallo_giorni,
            card.fattore_facilita,
            val
          );
          const prossima = addDaysISO(next.intervallo);
          db.prepare(
            `UPDATE flashcard
             SET livello = ?, intervallo_giorni = ?, fattore_facilita = ?, prossima_revisione = ?
             WHERE id = ?`
          ).run(
            next.livello,
            next.intervallo,
            next.fattoreFacilita,
            prossima,
            m.flashcardId
          );
          results.push({
            clientId: m.clientId,
            ok: true,
            data: {
              livello: next.livello,
              intervallo_giorni: next.intervallo,
              prossima_revisione: prossima,
            },
          });
        } else if (m.type === "quiz_result") {
          const quiz = db
            .prepare(`SELECT * FROM quiz WHERE id = ?`)
            .get(m.quizId) as { id: string; domande_json: string } | undefined;
          if (!quiz) {
            results.push({
              clientId: m.clientId,
              ok: false,
              error: "Quiz non trovato",
            });
            continue;
          }
          const domande = JSON.parse(quiz.domande_json) as {
            risposta_corretta: number;
          }[];
          const risposte = Array.isArray(m.risposte) ? m.risposte : [];
          let corrette = 0;
          domande.forEach((d, i) => {
            if (risposte[i] === d.risposta_corretta) corrette++;
          });
          const punteggio =
            typeof m.punteggio === "number"
              ? m.punteggio
              : Math.round((corrette / Math.max(1, domande.length)) * 100);
          const resultId = nanoid(12);
          db.prepare(
            `INSERT INTO quiz_risultati (id, quiz_id, punteggio, risposte_date_json, feedback_ai)
             VALUES (?, ?, ?, ?, ?)`
          ).run(
            resultId,
            m.quizId,
            punteggio,
            JSON.stringify(risposte),
            "Sincronizzato da app mobile (offline)"
          );
          results.push({
            clientId: m.clientId,
            ok: true,
            data: { resultId, punteggio },
          });
        } else if (m.type === "progress") {
          const piano = db
            .prepare(`SELECT id FROM piani WHERE id = ?`)
            .get(m.pianoId);
          if (!piano) {
            results.push({
              clientId: m.clientId,
              ok: false,
              error: "Piano non trovato",
            });
            continue;
          }
          db.prepare(`UPDATE piani SET progress_json = ? WHERE id = ?`).run(
            JSON.stringify(m.progress),
            m.pianoId
          );
          results.push({ clientId: m.clientId, ok: true });
        } else {
          results.push({
            clientId: (m as Mutation).clientId,
            ok: false,
            error: "Tipo mutazione sconosciuto",
          });
        }
      } catch (err) {
        results.push({
          clientId: (m as Mutation).clientId,
          ok: false,
          error: err instanceof Error ? err.message : "Errore",
        });
      }
    }

    const applied = results.filter((r) => r.ok).length;
    return withCors(
      NextResponse.json({
        ok: true,
        applied,
        failed: results.length - applied,
        results,
      })
    );
  } catch (e) {
    console.error(e);
    return withCors(
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Push fallito" },
        { status: 500 }
      )
    );
  }
}
