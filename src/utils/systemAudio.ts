// src/utils/systemAudio.ts: synthesized System sound effects (no audio files, no copyright issues).
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) { enabled = v; }

/** Call from a tap/click handler. Browsers block sound until the user interacts. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* audio unsupported */ }
}

function blip(f: number, t0: number, dur: number, type: OscillatorType, vol: number, f2?: number) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + t0;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function sweep(t0: number, dur: number, f1: number, f2: number, vol: number) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + t0;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 6;
  bp.frequency.setValueAtTime(f1, t);
  bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start(t);
}

export const sfx = {
  /** Digital chime: the "[ SYSTEM ]" notification. */
  notify() { blip(1318.5, 0, 0.2, 'sine', 0.18); blip(1760, 0.09, 0.4, 'sine', 0.16); blip(2637, 0.09, 0.3, 'triangle', 0.04); },
  /** Futuristic UI activation: used by the opening cut. */
  activate() { sweep(0, 0.7, 300, 4200, 0.09); blip(110, 0.35, 0.5, 'sine', 0.3, 50); blip(880, 0.6, 0.45, 'sine', 0.1); blip(1318.5, 0.68, 0.5, 'sine', 0.09); },
  /** Low hologram hum. */
  hum() { blip(55, 0, 1.4, 'sine', 0.06); blip(110.5, 0, 1.4, 'triangle', 0.025); },
  /** Quest appears or is completed. */
  quest() { [988, 1175, 1568].forEach((f, i) => blip(f, i * 0.09, 0.25, 'sine', 0.14)); },
  penalty() { blip(220, 0, 0.35, 'sawtooth', 0.1, 110); blip(196, 0.22, 0.45, 'sawtooth', 0.1, 90); },
  levelUp() { [523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, i * 0.08, 0.35, 'triangle', 0.13)); sweep(0, 0.6, 400, 5000, 0.06); },
  click() { blip(1800, 0, 0.04, 'square', 0.03); },
};
