import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { parsePairUrl } from "../lib/api";
import { colors } from "../theme";

type Props = {
  onScanned: (url: string) => void;
  onBack: () => void;
};

export function ScanQrScreen({ onScanned, onBack }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Richiesta permesso fotocamera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Serve la fotocamera</Text>
        <Text style={styles.muted}>
          Per scansionare il QR di /collega sul PC.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>Consenti fotocamera</Text>
        </Pressable>
        <Pressable onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={styles.backText}>← Indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.backText}>← Annulla</Text>
        </Pressable>
        <Text style={styles.title}>Scansiona QR</Text>
        <Text style={styles.muted}>
          Inquadra il QR su http://PC:3005/collega
        </Text>
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            locked
              ? undefined
              : ({ data }) => {
                  const base = parsePairUrl(String(data || ""));
                  if (!base) {
                    setErr("QR non riconosciuto. Usa quello di Studify /collega.");
                    return;
                  }
                  setLocked(true);
                  setErr(null);
                  onScanned(base);
                }
          }
        />
        <View style={styles.frame} pointerEvents="none" />
      </View>

      {err ? <Text style={styles.err}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  backText: { color: "#6ee7b7", fontWeight: "600", marginBottom: 8 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fafafa",
    marginBottom: 4,
  },
  muted: { color: "#a1a1aa", fontSize: 14, lineHeight: 20, textAlign: "center" },
  cameraWrap: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#18181b",
  },
  frame: {
    position: "absolute",
    top: "22%",
    left: "12%",
    right: "12%",
    bottom: "22%",
    borderWidth: 2,
    borderColor: "#34d399",
    borderRadius: 16,
  },
  err: {
    color: "#fda4af",
    textAlign: "center",
    padding: 16,
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.emerald,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
});
