"use client";

/** Suoni UI stile app studio (Web Audio, zero file esterni) */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.08,
  when = 0
) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playTap() {
  void ac()?.resume();
  tone(520, 0.06, "sine", 0.05);
}

export function playUnlock() {
  void ac()?.resume();
  tone(392, 0.08, "triangle", 0.06, 0);
  tone(523, 0.1, "triangle", 0.06, 0.07);
  tone(659, 0.14, "triangle", 0.07, 0.14);
}

export function playComplete() {
  void ac()?.resume();
  tone(523, 0.09, "sine", 0.07, 0);
  tone(659, 0.09, "sine", 0.07, 0.08);
  tone(784, 0.16, "sine", 0.08, 0.16);
}

export function playXp() {
  void ac()?.resume();
  tone(880, 0.07, "square", 0.035, 0);
  tone(1175, 0.12, "square", 0.04, 0.06);
}

export function playError() {
  void ac()?.resume();
  tone(220, 0.12, "sawtooth", 0.04, 0);
  tone(180, 0.15, "sawtooth", 0.035, 0.08);
}

export function playChest() {
  void ac()?.resume();
  tone(330, 0.08, "triangle", 0.06, 0);
  tone(440, 0.08, "triangle", 0.06, 0.07);
  tone(554, 0.08, "triangle", 0.06, 0.14);
  tone(740, 0.18, "triangle", 0.07, 0.22);
}
