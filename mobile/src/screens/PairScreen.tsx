import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useApp } from "../context/AppContext";
import { healthCheck, parsePairUrl } from "../lib/api";
import { colors } from "../theme";

type Props = {
  onDone: () => void;
  onBack: () => void;
};

export function PairScreen({ onDone, onBack }: Props) {
  const { setBaseUrl, sync } = useApp();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function connect() {
    const base = parsePairUrl(input);
    if (!base) {
      setMsg(
        "Incolla l'URL del PC (http://192.168.x.x:3005) o un link studify://pair?…"
      );
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const h = await healthCheck(base);
      if (!h.ok) {
        setMsg(
          `PC non raggiungibile (${h.error}). Stesso Wi‑Fi? Firewall porta 3005?`
        );
        return;
      }
      await setBaseUrl(base);
      const r = await sync();
      setMsg(
        r.online
          ? `Connesso · ${r.count ?? 0} piani scaricati`
          : r.error || "Connesso ma sync incompleto"
      );
      if (r.online) {
        setTimeout(onDone, 600);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Indietro</Text>
      </Pressable>
      <Text style={styles.title}>Collega al PC</Text>
      <Text style={styles.sub}>
        1. Sul PC apri Studify e vai su{" "}
        <Text style={styles.mono}>/collega</Text>
        {"\n"}
        2. Copia l&apos;indirizzo (o scansiona il QR dal browser del telefono)
        {"\n"}
        3. Incolla qui sotto e connetti
      </Text>

      <Text style={styles.label}>URL o link pairing</Text>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="http://192.168.1.10:3005"
        placeholderTextColor={colors.textMuted}
      />

      <Pressable
        style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
        disabled={busy}
        onPress={() => void connect()}
      >
        <Text style={styles.primaryBtnText}>
          {busy ? "Connetto…" : "Connetti e sincronizza"}
        </Text>
      </Pressable>

      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <View style={styles.tip}>
        <Text style={styles.tipTitle}>Suggerimenti</Text>
        <Text style={styles.tipText}>
          · PC e telefono sulla stessa rete Wi‑Fi{"\n"}
          · Su Windows: firewall → porta TCP 3005 rete privata{"\n"}
          · Docker o npm run dev devono essere avviati sul PC
        </Text>
      </View>
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
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  mono: { fontFamily: "monospace", color: colors.text },
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
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  msg: { marginTop: 14, fontSize: 14, color: colors.emerald, lineHeight: 20 },
  tip: {
    marginTop: 28,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.amberSoft,
  },
  tipTitle: { fontWeight: "700", color: colors.text, marginBottom: 6 },
  tipText: { fontSize: 13, color: colors.text, lineHeight: 20 },
});
