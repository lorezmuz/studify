import { NextResponse } from "next/server";
import { getDb, type PianoRow } from "@/lib/db";
import {
  applyProgress,
  completeNode,
  type RoadmapNode,
  type RoadmapProgress,
} from "@/lib/roadmap";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: pianoId } = await ctx.params;
  const body = await request.json();
  const nodeId = String(body.nodeId || "");
  if (!nodeId) {
    return NextResponse.json({ error: "nodeId mancante" }, { status: 400 });
  }

  const db = getDb();
  const piano = db.prepare(`SELECT * FROM piani WHERE id = ?`).get(pianoId) as
    | PianoRow
    | undefined;
  if (!piano?.roadmap_json) {
    return NextResponse.json({ error: "Roadmap assente" }, { status: 400 });
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

  const current = applyProgress(nodes, progress).find((n) => n.id === nodeId);
  if (!current || current.status === "locked") {
    return NextResponse.json(
      { error: "Nodo bloccato o non valido" },
      { status: 400 }
    );
  }

  const result = completeNode(nodes, progress, nodeId);
  db.prepare(
    `UPDATE piani SET roadmap_json = ?, progress_json = ? WHERE id = ?`
  ).run(
    JSON.stringify(result.nodes),
    JSON.stringify(result.progress),
    pianoId
  );

  return NextResponse.json({
    ok: true,
    roadmap: result.nodes,
    progress: result.progress,
    xpGain: result.xpGain,
  });
}
