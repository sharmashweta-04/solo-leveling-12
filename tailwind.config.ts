import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // System Window core palette
        'sys-bg': '#080c10',          // near-black background
        'sys-panel': '#0d1117',       // holographic panel bg
        'sys-border': '#0ff',         // electric-blue border (cyan-400 equivalent)
        'sys-blue': '#00d4ff',        // primary electric blue
        'sys-blue-dim': '#0088aa',    // dimmed blue for secondary text
        'sys-blue-glow': '#00eeff33', // blue glow overlay
        'sys-text': '#c8e6f0',        // main text (off-white blue tint)
        'sys-text-dim': '#5f8a9a',    // secondary/muted text
        'sys-green': '#00ff88',       // success / Biology wing
        'sys-purple': '#a855f7',      // Chemistry wing
        'sys-red': '#ff3366',         // danger / penalty
        'sys-yellow': '#ffd700',      // gold / S-rank
        'sys-rank-e': '#888888',
        'sys-rank-d': '#6dcfff',
        'sys-rank-c': '#00ff88',
        'sys-rank-b': '#a855f7',
        'sys-rank-a': '#ffd700',
        'sys-rank-s': '#ff3366',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'sys': '0 0 20px rgba(0, 212, 255, 0.15), inset 0 0 20px rgba(0, 212, 255, 0.05)',
        'sys-glow': '0 0 40px rgba(0, 212, 255, 0.4)',
        'sys-sm': '0 0 10px rgba(0, 212, 255, 0.2)',
      },
      backgroundImage: {
        'sys-grid': 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'flicker': 'flicker 4s ease-in-out infinite',
        'scan': 'scanline 3s linear infinite',
        'type-blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,212,255,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(0,212,255,0.6), 0 0 60px rgba(0,212,255,0.2)' },
        },
        flicker: {
          '0%, 95%, 100%': { opacity: '1' },
          '96%': { opacity: '0.8' },
          '97%': { opacity: '1' },
          '98%': { opacity: '0.7' },
        },
        scanline: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100px' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
