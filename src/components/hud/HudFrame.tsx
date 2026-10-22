'use client';
// src/components/hud/HudFrame.tsx: glowing blue holographic panel that materializes with a scan line.
import type { ReactNode } from 'react';

export default function HudFrame({
  title, icon = '!', delay = 0, className = '', children,
}: { title?: string; icon?: string; delay?: number; className?: string; children: ReactNode }) {
  return (
    <section className={`hud-frame ${className}`} style={{ ['--d' as string]: `${delay}ms` }}>
      <span className="hud-corner tl" /><span className="hud-corner tr" />
      <span className="hud-corner bl" /><span className="hud-corner br" />
      <span className="hud-scan" aria-hidden />
      <div className="hud-inner">
        {title && (
          <header className="hud-title">
            <span className="hud-icon" aria-hidden>{icon}</span>
            <h2>{title}</h2>
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
