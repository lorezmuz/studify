import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSettings, OutboxItem, PianoBundle } from "./types";

const KEYS = {
  settings: "@studify/settings",
  cache: "@studify/cache",
  outbox: "@studify/outbox",
};

const defaultSettings: AppSettings = {
  baseUrl: "",
  lastSyncAt: null,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.settings);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export async function saveSettings(partial: Partial<AppSettings>) {
  const cur = await getSettings();
  const next = { ...cur, ...partial };
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(next));
  return next;
}

export async function getCache(): Promise<PianoBundle[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.cache);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function setCache(piani: PianoBundle[]) {
  await AsyncStorage.setItem(KEYS.cache, JSON.stringify(piani));
}

export async function getPianoFromCache(
  id: string
): Promise<PianoBundle | null> {
  const all = await getCache();
  return all.find((p) => p.piano.id === id) ?? null;
}

export async function upsertPianoInCache(bundle: PianoBundle) {
  const all = await getCache();
  const i = all.findIndex((p) => p.piano.id === bundle.piano.id);
  if (i >= 0) all[i] = bundle;
  else all.unshift(bundle);
  await setCache(all);
}

export async function getOutbox(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.outbox);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

type OutboxInput =
  | { type: "complete_node"; pianoId: string; nodeId: string }
  | { type: "flashcard"; flashcardId: string; valutazione: number }
  | {
      type: "quiz_result";
      quizId: string;
      risposte: number[];
      punteggio: number;
    }
  | {
      type: "progress";
      pianoId: string;
      progress: import("./types").RoadmapProgress;
    };

export async function enqueueOutbox(item: OutboxInput) {
  const outbox = await getOutbox();
  const full = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  } as OutboxItem;
  outbox.push(full);
  await AsyncStorage.setItem(KEYS.outbox, JSON.stringify(outbox));
  return full;
}

export async function setOutbox(items: OutboxItem[]) {
  await AsyncStorage.setItem(KEYS.outbox, JSON.stringify(items));
}

export async function clearOutbox() {
  await AsyncStorage.setItem(KEYS.outbox, JSON.stringify([]));
}
