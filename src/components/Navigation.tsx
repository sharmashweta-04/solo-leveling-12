'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { label: 'SYSTEM', href: '/', icon: '⚡' },
    { label: 'FOCUS', href: '/focus', icon: '⏱️' },
    { label: 'DUNGEON', href: '/dungeon', icon: '⛩️' },
    { label: 'SHOP', href: '/shop', icon: '💎' },
    { label: 'REVIEW', href: '/review', icon: '📜' },
    { label: 'STATS', href: '/stats', icon: '📊' },
    { label: 'SETTINGS', href: '/settings', icon: '⚙️' }
  ];

  // Don't show bottom nav on full-screen intro
  if (pathname === '/intro') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-hunter-950/95 border-t border-hunter-blue/40 backdrop-blur-md">
      <div className="max-w-md mx-auto flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded transition-all ${
                isActive
                  ? 'text-hunter-blue font-bold shadow-[0_0_10px_rgba(0,217,255,0.4)] bg-hunter-blue/15'
                  : 'text-hunter-gray hover:text-hunter-300'
              }`}
            >
              <span className="text-base leading-none mb-1">{item.icon}</span>
              <span className="text-[9px] tracking-wider font-mono">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
