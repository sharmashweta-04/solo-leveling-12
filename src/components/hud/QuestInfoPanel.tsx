'use client';
// src/components/hud/QuestInfoPanel.tsx: the "QUEST INFO" window (Strength Training style).
import HudFrame from './HudFrame';

export interface QuestItem { id: string; label: string; done: number; target: number; unit?: string }

export default function QuestInfoPanel({
  heading = 'QUEST INFO', subtitle, items, warning, onToggle,
}: {
  heading?: string;
  subtitle: string;                       // e.g. "Daily Quest: Preparation to Become Strong has arrived."
  items: QuestItem[];
  warning?: string;
  onToggle?: (id: string) => void;
}) {
  return (
    <HudFrame title={heading} icon="!">
      <p className="hud-sub">[{subtitle}]</p>
      <h3 className="hud-goal"><span>GOAL</span></h3>
      <ul className="hud-goals">
        {items.map((q) => {
          const ok = q.done >= q.target;
          return (
            <li key={q.id}>
              <button type="button" className="hud-row" onClick={() => onToggle?.(q.id)} aria-pressed={ok}>
                <span className="hud-row-label">{q.label}</span>
                <span className="hud-row-count">[{q.done}/{q.target}{q.unit ?? ''}]</span>
                <span className={`hud-check ${ok ? 'on' : ''}`} aria-hidden>{ok ? '✓' : ''}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {warning && <p className="hud-warning"><b>WARNING:</b> {warning}</p>}
    </HudFrame>
  );
}
