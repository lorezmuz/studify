"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  EnvelopeSimple,
  Lock,
  SpinnerGap,
  Student,
  User as UserIcon,
} from "@phosphor-icons/react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();
  const isLogin = mode === "login";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!configured) {
      setError(
        "Supabase non è configurato. Aggiungi NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
      );
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Client Supabase non disponibile.");
      return;
    }

    if (password.length < 6) {
      setError("La password deve avere almeno 6 caratteri.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error: signError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signError) throw signError;
        router.push(next);
        router.refresh();
      } else {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const { data, error: signError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim() || email.split("@")[0],
            },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (signError) throw signError;

        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setMessage(
            "Controlla la tua email per confermare l'account, poi accedi."
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Qualcosa è andato storto. Riprova."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col px-4 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.18),transparent_60%)]" />

      <div className="mb-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/10">
          <Student weight="bold" className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {isLogin ? "Bentornato" : "Crea il tuo account"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {isLogin
            ? "Accedi per salvare progressi e percorsi sul cloud."
            : "I progressi ti seguono su ogni dispositivo."}
        </p>
      </div>

      <Card className="p-6 md:p-7">
        {!configured && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Modalità demo: configura Supabase in{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
              .env.local
            </code>{" "}
            per attivare l&apos;auth.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {!isLogin && (
            <Field
              label="Nome"
              icon={<UserIcon className="h-4 w-4" />}
              type="text"
              value={displayName}
              onChange={setDisplayName}
              placeholder="Come ti chiami?"
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            icon={<EnvelopeSimple className="h-4 w-4" />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tu@email.it"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            icon={<Lock className="h-4 w-4" />}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Minimo 6 caratteri"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
          />

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              {message}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <SpinnerGap className="h-5 w-5 animate-spin" />
                Un attimo...
              </>
            ) : isLogin ? (
              "Accedi"
            ) : (
              "Registrati"
            )}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {isLogin ? (
            <>
              Non hai un account?{" "}
              <Link
                href={`/auth/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Registrati
              </Link>
            </>
          ) : (
            <>
              Hai già un account?{" "}
              <Link
                href={`/auth/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Accedi
              </Link>
            </>
          )}
        </p>
      </Card>

      <p className="mt-6 text-center text-xs text-zinc-500">
        Puoi anche studiare come ospite: i dati restano su questo dispositivo.
      </p>
    </div>
  );
}

function Field({
  label,
  icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>
    </div>
  );
}
