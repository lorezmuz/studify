import { PianoView } from "@/components/piano-view";

export default async function PianoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PianoView id={id} />;
}
