import Link from "next/link";
import {
  BookOpenText,
  GameController,
  Lightning,
  MagicWand,
  PlayCircle,
  Question,
  ChatCircleDots,
  ChartLineUp,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const modes = [
  {
    icon: BookOpenText,
    title: "Lezione chiara",
    body: "L'AI spezza l'argomento in passi brevi, analogie e checklist.",
  },
  {
    icon: Question,
    title: "Quiz smart",
    body: "Domande con spiegazione immediata: capisci dove sbagli.",
  },
  {
    icon: ChatCircleDots,
    title: "Tutor AI",
    body: "Chiedi qualsiasi cosa sull'argomento, come a un compagno bravo.",
  },
  {
    icon: PlayCircle,
    title: "Video correlati",
    body: "Query pronte per trovare video utili su YouTube.",
  },
  {
    icon: GameController,
    title: "Giochi",
    body: "Vero/falso, ordina i passi, abbina: studia senza noia.",
  },
  {
    icon: MagicWand,
    title: "Playground",
    body: "Scrivi spiegazioni, esempi e risposte aperte con indizi.",
  },
];

export function LandingPage() {
  return (
    <div className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.18),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(251,191,36,0.16),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(14,165,233,0.12),transparent_40%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 md:grid-cols-[1.1fr_0.9fr] md:pt-20">
          <div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-5xl lg:text-6xl">
              Impara qualsiasi cosa
              <span className="block text-emerald-700 dark:text-emerald-400">
                volentieri.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-600 dark:text-zinc-300 md:text-lg">
              Incolla una pagina del libro o un argomento. L&apos;AI crea lezione,
              quiz, tutor, video e mini-giochi pensati per media e superiori.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/learn/new">
                <Button size="lg">
                  <Lightning weight="fill" className="h-5 w-5" />
                  Inizia gratis
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="lg" variant="secondary">
                  Crea account
                </Button>
              </Link>
            </div>
          </div>

          <Card className="relative overflow-hidden p-6 md:p-8">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Da pagina del libro a percorso
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                &ldquo;La fotosintesi trasforma luce, acqua e CO2 in glucosio e
                ossigeno...&rdquo;
              </div>
              <div className="flex items-center justify-center text-xs font-medium uppercase tracking-wide text-zinc-400">
                diventa
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {["Lezione", "Quiz", "Tutor", "Gioco"].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-emerald-600 px-3 py-3 text-center font-medium text-white"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <ChartLineUp className="h-4 w-4" />
              XP, streak e progressi salvati sul dispositivo
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Un solo input. Sei modi per fissarlo.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode) => (
            <Card key={mode.title} className="p-5">
              <mode.icon
                weight="duotone"
                className="h-7 w-7 text-emerald-600 dark:text-emerald-400"
              />
              <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {mode.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {mode.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-200/80 bg-white/60 py-16 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Dai l'input",
                body: "Argomento libero o testo copiato dal libro di scuola.",
              },
              {
                step: "2",
                title: "L'AI costruisce il percorso",
                body: "Lezione, quiz, flashcard, playground, video e giochi.",
              },
              {
                step: "3",
                title: "Studi e guadagni XP",
                body: "Completi modalità, mantieni lo streak, vedi i progressi.",
              },
            ].map((item) => (
              <div key={item.step}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {item.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link href="/learn/new">
              <Button size="lg">Crea il tuo primo percorso</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200/80 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Volentieri - imparare volentieri, non per forza.
      </footer>
    </div>
  );
}
