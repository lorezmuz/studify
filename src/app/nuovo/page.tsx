import { NuovoPianoForm } from "@/components/nuovo-piano-form";

export default function NuovoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nuovo piano di studio
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Materia, argomenti, data esame e voto obiettivo. Claude o Grok generano
        riassunto, 15 flashcard e 10 domande quiz.
      </p>
      <div className="mt-6">
        <NuovoPianoForm />
      </div>
    </div>
  );
}
