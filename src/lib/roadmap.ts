import { nanoid } from "nanoid";
import { giorniAllaData } from "./dates";

export type NodeType = "read" | "flashcards" | "quiz" | "review" | "chest";

export type RoadmapNode = {
  id: string;
  day: number;
  order: number;
  title: string;
  description: string;
  type: NodeType;
  /** Indice sezione h2 del riassunto (per type=read) */
  sectionIndex?: number;
  /** true se sbloccato / fatto */
  status: "locked" | "current" | "done";
};

export type RoadmapProgress = {
  completedIds: string[];
  xp: number;
  lastDayCompleted: number;
};

/** Estrae sezioni ## dal markdown del riassunto */
export function extractSections(
  riassunto: string
): { title: string; body: string }[] {
  const text = riassunto || "";
  const parts = text.split(/^##\s+/m);
  const sections: { title: string; body: string }[] = [];

  if (parts.length <= 1) {
    // fallback: spezza per # o in chunk
    const byH1 = text.split(/^#\s+/m).filter(Boolean);
    if (byH1.length > 1) {
      for (const p of byH1) {
        const nl = p.indexOf("\n");
        const title = (nl >= 0 ? p.slice(0, nl) : p).trim().slice(0, 80);
        const body = nl >= 0 ? p.slice(nl + 1).trim() : "";
        if (title) sections.push({ title, body });
      }
    }
    if (sections.length === 0) {
      const chunks = text.match(/[\s\S]{1,1200}/g) || [text];
      chunks.forEach((c, i) => {
        sections.push({
          title: `Parte ${i + 1}`,
          body: c.trim(),
        });
      });
    }
    return sections.filter((s) => s.body.length > 40 || s.title);
  }

  // parts[0] is preamble before first ##
  if (parts[0].trim().length > 80) {
    const pre = parts[0].trim();
    const titleMatch = pre.match(/^#\s+(.+)$/m);
    sections.push({
      title: titleMatch?.[1]?.trim() || "Introduzione",
      body: pre.replace(/^#\s+.+$/m, "").trim(),
    });
  }

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const nl = block.indexOf("\n");
    const title = (nl >= 0 ? block.slice(0, nl) : block).trim().slice(0, 100);
    const body = (nl >= 0 ? block.slice(nl + 1) : "").trim();
    if (title) sections.push({ title, body });
  }

  return sections;
}

/**
 * Costruisce una roadmap giorno-per-giorno fino all'esame (o 10 giorni default).
 * Alterna lettura sezioni, flashcard, quiz e chest milestone (stile path).
 */
export function buildRoadmap(input: {
  riassunto: string;
  dataEsame?: string | null;
  hasQuiz: boolean;
  hasFlashcards: boolean;
}): RoadmapNode[] {
  const sections = extractSections(input.riassunto);
  const daysLeft = giorniAllaData(input.dataEsame ?? null);
  const totalDays = Math.min(
    21,
    Math.max(5, daysLeft && daysLeft > 0 ? daysLeft : 10)
  );

  const nodes: RoadmapNode[] = [];
  let order = 0;
  let sectionPtr = 0;

  for (let day = 1; day <= totalDays; day++) {
    const isLast = day === totalDays;
    const isMidChest = day % 4 === 0 && !isLast;

    if (isLast) {
      nodes.push({
        id: nanoid(8),
        day,
        order: order++,
        title: "Verifica finale",
        description: "Quiz completo + ripasso lampo delle carte",
        type: "quiz",
        status: "locked",
      });
      continue;
    }

    if (isMidChest) {
      nodes.push({
        id: nanoid(8),
        day,
        order: order++,
        title: "Baule del giorno",
        description: "Checkpoint: mini-ripasso sbloccato",
        type: "chest",
        status: "locked",
      });
      continue;
    }

    // Giorno tipico: lettura sezione, oppure flashcard, oppure review
    const phase = day % 3;

    if (phase === 1 && sectionPtr < sections.length) {
      const sec = sections[sectionPtr];
      nodes.push({
        id: nanoid(8),
        day,
        order: order++,
        title: sec.title.slice(0, 60),
        description: "Leggi e capisci questa unità",
        type: "read",
        sectionIndex: sectionPtr,
        status: "locked",
      });
      sectionPtr++;
    } else if (phase === 2 && input.hasFlashcards) {
      nodes.push({
        id: nanoid(8),
        day,
        order: order++,
        title: "Carte del giorno",
        description: "Spaced repetition sulle flashcard",
        type: "flashcards",
        status: "locked",
      });
    } else if (input.hasQuiz && day > 2) {
      nodes.push({
        id: nanoid(8),
        day,
        order: order++,
        title: "Quiz di allenamento",
        description: "Metti alla prova quello che hai studiato",
        type: "quiz",
        status: "locked",
      });
    } else if (sectionPtr < sections.length) {
      const sec = sections[sectionPtr];
      nodes.push({
        id: nanoid(8),
        day,
        order: order++,
        title: sec.title.slice(0, 60),
        description: "Continua lo studio teorico",
        type: "read",
        sectionIndex: sectionPtr,
        status: "locked",
      });
      sectionPtr++;
    } else {
      nodes.push({
        id: nanoid(8),
        day,
        order: order++,
        title: "Ripasso guidato",
        description: "Rileggi i punti chiave e le formule",
        type: "review",
        status: "locked",
      });
    }
  }

  // Se restano sezioni, aggiungi giorni extra di lettura (max +5)
  let extra = 0;
  while (sectionPtr < sections.length && extra < 5) {
    const day = totalDays + 1 + extra;
    const sec = sections[sectionPtr];
    nodes.push({
      id: nanoid(8),
      day,
      order: order++,
      title: sec.title.slice(0, 60),
      description: "Unità extra dal riassunto",
      type: "read",
      sectionIndex: sectionPtr,
      status: "locked",
    });
    sectionPtr++;
    extra++;
  }

  return applyProgress(nodes, { completedIds: [], xp: 0, lastDayCompleted: 0 });
}

export function applyProgress(
  nodes: RoadmapNode[],
  progress: RoadmapProgress
): RoadmapNode[] {
  const done = new Set(progress.completedIds);
  let foundCurrent = false;

  return nodes.map((n) => {
    if (done.has(n.id)) {
      return { ...n, status: "done" as const };
    }
    if (!foundCurrent) {
      foundCurrent = true;
      return { ...n, status: "current" as const };
    }
    return { ...n, status: "locked" as const };
  });
}

export function completeNode(
  nodes: RoadmapNode[],
  progress: RoadmapProgress,
  nodeId: string
): { nodes: RoadmapNode[]; progress: RoadmapProgress; xpGain: number } {
  if (progress.completedIds.includes(nodeId)) {
    return { nodes: applyProgress(nodes, progress), progress, xpGain: 0 };
  }
  const node = nodes.find((n) => n.id === nodeId);
  const xpGain =
    node?.type === "chest" ? 40 : node?.type === "quiz" ? 30 : node?.type === "flashcards" ? 20 : 15;

  const nextProgress: RoadmapProgress = {
    completedIds: [...progress.completedIds, nodeId],
    xp: progress.xp + xpGain,
    lastDayCompleted: node?.day ?? progress.lastDayCompleted,
  };

  return {
    nodes: applyProgress(nodes, nextProgress),
    progress: nextProgress,
    xpGain,
  };
}
