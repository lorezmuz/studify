import type { PianoBundle } from "./types";

function normalizeBase(url: string) {
  return url.trim().replace(/\/+$/, "");
}

export async function healthCheck(baseUrl: string): Promise<{
  ok: boolean;
  pianiPronti?: number;
  error?: string;
}> {
  const base = normalizeBase(baseUrl);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${base}/api/mobile/health`, {
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      ok: !!data.ok,
      pianiPronti: data.pianiPronti,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Rete non raggiungibile",
    };
  }
}

export async function fetchSyncBundle(baseUrl: string): Promise<{
  ok: boolean;
  piani?: PianoBundle[];
  syncedAt?: string;
  error?: string;
}> {
  const base = normalizeBase(baseUrl);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60_000);
    const res = await fetch(`${base}/api/mobile/sync`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      ok: true,
      piani: data.piani || [],
      syncedAt: data.syncedAt,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sync fallito",
    };
  }
}

export async function pushMutations(
  baseUrl: string,
  mutations: Record<string, unknown>[]
): Promise<{ ok: boolean; applied?: number; error?: string }> {
  const base = normalizeBase(baseUrl);
  if (!mutations.length) return { ok: true, applied: 0 };
  try {
    const res = await fetch(`${base}/api/mobile/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations }),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, applied: data.applied };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Push fallito",
    };
  }
}

export function parsePairUrl(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  // studify://pair?baseUrl=http%3A%2F%2F...
  if (s.startsWith("studify://") || s.includes("studify://")) {
    try {
      const raw = s.includes("studify://")
        ? s.slice(s.indexOf("studify://"))
        : s;
      const u = new URL(raw.replace("studify://", "https://studify.local/"));
      const base = u.searchParams.get("baseUrl");
      if (base) return normalizeBase(decodeURIComponent(base));
    } catch {
      /* fall through */
    }
  }

  // QR a volte è solo l'URL http
  if (/^https?:\/\//i.test(s)) return normalizeBase(s);
  if (/^\d+\.\d+\.\d+\.\d+(:\d+)?$/.test(s)) {
    return normalizeBase(`http://${s}`);
  }
  if (/^[\w.-]+:\d+$/.test(s)) return normalizeBase(`http://${s}`);

  // query string isolata
  const m = s.match(/baseUrl=([^&\s]+)/i);
  if (m?.[1]) {
    try {
      return normalizeBase(decodeURIComponent(m[1]));
    } catch {
      return normalizeBase(m[1]);
    }
  }
  return null;
}
