'use client';

import { useEffect } from 'react';

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // console.log('PWA ServiceWorker registered:', registration.scope);
          })
          .catch((error) => {
            // console.log('ServiceWorker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
