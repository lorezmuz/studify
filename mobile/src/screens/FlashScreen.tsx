import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  enqueueOutbox,
  getPianoFromCache,
  upsertPianoInCache,
} from "../lib/storage";
import { addDaysISO, aggiornaSM2 } from "../lib/sm2";
import type { FlashcardRow, PianoBundle } from "../lib/types";
import { colors } from "../theme";
import { useApp } from "../context/AppContext";

type Props = {
  pianoId: string;
  onBack: () => void;
};

export function FlashScreen({ pianoId, onBack }: Props) {
  const { refreshLocal } = useApp();
  const [bundle, setBundle] = useState<PianoBundle | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    void getPianoFromCache(pianoId).then(setBundle);
  }, [pianoId]);

  const cards = useMemo(() => {
    if (!bundle) return [] as FlashcardRow[];
    const today = new Date().toISOString().slice(0, 10);
    const due = bundle.flashcard.filter(
      (c) => !c.prossima_revisione || c.prossima_revisione <= today
    );
    return due.length ? due : bundle.flashcard;
  }, [bundle]);

  const card = cards[idx];

  async function rate(valutazione: number) {
    if (!bundle || !card) return;
    const next = aggiornaSM2(
      card.livello,
      card.intervallo_giorni,
      card.fattore_facilita,
      valutazione
    );
    const prossima = addDaysISO(next.intervallo);
    const flashcard = bundle.flashcard.map((c) =>
      c.id === card.id
        ? {
            ...c,
            livello: next.livello,
            intervallo_giorni: next.intervallo,
            fattore_facilita: next.fattoreFacilita,
            prossima_revisione: prossima,
          }
        : c
    );
    const updated = { ...bundle, flashcard };
    await upsertPianoInCache(updated);
    await enqueueOutbox({
      type: "flashcard",
      flashcardId: card.id,
      valutazione,
    });
    setBundle(updated);
    setDone((d) => d + 1);
    setFlipped(false);
    if (idx + 1 >= cards.length) {
      // fine sessione
      setIdx(0);
      await refreshLocal();
    } else {
      setIdx(idx + 1);
    }
  }

  if (!bundle) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Carico…</Text>
      </View>
    );
  }

  if (!cards.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Nessuna flashcard</Text>
        <Pressable onPress={onBack}>
          <Text style={styles.backText}>← Indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.backText}>← Piano</Text>
        </Pressable>
        <Text style={styles.meta}>
          {idx + 1}/{cards.length} · fatte {done}
        </Text>
      </View>

      <Pressable style={styles.card} onPress={() => setFlipped((f) => !f)}>
        <Text style={styles.sideLabel}>{flipped ? "Retro" : "Fronte"}</Text>
        <Text style={styles.cardText}>
          {flipped ? card.retro : card.fronte}
        </Text>
        <Text style={styles.hint}>Tocca per girare</Text>
      </Pressable>

      {flipped ? (
        <View style={styles.rates}>
          {[
            { v: 1, label: "No", color: colors.rose },
            { v: 2, label: "Difficile", color: colors.amber },
            { v: 3, label: "Ok", color: colors.emerald },
            { v: 4, label: "Facile", color: "#047857" },
          ].map((r) => (
            <Pressable
              key={r.v}
              style={[styles.rateBtn, { borderColor: r.color }]}
              onPress={() => void rate(r.v)}
            >
              <Text style={[styles.rateText, { color: r.color }]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.footerHint}>
          Gira la carta, poi valuta quanto la ricordavi (SM-2).
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 56 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: { color: colors.emerald, fontWeight: "600" },
  meta: { color: colors.textMuted, fontSize: 13 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  muted: { color: colors.textMuted },
  card: {
    flex: 1,
    maxHeight: 380,
    backgroundColor: colors.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  sideLabel: {
    position: "absolute",
    top: 16,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  cardText: {
    fontSize: 20,
    lineHeight: 30,
    textAlign: "center",
    color: colors.text,
    fontWeight: "500",
  },
  hint: {
    position: "absolute",
    bottom: 16,
    fontSize: 12,
    color: colors.textMuted,
  },
  rates: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  rateBtn: {
    flexGrow: 1,
    minWidth: "40%",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.bgCard,
  },
  rateText: { fontWeight: "700" },
  footerHint: {
    marginTop: 20,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 13,
  },
});
