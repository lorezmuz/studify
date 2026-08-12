import OpenAI from "openai";
import { z } from "zod";
import { extractAndParseJson } from "./json-repair";
import { buildOfflinePack, isLowQualityPack } from "./offline-content";
import type { GenerateRequest, LearningPack } from "./types";
import { uid } from "./utils";

export type AiProviderId =
  | "ollama"
  | "openai"
  | "xai"
  | "groq"
  | "openrouter"
  | "deepseek"
  | "custom"
  | "demo";

export type UserAiConfigInput = {
  provider?: AiProviderId | string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export type AiSource = AiProviderId;

const packSchema = z.object({
  title: z.string(),
  subject: z.string(),
  level: z.enum(["media", "superiore"]),
  hook: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()).min(3).max(8),
  analogy: z.string(),
  lessonSections: z
    .array(z.object({ title: z.string(), body: z.string() }))
    .min(3)
    .max(8),
  quiz: z
    .array(
      z.object({
        prompt: z.string(),
        options: z.array(z.string()).min(2).max(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string(),
      })
    )
    .min(3)
    .max(10),
  flashcards: z
    .array(z.object({ front: z.string(), back: z.string() }))
    .min(2)
    .max(10),
  playground: z
    .array(
      z.object({
        title: z.string(),
        prompt: z.string(),
        hint: z.string(),
        sampleAnswer: z.string(),
      })
    )
    .min(1)
    .max(5),
  videos: z
    .array(
      z.object({
        title: z.string(),
        query: z.string(),
        why: z.string(),
      })
    )
    .min(1)
    .max(5),
  games: z
    .array(
      z.object({
        type: z.enum(["match", "order", "truefalse"]),
        prompt: z.string(),
        items: z.array(z.string()).min(2).max(6),
        answer: z.union([z.array(z.string()), z.boolean()]),
        explanation: z.string(),
      })
    )
    .min(1)
    .max(6),
});

type Provider = {
  id: AiSource;
  client: OpenAI;
  model: string;
  supportsJsonMode: boolean;
};

const PRESET_URLS: Record<string, { baseUrl: string; model: string; needsKey: boolean }> = {
  ollama: {
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "llama3:latest",
    needsKey: false,
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    needsKey: true,
  },
  xai: {
    baseUrl: "https://api.x.ai/v1",
    model: "grok-4-1-fast-reasoning",
    needsKey: true,
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    needsKey: true,
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openrouter/auto",
    needsKey: true,
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    needsKey: true,
  },
  custom: {
    baseUrl: "http://127.0.0.1:1234/v1",
    model: "local-model",
    needsKey: false,
  },
};

function envOllamaBase() {
  const raw =
    process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:11434";
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

async function isReachable(url: string): Promise<boolean> {
  try {
    // tags endpoint for ollama root; for /v1 try models
    const base = url.replace(/\/v1\/?$/, "");
    const res = await fetch(`${base}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function buildClient(
  baseURL: string,
  apiKey: string,
  provider: string
): OpenAI {
  const defaultHeaders: Record<string, string> = {};
  if (provider === "openrouter") {
    defaultHeaders["HTTP-Referer"] =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3005";
    defaultHeaders["X-Title"] = "Volentieri";
  }

  return new OpenAI({
    apiKey: apiKey || "not-needed",
    baseURL,
    defaultHeaders,
  });
}

/**
 * Priorità:
 * 1. Config utente (API key / Ollama / custom) passata dalla richiesta
 * 2. Ollama di sistema (env / locale)
 * 3. XAI_API_KEY server (opzionale)
 * 4. null → demo
 */
export async function resolveProvider(
  userConfig?: UserAiConfigInput | null
): Promise<Provider | null> {
  if (userConfig?.provider) {
    const id = String(userConfig.provider);
    if (id === "demo") return null;

    const preset = PRESET_URLS[id] ?? PRESET_URLS.custom;
    const baseUrl = (
      userConfig.baseUrl?.trim() ||
      (id === "ollama" ? envOllamaBase() : preset.baseUrl)
    ).replace(/\/$/, "");
    const model =
      userConfig.model?.trim() ||
      (id === "ollama" ? process.env.OLLAMA_MODEL || preset.model : preset.model);
    const apiKey = userConfig.apiKey?.trim() || "";

    const supportsJsonMode =
      id === "openai" || id === "xai" || id === "groq" || id === "deepseek";

    if (preset.needsKey && !apiKey) {
      // key mancante: prova fallback di sistema (Ollama env / xAI server)
      console.warn(`[ai] ${id}: API key mancante, provo fallback di sistema`);
    } else {
      return {
        id: id as AiSource,
        client: buildClient(baseUrl, apiKey || "ollama", id),
        model,
        supportsJsonMode,
      };
    }
  }

  // System Ollama
  const ollamaBase = envOllamaBase();
  if (await isReachable(ollamaBase)) {
    return {
      id: "ollama",
      client: buildClient(ollamaBase, "ollama", "ollama"),
      model: process.env.OLLAMA_MODEL || "llama3:latest",
      supportsJsonMode: false,
    };
  }

  // Optional paid server key
  if (process.env.XAI_API_KEY) {
    return {
      id: "xai",
      client: buildClient("https://api.x.ai/v1", process.env.XAI_API_KEY, "xai"),
      model: process.env.XAI_MODEL || "grok-4-1-fast-reasoning",
      supportsJsonMode: true,
    };
  }

  return null;
}

function normalizeQuizOptions(
  options: string[],
  correctIndex: number
): { options: string[]; correctIndex: number } {
  const opts = [...options];
  while (opts.length < 4) opts.push(`Opzione ${opts.length + 1}`);
  return {
    options: opts.slice(0, 4),
    correctIndex: Math.min(Math.max(correctIndex, 0), 3),
  };
}

function toLearningPack(
  parsed: z.infer<typeof packSchema>,
  input: GenerateRequest
): LearningPack {
  return {
    id: uid("pack"),
    title: parsed.title,
    subject: (parsed.subject as LearningPack["subject"]) || "altro",
    level: parsed.level,
    hook: parsed.hook,
    summary: parsed.summary,
    keyPoints: parsed.keyPoints,
    analogy: parsed.analogy,
    lessonSections: parsed.lessonSections,
    quiz: parsed.quiz.map((q) => {
      const norm = normalizeQuizOptions(q.options, q.correctIndex);
      return {
        id: uid("q"),
        prompt: q.prompt,
        options: norm.options,
        correctIndex: norm.correctIndex,
        explanation: q.explanation,
      };
    }),
    flashcards: parsed.flashcards.map((f) => ({ ...f, id: uid("f") })),
    playground: parsed.playground.map((p) => ({ ...p, id: uid("p") })),
    videos: parsed.videos,
    games: parsed.games.map((g) => ({ ...g, id: uid("g") })),
    sourcePreview: (input.bookText || input.topic).slice(0, 280),
    createdAt: new Date().toISOString(),
  };
}

const SYSTEM_PACK = `Sei un professore/tutor scolastico italiano ESPERTO della materia (media e superiori).
Il tuo compito: produrre lezioni con CONTENUTO REALE della materia, non consigli generici su "come studiare".

REGOLE FERREE:
- Scrivi SEMPRE in italiano.
- VIETATO il filler: niente frasi tipo "spiegalo a un amico in mensa", "non memorizzare la pagina", "i 3 errori tipici" SENZA contenuti della materia.
- Ogni lessonSection deve insegnare FATTI, REGOLE, ESEMPI, FORMULE, DATE, DEFINIZIONI utili all'interrogazione.
- I quiz devono verificare la materia (es. desinenze latine, formule, cause storiche), NON il metodo di studio.
- Se l'argomento è ENORME (es. "tutto il latino di 2 anni", "tutto il programma"):
  1) title e summary spiegano che spezzi il programma
  2) dai una MAPPA breve dei blocchi
  3) fai una lezione COMPLETA solo sul PRIMO blocco concreto (es. latino → 1ª declinazione con tabella completa e esempi)
- Se c'è bookText, basati su quello: non inventare il contrario del testo.
- Non inventare fatti storici/scientifici. Se non sei sicuro, resta su nozioni standard da manuale scolastico.

Output: SOLO JSON valido (niente markdown, niente testo prima/dopo) con chiavi:
title, subject, level ("media"|"superiore"), hook, summary, keyPoints (array),
analogy, lessonSections (array {title, body}),
quiz (array {prompt, options[4], correctIndex 0-3, explanation}) almeno 4 domande SULLA MATERIA,
flashcards (array {front, back}), playground (array {title, prompt, hint, sampleAnswer}),
videos (array {title, query, why}), games (array {type: "truefalse"|"order"|"match", prompt, items, answer, explanation}).
IMPORTANTE JSON: dentro le stringhe usa \\n per andare a capo, MAI a capo reali. Niente tab grezzi. Niente virgole finali.`;

export async function generateLearningPack(
  input: GenerateRequest,
  userConfig?: UserAiConfigInput | null
): Promise<{ pack: LearningPack; source: AiSource; warning?: string }> {
  const provider = await resolveProvider(userConfig);
  if (!provider) {
    return {
      pack: buildOfflinePack(input),
      source: "demo",
      warning:
        "AI non disponibile: percorso offline. Per latino hai già una lezione vera sulla 1ª declinazione; per altre materie collega Ollama/API o incolla il libro.",
    };
  }

  const user = {
    topic: input.topic,
    subject: input.subject ?? "altro",
    level: input.level ?? "media",
    bookText: input.bookText?.slice(0, 5000) ?? null,
    istruzioni: [
      "Produci contenuto di MATERIA, non meta-consigli sullo studio.",
      "Se topic troppo ampio, mappa + prima unità concreta completa.",
      "Quiz sulla materia con risposte corrette verificabili.",
    ],
  };

  try {
    const response = await provider.client.chat.completions.create({
      model: provider.model,
      temperature: 0.35,
      messages: [
        { role: "system", content: SYSTEM_PACK },
        {
          role: "user",
          content: `Crea il pacchetto di apprendimento da questo input:\n${JSON.stringify(user, null, 2)}`,
        },
      ],
      ...(provider.supportsJsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Risposta AI vuota");

    const parsed = packSchema.parse(extractAndParseJson(raw));
    const pack = toLearningPack(parsed, input);

    if (isLowQualityPack(pack, input.topic)) {
      console.warn(
        `[${provider.id}] low-quality pack detected, using offline content`
      );
      return {
        pack: buildOfflinePack(input),
        source: "demo",
        warning: `Il modello ${provider.model} ha prodotto contenuto troppo generico. Ti ho dato un percorso offline concreto (se è latino: 1ª declinazione). Prova un argomento più stretto o un modello migliore, oppure incolla la pagina del libro.`,
      };
    }

    return {
      pack,
      source: provider.id,
    };
  } catch (error) {
    console.error(`[${provider.id}] generate failed:`, error);
    const msg =
      error instanceof Error ? error.message : "Errore del provider AI";

    // Cloud key: show the error, still offer offline pack option via client
    if (
      userConfig?.apiKey ||
      (userConfig?.provider &&
        userConfig.provider !== "ollama" &&
        userConfig.provider !== "demo")
    ) {
      throw new Error(
        `AI (${provider.id} / ${provider.model}): ${msg}. Controlla key, modello e URL. Oppure usa Ollama o un argomento più stretto.`
      );
    }

    return {
      pack: buildOfflinePack(input),
      source: "demo",
      warning: `Ollama/modello non ha risposto bene (${msg}). Percorso offline generato. Per latino include lezione reale sulla 1ª declinazione.`,
    };
  }
}

export async function streamTutorReply(params: {
  topic: string;
  context: string;
  messages: { role: "user" | "assistant"; content: string }[];
  userConfig?: UserAiConfigInput | null;
}): Promise<{ reply: string; source: AiSource }> {
  const provider = await resolveProvider(params.userConfig);
  if (!provider) {
    const last = params.messages[params.messages.length - 1]?.content ?? "";
    return {
      source: "demo",
      reply: `Nessuna AI configurata. Su "${params.topic}":

1) Riformula la domanda in una frase semplice.
2) Collega a un esempio concreto.
3) Spiega ad alta voce in 3 righe.

Domanda: "${last}"

Vai su Impostazioni AI: Ollama locale (0€) oppure la tua API key (OpenAI, Groq, OpenRouter...).`,
    };
  }

  try {
    const completion = await provider.client.chat.completions.create({
      model: provider.model,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `Sei il tutor di Volentieri. Aiuti studenti di media/superiori su: ${params.topic}.
Contesto lezione: ${params.context.slice(0, 2500)}
Regole: italiano, chiaro, incoraggiante, fai domande guida, spiega con analogie. Max 180 parole se non serve di più.`,
        },
        ...params.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    return {
      source: provider.id,
      reply:
        completion.choices[0]?.message?.content ||
        "Non sono riuscito a generare una risposta. Riprova tra poco.",
    };
  } catch (error) {
    console.error(`[${provider.id}] tutor failed:`, error);
    const msg = error instanceof Error ? error.message : "errore sconosciuto";
    return {
      source: "demo",
      reply: `Il provider ${provider.id} non ha risposto: ${msg}. Controlla Impostazioni AI (key, modello, URL).`,
    };
  }
}

export async function getAiStatus(userConfig?: UserAiConfigInput | null) {
  try {
    const provider = await resolveProvider(userConfig);
    if (provider) {
      return {
        provider: provider.id,
        model: provider.model,
        message: `AI attiva: ${provider.id} · ${provider.model}`,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    provider: "demo" as const,
    model: null as string | null,
    message:
      "Nessuna AI: configura Ollama o la tua API key in Impostazioni",
  };
}

/** Test connessione senza generare un pack intero */
export async function testAiConnection(
  userConfig?: UserAiConfigInput | null
): Promise<{ ok: boolean; message: string; provider?: string; model?: string }> {
  try {
    const provider = await resolveProvider(userConfig);
    if (!provider) {
      return {
        ok: false,
        message: "Nessun provider disponibile. Configura Ollama o una API key.",
      };
    }
    const res = await provider.client.chat.completions.create({
      model: provider.model,
      temperature: 0,
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: 'Rispondi solo con la parola "ok" in minuscolo.',
        },
      ],
    });
    const text = res.choices[0]?.message?.content?.trim() || "";
    return {
      ok: true,
      message: `Connessione ok (${provider.id} / ${provider.model}): "${text.slice(0, 40)}"`,
      provider: provider.id,
      model: provider.model,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Test fallito. Controlla key, URL e modello.",
    };
  }
}
