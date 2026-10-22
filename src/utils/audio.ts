/**
 * Sound preferences helpers & Soft holographic system chime using Web Audio API (zero audio files needed).
 */

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('sound_enabled') !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sound_enabled', enabled ? 'true' : 'false');
}

export function playSystemChime(): void {
  if (!isSoundEnabled()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Primary fundamental tone (electric blue resonance: 880Hz / A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    
    // Harmonic overtone (1760Hz / A6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    const now = ctx.currentTime;

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, now);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.04, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.45);
    osc2.stop(now + 0.3);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch (err) {
    // Graceful fallback if Web Audio is blocked or not available
  }
}
