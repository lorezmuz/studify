import { execFile } from "child_process";
import { promisify } from "util";
import { extractAndParseJson } from "./json-repair";

const execFileAsync = promisify(execFile);

export const PROVIDERS = {
  claude: {
    id: "claude" as const,
    label: "Claude Code",
    comando: process.env.CLAUDE_CLI || "claude",
    // Claude Code: prompt non interattivo
    buildArgs: (prompt: string) => ["-p", prompt],
  },
  grok: {
    id: "grok" as const,
    label: "Grok Build",
    // sulla macchina utente è `grok.exe` (README: grok-build)
    comando: process.env.GROK_CLI || "grok",
    buildArgs: (prompt: string) => ["-p", prompt],
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export function isProviderId(v: string): v is ProviderId {
  return v === "claude" || v === "grok";
}

export type StudyMaterial = {
  riassunto: string;
  flashcard: { fronte: string; retro: string }[];
  quiz: {
    domanda: string;
    opzioni: string[];
    risposta_corretta: number;
  }[];
};

export function buildStudyPrompt(input: {
  materia: string;
  argomenti: string;
  votoObiettivo: number;
  extraContext?: string;
  /** Path assoluti di foto appunti sul filesystem locale — l'AI deve APRIRLE e leggerle */
  imagePaths?: string[];
}) {
  const parts: string[] = [];

  if (input.imagePaths?.length) {
    parts.push(
      `\n\nFOTO DEGLI APPUNTI (file locali sulla macchina — APRI e LEGGI ogni immagine, non inventare):\n` +
        input.imagePaths.map((p, i) => `${i + 1}. ${p}`).join("\n") +
        `\nUsa il contenuto di queste immagini come fonte principale (testo scritto, schemi, formule, evidenziazioni).`
    );
  }

  if (input.extraContext?.trim()) {
    parts.push(
      `\n\nTESTO / NOTE AGGIUNTIVE:\n${input.extraContext.trim().slice(0, 8000)}`
    );
  }

  const extra = parts.join("");

  return `Sei un generatore di JSON per un'app di studio. NON sei in chat con l'utente.

COMPITO: materiale di studio per materia "${input.materia}", argomenti: "${input.argomenti}".${extra}

REGOLE OUTPUT (obbligatorie):
- La tua risposta deve essere SOLO un oggetto JSON valido
- Il primo carattere della risposta deve essere {
- Il ultimo carattere deve essere }
- VIETATO: frasi tipo "Leggo le foto", "Certo", "Ecco il materiale", markdown fences, spiegazioni fuori dal JSON
- Dentro le stringhe JSON usa \\n per a capo, mai a capo grezzi

REQUISITI RIASSUNTO (campo "riassunto", markdown in una stringa):
- Il lettore NON ha seguito le lezioni: spiega nessi, premesse e termini
- Esempi concreti, sufficiente per voto obiettivo ${input.votoObiettivo}/10
- Italiano

REQUISITI flashcard: array di 15 oggetti {fronte, retro}
REQUISITI quiz: array di 10 oggetti {domanda, opzioni[4], risposta_corretta} con risposta_corretta indice 0-3

Schema esatto:
{"riassunto":"...","flashcard":[{"fronte":"...","retro":"..."}],"quiz":[{"domanda":"...","opzioni":["a","b","c","d"],"risposta_corretta":0}]}`;
}

export function buildExtraQuizPrompt(input: {
  materia: string;
  argomenti: string;
  riassunto: string;
  domandeGiaFatte: string[];
}) {
  return `Genera un NUOVO quiz di 10 domande a risposta multipla (4 opzioni) su:
Materia: ${input.materia}
Argomenti: ${input.argomenti}

Riassunto di riferimento (non ripetere le domande già fatte):
${input.riassunto.slice(0, 6000)}

Domande già usate (EVITA domande simili):
${input.domandeGiaFatte.slice(0, 40).map((d, i) => `${i + 1}. ${d}`).join("\n") || "(nessuna)"}

Rispondi SOLO con JSON:
{ "quiz": [{"domanda":"...","opzioni":["a","b","c","d"],"risposta_corretta":0}] }
Usa \\n nelle stringhe, niente a capo grezzi.`;
}

export function buildFeedbackPrompt(input: {
  argomenti: string;
  sbagli: { domanda: string; data: string; corretta: string }[];
}) {
  const elenco = input.sbagli
    .map(
      (s, i) =>
        `${i + 1}. Domanda: ${s.domanda}\n   Risposta data: ${s.data}\n   Corretta: ${s.corretta}`
    )
    .join("\n");

  return `Lo studente ha sbagliato queste domande su ${input.argomenti}:
${elenco}

Genera un breve report (max 150 parole) che spieghi:
- quali concetti specifici rivedere e perché ha sbagliato
- cosa ripassare prima del prossimo tentativo
Sii diretto e concreto, non generico. Solo testo, in italiano.`;
}

/**
 * Invoca Claude Code o Grok CLI in locale (abbonamento già autenticato).
 * Timeout lungo: la generazione può richiedere minuti.
 */
export async function generaConAI(
  provider: ProviderId,
  prompt: string,
  opts?: { timeoutMs?: number }
): Promise<string> {
  const p = PROVIDERS[provider];
  const timeout = opts?.timeoutMs ?? 10 * 60 * 1000;
  const args = p.buildArgs(prompt);

  try {
    const { stdout, stderr } = await execFileAsync(p.comando, args, {
      timeout,
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env },
    });
    const text = (stdout || stderr || "").trim();
    if (!text) {
      throw new Error(`${p.label}: output vuoto. Sei loggato nel CLI?`);
    }
    return text;
  } catch (err) {
    const e = err as {
      message?: string;
      stdout?: string;
      stderr?: string;
      killed?: boolean;
      code?: string;
    };
    if (e.stdout && String(e.stdout).trim()) {
      return String(e.stdout).trim();
    }
    if (e.killed) {
      throw new Error(`${p.label}: timeout dopo ${Math.round(timeout / 1000)}s`);
    }
    const detail = e.stderr || e.message || String(err);
    throw new Error(
      `${p.label} non ha risposto: ${detail}. Verifica che \`${p.comando}\` sia nel PATH e che tu sia autenticato.`
    );
  }
}

function normalizeMaterial(parsed: StudyMaterial): StudyMaterial {
  if (!parsed?.riassunto || !Array.isArray(parsed.flashcard) || !Array.isArray(parsed.quiz)) {
    throw new Error("JSON incompleto: servono riassunto, flashcard e quiz");
  }

  const quiz = parsed.quiz.slice(0, 12).map((q) => {
    const opzioni = Array.isArray(q.opzioni) ? q.opzioni.slice(0, 4) : [];
    while (opzioni.length < 4) opzioni.push(`Opzione ${opzioni.length + 1}`);
    return {
      domanda: String(q.domanda || ""),
      opzioni,
      risposta_corretta: Math.min(
        3,
        Math.max(0, Number(q.risposta_corretta) || 0)
      ),
    };
  });

  const flashcard = parsed.flashcard
    .slice(0, 20)
    .map((f) => ({
      fronte: String(f.fronte || ""),
      retro: String(f.retro || ""),
    }))
    .filter((f) => f.fronte && f.retro);

  if (flashcard.length < 5) {
    throw new Error("Troppo poche flashcard valide nella risposta AI");
  }
  if (quiz.length < 5) {
    throw new Error("Troppo poche domande quiz valide nella risposta AI");
  }

  return {
    riassunto: String(parsed.riassunto),
    flashcard,
    quiz,
  };
}

function tryParseMaterial(raw: string): StudyMaterial | null {
  try {
    return normalizeMaterial(extractAndParseJson(raw) as StudyMaterial);
  } catch {
    return null;
  }
}

export async function generaMaterialeStudio(
  provider: ProviderId,
  input: {
    materia: string;
    argomenti: string;
    votoObiettivo: number;
    extraContext?: string;
    imagePaths?: string[];
  }
): Promise<StudyMaterial> {
  const prompt = buildStudyPrompt(input);
  const raw = await generaConAI(provider, prompt);

  let material = tryParseMaterial(raw);
  if (material) return material;

  // Grok/Claude a volte scrivono "Leggo le foto..." invece del JSON: secondo passaggio
  console.warn(
    `[${provider}] prima risposta non JSON (inizio: ${JSON.stringify(raw.slice(0, 80))}), retry conversione`
  );

  const retryPrompt = `La risposta precedente NON era JSON valido. Devi produrre SOLO JSON.

Materia: ${input.materia}
Argomenti: ${input.argomenti}
Voto obiettivo: ${input.votoObiettivo}/10
${input.imagePaths?.length ? `Foto locali da usare come fonte (APRIle):\n${input.imagePaths.join("\n")}` : ""}
${input.extraContext ? `Note:\n${input.extraContext.slice(0, 4000)}` : ""}

Contenuto/appunti grezzi dalla risposta precedente (estraine il materiale di studio se c'è, altrimenti crea dal tema):
---
${raw.slice(0, 12000)}
---

Rispondi con UN SOLO oggetto JSON. Primo carattere { ultimo }. Niente altre parole.
Schema:
{"riassunto":"markdown...","flashcard":[{"fronte":"...","retro":"..."}],"quiz":[{"domanda":"...","opzioni":["a","b","c","d"],"risposta_corretta":0}]}
15 flashcard, 10 quiz. Italiano.`;

  const raw2 = await generaConAI(provider, retryPrompt, {
    timeoutMs: 8 * 60 * 1000,
  });
  material = tryParseMaterial(raw2);
  if (material) return material;

  const preview = raw2.slice(0, 120).replace(/\s+/g, " ");
  throw new Error(
    `L'AI ha risposto in testo libero invece che JSON (es. "${preview}..."). Riprova, o usa Claude Code che rispetta meglio il formato.`
  );
}
