import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AppSettings, PianoBundle } from "../lib/types";
import { getCache, getOutbox, getSettings, saveSettings } from "../lib/storage";
import { runSync, type SyncResult } from "../lib/sync";

type AppCtx = {
  ready: boolean;
  settings: AppSettings;
  piani: PianoBundle[];
  online: boolean | null;
  outboxCount: number;
  syncing: boolean;
  lastError: string | null;
  refreshLocal: () => Promise<void>;
  setBaseUrl: (url: string) => Promise<void>;
  sync: () => Promise<SyncResult>;
};

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    baseUrl: "",
    lastSyncAt: null,
  });
  const [piani, setPiani] = useState<PianoBundle[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshLocal = useCallback(async () => {
    const [s, cache, outbox] = await Promise.all([
      getSettings(),
      getCache(),
      getOutbox(),
    ]);
    setSettings(s);
    setPiani(cache);
    setOutboxCount(outbox.length);
  }, []);

  useEffect(() => {
    (async () => {
      await refreshLocal();
      setReady(true);
      const s = await getSettings();
      if (s.baseUrl) {
        const r = await runSync();
        setOnline(r.online);
        if (r.piani) setPiani(r.piani);
        if (r.lastSyncAt) {
          setSettings((prev) => ({ ...prev, lastSyncAt: r.lastSyncAt || null }));
        }
        if (r.error && !r.online) setLastError(r.error);
        const outbox = await getOutbox();
        setOutboxCount(outbox.length);
      }
    })();
  }, [refreshLocal]);

  const setBaseUrl = useCallback(async (url: string) => {
    const next = await saveSettings({ baseUrl: url });
    setSettings(next);
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setLastError(null);
    try {
      const r = await runSync();
      setOnline(r.online);
      if (r.piani) setPiani(r.piani);
      if (r.lastSyncAt) {
        setSettings((prev) => ({ ...prev, lastSyncAt: r.lastSyncAt || null }));
      }
      if (r.error) setLastError(r.error);
      const outbox = await getOutbox();
      setOutboxCount(outbox.length);
      return r;
    } finally {
      setSyncing(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      ready,
      settings,
      piani,
      online,
      outboxCount,
      syncing,
      lastError,
      refreshLocal,
      setBaseUrl,
      sync,
    }),
    [
      ready,
      settings,
      piani,
      online,
      outboxCount,
      syncing,
      lastError,
      refreshLocal,
      setBaseUrl,
      sync,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
