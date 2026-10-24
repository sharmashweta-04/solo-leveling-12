// src/components/hud/fonts.ts: the video uses an elegant serif (Trajan/Cinzel style), NOT monospace.
import { Cinzel, Cormorant_Garamond } from 'next/font/google';
export const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['500', '700'], display: 'swap' });
export const cormorant = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-cormorant', weight: ['500', '600', '700'], display: 'swap' });
