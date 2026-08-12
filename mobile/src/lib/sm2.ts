/** SM-2 semplificato — allineato al backend web */
export function aggiornaSM2(
  livello: number,
  intervallo: number,
  fattoreFacilita: number,
  valutazione: number
) {
  if (valutazione < 2) {
    return { livello: 0, intervallo: 1, fattoreFacilita };
  }
  const nuovoFattore = Math.max(
    1.3,
    fattoreFacilita +
      (0.1 - (4 - valutazione) * (0.08 + (4 - valutazione) * 0.02))
  );
  let nuovoIntervallo: number;
  if (livello === 0) nuovoIntervallo = 1;
  else if (livello === 1) nuovoIntervallo = 6;
  else nuovoIntervallo = Math.round(intervallo * nuovoFattore);

  return {
    livello: livello + 1,
    intervallo: nuovoIntervallo,
    fattoreFacilita: nuovoFattore,
  };
}

export function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
