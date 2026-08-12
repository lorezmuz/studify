import { FlashcardSession } from "@/components/flashcard-session";

export default async function FlashcardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FlashcardSession pianoId={id} />;
}
