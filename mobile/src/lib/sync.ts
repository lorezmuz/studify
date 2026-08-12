import { fetchSyncBundle, healthCheck, pushMutations } from "./api";
import {
  clearOutbox,
  getOutbox,
  getSettings,
  saveSettings,
  setCache,
  setOutbox,
} from "./storage";
import type { OutboxItem, PianoBundle } from "./types";

export type SyncResult = {
  online: boolean;
  error?: string;
  count?: number;
  pushed?: number;
  lastSyncAt?: string | null;
  piani?: PianoBundle[];
};

function toPushPayload(item: OutboxItem) {
  const clientId = item.id;
  switch (item.type) {
    case "complete_node":
      return {
        type: "complete_node",
        pianoId: item.pianoId,
        nodeId: item.nodeId,
        clientId,
      };
    case "flashcard":
      return {
        type: "flashcard",
        flashcardId: item.flashcardId,
        valutazione: item.valutazione,
        clientId,
      };
    case "quiz_result":
      return {
        type: "quiz_result",
        quizId: item.quizId,
        risposte: item.risposte,
        punteggio: item.punteggio,
        clientId,
      };
    case "progress":
      return {
        type: "progress",
        pianoId: item.pianoId,
        progress: item.progress,
        clientId,
      };
  }
}

export async function runSync(): Promise<SyncResult> {
  const settings = await getSettings();
  if (!settings.baseUrl) {
    return { online: false, error: "Nessun server configurato", lastSyncAt: settings.lastSyncAt };
  }

  const health = await healthCheck(settings.baseUrl);
  if (!health.ok) {
    return {
      online: false,
      error: health.error || "PC non raggiungibile",
      lastSyncAt: settings.lastSyncAt,
    };
  }

  // 1) push outbox
  const outbox = await getOutbox();
  let pushed = 0;
  if (outbox.length) {
    const push = await pushMutations(
      settings.baseUrl,
      outbox.map(toPushPayload)
    );
    if (push.ok) {
      pushed = push.applied ?? outbox.length;
      // rimuovi applicate (semplice: svuota se ok)
      await clearOutbox();
    } else {
      // non bloccare pull
    }
  }

  // 2) pull bundle
  const bundle = await fetchSyncBundle(settings.baseUrl);
  if (!bundle.ok || !bundle.piani) {
    return {
      online: true,
      error: bundle.error || "Sync download fallito",
      pushed,
      lastSyncAt: settings.lastSyncAt,
    };
  }

  await setCache(bundle.piani);
  const lastSyncAt = bundle.syncedAt || new Date().toISOString();
  await saveSettings({ lastSyncAt });

  return {
    online: true,
    count: bundle.piani.length,
    pushed,
    lastSyncAt,
    piani: bundle.piani,
  };
}

export async function flushOutboxOnly(): Promise<number> {
  const settings = await getSettings();
  if (!settings.baseUrl) return 0;
  const health = await healthCheck(settings.baseUrl);
  if (!health.ok) return 0;
  const outbox = await getOutbox();
  if (!outbox.length) return 0;
  const push = await pushMutations(
    settings.baseUrl,
    outbox.map(toPushPayload)
  );
  if (push.ok) {
    await clearOutbox();
    return push.applied ?? outbox.length;
  }
  return 0;
}

/** Rimuovi solo le mutazioni con id in lista (se push parziale) */
export async function dropOutboxIds(ids: string[]) {
  const set = new Set(ids);
  const outbox = await getOutbox();
  await setOutbox(outbox.filter((o) => !set.has(o.id)));
}
