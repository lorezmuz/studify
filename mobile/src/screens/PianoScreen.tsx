import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "../hooks/useFocusEffect";
import { getPianoFromCache, enqueueOutbox, upsertPianoInCache } from "../lib/storage";
import type { PianoBundle, RoadmapNode } from "../lib/types";
import { colors } from "../theme";
import { useApp } from "../context/AppContext";

type Props = {
  pianoId: string;
  onBack: () => void;
  onFlash: () => void;
  onQuiz: () => void;
  onStudio: (sectionIndex: number, nodeId?: string) => void;
};

export function PianoScreen({
  pianoId,
  onBack,
  onFlash,
  onQuiz,
  onStudio,
}: Props) {
  const { refreshLocal } = useApp();
  const [bundle, setBundle] = useState<PianoBundle | null>(null);
  const [busyNode, setBusyNode] = useState<string | null>(null);

  const load = useCallback(async () => {
    const b = await getPianoFromCache(pianoId);
    setBundle(b);
  }, [pianoId]);

  useFocusEffect(load);

  async function completeNode(node: RoadmapNode) {
    if (!bundle || node.status === "locked" || node.status === "done") return;
    setBusyNode(node.id);

    if (node.type === "read" && typeof node.sectionIndex === "number") {
      onStudio(node.sectionIndex, node.id);
      setBusyNode(null);
      return;
    }
    if (node.type === "flashcards") {
      onFlash();
      setBusyNode(null);
      return;
    }
    if (node.type === "quiz") {
      onQuiz();
      setBusyNode(null);
      return;
    }

    // review / chest → marca done localmente
    const progress = {
      ...bundle.progress,
      completedIds: [...new Set([...bundle.progress.completedIds, node.id])],
      xp: (bundle.progress.xp || 0) + (node.type === "chest" ? 30 : 15),
    };
    const roadmap = bundle.roadmap.map((n) => {
      if (n.id === node.id) return { ...n, status: "done" as const };
      return n;
    });
    // sblocca il prossimo locked
    const nextLocked = roadmap.find((n) => n.status === "locked");
    const roadmap2 = roadmap.map((n) => {
      if (nextLocked && n.id === nextLocked.id && n.status === "locked") {
        return { ...n, status: "current" as const };
      }
      if (n.status === "done") return n;
      if (n.id === node.id) return { ...n, status: "done" as const };
      return n;
    });

    const updated: PianoBundle = {
      ...bundle,
      progress,
      roadmap: roadmap2.map((n) =>
        n.id === node.id ? { ...n, status: "done" } : n
      ),
    };
    // apply simple unlock: first non-done becomes current
    let foundCurrent = false;
    updated.roadmap = updated.roadmap.map((n) => {
      if (n.status === "done") return n;
      if (!foundCurrent) {
        foundCurrent = true;
        return { ...n, status: "current" as const };
      }
      return { ...n, status: "locked" as const };
    });

    await upsertPianoInCache(updated);
    await enqueueOutbox({
      type: "complete_node",
      pianoId,
      nodeId: node.id,
    });
    setBundle(updated);
    await refreshLocal();
    setBusyNode(null);
  }

  if (!bundle) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.emerald} />
        <Pressable onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={styles.backText}>← Indietro</Text>
        </Pressable>
      </View>
    );
  }

  const p = bundle.piano;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <Pressable onPress={onBack}>
        <Text style={styles.backText}>← Piani</Text>
      </Pressable>
      <Text style={styles.materia}>{p.materia}</Text>
      <Text style={styles.argomenti}>{p.argomenti}</Text>
      <Text style={styles.xp}>
        {bundle.progress?.xp ?? 0} XP · {bundle.progress?.completedIds?.length ?? 0}/
        {bundle.roadmap?.length ?? 0} tappe
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={onFlash}>
          <Text style={styles.actionBtnText}>Flashcard</Text>
          <Text style={styles.actionSub}>{bundle.flashcard.length}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onQuiz}>
          <Text style={styles.actionBtnText}>Quiz</Text>
          <Text style={styles.actionSub}>{bundle.quiz.length}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Percorso</Text>
      {bundle.roadmap.map((node, i) => (
        <Pressable
          key={node.id}
          style={[
            styles.node,
            node.status === "done" && styles.nodeDone,
            node.status === "current" && styles.nodeCurrent,
            node.status === "locked" && styles.nodeLocked,
          ]}
          disabled={node.status === "locked" || busyNode === node.id}
          onPress={() => void completeNode(node)}
        >
          <View style={styles.nodeDot}>
            <Text style={styles.nodeDotText}>
              {node.status === "done" ? "✓" : i + 1}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nodeTitle}>{node.title}</Text>
            <Text style={styles.nodeDesc} numberOfLines={2}>
              {node.description || node.type}
            </Text>
          </View>
          <Text style={styles.nodeType}>{labelType(node.type)}</Text>
        </Pressable>
      ))}

      {bundle.sections?.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Sezioni studio
          </Text>
          {bundle.sections.map((s, idx) => (
            <Pressable
              key={idx}
              style={styles.sectionCard}
              onPress={() => onStudio(idx)}
            >
              <Text style={styles.sectionCardTitle}>{s.title}</Text>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function labelType(t: RoadmapNode["type"]) {
  switch (t) {
    case "read":
      return "Leggi";
    case "flashcards":
      return "Flash";
    case "quiz":
      return "Quiz";
    case "review":
      return "Ripasso";
    case "chest":
      return "Bonus";
    default:
      return t;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  backText: { color: colors.emerald, fontWeight: "600", marginBottom: 12 },
  materia: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
  },
  argomenti: {
    marginTop: 6,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  xp: { marginTop: 10, fontSize: 13, color: colors.emerald, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  actionBtnText: { fontWeight: "700", color: colors.text },
  actionSub: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  node: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  nodeDone: { opacity: 0.75 },
  nodeCurrent: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldSoft,
  },
  nodeLocked: { opacity: 0.45 },
  nodeDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeDotText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  nodeTitle: { fontWeight: "700", color: colors.text, fontSize: 15 },
  nodeDesc: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  nodeType: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  sectionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  sectionCardTitle: { fontWeight: "600", color: colors.text },
});
