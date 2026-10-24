'use client';
// src/components/hud/HudBackground.tsx: night-city data network: glowing nodes joined by lines, light trails, optional globe backdrop.
import { useEffect, useRef } from 'react';

type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; ph: number; c: string };

export default function HudBackground({ lite = false, image = '/media/bg_globe.webp' }: { lite?: boolean; image?: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const veil = image && !lite ? 0.6 : 1;
    let w = 0, h = 0, raf = 0, last = 0, alive = true; let parts: P[] = [];
    const mk = (any: boolean): P => ({ x: Math.random() * w, y: any ? Math.random() * h : h + 10, r: 0.8 + Math.random() * 1.9,
      vx: (Math.random() - 0.5) * 0.15, vy: -(0.1 + Math.random() * 0.3), a: 0.35 + Math.random() * 0.6, ph: Math.random() * 6.28,
      c: Math.random() < 0.78 ? '92,200,255' : '150,110,255' });
    const resize = () => { w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: lite ? 18 : Math.round(Math.min(48, Math.max(26, w / 14))) }, () => mk(true)); };
    const frame = (now: number) => {
      const t = now / 1000; ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(3,8,24,${veil})`; ctx.fillRect(0, 0, w, h);
      if (!lite) for (let k = 0; k < 4; k++) {            // light trails (the blue data highways)
        const y = h * (0.6 + k * 0.09) + Math.sin(t * 0.4 + k) * 8, x = ((t * (40 + k * 18) + k * 160) % (w + 320)) - 160;
        const g = ctx.createLinearGradient(x, 0, x + 260, 0);
        g.addColorStop(0, 'rgba(92,200,255,0)'); g.addColorStop(0.5, 'rgba(160,225,255,.45)'); g.addColorStop(1, 'rgba(92,200,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 260, y + 14); ctx.stroke();
      }
      for (const p of parts) { p.x += p.vx; p.y += p.vy; if (p.y < -10) Object.assign(p, mk(false)); }
      ctx.lineWidth = 1;
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {   // network lines
        const dx = parts[i].x - parts[j].x, dy = parts[i].y - parts[j].y, d = Math.hypot(dx, dy);
        if (d < 120) { ctx.strokeStyle = `rgba(92,200,255,${(1 - d / 120) * 0.3})`; ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(parts[j].x, parts[j].y); ctx.stroke(); }
      }
      for (const p of parts) {
        const tw = p.a * (0.6 + 0.4 * Math.sin(t * 2 + p.ph));
        ctx.fillStyle = `rgba(${p.c},${tw * 0.2})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, 6.283); ctx.fill();
        ctx.fillStyle = `rgba(${p.c},${tw})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    };
    const loop = (now: number) => { if (!alive) return; raf = requestAnimationFrame(loop); if (document.hidden || now - last < 33) return; last = now; frame(now); };
    resize(); addEventListener('resize', resize);
    if (reduce) frame(0); else raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }, [lite, image]);
  return (
    <>
      {image && !lite && <div aria-hidden className="fixed inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />}
      <canvas ref={ref} aria-hidden className="fixed inset-0 -z-10 pointer-events-none" />
    </>
  );
}
