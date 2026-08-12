import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  enqueueOutbox,
  getPianoFromCache,
  upsertPianoInCache,
} from "../lib/storage";
import type { PianoBundle } from "../lib/types";
import { colors } from "../theme";
import { useApp } from "../context/AppContext";

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
    const roadmap = bundle.roadmap.map((n) => {
      if (n.id === nodeId) return { ...n, status: "done" as const };
      if (n.status === "done" || n.id === nodeId) {
        return n.id === nodeId ? { ...n, status: "done" as const } : n;
      }
      return n;
    }).map((n) => {
      if (n.status === "done") return n;
      if (!foundCurrent) {
        foundCurrent = true;
        return { ...n, status: "current" as const };
      }
      return { ...n, status: n.status === "current" ? ("locked" as const) : n.status };
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.backText}>← Indietro</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={2}>
          {section?.title || "Studio"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.body}>
          {section?.body ||
            bundle?.piano.riassunto ||
            "Contenuto non disponibile offline."}
        </Text>
      </ScrollView>
      {nodeId ? (
        <View style={styles.footer}>
          <Pressable
            style={[styles.primaryBtn, done && { opacity: 0.7 }]}
            onPress={() => void markDone().then(onBack)}
            disabled={done}
          >
            <Text style={styles.primaryBtnText}>
              {done ? "Completato" : "Segna completato"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  backText: { color: colors.emerald, fontWeight: "600", marginBottom: 8 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  pad: { padding: 20, paddingBottom: 100 },
  body: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.text,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryBtn: {
    backgroundColor: colors.emerald,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
});
