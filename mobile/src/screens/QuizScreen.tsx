import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import {
  enqueueOutbox,
  getPianoFromCache,
} from "../lib/storage";
import type { PianoBundle, QuizDomanda } from "../lib/types";
import { colors } from "../theme";
import { useApp } from "../context/AppContext";

type Props = {
  pianoId: string;
  onBack: () => void;
};

export function QuizScreen({ pianoId, onBack }: Props) {
  const { refreshLocal } = useApp();
  const [bundle, setBundle] = useState<PianoBundle | null>(null);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

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
    if (!current || finished) return;
    const next = [...answers];
    next[qi] = optionIndex;
    setAnswers(next);
    if (qi + 1 >= domande.length) {
      void finish(next);
    } else {
      setQi(qi + 1);
    }
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
      <View style={styles.center}>
        <Text style={styles.muted}>Carico…</Text>
      </View>
    );
  }

  if (!domande.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Nessun quiz in cache</Text>
        <Pressable onPress={onBack}>
          <Text style={styles.backText}>← Indietro</Text>
        </Pressable>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={styles.center}>
        <Text style={styles.score}>{score}%</Text>
        <Text style={styles.title}>Quiz completato</Text>
        <Text style={styles.muted}>
          Risultato salvato in locale e inviato al PC al prossimo sync.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Torna al piano</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <Pressable onPress={onBack}>
        <Text style={styles.backText}>← Piano</Text>
      </Pressable>
      <Text style={styles.progress}>
        Domanda {qi + 1} / {domande.length}
      </Text>
      <Text style={styles.question}>{current.domanda}</Text>
      {current.opzioni.map((op, i) => (
        <Pressable key={i} style={styles.option} onPress={() => pick(i)}>
          <Text style={styles.optionText}>{op}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: 24,
  },
  backText: { color: colors.emerald, fontWeight: "600", marginBottom: 16 },
  progress: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  question: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 28,
    marginBottom: 20,
  },
  option: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  optionText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  muted: {
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  score: {
    fontSize: 56,
    fontWeight: "800",
    color: colors.emerald,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: colors.emerald,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
});
