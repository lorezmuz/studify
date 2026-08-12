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
import { colors, radius, shadow, space } from "../theme";
import type { PianoBundle } from "../lib/types";
import {
  BrandMark,
  EmptyState,
  PrimaryButton,
  ProgressBar,
  Screen,
  StatusPill,
} from "../components/ui";

type Props = {
  onOpenPiano: (id: string) => void;
  onOpenSettings: () => void;
  onOpenPair: () => void;
};

export function HomeScreen({ onOpenPiano, onOpenSettings, onOpenPair }: Props) {
  const {
    ready,
    piani,
    online,
    syncing,
    lastError,
    settings,
    sync,
    outboxCount,
  } = useApp();

  if (!ready) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.emerald} size="large" />
      </Screen>
    );
  }

  if (!settings.baseUrl && piani.length === 0) {
    return (
      <Screen style={styles.welcome} edges="all">
        <BrandMark size={64} />
        <Text style={styles.welcomeTitle}>Studify</Text>
        <Text style={styles.welcomeSub}>
          I tuoi piani di studio sul telefono. Collega il PC in Wi‑Fi e studia
          anche offline.
        </Text>
        <View style={{ width: "100%", marginTop: 8 }}>
          <PrimaryButton label="Collega al PC" onPress={onOpenPair} />
        </View>
        <Pressable onPress={onOpenSettings} style={styles.linkBtn}>
          <Text style={styles.linkText}>Impostazioni</Text>
        </Pressable>
      </Screen>
    );
  }

  const offlineLabel = piani.length
    ? `Offline · ${piani.length} in cache`
    : "Offline";

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandMark size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>I tuoi piani</Text>
            <StatusPill
              online={online}
              onlineLabel={
                outboxCount > 0
                  ? `Online · ${outboxCount} da inviare`
                  : "Online · PC connesso"
              }
              offlineLabel={
                outboxCount > 0
                  ? `${offlineLabel} · ${outboxCount} da inviare`
                  : offlineLabel
              }
            />
          </View>
        </View>
        <Pressable style={styles.gear} onPress={onOpenSettings}>
          <Text style={styles.gearText}>⚙</Text>
        </Pressable>
      </View>

      {lastError && online === false ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText} numberOfLines={2}>
            {lastError}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={piani}
        keyExtractor={(item) => item.piano.id}
        contentContainerStyle={
          piani.length === 0 ? styles.emptyList : styles.list
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={() => {
              void sync();
            }}
            tintColor={colors.emerald}
            colors={[colors.emerald]}
          />
        }
        ListHeaderComponent={
          piani.length > 0 ? (
            <Text style={styles.hint}>
              Scorri in basso per sincronizzare
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="📚"
            title="Nessun piano in cache"
            body="Collega il PC e sincronizza per scaricare i piani pronti."
            actionLabel={syncing ? "Sincronizzo…" : "Sincronizza"}
            onAction={() => {
              void sync();
            }}
          />
        }
        renderItem={({ item }) => (
          <PianoCard item={item} onPress={() => onOpenPiano(item.piano.id)} />
        )}
      />
    </Screen>
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
  const total = Math.max(1, item.roadmap?.length ?? 0);
  const letter = (p.materia || "?").trim().charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadow.card,
        pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{letter}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            <Text style={styles.materia} numberOfLines={1}>
              {p.materia}
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
          <Text style={styles.argomenti} numberOfLines={2}>
            {p.argomenti}
          </Text>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.row}>
          <Text style={styles.meta}>
            {done}/{item.roadmap?.length ?? 0} tappe
          </Text>
          <Text style={styles.xp}>{xp} XP</Text>
        </View>
        <ProgressBar value={done} max={total} />
        <Text style={styles.metaSoft}>
          {item.flashcard?.length || 0} flashcard
          {item.quiz?.length ? ` · ${item.quiz.length} quiz` : ""}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  welcome: {
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  welcomeTitle: {
    marginTop: 16,
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -1,
  },
  welcomeSub: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
  linkBtn: { marginTop: 14, padding: 8 },
  linkText: { color: colors.emerald, fontWeight: "700", fontSize: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hello: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  gear: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  gearText: { fontSize: 18 },
  banner: {
    marginHorizontal: space.xl,
    marginBottom: space.sm,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.roseSoft,
  },
  bannerText: { color: colors.rose, fontSize: 12, fontWeight: "600" },
  hint: {
    fontSize: 12,
    color: colors.textSoft,
    marginBottom: 10,
    marginLeft: 4,
  },
  list: { paddingHorizontal: space.xl, paddingBottom: 48 },
  emptyList: { flexGrow: 1, paddingHorizontal: space.xl },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 14,
  },
  cardTop: { flexDirection: "row", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.emeraldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.emeraldDeep,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  materia: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  argomenti: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
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
  progressBlock: { marginTop: 14, gap: 6 },
  meta: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  metaSoft: { fontSize: 11, color: colors.textSoft, marginTop: 2 },
  xp: { fontSize: 12, fontWeight: "800", color: colors.emerald },
});
