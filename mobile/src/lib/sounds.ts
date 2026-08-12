/**
 * Suoni UI (WAV sintetico) + haptic — fail-safe, non crasha l'app.
 * Usa expo-audio (SDK 54) al posto di expo-av deprecato.
 */
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";

let audioReady = false;

async function ensureAudio() {
  if (audioReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "duckOthers",
    });
    audioReady = true;
  } catch {
    try {
      // API più permissiva se le option keys differiscono
      await setAudioModeAsync({ playsInSilentMode: true } as never);
      audioReady = true;
    } catch {
      /* ignore */
    }
  }
}

const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63];
    out += B64[(n >> 12) & 63];
    out += i + 1 < len ? B64[(n >> 6) & 63] : "=";
    out += i + 2 < len ? B64[n & 63] : "=";
  }
  return out;
}

function toneWavBase64(
  freqs: number[],
  durationSec: number,
  volume = 0.22
): string {
  const sampleRate = 16000;
  const n = Math.min(Math.floor(sampleRate * durationSec), sampleRate);
  const pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 50) * Math.exp(-t * 5);
    let s = 0;
    for (let f = 0; f < freqs.length; f++) {
      s += Math.sin(2 * Math.PI * freqs[f] * t);
    }
    s = (s / Math.max(1, freqs.length)) * env * volume;
    pcm[i] = (s * 32767) | 0;
  }

  const dataBytes = pcm.byteLength;
  const buf = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);
  const w = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) u8[off + i] = str.charCodeAt(i);
  };
  w(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  w(8, "WAVE");
  w(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, "data");
  view.setUint32(40, dataBytes, true);
  u8.set(new Uint8Array(pcm.buffer), 44);
  return bytesToBase64(u8);
}

const uriCache = new Map<string, string>();

function wavUri(key: string, factory: () => string): string {
  let uri = uriCache.get(key);
  if (!uri) {
    try {
      uri = `data:audio/wav;base64,${factory()}`;
      uriCache.set(key, uri);
    } catch {
      return "";
    }
  }
  return uri;
}

async function playUri(uri: string) {
  if (!uri) return;
  try {
    await ensureAudio();
    const player = createAudioPlayer({ uri });
    player.volume = 0.85;
    player.play();
    // rilascia dopo un po'
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        /* */
      }
    }, 1500);
  } catch {
    /* audio non critico */
  }
}

async function hap(
  kind: "light" | "medium" | "success" | "error" | "select"
) {
  try {
    if (kind === "light") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (kind === "medium") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (kind === "success") {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } else if (kind === "error") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      await Haptics.selectionAsync();
    }
  } catch {
    /* */
  }
}

export async function playTap() {
  void hap("light");
  await playUri(wavUri("tap", () => toneWavBase64([520], 0.06, 0.2)));
}

export async function playUnlock() {
  void hap("success");
  await playUri(
    wavUri("unlock", () => toneWavBase64([392, 523, 659], 0.22, 0.18))
  );
}

export async function playComplete() {
  void hap("success");
  await playUri(
    wavUri("complete", () => toneWavBase64([523, 659, 784], 0.25, 0.2))
  );
}

export async function playXp() {
  void hap("medium");
  await playUri(wavUri("xp", () => toneWavBase64([880, 1175], 0.14, 0.16)));
}

export async function playError() {
  void hap("error");
  await playUri(wavUri("error", () => toneWavBase64([220, 180], 0.16, 0.18)));
}

export async function playChest() {
  void hap("success");
  await playUri(
    wavUri("chest", () => toneWavBase64([330, 440, 554, 740], 0.3, 0.18))
  );
}

export async function playFlip() {
  void hap("select");
  await playUri(wavUri("flip", () => toneWavBase64([640, 480], 0.08, 0.14)));
}

export async function playCorrect() {
  void hap("success");
  await playUri(wavUri("ok", () => toneWavBase64([660, 880], 0.12, 0.18)));
}
