import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  enqueueOutbox,
  getPianoFromCache,
  upsertPianoInCache,
} from "../lib/storage";
import type { PianoBundle } from "../lib/types";
import { colors, space } from "../theme";
import { useApp } from "../context/AppContext";
import { MarkdownView } from "../components/MarkdownView";
import { BackLink, PrimaryButton, Screen } from "../components/ui";

type Props = {
  pianoId: string;
  sectionIndex: number;
  nodeId?: string;
  onBack: () => void;
};

export function StudioScreen({
  pianoId,
  sectionIndex,
  nodeId,
  onBack,
}: Props) {
  const { refreshLocal } = useApp();
  const [bundle, setBundle] = useState<PianoBundle | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void getPianoFromCache(pianoId).then(setBundle);
  }, [pianoId]);

  const section = bundle?.sections?.[sectionIndex];
  const body =
    section?.body ||
    bundle?.piano.riassunto ||
    "_Contenuto non disponibile offline._";
  const title = section?.title || "Studio";

  async function markDone() {
    if (!bundle || !nodeId) {
      onBack();
      return;
    }
    const progress = {
      ...bundle.progress,
      completedIds: [...new Set([...bundle.progress.completedIds, nodeId])],
      xp: (bundle.progress.xp || 0) + 20,
    };
    let foundCurrent = false;
    const roadmap = bundle.roadmap
      .map((n) =>
        n.id === nodeId ? { ...n, status: "done" as const } : n
      )
      .map((n) => {
        if (n.status === "done") return n;
        if (!foundCurrent) {
          foundCurrent = true;
          return { ...n, status: "current" as const };
        }
        return {
          ...n,
          status: n.status === "current" ? ("locked" as const) : n.status,
        };
      });

    const updated: PianoBundle = { ...bundle, progress, roadmap };
    await upsertPianoInCache(updated);
    await enqueueOutbox({
      type: "complete_node",
      pianoId,
      nodeId,
    });
    setDone(true);
    await refreshLocal();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BackLink label="Piano" onPress={onBack} />
        <Text style={styles.kicker}>Studio</Text>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </View>

      <View style={[styles.md, nodeId ? { marginBottom: 96 } : null]}>
        <MarkdownView markdown={body} title={title} />
      </View>

      {nodeId ? (
        <View style={styles.footer}>
          <PrimaryButton
            label={done ? "Completato ✓" : "Segna completato"}
            onPress={() => void markDone().then(onBack)}
            disabled={done}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.xl,
    paddingBottom: 4,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.emerald,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  md: { flex: 1 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.lg,
    paddingBottom: 28,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
});
