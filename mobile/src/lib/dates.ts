export function badgeCountdown(dataEsame: string | null | undefined): {
  label: string;
  past: boolean;
  urgent: boolean;
} {
  if (!dataEsame) return { label: "Senza data", past: false, urgent: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(dataEsame + "T12:00:00");
  const diff = Math.round(
    (exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return { label: "Passato", past: true, urgent: false };
  if (diff === 0) return { label: "Oggi!", past: false, urgent: true };
  if (diff === 1) return { label: "Domani", past: false, urgent: true };
  if (diff <= 7) return { label: `${diff} giorni`, past: false, urgent: true };
  return { label: `${diff} giorni`, past: false, urgent: false };
}
