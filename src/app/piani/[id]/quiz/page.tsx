import { Suspense } from "react";
import { QuizSession } from "@/components/quiz-session";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-zinc-500">
          Carico quiz...
        </div>
      }
    >
      <QuizSession pianoId={id} />
    </Suspense>
  );
}
