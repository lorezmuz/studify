import Database from "better-sqlite3";
import katex from "katex";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

const katexOpts = {
  throwOnError: false,
  strict: "ignore",
  trust: true,
  output: "html",
};
function cleanTex(tex) {
  let t = tex.trim();
  t = t.replace(
    /(^|[^\\])\b(Delta|alpha|beta|gamma|theta|vartheta|rho|pi|mu|sigma|omega|phi|psi)\b/g,
    "$1\\$2"
  );
  t = t.replace(/(\d)\s*°/g, "$1^{\\circ}");
  return t;
}
function katexHtml(tex, displayMode) {
  const html = katex.renderToString(cleanTex(tex), {
    ...katexOpts,
    displayMode,
  });
  return displayMode
    ? `<div class="katex-block">${html}</div>`
    : `<span class="katex-inline">${html}</span>`;
}
function protect(html, store) {
  const id = store.length;
  store.push(html);
  return `§§MATH${id}§§`;
}
function restore(html, store) {
  return html.replace(/§§MATH(\d+)§§/g, (_, n) => store[Number(n)] ?? "");
}
function prepareMarkdown(src) {
  const store = [];
  let t = src.replace(/\r\n/g, "\n");
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

  t = t.replace(/^(#{1,4})([^\s#])/gm, "$1 $2");
  t = t.replace(/([^\n])\n(#{1,4}\s)/g, "$1\n\n$2");
  t = t.replace(/^\s*---\s*$/gm, "\n\n---\n\n");
  t = t.replace(/^(\s*)[-*•]([^\s*-])/gm, "$1- $2");
  t = t.replace(/\*\*([ \t]+)([^*\n]+?)\*\*/g, "**$2**");
  t = t.replace(/\*\*([^*\n]+?)([ \t]+)\*\*/g, "**$1**");

  const i = t.indexOf("quiete");
  console.log("BEFORE MARKED", JSON.stringify(t.slice(i - 40, i + 30)));

  marked.setOptions({ gfm: true, breaks: false });
  let html = marked.parse(t, { async: false });
  const j = html.indexOf("quiete");
  console.log("AFTER MARKED", html.slice(j - 100, j + 80));
  html = restore(html, store);
  html = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
    ADD_TAGS: [
      "path",
      "svg",
      "line",
      "g",
      "use",
      "defs",
      "symbol",
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
  console.log("strong", (html.match(/<strong>/g) || []).length);
  console.log("stars", (html.match(/\*\*/g) || []).length);
  const k = html.indexOf("quiete");
  console.log("FINAL", html.slice(k - 90, k + 70));
}

const db = new Database("data/volentieri.sqlite");
const t = db
  .prepare("SELECT riassunto FROM piani WHERE id=?")
  .get("T1N2P3UlJQ").riassunto;
prepareMarkdown(t);
