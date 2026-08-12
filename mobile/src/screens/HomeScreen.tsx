import React from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useApp } from "../context/AppContext";
import { badgeCountdown } from "../lib/dates";
import { colors } from "../theme";
import type { PianoBundle } from "../lib/types";

type Props = {
  onOpenPiano: (id: string) => void;
  onOpenSettings: () => void;
  onOpenPair: () => void;
};

export function HomeScreen({ onOpenPiano, onOpenSettings, onOpenPair }: Props) {
  const { ready, piani, online, syncing, lastError, settings, sync, outboxCount } =
    useApp();

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.emerald} />
      </View>
    );
  }

  if (!settings.baseUrl && piani.length === 0) {
    return (
      <View style={styles.centerPad}>
        <Text style={styles.title}>Studify</Text>
        <Text style={styles.sub}>
          Collega il PC sulla stessa Wi‑Fi per scaricare i piani di studio.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={onOpenPair}>
          <Text style={styles.primaryBtnText}>Collega al PC</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={onOpenSettings}>
          <Text style={styles.linkText}>Impostazioni</Text>
        </Pressable>
      </View>
    );
  }

  const statusLabel =
    online === true
      ? "Online · PC connesso"
      : online === false
        ? `Offline${piani.length ? ` · ${piani.length} piani in cache` : ""}`
        : "…";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>I tuoi piani</Text>
          <Text
            style={[
              styles.badge,
              online === false ? styles.badgeOff : styles.badgeOn,
            ]}
          >
            {statusLabel}
            {outboxCount > 0 ? ` · ${outboxCount} da inviare` : ""}
          </Text>
          {lastError && online === false ? (
            <Text style={styles.err} numberOfLines={2}>
              {lastError}
            </Text>
          ) : null}
        </View>
        <Pressable style={styles.iconBtn} onPress={onOpenSettings}>
          <Text style={styles.iconBtnText}>⚙</Text>
        </Pressable>
      </View>

      <FlatList
        data={piani}
        keyExtractor={(item) => item.piano.id}
        contentContainerStyle={
          piani.length === 0 ? styles.emptyList : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={() => {
              void sync();
            }}
            tintColor={colors.emerald}
          />
        }
        ListEmptyComponent={
          <View style={styles.centerPad}>
            <Text style={styles.sub}>
              Nessun piano in cache. Sincronizza con il PC.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                void sync();
              }}
            >
              <Text style={styles.primaryBtnText}>
                {syncing ? "Sincronizzo…" : "Sincronizza"}
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <PianoCard item={item} onPress={() => onOpenPiano(item.piano.id)} />
        )}
      />
    </View>
  );
}

function PianoCard({
  item,
  onPress,
}: {
  item: PianoBundle;
  onPress: () => void;
}) {
  const p = item.piano;
  const b = badgeCountdown(p.data_esame);
  const xp = item.progress?.xp ?? 0;
  const done = item.progress?.completedIds?.length ?? 0;
  const total = item.roadmap?.length ?? 0;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        <Text style={styles.materia}>{p.materia}</Text>
        <View
          style={[
            styles.pill,
            b.urgent ? styles.pillUrgent : b.past ? styles.pillPast : null,
          ]}
        >
          <Text style={styles.pillText}>{b.label}</Text>
        </View>
      </View>
      <Text style={styles.argomenti} numberOfLines={2}>
        {p.argomenti}
      </Text>
      <Text style={styles.meta}>
        {xp} XP · {done}/{total} tappe
        {item.flashcard?.length
          ? ` · ${item.flashcard.length} flashcard`
          : ""}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  centerPad: {
    flex: 1,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 8,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  badge: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "500",
  },
  badgeOn: { color: colors.emerald },
  badgeOff: { color: colors.amber },
  err: { marginTop: 4, fontSize: 12, color: colors.rose },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { fontSize: 18 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  emptyList: { flexGrow: 1 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  materia: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  argomenti: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  meta: { marginTop: 10, fontSize: 12, color: colors.textMuted },
  pill: {
    backgroundColor: colors.emeraldSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillUrgent: { backgroundColor: colors.amberSoft },
  pillPast: { backgroundColor: "#f4f4f5" },
  pillText: { fontSize: 12, fontWeight: "600", color: colors.text },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: colors.emerald,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  linkBtn: { marginTop: 16, padding: 8 },
  linkText: { color: colors.emerald, fontWeight: "600" },
});
