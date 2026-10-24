'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  // Close sheet when pathname changes
  useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  // Don't show bottom nav on full-screen intro
  if (pathname === '/intro') return null;

  const mainTabs = [
    { label: 'SYSTEM', href: '/', icon: '⚡' },
    { label: 'FOCUS', href: '/focus', icon: '⏱️' },
    { label: 'DUNGEON', href: '/dungeon', icon: '⛩️' },
    { label: 'SHOP', href: '/shop', icon: '💎' },
  ];

  const moreItems = [
    { label: 'DAILY QUESTS', href: '/', icon: '⚔️', desc: 'Active hunter objectives' },
    { label: 'BOSS RAID', href: '/raid', icon: '🩸', desc: '3-hour PW mock test' },
    { label: 'GRIMOIRE', href: '/grimoire', icon: '📖', desc: 'NCERT error notebook' },
    { label: 'SRS REVIEW', href: '/review', icon: '🧠', desc: 'Spaced repetition flashcards' },
    { label: 'SHADOW ARMY', href: '/shadows', icon: '👥', desc: 'Extracted chapter shadows' },
    { label: 'HUNTER STATS', href: '/stats', icon: '📊', desc: 'Radar & performance metrics' },
    { label: 'SYSTEM SETTINGS', href: '/settings', icon: '⚙️', desc: 'Sound, backup, reset' },
  ];

  const isMoreActive = ['/raid', '/grimoire', '/review', '/shadows', '/stats', '/settings'].includes(pathname);

  return (
    <>
      {/* MORE SHEET MODAL */}
      {showMore && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMore(false)}
          />

          {/* Slide-up Sheet */}
          <div className="relative z-10 w-full max-w-md mx-auto bg-[#030a18] border-t-2 border-[#5cc8ff] rounded-t-2xl p-4 shadow-[0_-10px_35px_rgba(92,200,255,0.35)] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#5cc8ff]/30 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base text-[#5cc8ff]">⚡</span>
                <span className="text-xs font-bold font-[family-name:var(--font-cinzel)] tracking-widest text-[#dff3ff] drop-shadow-[0_0_8px_rgba(92,200,255,0.8)]">
                  [ SYSTEM DIRECTORY ]
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMore(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8ab4d8] hover:text-white text-base font-bold transition-colors"
                aria-label="Close directory"
              >
                ✕
              </button>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {moreItems.map((item) => {
                const isActive = pathname === item.href && (item.href !== '/' || pathname === '/');
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`min-h-[48px] px-3.5 py-2.5 rounded border transition-all flex items-center gap-3 ${
                      isActive
                        ? 'border-[#5cc8ff] bg-[#5cc8ff]/20 text-[#dff3ff] shadow-[0_0_12px_rgba(92,200,255,0.4)]'
                        : 'border-[#1b3558]/70 bg-[#050f24]/75 hover:border-[#5cc8ff]/50 text-[#dff3ff]'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold font-[family-name:var(--font-cinzel)] tracking-wider text-[#dff3ff]">{item.label}</div>
                      <div className="text-xs text-[#8ab4d8] font-[family-name:var(--font-cormorant)] font-semibold truncate">{item.desc}</div>
                    </div>
                    <span className="text-xs text-[#5cc8ff] font-bold">→</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#030a18]/95 border-t border-[#5cc8ff]/60 shadow-[0_-4px_20px_rgba(92,200,255,0.3)] backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-md mx-auto flex items-center justify-between px-2 h-16">
          {mainTabs.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center rounded transition-all font-[family-name:var(--font-cinzel)] ${
                  isActive
                    ? 'text-[#dff3ff] font-bold drop-shadow-[0_0_10px_rgba(92,200,255,0.9)] bg-[#5cc8ff]/20 border border-[#5cc8ff]/60'
                    : 'text-[#8ab4d8] hover:text-[#dff3ff]'
                }`}
              >
                <span className="text-base leading-none mb-1">{item.icon}</span>
                <span className="text-xs tracking-wider font-bold">{item.label}</span>
              </Link>
            );
          })}

          {/* MORE TAB BUTTON */}
          <button
            type="button"
            onClick={() => setShowMore((prev) => !prev)}
            className={`min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center rounded transition-all font-[family-name:var(--font-cinzel)] ${
              showMore || isMoreActive
                ? 'text-[#dff3ff] font-bold drop-shadow-[0_0_10px_rgba(92,200,255,0.9)] bg-[#5cc8ff]/20 border border-[#5cc8ff]/60'
                : 'text-[#8ab4d8] hover:text-[#dff3ff]'
            }`}
          >
            <span className="text-base leading-none mb-1">☰</span>
            <span className="text-xs tracking-wider font-bold">MORE</span>
          </button>
        </div>
      </nav>
    </>
  );
}
