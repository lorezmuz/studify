import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { extractSections } from "./roadmap";

type Flash = { fronte: string; retro: string };
type QuizQ = {
  domanda: string;
  opzioni: string[];
  risposta_corretta: number;
};
type RoadNode = { day: number; title: string; type: string; description: string };

const BRAND = "Studify";
const GREEN: [number, number, number] = [5, 150, 105];
const INK: [number, number, number] = [24, 24, 27];
const MUTED: [number, number, number] = [82, 82, 91];

function cleanInline(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, " [formula] ")
    .replace(/\$[^$\n]+\$/g, " [formula] ")
    .replace(/\\\[[\s\S]*?\\\]/g, " [formula] ")
    .replace(/\\\([\s\S]*?\\\)/g, " [formula] ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~|]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureSpace(doc: jsPDF, y: number, need = 24): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - need) {
    doc.addPage();
    return 20;
  }
  return y;
}

function writeParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  opts?: { size?: number; bold?: boolean; color?: [number, number, number]; lineH?: number }
): number {
  const size = opts?.size ?? 10;
  const lineH = opts?.lineH ?? size * 0.45;
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...(opts?.color ?? INK));
  const lines = doc.splitTextToSize(text, maxW) as string[];
  let cy = y;
  for (const line of lines) {
    cy = ensureSpace(doc, cy, 16);
    doc.text(line, x, cy);
    cy += lineH;
  }
  return cy;
}

function sectionHeading(doc: jsPDF, title: string, y: number, margin: number, maxW: number) {
  y = ensureSpace(doc, y, 28);
  doc.setFillColor(...GREEN);
  doc.roundedRect(margin, y - 4.5, 2.2, 6, 0.5, 0.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...GREEN);
  const lines = doc.splitTextToSize(title, maxW - 6) as string[];
  doc.text(lines[0], margin + 5, y);
  y += 3;
  doc.setDrawColor(220, 252, 231);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 2, margin + maxW, y + 2);
  return y + 8;
}

function writeBodyBlocks(
  doc: jsPDF,
  body: string,
  margin: number,
  y: number,
  maxW: number
): number {
  // spezza in paragrafi e liste
  const chunks = body.split(/\n{2,}/);
  for (const chunk of chunks) {
    const raw = chunk.trim();
    if (!raw) continue;

    // heading ###
    if (/^###\s+/.test(raw)) {
      const title = cleanInline(raw.replace(/^###\s+/, ""));
      y = ensureSpace(doc, y, 18);
      y = writeParagraph(doc, title, margin, y, maxW, {
        size: 11,
        bold: true,
        color: INK,
        lineH: 5.5,
      });
      y += 3;
      continue;
    }

    // lista
    const lines = raw.split("\n");
    const isList = lines.every(
      (l) => !l.trim() || /^[-*•]\s+/.test(l.trim()) || /^\d+\.\s+/.test(l.trim())
    );
    if (isList) {
      for (const l of lines) {
        const t = l.trim();
        if (!t) continue;
        const item = cleanInline(t.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, ""));
        y = ensureSpace(doc, y, 14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        doc.text("•", margin, y);
        const wrapped = doc.splitTextToSize(item, maxW - 6) as string[];
        for (let i = 0; i < wrapped.length; i++) {
          y = ensureSpace(doc, y, 12);
          doc.text(wrapped[i], margin + 5, y);
          y += 4.8;
        }
        y += 1;
      }
      y += 2;
      continue;
    }

    // tabella grezza markdown → ignora righe |---| 
    if (raw.includes("|") && raw.split("\n").length >= 2) {
      const rows = raw
        .split("\n")
        .map((r) => r.trim())
        .filter((r) => r.startsWith("|") && !/^\|[\s-:|]+\|$/.test(r))
        .map((r) =>
          r
            .split("|")
            .slice(1, -1)
            .map((c) => cleanInline(c))
        );
      if (rows.length >= 2) {
        y = ensureSpace(doc, y, 40);
        autoTable(doc, {
          startY: y,
          head: [rows[0]],
          body: rows.slice(1),
          styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
          headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          margin: { left: margin, right: margin },
        });
        const d = doc as jsPDF & { lastAutoTable?: { finalY: number } };
        y = (d.lastAutoTable?.finalY ?? y) + 6;
        continue;
      }
    }

    // paragrafo
    const para = cleanInline(raw.replace(/\n/g, " "));
    if (para.length < 2) continue;
    y = writeParagraph(doc, para, margin, y, maxW, {
      size: 10,
      lineH: 5,
    });
    y += 3.5;
  }
  return y;
}

/** PDF formattato a sezioni (non dump grezzo di markdown) */
export function buildPianoPdf(input: {
  materia: string;
  argomenti: string;
  dataEsame?: string | null;
  votoObiettivo?: number | null;
  riassunto: string;
  flashcard: Flash[];
  quiz: QuizQ[];
  roadmap: RoadNode[];
}): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  let y = 0;

  // Copertina
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 48, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(BRAND, margin, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Piano di studio personalizzato", margin, 26);
  doc.setFontSize(9);
  doc.text(
    [
      input.materia,
      input.votoObiettivo != null ? `obiettivo ${input.votoObiettivo}/10` : null,
      input.dataEsame ? `esame ${input.dataEsame}` : null,
    ]
      .filter(Boolean)
      .join("  ·  "),
    margin,
    38
  );

  y = 58;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  y = writeParagraph(doc, input.argomenti, margin, y, maxW, {
    size: 16,
    bold: true,
    lineH: 7,
  });
  y += 6;

  // —— Roadmap
  y = sectionHeading(doc, "Roadmap giorno per giorno", y, margin, maxW);
  autoTable(doc, {
    startY: y,
    head: [["Giorno", "Attività", "Tipo", "Cosa fare"]],
    body: input.roadmap.map((n) => [
      `${n.day}`,
      n.title,
      n.type,
      n.description,
    ]),
    styles: { fontSize: 8.5, cellPadding: 2, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 18, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 28 },
      3: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });
  const d1 = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  y = (d1.lastAutoTable?.finalY ?? y) + 12;

  // —— Riassunto per sezioni
  doc.addPage();
  y = 20;
  y = sectionHeading(doc, "Riassunto strutturato", y, margin, maxW);

  const sections = extractSections(input.riassunto);
  if (sections.length === 0) {
    y = writeBodyBlocks(doc, input.riassunto, margin, y, maxW);
  } else {
    sections.forEach((sec, idx) => {
      y = ensureSpace(doc, y, 30);
      // numero sezione
      doc.setFillColor(...GREEN);
      doc.circle(margin + 3, y - 1.5, 3.2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(String(idx + 1), margin + 3, y, { align: "center" });

      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const titleLines = doc.splitTextToSize(cleanInline(sec.title), maxW - 10) as string[];
      doc.text(titleLines, margin + 9, y);
      y += titleLines.length * 5.5 + 3;

      y = writeBodyBlocks(doc, sec.body, margin, y, maxW);
      y += 5;
    });
  }

  // —— Flashcard
  doc.addPage();
  y = 20;
  y = sectionHeading(doc, `Flashcard (${input.flashcard.length})`, y, margin, maxW);
  autoTable(doc, {
    startY: y,
    head: [["#", "Domanda / concetto", "Risposta"]],
    body: input.flashcard.map((c, i) => [
      String(i + 1),
      cleanInline(c.fronte),
      cleanInline(c.retro),
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.2, valign: "top", overflow: "linebreak" },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 80 },
      2: { cellWidth: 85 },
    },
    margin: { left: margin, right: margin },
  });

  // —— Quiz
  doc.addPage();
  y = 20;
  y = sectionHeading(doc, `Quiz con soluzioni (${input.quiz.length})`, y, margin, maxW);

  input.quiz.forEach((q, i) => {
    y = ensureSpace(doc, y, 40);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin - 1, y - 4, maxW + 2, 6, 1, 1, "F");
    y = writeParagraph(doc, `${i + 1}. ${cleanInline(q.domanda)}`, margin, y, maxW, {
      size: 10,
      bold: true,
      lineH: 5,
    });
    y += 2;
    q.opzioni.forEach((opt, j) => {
      const ok = j === q.risposta_corretta;
      y = ensureSpace(doc, y, 12);
      if (ok) {
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(margin, y - 3.5, maxW, 6, 1, 1, "F");
      }
      y = writeParagraph(
        doc,
        `${ok ? "✓" : "○"}  ${String.fromCharCode(65 + j)})  ${cleanInline(opt)}`,
        margin + 2,
        y,
        maxW - 4,
        {
          size: 9.5,
          bold: ok,
          color: ok ? GREEN : MUTED,
          lineH: 4.6,
        }
      );
      y += 1.5;
    });
    y += 5;
  });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.2);
    const pageH = doc.internal.pageSize.getHeight();
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.setFont("helvetica", "normal");
    doc.text(`${BRAND}  ·  ${input.materia}`, margin, pageH - 7);
    doc.text(`${p} / ${pages}`, pageW - margin, pageH - 7, { align: "right" });
  }

  return doc.output("blob");
}
