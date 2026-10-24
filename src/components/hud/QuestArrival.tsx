'use client';
// src/components/hud/QuestArrival.tsx: short hologram-globe cutscene, once per game day, then fades into the real quest panel.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EffectsLevel } from './IntroVideo';

export default function QuestArrival({ dayKey, effects = 'full', onDone }: { dayKey: string; effects?: EffectsLevel; onDone?: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'fading' | 'done'>('idle');
  const ref = useRef<HTMLVideoElement>(null);
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const key = `sl_arrival_${dayKey}`;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    document.documentElement.classList.remove('intro-playing');
    try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
    setPhase('fading');
    setTimeout(() => { setPhase('done'); doneRef.current?.(); }, 450);
  }, [key]);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(key) === '1'; } catch { /* ignore */ }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cutsceneEnabled = true;
    try {
      const stored = localStorage.getItem('solo_quest_cutscene');
      if (stored === 'false') cutsceneEnabled = false;
    } catch { /* ignore */ }
    const skipParam = typeof window !== 'undefined' && window.location.search.includes('skipIntro=1');
    if (seen || reduce || effects !== 'full' || !cutsceneEnabled || skipParam) { finished.current = true; setPhase('done'); return; }
    setPhase('playing');
    document.documentElement.classList.add('intro-playing');
    const v = ref.current;
    if (v) v.play().catch(() => { v.muted = true; v.play().catch(finish); });
    return () => document.documentElement.classList.remove('intro-playing');
  }, [key, effects, finish]);

  if (phase === 'done') return null;
  return (
    <div className="fixed inset-0 z-[90] bg-[#050816]"
      style={{ opacity: phase === 'fading' ? 0 : 1, transition: 'opacity .45s ease', pointerEvents: phase === 'fading' ? 'none' : 'auto' }}>
      <video ref={ref} className="absolute inset-0 h-full w-full object-cover" poster="/media/quest_arrival_poster.webp"
        playsInline preload="auto" onEnded={finish} onError={finish}
        onTimeUpdate={() => { const v = ref.current; if (v && v.duration && v.currentTime >= v.duration - 0.3) finish(); }}>
        <source src="/media/quest_arrival.webm" type="video/webm; codecs=vp9,opus" />
        <source src="/media/quest_arrival.mp4" type="video/mp4" />
      </video>
      <button type="button" onClick={finish}
        className="absolute right-4 min-h-[44px] rounded border border-[#5cc8ff]/60 bg-[#030a18]/75 px-4 font-[family-name:var(--font-cinzel)] font-bold text-xs tracking-widest text-[#dff3ff] shadow-[0_0_12px_rgba(92,200,255,0.5)]"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>SKIP</button>
    </div>
  );
}
