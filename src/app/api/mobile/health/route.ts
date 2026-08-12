import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withCors } from "@/lib/cors";

export const runtime = "nodejs";

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  let pianiCount = 0;
  try {
    const db = getDb();
    const row = db
      .prepare(`SELECT COUNT(*) as n FROM piani WHERE stato = 'pronto'`)
      .get() as { n: number };
    pianiCount = row?.n ?? 0;
  } catch {
    /* db non ancora creato */
  }

  return withCors(
    NextResponse.json({
      ok: true,
      name: "Studify",
      version: "0.1.0",
      mobileApi: 1,
      pianiPronti: pianiCount,
      time: new Date().toISOString(),
    })
  );
}
