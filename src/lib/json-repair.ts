/**
 * Ollama e modelli piccoli spesso mettono newline/tab grezzi dentro le stringhe JSON.
 * JSON.parse allora esplode con: "Bad control character in string literal".
 */

export function extractAndParseJson(raw: string): unknown {
  const candidates = collectCandidates(raw);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    for (const variant of [
      candidate,
      sanitizeControlCharsInStrings(candidate),
      sanitizeControlCharsInStrings(stripTrailingCommas(candidate)),
    ]) {
      try {
        return JSON.parse(variant);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
  }

  throw lastError || new Error("JSON non valido nella risposta del modello");
}

function collectCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const out: string[] = [];

  // Rimuovi prefissi chat tipici prima del JSON
  const stripped = trimmed
    .replace(/^(certo[!.,]?\s*|ecco[^.]*[.!]?\s*|leggo[^.]*[.!]?\s*)+/i, "")
    .trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) out.push(fenced[1].trim());
  const fenced2 = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced2?.[1]) out.push(fenced2[1].trim());

  // Estrai oggetto bilanciato (non solo first { ... last })
  const balanced = extractBalancedObject(trimmed);
  if (balanced) out.push(balanced);
  const balanced2 = extractBalancedObject(stripped);
  if (balanced2) out.push(balanced2);

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) out.push(trimmed.slice(start, end + 1));

  out.push(stripped);
  out.push(trimmed);
  return [...new Set(out.filter(Boolean))];
}

/** Trova il primo {...} con graffe bilanciate (ignorando graffe dentro stringhe). */
function extractBalancedObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Dentro le stringhe "..." scappa i control character; fuori non tocca. */
export function sanitizeControlCharsInStrings(json: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    const code = c.charCodeAt(0);

    if (escaped) {
      result += c;
      escaped = false;
      continue;
    }

    if (inString && c === "\\") {
      result += c;
      escaped = true;
      continue;
    }

    if (c === '"') {
      inString = !inString;
      result += c;
      continue;
    }

    if (inString) {
      if (c === "\n") {
        result += "\\n";
        continue;
      }
      if (c === "\r") {
        result += "\\r";
        continue;
      }
      if (c === "\t") {
        result += "\\t";
        continue;
      }
      if (code < 0x20) {
        result += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
    }

    result += c;
  }

  return result;
}

function stripTrailingCommas(json: string): string {
  return json.replace(/,(\s*[}\]])/g, "$1");
}
