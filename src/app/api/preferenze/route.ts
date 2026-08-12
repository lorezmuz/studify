import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const materia = new URL(request.url).searchParams.get("materia");
  if (!materia) return NextResponse.json({ provider: null });
  const db = getDb();
  const row = db
    .prepare(
      `SELECT provider_preferito FROM preferenze_materia WHERE materia = ?`
    )
    .get(materia.toLowerCase()) as { provider_preferito: string } | undefined;
  return NextResponse.json({
    provider: row?.provider_preferito ?? null,
  });
}
