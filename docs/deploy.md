# Deployment & Installation Guide

This guide describes how to deploy **Solo Leveling: Class 12 PCB Dungeon** completely free on **Vercel** or **Cloudflare Pages**, and how to install it as an offline PWA on your phone home screen.

---

## 1. Free Deployment on Vercel (Recommended — 2 Minutes)

Because your code is already pushed to GitHub at [github.com/sharmashweta-04/solo-leveling-12](https://github.com/sharmashweta-04/solo-leveling-12):

1. Go to **[vercel.com](https://vercel.com/)** and log in with your GitHub account.
2. Click **"Add New..."** → **"Project"**.
3. Select your repository: **`sharmashweta-04/solo-leveling-12`**.
4. In the Project Configuration:
   - **Framework Preset**: Next.js (automatically detected)
   - **Root Directory**: `./`
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)
5. Click **"Deploy"**.
6. In ~60 seconds, your site will be live at a free HTTPS URL like:
   `https://solo-leveling-12.vercel.app`

---

## 2. Installing on Mobile Phone Home Screen (Offline PWA)

### Android (Chrome / Brave / Edge)
1. Open your deployed URL (e.g. `https://solo-leveling-12.vercel.app`) on your mobile browser.
2. Tap the three dots menu (top-right corner).
3. Tap **"Install app"** or **"Add to Home screen"**.
4. The Solo Leveling icon will appear on your phone home screen, running in standalone fullscreen without browser bars, and working 100% offline!

### iOS (Safari on iPhone / iPad)
1. Open the URL in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up at the bottom).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** (top-right).

---

## 3. Local-First Data Security
- Your progress, XP, MP, and SRS cards live in your phone's browser **IndexedDB** (`Dexie`).
- To backup or transfer your progress between devices, go to **Settings** (`/settings`) and tap **"EXPORT JSON"**.
- To restore, tap **"IMPORT JSON"** and choose your saved backup file.
