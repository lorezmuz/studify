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
import {
  getPianoFromCache,
  enqueueOutbox,
  upsertPianoInCache,
} from "../lib/storage";
import type { PianoBundle, RoadmapNode } from "../lib/types";
import { colors, radius, shadow, space } from "../theme";
import { useApp } from "../context/AppContext";
import {
  BackLink,
  ProgressBar,
  Screen,
  SectionLabel,
} from "../components/ui";
import { badgeCountdown } from "../lib/dates";

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

    const progress = {
      ...bundle.progress,
      completedIds: [...new Set([...bundle.progress.completedIds, node.id])],
      xp: (bundle.progress.xp || 0) + (node.type === "chest" ? 30 : 15),
    };

    const updated: PianoBundle = {
      ...bundle,
      progress,
      roadmap: bundle.roadmap.map((n) =>
        n.id === node.id ? { ...n, status: "done" as const } : n
      ),
    };
    let foundCurrent = false;
    updated.roadmap = updated.roadmap.map((n) => {
      if (n.status === "done" || n.id === node.id) {
        return n.id === node.id ? { ...n, status: "done" as const } : n;
      }
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
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.emerald} />
        <View style={{ marginTop: 16 }}>
          <BackLink label="Indietro" onPress={onBack} />
        </View>
      </Screen>
    );
  }

  const p = bundle.piano;
  const b = badgeCountdown(p.data_esame);
  const done = bundle.progress?.completedIds?.length ?? 0;
  const total = Math.max(1, bundle.roadmap?.length ?? 0);
  const xp = bundle.progress?.xp ?? 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.pad}
        showsVerticalScrollIndicator={false}
      >
        <BackLink label="Piani" onPress={onBack} />

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.materia}>{p.materia}</Text>
            <View
              style={[
                styles.timePill,
                b.urgent && styles.timeUrgent,
                b.past && styles.timePast,
              ]}
            >
              <Text style={styles.timeText}>{b.label}</Text>
            </View>
          </View>
          <Text style={styles.argomenti}>{p.argomenti}</Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{xp}</Text>
              <Text style={styles.statLbl}>XP</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>
                {done}/{bundle.roadmap?.length ?? 0}
              </Text>
              <Text style={styles.statLbl}>tappe</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>{bundle.flashcard.length}</Text>
              <Text style={styles.statLbl}>flash</Text>
            </View>
          </View>
          <ProgressBar value={done} max={total} height={10} />
        </View>

        <View style={styles.actions}>
          <ActionTile
            emoji="🃏"
            title="Flashcard"
            sub={`${bundle.flashcard.length} carte`}
            color={colors.violetSoft}
            onPress={onFlash}
          />
          <ActionTile
            emoji="✅"
            title="Quiz"
            sub={`${bundle.quiz.length} set`}
            color={colors.skySoft}
            onPress={onQuiz}
          />
        </View>

        <SectionLabel>Percorso</SectionLabel>
        <View style={styles.path}>
          {bundle.roadmap.map((node, i) => (
            <View key={node.id} style={styles.pathItem}>
              {i > 0 ? (
                <View
                  style={[
                    styles.connector,
                    node.status !== "locked" && styles.connectorOn,
                  ]}
                />
              ) : null}
              <Pressable
                style={[
                  styles.node,
                  node.status === "done" && styles.nodeDone,
                  node.status === "current" && styles.nodeCurrent,
                  node.status === "locked" && styles.nodeLocked,
                ]}
                disabled={node.status === "locked" || busyNode === node.id}
                onPress={() => void completeNode(node)}
              >
                <View
                  style={[
                    styles.nodeDot,
                    node.status === "done" && styles.dotDone,
                    node.status === "locked" && styles.dotLocked,
                    node.status === "current" && styles.dotCurrent,
                  ]}
                >
                  <Text style={styles.nodeDotText}>
                    {node.status === "done" ? "✓" : typeEmoji(node.type)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nodeTitle}>{node.title}</Text>
                  <Text style={styles.nodeDesc} numberOfLines={2}>
                    {node.description || labelType(node.type)}
                  </Text>
                </View>
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>{labelType(node.type)}</Text>
                </View>
              </Pressable>
            </View>
          ))}
        </View>

        {bundle.sections?.length > 0 && (
          <>
            <SectionLabel>Sezioni studio</SectionLabel>
            {bundle.sections.map((s, idx) => (
              <Pressable
                key={idx}
                style={styles.sectionCard}
                onPress={() => onStudio(idx)}
              >
                <View style={styles.sectionNum}>
                  <Text style={styles.sectionNumText}>{idx + 1}</Text>
                </View>
                <Text style={styles.sectionCardTitle} numberOfLines={2}>
                  {s.title}
                </Text>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function ActionTile({
  emoji,
  title,
  sub,
  color,
  onPress,
}: {
  emoji: string;
  title: string;
  sub: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: color },
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionBtnText}>{title}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </Pressable>
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

function typeEmoji(t: RoadmapNode["type"]) {
  switch (t) {
    case "read":
      return "📖";
    case "flashcards":
      return "🃏";
    case "quiz":
      return "❓";
    case "review":
      return "🔁";
    case "chest":
      return "🎁";
    default:
      return "•";
  }
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.xl, paddingBottom: 56 },
  center: { alignItems: "center", justifyContent: "center" },
  hero: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: space.lg,
    ...shadow.card,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  materia: {
    flex: 1,
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.6,
  },
  argomenti: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  timePill: {
    backgroundColor: colors.emeraldSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  timeUrgent: { backgroundColor: colors.amberSoft },
  timePast: { backgroundColor: colors.bgElevated },
  timeText: { fontSize: 11, fontWeight: "700", color: colors.text },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
  },
  stat: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "800", color: colors.text },
  statLbl: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: radius.lg,
    padding: 14,
    minHeight: 100,
  },
  actionEmoji: { fontSize: 22, marginBottom: 6 },
  actionBtnText: { fontWeight: "800", color: colors.text, fontSize: 15 },
  actionSub: { marginTop: 2, color: colors.textMuted, fontSize: 12 },
  path: { gap: 0 },
  pathItem: { position: "relative" },
  connector: {
    position: "absolute",
    left: 27,
    top: -8,
    width: 2,
    height: 12,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  connectorOn: { backgroundColor: colors.emerald },
  node: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    marginBottom: 10,
    ...shadow.card,
  },
  nodeDone: { opacity: 0.72 },
  nodeCurrent: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldMuted,
  },
  nodeLocked: { opacity: 0.5 },
  nodeDot: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.emeraldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: colors.emerald },
  dotCurrent: {
    backgroundColor: colors.emerald,
    ...shadow.soft,
  },
  dotLocked: { backgroundColor: colors.bgElevated },
  nodeDotText: { fontSize: 15, color: "#fff", fontWeight: "700" },
  nodeTitle: { fontWeight: "800", color: colors.text, fontSize: 15 },
  nodeDesc: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  typeChip: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  typeChipText: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
  sectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 8,
  },
  sectionNum: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.emeraldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.emeraldDeep,
  },
  sectionCardTitle: { flex: 1, fontWeight: "600", color: colors.text },
  chev: { fontSize: 22, color: colors.textSoft, fontWeight: "300" },
});
