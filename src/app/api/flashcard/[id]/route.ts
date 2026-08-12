import { NextResponse } from "next/server";
import { getDb, type FlashcardRow } from "@/lib/db";
import { addDaysISO, aggiornaSM2 } from "@/lib/sm2";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await request.json();
  const valutazione = Number(body.valutazione);
  if (![1, 2, 3, 4].includes(valutazione)) {
    return NextResponse.json(
      { error: "valutazione deve essere 1-4" },
      { status: 400 }
    );
  }

  const db = getDb();
  const card = db.prepare(`SELECT * FROM flashcard WHERE id = ?`).get(id) as
    | FlashcardRow
    | undefined;
  if (!card) {
    return NextResponse.json({ error: "Flashcard non trovata" }, { status: 404 });
  }

  const next = aggiornaSM2(
    card.livello,
    card.intervallo_giorni,
    card.fattore_facilita,
    valutazione
  );
  const prossima = addDaysISO(next.intervallo);

  db.prepare(
    `UPDATE flashcard
     SET livello = ?, intervallo_giorni = ?, fattore_facilita = ?, prossima_revisione = ?
     WHERE id = ?`
  ).run(next.livello, next.intervallo, next.fattoreFacilita, prossima, id);

  return NextResponse.json({
    ok: true,
    livello: next.livello,
    intervallo_giorni: next.intervallo,
    fattore_facilita: next.fattoreFacilita,
    prossima_revisione: prossima,
  });
}
