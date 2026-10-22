'use client';
// src/components/hud/OpeningCut.tsx: tap-to-enter, then a bright horizontal line cuts the screen and the halves slide apart.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { sfx, unlockAudio } from '@/src/utils/systemAudio';

type Phase = 'gate' | 'line' | 'open' | 'done';

export default function OpeningCut({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<Phase>('gate');

  useEffect(() => {
    try {
      if (sessionStorage.getItem('sl_opened') === '1') { setPhase('done'); onDone?.(); }
    } catch { /* storage blocked: just show it */ }
  }, [onDone]);

  const enter = () => {
    if (phase !== 'gate') return;
    unlockAudio();
    sfx.activate();
    setPhase('line');
    setTimeout(() => setPhase('open'), 450);
    setTimeout(() => {
      setPhase('done');
      try { sessionStorage.setItem('sl_opened', '1'); } catch { /* ignore */ }
      sfx.hum();
      onDone?.();
    }, 1500);
  };

  if (phase === 'done') return null;
  const opening = phase === 'open';
  const half = 'fixed inset-x-0 h-1/2 bg-[#050816]';

  return (
    <div className="fixed inset-0 z-[100]" onClick={enter} role="button" aria-label="Enter the System">
      <motion.div className={`${half} top-0`} animate={{ y: opening ? '-100%' : 0 }} transition={{ duration: 0.85, ease: [0.7, 0, 0.2, 1] }} />
      <motion.div className={`${half} bottom-0`} animate={{ y: opening ? '100%' : 0 }} transition={{ duration: 0.85, ease: [0.7, 0, 0.2, 1] }} />
      {phase !== 'gate' && (
        <motion.div
          className="fixed left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 bg-white"
          style={{ boxShadow: '0 0 12px #00FFFF, 0 0 32px #00BFFF, 0 0 70px #00BFFF' }}
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: opening ? 0 : 1 }}
          transition={{ duration: opening ? 0.5 : 0.35 }}
        />
      )}
      {phase === 'gate' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 font-mono text-center px-6">
          <div className="text-[#00BFFF] tracking-[0.3em] text-sm animate-pulse">[ SYSTEM ]</div>
          <div className="text-[#bfeaff] tracking-[0.2em] text-base">TAP TO ENTER THE SYSTEM</div>
        </div>
      )}
    </div>
  );
}
