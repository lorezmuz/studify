import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
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
import { BackLink, Screen, SectionLabel } from "../components/ui";
import { badgeCountdown } from "../lib/dates";
import { StudyPath } from "../components/StudyPath";
import { PressScale } from "../components/PressScale";
import {
  playChest,
  playComplete,
  playTap,
  playXp,
} from "../lib/sounds";

type Props = {
  pianoId: string;
  onBack: () => void;
  onFlash: (opts?: { reviewAll?: boolean }) => void;
  onQuiz: (opts?: { review?: boolean }) => void;
  onStudio: (
    sectionIndex: number,
    opts?: { nodeId?: string; reviewOnly?: boolean }
  ) => void;
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

  /** Apre il contenuto di una tappa (anche se già fatta). */
  function openNodeContent(node: RoadmapNode, reviewOnly: boolean) {
    void playTap();
    if (node.type === "read" && typeof node.sectionIndex === "number") {
      onStudio(node.sectionIndex, {
        nodeId: reviewOnly ? undefined : node.id,
        reviewOnly,
      });
      return;
    }
    if (node.type === "flashcards" || node.type === "review") {
      onFlash({ reviewAll: true });
      return;
    }
    if (node.type === "quiz") {
      onQuiz({ review: reviewOnly });
      return;
    }
    if (node.type === "chest") {
      // baule: se già fatto, solo feedback; se current, completa sotto
      if (reviewOnly) void playChest();
    }
  }

  async function onSelectNode(node: RoadmapNode) {
    if (!bundle || node.status === "locked") return;
    if (busyNode) return;

    // Già fatta → riapri in sola lettura / ripasso (niente XP extra)
    if (node.status === "done") {
      openNodeContent(node, true);
      return;
    }

    // Current → apri e, se chest/review “istantanei”, completa
    setBusyNode(node.id);

    if (node.type === "read" && typeof node.sectionIndex === "number") {
      openNodeContent(node, false);
      setBusyNode(null);
      return;
    }
    if (node.type === "flashcards") {
      openNodeContent(node, false);
      setBusyNode(null);
      return;
    }
    if (node.type === "quiz") {
      openNodeContent(node, false);
      setBusyNode(null);
      return;
    }

    // review / chest → marca done (prima volta)
    if (node.type === "chest") void playChest();
    else void playComplete();

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
    void playXp();
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
  const xp = bundle.progress?.xp ?? 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.pad}
        showsVerticalScrollIndicator={false}
      >
        <BackLink label="Piani" onPress={onBack} />

        <View style={styles.metaRow}>
          <Text style={styles.argomenti} numberOfLines={2}>
            {p.argomenti}
          </Text>
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

        <Text style={styles.hintReopen}>
          Tocca anche le tappe ✓ già fatte per ripassarle.
        </Text>

        <View style={styles.actions}>
          <PressScale
            onPress={() => {
              void playTap();
              onFlash({ reviewAll: true });
            }}
            style={[styles.actionBtn, { backgroundColor: colors.violetSoft }]}
          >
            <Text style={styles.actionEmoji}>🃏</Text>
            <Text style={styles.actionBtnText}>Flashcard</Text>
            <Text style={styles.actionSub}>
              {bundle.flashcard.length} carte · ripasso
            </Text>
          </PressScale>
          <PressScale
            onPress={() => {
              void playTap();
              onQuiz({ review: true });
            }}
            style={[styles.actionBtn, { backgroundColor: colors.skySoft }]}
          >
            <Text style={styles.actionEmoji}>✅</Text>
            <Text style={styles.actionBtnText}>Quiz</Text>
            <Text style={styles.actionSub}>
              {bundle.quiz.length} set · ripeti
            </Text>
          </PressScale>
        </View>

        <StudyPath
          nodes={bundle.roadmap}
          unitTitle={p.materia}
          unitSubtitle="Il tuo percorso"
          xp={xp}
          onSelect={(node) => void onSelectNode(node)}
        />

        {bundle.sections?.length > 0 && (
          <>
            <SectionLabel>Sezioni studio (sempre apribili)</SectionLabel>
            {bundle.sections.map((s, idx) => (
              <PressScale
                key={idx}
                onPress={() => {
                  void playTap();
                  onStudio(idx, { reviewOnly: true });
                }}
                style={styles.sectionCard}
              >
                <View style={styles.sectionRow}>
                  <View style={styles.sectionNum}>
                    <Text style={styles.sectionNumText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.sectionCardTitle} numberOfLines={2}>
                    {s.title}
                  </Text>
                  <Text style={styles.chev}>›</Text>
                </View>
              </PressScale>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.xl, paddingBottom: 56 },
  center: { alignItems: "center", justifyContent: "center" },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  argomenti: {
    flex: 1,
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
  hintReopen: {
    fontSize: 12,
    color: colors.emeraldDeep,
    fontWeight: "600",
    marginBottom: 12,
  },
  actions: { flexDirection: "row", gap: 10, marginBottom: 18 },
  actionBtn: {
    flex: 1,
    borderRadius: radius.lg,
    padding: 14,
    minHeight: 96,
  },
  actionEmoji: { fontSize: 22, marginBottom: 6 },
  actionBtnText: { fontWeight: "800", color: colors.text, fontSize: 15 },
  actionSub: { marginTop: 2, color: colors.textMuted, fontSize: 12 },
  sectionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 8,
    ...shadow.card,
  },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
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
