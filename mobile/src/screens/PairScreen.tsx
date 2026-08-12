import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useApp } from "../context/AppContext";
import { healthCheck, parsePairUrl } from "../lib/api";
import { colors, radius, space } from "../theme";
import {
  BackLink,
  BrandMark,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";

type Props = {
  onDone: () => void;
  onBack: () => void;
  onScanQr: () => void;
  initialUrl?: string;
};

export function PairScreen({ onDone, onBack, onScanQr, initialUrl }: Props) {
  const { setBaseUrl, sync } = useApp();
  const [input, setInput] = useState(initialUrl || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (!initialUrl) return;
    setInput(initialUrl);
    void (async () => {
      const base = parsePairUrl(initialUrl);
      if (!base) return;
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
        if (r.online) setTimeout(onDone, 600);
      } finally {
        setBusy(false);
      }
    })();
  }, [initialUrl, setBaseUrl, sync, onDone]);

  async function connect(raw?: string) {
    const base = parsePairUrl(raw ?? input);
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
      setInput(base);
      const r = await sync();
      setMsg(
        r.online
          ? `Connesso · ${r.count ?? 0} piani scaricati`
          : r.error || "Connesso ma sync incompleto"
      );
      if (r.online) setTimeout(onDone, 600);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <BackLink label="Home" onPress={onBack} />
        <View style={styles.hero}>
          <BrandMark size={52} />
          <Title subtitle="Stesso Wi‑Fi del PC · porta 3005">
            Collega al PC
          </Title>
        </View>

        <View style={styles.steps}>
          <Step n={1} text="Sul PC apri /collega" />
          <Step n={2} text="Scansiona il QR o copia l’URL" />
          <Step n={3} text="Sincronizza i piani" />
        </View>

        <PrimaryButton
          label="📷  Scansiona QR"
          onPress={onScanQr}
          disabled={busy}
        />
        <View style={{ height: 14 }} />

        <Text style={styles.label}>Oppure URL / link pairing</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://192.168.1.10:3005"
          placeholderTextColor={colors.textSoft}
        />

        <PrimaryButton
          label={busy ? "Connetto…" : "Connetti e sincronizza"}
          onPress={() => void connect()}
          loading={busy}
          disabled={busy}
          variant="secondary"
        />

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>Suggerimenti</Text>
          <Text style={styles.tipText}>
            · PC e telefono sulla stessa rete Wi‑Fi{"\n"}
            · Windows: firewall TCP 3005 rete privata{"\n"}
            · Backend avviato: npm run dev o Docker
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepN}>
        <Text style={styles.stepNText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.xl, paddingBottom: 48 },
  hero: { alignItems: "flex-start", gap: 12, marginBottom: 4 },
  steps: { marginBottom: 22, gap: 10 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepN: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.emeraldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNText: { fontWeight: "800", color: colors.emeraldDeep, fontSize: 13 },
  stepText: { fontSize: 14, color: colors.text, fontWeight: "600" },
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
  msg: {
    marginTop: 14,
    fontSize: 14,
    color: colors.emeraldDeep,
    lineHeight: 20,
    fontWeight: "600",
  },
  tip: {
    marginTop: 28,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.amberSoft,
  },
  tipTitle: { fontWeight: "800", color: colors.text, marginBottom: 6 },
  tipText: { fontSize: 13, color: colors.text, lineHeight: 20 },
});
