'use client';
// src/components/hud/IntroVideo.tsx: tap-to-enter, then the ARISE flames + cyan light-streak video, then a smooth fade into the app.
import { useCallback, useEffect, useRef, useState } from 'react';
import OpeningCut from './OpeningCut';
import { sfx, unlockAudio } from '@/src/utils/systemAudio';

export type EffectsLevel = 'full' | 'lite' | 'off';
type Phase = 'gate' | 'playing' | 'fading' | 'done' | 'fallback';

export default function IntroVideo({ effects = 'full', onDone }: { effects?: EffectsLevel; onDone?: () => void }) {
  const [phase, setPhase] = useState<Phase>('gate');
  const ref = useRef<HTMLVideoElement>(null);
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    document.documentElement.classList.remove('intro-playing'); // un-pause the HUD "materialize" animations
    setPhase('fading');
    setTimeout(() => {
      setPhase('done');
      try { sessionStorage.setItem('sl_opened', '1'); } catch { /* ignore */ }
      doneRef.current?.();
    }, 500);
  }, []);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('sl_opened') === '1'; } catch { /* ignore */ }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData;
    if (seen || reduce || effects === 'off' || saveData) { finished.current = true; setPhase('done'); doneRef.current?.(); return; }
    if (effects === 'lite') { setPhase('fallback'); return; }
    document.documentElement.classList.add('intro-playing');
    return () => document.documentElement.classList.remove('intro-playing');
  }, [effects]);

  const start = async () => {
    const v = ref.current;
    if (!v || phase !== 'gate') return;
    unlockAudio();
    setPhase('playing');
    try { v.currentTime = 0; v.muted = false; await v.play(); }
    catch {
      try { v.muted = true; await v.play(); }          // sound blocked: play silently
      catch { sfx.activate(); setPhase('fallback'); }  // video blocked: use the line-cut + synthesized sound
    }
  };

  const onTime = () => {
    const v = ref.current;
    if (v && v.duration && v.currentTime >= v.duration - 0.45) finish(); // video ends on near-black: fade over the app
  };

  if (phase === 'done') return null;
  if (phase === 'fallback') return <OpeningCut onDone={() => doneRef.current?.()} />;

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#050816]"
      style={{ opacity: phase === 'fading' ? 0 : 1, transition: 'opacity .5s ease', pointerEvents: phase === 'fading' ? 'none' : 'auto' }}
    >
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        poster="/media/intro_poster.webp"
        playsInline
        preload="auto"
        onTimeUpdate={onTime}
        onEnded={finish}
        onError={() => setPhase('fallback')}
      >
        <source src="/media/intro.webm" type="video/webm; codecs=vp9,opus" />
        <source src="/media/intro.mp4" type="video/mp4" />
      </video>
      {phase === 'gate' && (
        <button type="button" onClick={start} aria-label="Enter the System"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#050816]/70 px-6 text-center font-mono">
          <span className="animate-pulse text-sm tracking-[0.3em] text-[#00BFFF]">[ SYSTEM ]</span>
          <span className="text-base tracking-[0.2em] text-[#bfeaff]">TAP TO ENTER THE SYSTEM</span>
        </button>
      )}
      {phase === 'playing' && (
        <button type="button" onClick={finish}
          className="absolute right-4 min-h-[44px] rounded border border-[#00BFFF]/60 bg-[#050816]/60 px-4 font-mono text-xs tracking-widest text-[#bfeaff]"
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          SKIP
        </button>
      )}
    </div>
  );
}
