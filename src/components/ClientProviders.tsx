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
      <div className="fixed inset-0 pointer-events-none -z-10">
        <HudBackground />
      </div>
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
