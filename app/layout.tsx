import type { Metadata, Viewport } from 'next';
import { cinzel, cormorant } from '@/src/components/hud/fonts';
import './globals.css';
import '@/src/components/hud/hud.css';
import '@/src/components/hud/hud-video.css';
import PWARegistration from '@/src/components/PWARegistration';

export const metadata: Metadata = {
  title: 'Solo Leveling: Class 12 PCB Dungeon',
  description: 'Gamified 45-day Class 12 PCB revision system. Arise, Hunter.',
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#030a18',
};

import ClientProviders from '@/src/components/ClientProviders';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${cinzel.variable} ${cormorant.variable}`}>
      <body className="antialiased min-h-screen text-[#dff3ff] bg-transparent flex flex-col selection:bg-[#5cc8ff]/30 selection:text-white">
        <PWARegistration />
        <ClientProviders>
          {/* Shared page wrapper with consistent safe-area bottom padding */}
          <div className="flex-1 w-full max-w-md mx-auto px-3.5 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
            <main>{children}</main>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
