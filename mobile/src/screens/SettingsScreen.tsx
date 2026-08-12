import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useApp } from "../context/AppContext";
import { healthCheck, parsePairUrl } from "../lib/api";
import { setCache, clearOutbox } from "../lib/storage";
import { colors } from "../theme";

type Props = {
  onBack: () => void;
  onPair: () => void;
};

export function SettingsScreen({ onBack, onPair }: Props) {
  const { settings, setBaseUrl, sync, syncing, outboxCount, online, refreshLocal } =
    useApp();
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
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Indietro</Text>
      </Pressable>
      <Text style={styles.title}>Impostazioni</Text>

      <Text style={styles.label}>Indirizzo PC (LAN)</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="http://192.168.1.10:3005"
        placeholderTextColor={colors.textMuted}
      />
      <Pressable style={styles.primaryBtn} onPress={() => void saveAndTest()}>
        <Text style={styles.primaryBtnText}>Salva e prova</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={onPair}>
        <Text style={styles.secondaryBtnText}>Apri pairing / istruzioni</Text>
      </Pressable>

      <Pressable
        style={[styles.secondaryBtn, syncing && { opacity: 0.6 }]}
        disabled={syncing}
        onPress={() => void sync().then((r) => setMsg(r.error || `Sync: ${r.count ?? 0} piani`))}
      >
        <Text style={styles.secondaryBtnText}>
          {syncing ? "Sincronizzo…" : "Sincronizza ora"}
        </Text>
      </Pressable>

      <View style={styles.infoBox}>
        <Text style={styles.infoLine}>
          Stato:{" "}
          {online === true ? "Online" : online === false ? "Offline" : "—"}
        </Text>
        <Text style={styles.infoLine}>
          Ultimo sync:{" "}
          {settings.lastSyncAt
            ? new Date(settings.lastSyncAt).toLocaleString()
            : "mai"}
        </Text>
        <Text style={styles.infoLine}>Outbox: {outboxCount} mutazioni</Text>
      </View>

      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <Pressable style={styles.dangerBtn} onPress={() => void clearCache()}>
        <Text style={styles.dangerBtnText}>Svuota cache locale</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { color: colors.emerald, fontWeight: "600", fontSize: 15 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: colors.emerald,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryBtnText: { color: colors.text, fontWeight: "600" },
  infoBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  infoLine: { fontSize: 13, color: colors.textMuted },
  msg: { marginTop: 12, fontSize: 13, color: colors.emerald },
  dangerBtn: {
    marginTop: 28,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerBtnText: { color: colors.rose, fontWeight: "600" },
});
