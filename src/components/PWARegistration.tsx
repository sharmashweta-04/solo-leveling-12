'use client';

import { useEffect, useState } from 'react';
import { sfx } from '@/src/utils/systemAudio';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWARegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.location.protocol.startsWith('http')) {
      return;
    }

    // Capture install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = promptEvent;
      
      // If not previously dismissed this session
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // If there's an already waiting worker
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setUpdateAvailable(true);
        }

        // Detect new workers installing
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
              sfx.quest();
            }
          });
        });

        // Check for updates whenever window regains focus
        window.addEventListener('focus', () => {
          reg.update().catch(() => {});
        });
      })
      .catch(() => {});

    // Reload when the new controller takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleApplyUpdate = () => {
    sfx.click();
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    sfx.click();
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa_prompt_dismissed', '1');
  };

  return (
    <>
      {/* 1. New Version / Update Notification Banner */}
      {updateAvailable && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-md p-3 bg-[#030a18]/95 border-2 border-cyan-300 shadow-[0_0_20px_rgba(92,200,255,0.6)] backdrop-blur-md flex items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-bold text-cyan-200" style={{ fontFamily: 'var(--font-cinzel)' }}>
              SYSTEM UPGRADE READY
            </div>
            <div className="text-[#9bbacf] text-[11px]">
              A new version has been deployed. Tap update to apply.
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplyUpdate}
            className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-400 text-cyan-100 font-bold uppercase tracking-wider text-xs whitespace-nowrap shadow-[0_0_10px_rgba(92,200,255,0.4)]"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            UPDATE ⚡
          </button>
        </div>
      )}

      {/* 2. Install App Banner (if browser supports install prompt and not yet installed) */}
      {showInstallBanner && installPrompt && !updateAvailable && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[190] w-[92%] max-w-md p-3 bg-[#030a18]/95 border border-cyan-500/50 shadow-[0_0_20px_rgba(92,200,255,0.4)] backdrop-blur-md flex items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-bold text-cyan-200" style={{ fontFamily: 'var(--font-cinzel)' }}>
              INSTALL SYSTEM ON DEVICE
            </div>
            <div className="text-[#9bbacf] text-[11px]">
              Install app for full-screen offline access.
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleInstallApp}
              className="px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400 text-cyan-100 font-bold uppercase text-[11px] whitespace-nowrap"
              style={{ fontFamily: 'var(--font-cinzel)' }}
            >
              INSTALL 📱
            </button>
            <button
              type="button"
              onClick={handleDismissInstall}
              className="text-[#9bbacf] hover:text-white p-1 text-sm font-bold"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

