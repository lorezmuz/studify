import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { enqueueOutbox, getPianoFromCache } from "../lib/storage";
import type { PianoBundle, QuizDomanda } from "../lib/types";
import { colors, radius, shadow, space } from "../theme";
import { useApp } from "../context/AppContext";
import {
  BackLink,
  EmptyState,
  PrimaryButton,
  ProgressBar,
  Screen,
} from "../components/ui";

type Props = {
  pianoId: string;
  onBack: () => void;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizScreen({ pianoId, onBack }: Props) {
  const { refreshLocal } = useApp();
  const [bundle, setBundle] = useState<PianoBundle | null>(null);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    void getPianoFromCache(pianoId).then(setBundle);
  }, [pianoId]);

  const quiz = bundle?.quiz?.[0];
  const domande: QuizDomanda[] = useMemo(() => {
    if (!quiz) return [];
    try {
      return JSON.parse(quiz.domande_json) as QuizDomanda[];
    } catch {
      return [];
    }
  }, [quiz]);

  const current = domande[qi];

  function pick(optionIndex: number) {
    if (!current || finished || picked !== null) return;
    setPicked(optionIndex);
    const next = [...answers];
    next[qi] = optionIndex;
    setAnswers(next);
    setTimeout(() => {
      setPicked(null);
      if (qi + 1 >= domande.length) {
        void finish(next);
      } else {
        setQi(qi + 1);
      }
    }, 280);
  }

  async function finish(risposte: number[]) {
    if (!quiz) return;
    let corrette = 0;
    domande.forEach((d, i) => {
      if (risposte[i] === d.risposta_corretta) corrette++;
    });
    const punteggio = Math.round(
      (corrette / Math.max(1, domande.length)) * 100
    );
    setScore(punteggio);
    setFinished(true);
    await enqueueOutbox({
      type: "quiz_result",
      quizId: quiz.id,
      risposte,
      punteggio,
    });
    await refreshLocal();
  }

  if (!bundle) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.muted}>Carico…</Text>
      </Screen>
    );
  }

  if (!domande.length) {
    return (
      <Screen>
        <View style={styles.pad}>
          <BackLink label="Piano" onPress={onBack} />
          <EmptyState
            icon="✅"
            title="Nessun quiz in cache"
            body="Sincronizza di nuovo quando il piano ha un quiz generato."
            actionLabel="Torna al piano"
            onAction={onBack}
          />
        </View>
      </Screen>
    );
  }

  if (finished) {
    const tone =
      score >= 80 ? "Ottimo lavoro!" : score >= 50 ? "Buon risultato" : "Ripassa e riprova";
    return (
      <Screen style={styles.centerPad} edges="all">
        <View style={styles.scoreRing}>
          <Text style={styles.score}>{score}%</Text>
        </View>
        <Text style={styles.doneTitle}>{tone}</Text>
        <Text style={styles.muted}>
          Risultato salvato in locale · si invia al PC al prossimo sync.
        </Text>
        <View style={{ width: "100%", marginTop: 20 }}>
          <PrimaryButton label="Torna al piano" onPress={onBack} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <BackLink label="Piano" onPress={onBack} />

        <View style={styles.topMeta}>
          <Text style={styles.progress}>
            Domanda {qi + 1} di {domande.length}
          </Text>
          <Text style={styles.pct}>
            {Math.round((qi / domande.length) * 100)}%
          </Text>
        </View>
        <ProgressBar value={qi} max={domande.length} height={8} />

        <View style={styles.questionCard}>
          <Text style={styles.question}>{current.domanda}</Text>
        </View>

        {current.opzioni.map((op, i) => {
          const selected = picked === i;
          return (
            <Pressable
              key={i}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => pick(i)}
            >
              <View style={[styles.letter, selected && styles.letterOn]}>
                <Text style={[styles.letterText, selected && styles.letterTextOn]}>
                  {LETTERS[i] || String(i + 1)}
                </Text>
              </View>
              <Text style={styles.optionText}>{op}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.xl, paddingBottom: 48 },
  center: { alignItems: "center", justifyContent: "center" },
  centerPad: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  topMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progress: { fontSize: 13, color: colors.textMuted, fontWeight: "700" },
  pct: { fontSize: 13, color: colors.emerald, fontWeight: "800" },
  questionCard: {
    marginTop: 18,
    marginBottom: 16,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.card,
  },
  question: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  optionSelected: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldMuted,
  },
  letter: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  letterOn: { backgroundColor: colors.emerald },
  letterText: { fontWeight: "800", color: colors.textMuted, fontSize: 13 },
  letterTextOn: { color: "#fff" },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    fontWeight: "500",
  },
  muted: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  scoreRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.emeraldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 6,
    borderColor: colors.emerald,
  },
  score: {
    fontSize: 40,
    fontWeight: "900",
    color: colors.emeraldDeep,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
});
