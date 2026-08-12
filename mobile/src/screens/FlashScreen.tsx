import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  enqueueOutbox,
  getPianoFromCache,
  upsertPianoInCache,
} from "../lib/storage";
import { addDaysISO, aggiornaSM2 } from "../lib/sm2";
import type { FlashcardRow, PianoBundle } from "../lib/types";
import { colors, radius, shadow, space } from "../theme";
import { useApp } from "../context/AppContext";
import {
  BackLink,
  EmptyState,
  ProgressBar,
  Screen,
} from "../components/ui";

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
  const [finished, setFinished] = useState(false);

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
      setFinished(true);
      await refreshLocal();
    } else {
      setIdx(idx + 1);
    }
  }

  if (!bundle) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.muted}>Carico…</Text>
      </Screen>
    );
  }

  if (!cards.length) {
    return (
      <Screen>
        <View style={styles.pad}>
          <BackLink label="Piano" onPress={onBack} />
          <EmptyState
            icon="🃏"
            title="Nessuna flashcard"
            body="Questo piano non ha ancora carte in cache."
            actionLabel="Torna al piano"
            onAction={onBack}
          />
        </View>
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen style={styles.centerPad} edges="all">
        <Text style={styles.doneEmoji}>✨</Text>
        <Text style={styles.doneTitle}>Sessione finita</Text>
        <Text style={styles.muted}>
          Hai ripassato {done} carte. I progressi SM-2 andranno al PC al sync.
        </Text>
        <Pressable style={styles.doneBtn} onPress={onBack}>
          <Text style={styles.doneBtnText}>Torna al piano</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <BackLink label="Piano" onPress={onBack} />
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {idx + 1} / {cards.length}
          </Text>
          <Text style={styles.metaSoft}>fatte {done}</Text>
        </View>
        <ProgressBar value={idx} max={Math.max(1, cards.length)} height={6} />
      </View>

      <Pressable
        style={[styles.card, flipped && styles.cardBack]}
        onPress={() => setFlipped((f) => !f)}
      >
        <View style={styles.sideBadge}>
          <Text style={styles.sideLabel}>{flipped ? "Retro" : "Fronte"}</Text>
        </View>
        <Text style={styles.cardText}>
          {flipped ? card.retro : card.fronte}
        </Text>
        <Text style={styles.hint}>
          {flipped ? "Valuta qui sotto" : "Tocca per girare"}
        </Text>
      </Pressable>

      {flipped ? (
        <View style={styles.rates}>
          {(
            [
              { v: 1, label: "No", sub: "di nuovo", bg: colors.roseSoft, fg: colors.rose },
              {
                v: 2,
                label: "Difficile",
                sub: "lento",
                bg: colors.amberSoft,
                fg: colors.amber,
              },
              {
                v: 3,
                label: "Ok",
                sub: "bene",
                bg: colors.emeraldSoft,
                fg: colors.emeraldDeep,
              },
              {
                v: 4,
                label: "Facile",
                sub: "subito",
                bg: "#bbf7d0",
                fg: "#047857",
              },
            ] as const
          ).map((r) => (
            <Pressable
              key={r.v}
              style={[styles.rateBtn, { backgroundColor: r.bg }]}
              onPress={() => void rate(r.v)}
            >
              <Text style={[styles.rateText, { color: r.fg }]}>{r.label}</Text>
              <Text style={[styles.rateSub, { color: r.fg }]}>{r.sub}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.footerHint}>
          Gira la carta, poi valuta quanto la ricordavi (SM-2).
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  pad: { flex: 1, paddingHorizontal: space.xl },
  center: { alignItems: "center", justifyContent: "center" },
  centerPad: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  header: { marginBottom: space.lg },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  meta: { color: colors.text, fontSize: 14, fontWeight: "800" },
  metaSoft: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  muted: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  card: {
    flex: 1,
    maxHeight: 400,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 28,
    justifyContent: "center",
    alignItems: "center",
    ...shadow.card,
  },
  cardBack: {
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emeraldSoft,
  },
  sideBadge: {
    position: "absolute",
    top: 16,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardText: {
    fontSize: 21,
    lineHeight: 32,
    textAlign: "center",
    color: colors.text,
    fontWeight: "600",
  },
  hint: {
    position: "absolute",
    bottom: 18,
    fontSize: 12,
    color: colors.textSoft,
    fontWeight: "600",
  },
  rates: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  rateBtn: {
    flexGrow: 1,
    minWidth: "45%",
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  rateText: { fontWeight: "800", fontSize: 15 },
  rateSub: { fontSize: 11, marginTop: 2, fontWeight: "600", opacity: 0.8 },
  footerHint: {
    marginTop: 18,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  doneEmoji: { fontSize: 48, marginBottom: 8 },
  doneTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
  },
  doneBtn: {
    marginTop: 24,
    backgroundColor: colors.emerald,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.md,
    ...shadow.soft,
  },
  doneBtnText: { color: "#fff", fontWeight: "800" },
});
