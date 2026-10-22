'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import ConflictModal from '@/src/components/ConflictModal';
import GuestUploadModal from '@/src/components/GuestUploadModal';
import Navigation from '@/src/components/Navigation';
import HudBackground from '@/src/components/hud/HudBackground';
import OpeningCut from '@/src/components/hud/OpeningCut';

function AuthGuardWrapper({ children }: { children: React.ReactNode }) {
  const { user, isGuest, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [effectsMode, setEffectsMode] = React.useState<'full' | 'lite' | 'off'>('full');

  React.useEffect(() => {
    const updateEff = () => {
      try {
        const stored = localStorage.getItem('solo_visual_effects') as 'full' | 'lite' | 'off' | null;
        if (stored) {
          setEffectsMode(stored);
        } else if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
          setEffectsMode('lite');
        }
      } catch {
        // Ignore
      }
    };
    updateEff();
    window.addEventListener('solo_effects_changed', updateEff);
    return () => window.removeEventListener('solo_effects_changed', updateEff);
  }, []);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isLoading && !user && !isGuest && !isLoginPage) {
      router.replace('/login');
    }
  }, [user, isGuest, isLoading, isLoginPage, router]);

  if (isLoading && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--sys-bg)]">
        <div className="text-cyan-400 font-mono text-xs tracking-widest animate-pulse">
          [ SYSTEM ] LOADING HUNTER PROFILE...
        </div>
      </div>
    );
  }

  return (
    <>
      {effectsMode !== 'off' && (
        <div className="fixed inset-0 pointer-events-none -z-10">
          <HudBackground lite={effectsMode === 'lite'} />
        </div>
      )}
      <OpeningCut />
      {children}
      <ConflictModal />
      <GuestUploadModal />
      {!isLoginPage && <Navigation />}
    </>
  );
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuardWrapper>{children}</AuthGuardWrapper>
    </AuthProvider>
  );
}
