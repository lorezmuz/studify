"use client";

import { useMemo } from "react";
import katex from "katex";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import "katex/dist/katex.min.css";

const katexOpts: katex.KatexOptions = {
  throwOnError: false,
  strict: "ignore",
  trust: true,
  output: "html",
};

function cleanTex(tex: string): string {
  let t = tex.trim();
  t = t.replace(
    /(^|[^\\])\b(Delta|alpha|beta|gamma|theta|vartheta|rho|pi|mu|sigma|omega|phi|psi)\b/g,
    "$1\\$2"
  );
  t = t.replace(/(\d)\s*°/g, "$1^{\\circ}");
  return t;
}

function katexHtml(tex: string, displayMode: boolean): string {
  try {
    const html = katex.renderToString(cleanTex(tex), {
      ...katexOpts,
      displayMode,
    });
    if (displayMode) {
      return `<div class="katex-block">${html}</div>`;
    }
    return `<span class="katex-inline">${html}</span>`;
  } catch {
    const safe = tex
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return displayMode
      ? `<div class="math-fallback">${safe}</div>`
      : `<span class="math-fallback">${safe}</span>`;
  }
}

/** Placeholder che non interferisce con GFM / liste / tabelle */
function protect(html: string, store: string[]): string {
  const id = store.length;
  store.push(html);
  return `§§MATH${id}§§`;
}

function restore(html: string, store: string[]): string {
  return html.replace(/§§MATH(\d+)§§/g, (_, n) => store[Number(n)] ?? "");
}

function prepareMarkdown(src: string): string {
  const store: string[] = [];
  let t = src.replace(/\r\n/g, "\n");

  // 1) Estrai TUTTA la math PRIMA del markdown → placeholder
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, body) =>
    protect(katexHtml(body, true), store)
  );
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, (_, body) =>
    protect(katexHtml(body, true), store)
  );
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, body) =>
    protect(katexHtml(body, false), store)
  );
  t = t.replace(/\$([^$\n]+?)\$/g, (_, body) =>
    protect(katexHtml(body, false), store)
  );

  // 2) Normalizza markdown
  // IMPORTANTE: non usare regex **...** che partono da un ** di chiusura
  // e arrivano al ** di apertura successivo (rompe grassetto e mangia spazi).
  t = t.replace(/^(#{1,4})([^\s#])/gm, "$1 $2");
  t = t.replace(/([^\n])\n(#{1,4}\s)/g, "$1\n\n$2");
  t = t.replace(/^\s*---\s*$/gm, "\n\n---\n\n");
  t = t.replace(/^(\s*)[-*•]([^\s*-])/gm, "$1- $2");
  // padding solo se ** di APERTURA (preceduto da inizio/spazio/punteggiatura)
  t = t.replace(/(^|[\s([{«"'])\*\*[ \t]+([^*\n]+?)\*\*/gm, "$1**$2**");
  t = t.replace(/(^|[\s([{«"'])\*\*([^*\n]+?)[ \t]+\*\*/gm, "$1**$2**");

  // 3) Markdown → HTML (i placeholder restano testo innocuo)
  marked.setOptions({ gfm: true, breaks: false });
  let html = marked.parse(t, { async: false }) as string;

  // 4) Ripristina KaTeX HTML
  html = restore(html, store);

  // 5) Sanitize permettendo SVG/KaTeX
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
    ADD_TAGS: [
      "math",
      "semantics",
      "mrow",
      "mi",
      "mo",
      "mn",
      "msup",
      "msub",
      "mfrac",
      "annotation",
      "path",
      "svg",
      "line",
      "g",
      "use",
      "defs",
      "symbol",
    ],
    ADD_ATTR: [
      "class",
      "style",
      "d",
      "viewBox",
      "xmlns",
      "width",
      "height",
      "preserveAspectRatio",
      "aria-hidden",
      "focusable",
      "role",
      "encoding",
      "x",
      "y",
      "x1",
      "y1",
      "x2",
      "y2",
      "transform",
      "fill",
      "stroke",
      "stroke-width",
    ],
  });
}

export function StudyMarkdown({ text }: { text: string }) {
  const html = useMemo(() => prepareMarkdown(text || ""), [text]);

  return (
    <div
      className="study-md text-[15px] leading-7 text-zinc-700 dark:text-zinc-300"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
