export function giorniAllaData(dataEsame: string | null | undefined): number | null {
  if (!dataEsame) return null;
  const target = new Date(dataEsame + "T12:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function badgeCountdown(dataEsame: string | null | undefined): {
  label: string;
  urgent: boolean;
  past: boolean;
} {
  const g = giorniAllaData(dataEsame);
  if (g === null) return { label: "Senza data", urgent: false, past: false };
  if (g < 0) return { label: "Archiviato", urgent: false, past: true };
  if (g === 0) return { label: "Oggi!", urgent: true, past: false };
  if (g === 1) return { label: "Domani", urgent: true, past: false };
  if (g <= 7) return { label: `tra ${g} giorni`, urgent: true, past: false };
  if (g <= 14) return { label: `tra ${g} giorni`, urgent: false, past: false };
  if (g < 30) return { label: `tra ${Math.ceil(g / 7)} settimane`, urgent: false, past: false };
  return { label: `tra ${Math.round(g / 30)} mesi`, urgent: false, past: false };
}
