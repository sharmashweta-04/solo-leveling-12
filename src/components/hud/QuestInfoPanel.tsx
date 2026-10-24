'use client';
// src/components/hud/QuestInfoPanel.tsx: layout copied from the video frame (title bar, [subtitle], GOAL, boxed rows, WARNING).
import HudFrame from './HudFrame';

export interface QuestItem { id: string; label: string; done: number; target: number; unit?: string }

export default function QuestInfoPanel({ heading = 'QUEST INFO', subtitle, items, warning, onToggle }:
  { heading?: string; subtitle: string; items: QuestItem[]; warning?: string; onToggle?: (id: string) => void }) {
  return (
    <HudFrame title={heading}>
      <p className="hud2-sub">[{subtitle}]</p>
      <div className="hud2-div" />
      <h3 className="hud2-goal">GOAL</h3>
      <div className="hud2-goalline" />
      <ul className="hud2-goals">
        {items.map((q) => {
          const ok = q.done >= q.target;
          return (
            <li key={q.id}>
              <button type="button" className="hud2-row" onClick={() => onToggle?.(q.id)} aria-pressed={ok}>
                <span className="hud2-label">{q.label}</span>
                <span className="hud2-count">[{q.done}/{q.target}{q.unit ?? ''}]</span>
                <span className={`hud2-check ${ok ? 'on' : ''}`} aria-hidden>{ok ? '✓' : ''}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {warning && (<><div className="hud2-div" /><p className="hud2-warning"><b>WARNING:</b> {warning}</p></>)}
    </HudFrame>
  );
}
