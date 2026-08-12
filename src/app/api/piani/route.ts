import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb, type PianoRow } from "@/lib/db";
import { isProviderId, type ProviderId } from "@/lib/ai-providers";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM piani
       ORDER BY
         CASE WHEN data_esame IS NULL THEN 1 ELSE 0 END,
         data_esame ASC,
         creato_il DESC`
    )
    .all() as PianoRow[];
  return NextResponse.json({ piani: rows });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const materia = String(body.materia || "").trim();
    const argomenti = String(body.argomenti || "").trim();
    const dataEsame = body.dataEsame ? String(body.dataEsame).slice(0, 10) : null;
    const votoObiettivo = Math.min(
      10,
      Math.max(1, Number(body.votoObiettivo) || 7)
    );
    let aiProvider: ProviderId = "claude";
    if (body.aiProvider && isProviderId(String(body.aiProvider))) {
      aiProvider = body.aiProvider;
    }

    if (!materia || !argomenti) {
      return NextResponse.json(
        { error: "Materia e argomenti sono obbligatori." },
        { status: 400 }
      );
    }

    const id = nanoid(10);
    const db = getDb();
    db.prepare(
      `INSERT INTO piani (id, materia, argomenti, data_esame, voto_obiettivo, ai_provider, stato)
       VALUES (?, ?, ?, ?, ?, ?, 'generando')`
    ).run(id, materia, argomenti, dataEsame, votoObiettivo, aiProvider);

    return NextResponse.json({ id, stato: "generando" });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore creazione piano" },
      { status: 500 }
    );
  }
}
