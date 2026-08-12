import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useApp } from "../context/AppContext";
import { healthCheck, parsePairUrl } from "../lib/api";
import { setCache, clearOutbox } from "../lib/storage";
import { colors, radius, space } from "../theme";
import {
  BackLink,
  Card,
  PrimaryButton,
  Screen,
  SectionLabel,
  StatusPill,
  Title,
} from "../components/ui";

type Props = {
  onBack: () => void;
  onPair: () => void;
};

export function SettingsScreen({ onBack, onPair }: Props) {
  const {
    settings,
    setBaseUrl,
    sync,
    syncing,
    outboxCount,
    online,
    refreshLocal,
  } = useApp();
  const [url, setUrl] = useState(settings.baseUrl);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveAndTest() {
    const parsed = parsePairUrl(url) || url.trim();
    if (!parsed) {
      setMsg("Inserisci un URL valido, es. http://192.168.1.10:3005");
      return;
    }
    await setBaseUrl(parsed);
    setUrl(parsed);
    const h = await healthCheck(parsed);
    if (h.ok) {
      setMsg(`OK · ${h.pianiPronti ?? 0} piani pronti sul PC`);
      await sync();
    } else {
      setMsg(`Non raggiungibile: ${h.error}`);
    }
  }

  async function clearCache() {
    Alert.alert(
      "Svuota cache",
      "Rimuove i piani salvati sul telefono. I dati sul PC restano.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Svuota",
          style: "destructive",
          onPress: async () => {
            await setCache([]);
            await clearOutbox();
            await refreshLocal();
            setMsg("Cache svuotata");
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <BackLink label="Home" onPress={onBack} />
        <Title subtitle="Connessione PC, sync e cache locale">
          Impostazioni
        </Title>

        <View style={styles.statusRow}>
          <StatusPill
            online={online}
            onlineLabel="PC raggiungibile"
            offlineLabel="PC non in rete"
          />
        </View>

        <SectionLabel>Server LAN</SectionLabel>
        <Text style={styles.label}>Indirizzo PC</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://192.168.1.10:3005"
          placeholderTextColor={colors.textSoft}
        />
        <PrimaryButton
          label="Salva e prova"
          onPress={() => void saveAndTest()}
        />
        <View style={{ height: 10 }} />
        <PrimaryButton
          label="Apri pairing / QR"
          onPress={onPair}
          variant="secondary"
        />
        <View style={{ height: 10 }} />
        <PrimaryButton
          label={syncing ? "Sincronizzo…" : "Sincronizza ora"}
          onPress={() =>
            void sync().then((r) =>
              setMsg(r.error || `Sync: ${r.count ?? 0} piani`)
            )
          }
          variant="secondary"
          loading={syncing}
          disabled={syncing}
        />

        <SectionLabel>Stato</SectionLabel>
        <Card>
          <InfoRow
            label="Ultimo sync"
            value={
              settings.lastSyncAt
                ? new Date(settings.lastSyncAt).toLocaleString()
                : "mai"
            }
          />
          <InfoRow label="Outbox" value={`${outboxCount} mutazioni`} />
          <InfoRow
            label="URL"
            value={settings.baseUrl || "—"}
            mono
          />
        </Card>

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}

        <View style={{ marginTop: 28 }}>
          <PrimaryButton
            label="Svuota cache locale"
            onPress={() => void clearCache()}
            variant="danger"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[styles.infoValue, mono && styles.mono]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.xl, paddingBottom: 48 },
  statusRow: { marginBottom: space.md },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSoft,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: "600" },
  mono: { fontFamily: "monospace", fontSize: 12 },
  msg: {
    marginTop: 14,
    fontSize: 13,
    color: colors.emeraldDeep,
    fontWeight: "600",
  },
});
