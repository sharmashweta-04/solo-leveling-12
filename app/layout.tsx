import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Solo Leveling: Class 12 PCB Dungeon',
  description: 'Gamified 45-day Class 12 PCB revision system. Arise, Hunter.',
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#080c10',
};

import Navigation from '@/src/components/Navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-hunter-950 text-hunter-100">
        <main>{children}</main>
        <Navigation />
      </body>
    </html>
  );
}
