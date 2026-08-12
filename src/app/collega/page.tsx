"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, WifiHigh, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PairInfo = {
  preferred: string;
  candidates: string[];
  qr: string;
  tip: string;
};

export default function CollegaPage() {
  const [info, setInfo] = useState<PairInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/mobile/pair")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Errore");
        setInfo(d);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Errore rete"));
  }, []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const qrImg = info
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(info.qr)}`
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna ai piani
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <WifiHigh className="h-7 w-7 text-emerald-600" weight="duotone" />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Collega il telefono
        </h1>
      </div>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        Stesso Wi‑Fi del PC. Apri l&apos;app Studify e scansiona il QR oppure
        inserisci l&apos;indirizzo nelle impostazioni.
      </p>

      {err && (
        <Card className="mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </Card>
      )}

      {!info && !err && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <SpinnerGap className="h-5 w-5 animate-spin" />
          Rilevo indirizzo di rete…
        </div>
      )}

      {info && (
        <div className="space-y-6">
          <Card className="flex flex-col items-center p-8">
            {qrImg && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrImg}
                alt="QR pairing Studify"
                width={240}
                height={240}
                className="rounded-lg bg-white p-2"
              />
            )}
            <p className="mt-4 text-center font-mono text-sm text-zinc-800 dark:text-zinc-200">
              {info.preferred}
            </p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => copy(info.preferred)}
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copiato" : "Copia URL"}
            </Button>
          </Card>

          {info.candidates.length > 1 && (
            <Card className="p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Altri indirizzi rilevati
              </p>
              <ul className="space-y-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {info.candidates.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() => copy(c)}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-medium">Firewall Windows</p>
            <p className="mt-1 opacity-90">{info.tip}</p>
            <p className="mt-2 font-mono text-xs opacity-80">
              Porta TCP 3005 · rete privata
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
