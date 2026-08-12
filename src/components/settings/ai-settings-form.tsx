"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  FloppyDisk,
  Key,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  PROVIDER_PRESETS,
  defaultAiConfig,
  describeConfig,
  getPreset,
  getUserAiConfig,
  saveUserAiConfig,
  type AiProviderId,
  type UserAiConfig,
} from "@/lib/ai-settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AiSettingsForm() {
  const [config, setConfig] = useState<UserAiConfig>(defaultAiConfig());
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  useEffect(() => {
    setConfig(getUserAiConfig());
    setMounted(true);
  }, []);

  function selectProvider(id: AiProviderId) {
    const preset = getPreset(id);
    setConfig((c) => ({
      ...c,
      provider: id,
      baseUrl: preset.defaultBaseUrl,
      model: c.provider === id && c.model ? c.model : preset.defaultModel,
      // keep key when switching cloud providers
      apiKey: preset.needsKey ? c.apiKey : "",
    }));
    setSaved(false);
    setTestMsg(null);
  }

  function onSave(e?: FormEvent) {
    e?.preventDefault();
    saveUserAiConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function onTest() {
    setTesting(true);
    setTestMsg(null);
    saveUserAiConfig(config);
    try {
      const res = await fetch("/api/ai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: config.apiKey || undefined,
          baseUrl: config.baseUrl || undefined,
          model: config.model || undefined,
        }),
      });
      const data = await res.json();
      setTestMsg({
        ok: Boolean(data.ok),
        text: data.message || (data.ok ? "Ok" : "Fallito"),
      });
    } catch {
      setTestMsg({ ok: false, text: "Impossibile contattare il server." });
    } finally {
      setTesting(false);
    }
  }

  if (!mounted) {
    return (
      <Card className="p-8 text-sm text-zinc-500">Carico impostazioni...</Card>
    );
  }

  const preset = getPreset(config.provider);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Configurazione attiva:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {describeConfig(config)}
          </span>
        </p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          La API key resta{" "}
          <strong className="font-medium text-zinc-700 dark:text-zinc-300">
            solo sul tuo browser
          </strong>{" "}
          (localStorage). Viene inviata al server Volentieri{" "}
          <em>solo durante la richiesta</em> per parlare col provider, non viene
          salvata sul database.
        </p>
      </Card>

      <form onSubmit={onSave} className="space-y-5">
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Scegli il provider
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROVIDER_PRESETS.map((p) => {
              const active = config.provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProvider(p.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {p.label}
                    </span>
                    {p.freeHint && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        {p.freeHint}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <Card className="space-y-4 p-5">
          {preset.needsKey && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                <Key className="h-4 w-4" />
                La tua API key
              </label>
              <input
                type="password"
                autoComplete="off"
                value={config.apiKey}
                onChange={(e) => {
                  setConfig({ ...config, apiKey: e.target.value });
                  setSaved(false);
                }}
                placeholder="sk-... o la key del provider"
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Modello
            </label>
            <input
              value={config.model}
              onChange={(e) => {
                setConfig({ ...config, model: e.target.value });
                setSaved(false);
              }}
              placeholder={preset.defaultModel}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Es.{" "}
              {config.provider === "ollama"
                ? "llama3:latest, phi3:mini, gemma4:latest"
                : config.provider === "openai"
                  ? "gpt-4o-mini, gpt-4o"
                  : config.provider === "groq"
                    ? "llama-3.3-70b-versatile"
                    : "il nome modello del tuo provider"}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Base URL
            </label>
            <input
              value={config.baseUrl}
              onChange={(e) => {
                setConfig({ ...config, baseUrl: e.target.value });
                setSaved(false);
              }}
              placeholder={preset.defaultBaseUrl}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 font-mono text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Deve essere un endpoint compatibile OpenAI (
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                .../v1
              </code>
              ).
            </p>
          </div>
        </Card>

        {testMsg && (
          <div
            className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${
              testMsg.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
            }`}
          >
            {testMsg.ok ? (
              <CheckCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {testMsg.text}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <FloppyDisk className="h-4 w-4" />
            {saved ? "Salvato" : "Salva"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onTest}
            disabled={testing}
          >
            {testing ? (
              <>
                <SpinnerGap className="h-4 w-4 animate-spin" />
                Test...
              </>
            ) : (
              "Prova connessione"
            )}
          </Button>
          <Link href="/learn/new">
            <Button type="button" variant="ghost">
              Vai a studiare
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
