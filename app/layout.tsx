import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import '@/src/components/hud/hud.css';
import '@/src/components/hud/hud-video.css';
import PWARegistration from '@/src/components/PWARegistration';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Solo Leveling: Class 12 PCB Dungeon',
  description: 'Gamified 45-day Class 12 PCB revision system. Arise, Hunter.',
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080c10',
};

import ClientProviders from '@/src/components/ClientProviders';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased min-h-screen bg-hunter-950 text-hunter-100 font-mono flex flex-col">
        <PWARegistration />
        <ClientProviders>
          {/* Shared page wrapper with consistent safe-area bottom padding */}
          <div className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
            <main>{children}</main>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
