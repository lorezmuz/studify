/**
 * Suoni UI (tono sintetico WAV base64) + haptic.
 * Stile allineato al web: tap, unlock, complete, xp, error, chest.
 */
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

let unlocked = false;

async function ensureAudio() {
  if (unlocked) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    unlocked = true;
  } catch {
    /* ignore */
  }
}

/** Genera un WAV mono 16-bit PCM a 22050 Hz come base64. */
function toneWavBase64(
  freqs: number[],
  durationSec: number,
  volume = 0.25
): string {
  const sampleRate = 22050;
  const n = Math.floor(sampleRate * durationSec);
  const data = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 40) * Math.exp(-t * 4.5);
    let s = 0;
    for (const f of freqs) {
      s += Math.sin(2 * Math.PI * f * t);
    }
    s = (s / freqs.length) * env * volume;
    data[i] = Math.max(-32767, Math.min(32767, Math.floor(s * 32767)));
  }
  const dataBytes = data.byteLength;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataBytes, true);
  new Uint8Array(buffer, 44).set(new Uint8Array(data.buffer));

  // base64
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa may not exist in RN — use manual base64
  return base64FromBinary(binary);
}

const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64FromBinary(bin: string): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bin.length; i += 3) {
    const n =
      (bin.charCodeAt(i) << 16) |
      (bin.charCodeAt(i + 1) << 8) |
      bin.charCodeAt(i + 2);
    out +=
      B64[(n >> 18) & 63] +
      B64[(n >> 12) & 63] +
      B64[(n >> 6) & 63] +
      B64[n & 63];
  }
  if (i < bin.length) {
    const a = bin.charCodeAt(i);
    const b = i + 1 < bin.length ? bin.charCodeAt(i + 1) : 0;
    const n = (a << 16) | (b << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bin.length ? B64[(n >> 6) & 63] : "=";
    out += "=";
  }
  return out;
}

const cache = new Map<string, string>();

function uriFor(key: string, factory: () => string) {
  let b64 = cache.get(key);
  if (!b64) {
    b64 = factory();
    cache.set(key, b64);
  }
  return `data:audio/wav;base64,${b64}`;
}

async function playUri(uri: string) {
  try {
    await ensureAudio();
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume: 0.85 }
    );
    sound.setOnPlaybackStatusUpdate((st) => {
      if (st.isLoaded && st.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    /* silent fail */
  }
}

export async function playTap() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await playUri(
    uriFor("tap", () => toneWavBase64([520], 0.07, 0.22))
  );
}

export async function playUnlock() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await playUri(
    uriFor("unlock", () => toneWavBase64([392, 523, 659], 0.28, 0.2))
  );
}

export async function playComplete() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await playUri(
    uriFor("complete", () => toneWavBase64([523, 659, 784], 0.32, 0.22))
  );
}

export async function playXp() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await playUri(
    uriFor("xp", () => toneWavBase64([880, 1175], 0.18, 0.18))
  );
}

export async function playError() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  await playUri(
    uriFor("error", () => toneWavBase64([220, 180], 0.22, 0.2))
  );
}

export async function playChest() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await playUri(
    uriFor("chest", () => toneWavBase64([330, 440, 554, 740], 0.4, 0.2))
  );
}

export async function playFlip() {
  void Haptics.selectionAsync();
  await playUri(
    uriFor("flip", () => toneWavBase64([640, 480], 0.09, 0.16))
  );
}

export async function playCorrect() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await playUri(
    uriFor("ok", () => toneWavBase64([660, 880], 0.16, 0.2))
  );
}
