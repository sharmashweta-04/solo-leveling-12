'use client';
// src/components/hud/HudFrame.tsx: the stepped-corner, glowing white-blue frame with the top crest from the video's QUEST INFO window.
import type { ReactNode } from 'react';

export default function HudFrame({ title, icon = '!', delay = 0, className = '', children }:
  { title?: string; icon?: string; delay?: number; className?: string; children: ReactNode }) {
  return (
    <section className={`hud-frame hud2 ${className}`} style={{ ['--d' as string]: `${delay}ms` }}>
      <svg className="hud2-crest" viewBox="0 0 64 22" aria-hidden>
        <path d="M32 0 36 10 32 22 28 10Z M19 5 27 12 21 15Z M45 5 37 12 43 15Z" />
      </svg>
      <div className="hud2-edge">
        <div className="hud2-body">
          <span className="hud-scan" aria-hidden />
          {title && (
            <header className="hud2-title">
              <span className="hud2-icon" aria-hidden><i>{icon}</i></span>
              <h2>{title}</h2>
            </header>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
