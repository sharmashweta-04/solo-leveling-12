'use client';
// src/components/hud/HudBackground.tsx: floating particles, energy waves, shimmering grid on #050816.
import { useEffect, useRef } from 'react';

type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; ph: number; c: string };

export default function HudBackground({ lite = false }: { lite?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0, last = 0, alive = true;
    let parts: P[] = [];

    const mk = (anywhere: boolean): P => ({
      x: Math.random() * w, y: anywhere ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.8, vx: (Math.random() - 0.5) * 0.12, vy: -(0.12 + Math.random() * 0.35),
      a: 0.25 + Math.random() * 0.6, ph: Math.random() * 6.28, c: Math.random() < 0.7 ? '0,191,255' : '0,255,255',
    });

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = lite ? 16 : Math.round(Math.min(70, Math.max(30, w / 12)));
      parts = Array.from({ length: n }, () => mk(true));
    };

    const frame = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, Math.max(w, h) * 0.85);
      g.addColorStop(0, '#0a1433'); g.addColorStop(1, '#050816');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      // shimmering holographic grid lines
      const step = 44;
      ctx.lineWidth = 1;
      for (let x = 0, i = 0; x <= w; x += step, i++) {
        ctx.strokeStyle = `rgba(0,255,255,${0.02 + 0.06 * Math.max(0, Math.sin(t * 0.8 + i * 0.7))})`;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0, j = 0; y <= h; y += step, j++) {
        ctx.strokeStyle = `rgba(0,255,255,${0.02 + 0.06 * Math.max(0, Math.sin(t * 0.7 + j * 0.9 + 2))})`;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // pulsing energy waves
      if (!lite) {
        for (let k = 0; k < 3; k++) {
          const base = h * (0.3 + k * 0.22);
          ctx.strokeStyle = `rgba(0,255,255,${0.05 + 0.05 * Math.sin(t * 0.9 + k)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 8) {
            const y = base + Math.sin(x * 0.012 + t * (0.8 + k * 0.25)) * (14 + k * 6) + Math.sin(x * 0.03 - t) * 4;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // drifting particles
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) Object.assign(p, mk(false));
        const tw = p.a * (0.6 + 0.4 * Math.sin(t * 2 + p.ph));
        ctx.fillStyle = `rgba(${p.c},${tw * 0.18})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, 6.283); ctx.fill();
        ctx.fillStyle = `rgba(${p.c},${tw})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    };

    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 33) return; // ~30 fps, paused when tab hidden
      last = now;
      frame(now);
    };

    resize();
    window.addEventListener('resize', resize);
    if (reduce) frame(0); else raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [lite]);

  return <canvas ref={ref} aria-hidden className="fixed inset-0 -z-10 pointer-events-none" />;
}
