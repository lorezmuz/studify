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
import { playComplete, playXp } from "../lib/sounds";

type Props = {
  pianoId: string;
  sectionIndex: number;
  nodeId?: string;
  /** Solo lettura (tappa già fatta o sezione aperta dalla lista) */
  reviewOnly?: boolean;
  onBack: () => void;
};

export function StudioScreen({
  pianoId,
  sectionIndex,
  nodeId,
  reviewOnly = false,
  onBack,
}: Props) {
  const { refreshLocal } = useApp();
  const [bundle, setBundle] = useState<PianoBundle | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void getPianoFromCache(pianoId).then((b) => {
      setBundle(b);
      if (
        b &&
        nodeId &&
        b.progress?.completedIds?.includes(nodeId)
      ) {
        setDone(true);
      }
    });
  }, [pianoId, nodeId]);

  const section = bundle?.sections?.[sectionIndex];
  const body =
    section?.body ||
    bundle?.piano.riassunto ||
    "_Contenuto non disponibile offline._";
  const title = section?.title || "Studio";
  const alreadyDone =
    reviewOnly ||
    done ||
    (!!nodeId && !!bundle?.progress?.completedIds?.includes(nodeId));
  const canComplete = !!nodeId && !reviewOnly && !alreadyDone;

  async function markDone() {
    if (!bundle || !nodeId || reviewOnly || alreadyDone) {
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
    void playComplete();
    void playXp();
    await refreshLocal();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BackLink label="Piano" onPress={onBack} />
        <Text style={styles.kicker}>
          {alreadyDone ? "Ripasso" : "Studio"}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {alreadyDone ? (
          <Text style={styles.reviewHint}>
            Già completata — puoi rileggerla quando vuoi.
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.md,
          canComplete || alreadyDone ? { marginBottom: 96 } : null,
        ]}
      >
        <MarkdownView markdown={body} title={title} />
      </View>

      {canComplete ? (
        <View style={styles.footer}>
          <PrimaryButton
            label="Segna completato"
            onPress={() => void markDone().then(onBack)}
          />
        </View>
      ) : alreadyDone ? (
        <View style={styles.footer}>
          <PrimaryButton label="Torna al percorso" onPress={onBack} />
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
  reviewHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: "600",
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
