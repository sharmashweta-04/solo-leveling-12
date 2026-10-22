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

## 3. Free Supabase Cloud Sync Setup (Prompt C)

To enable cross-device sync, account login, and cloud backup snapshots:

1. Create a free account at **[supabase.com](https://supabase.com)** and create a new project.
2. In Supabase Dashboard, navigate to **SQL Editor** → **New Query**.
3. Paste the contents of `supabase/schema.sql` from this repository and click **Run**. This sets up the `player_snapshots` and `player_snapshot_history` tables with Row Level Security (RLS).
4. Navigate to **Authentication** → **Providers** and ensure **Email** is enabled. (Optionally turn off "Confirm email" for testing).
5. In **Authentication** → **URL Configuration**, set Site URL to your Vercel URL and add `http://localhost:3000` to Redirect URLs.
6. In **Project Settings** → **API**, copy:
   - **Project URL**
   - **anon public key**
7. **Local development**: create `.env.local` in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```
8. **Vercel deployment**: in Vercel Project Settings → **Environment Variables**, add the same two variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
9. Trigger a redeploy on Vercel.

---

## 4. Local-First Data Security & Backup Vault
- Your progress, XP, MP, and SRS cards live in your phone's browser **IndexedDB** (`Dexie`).
- When logged in, changes automatically sync to your private Supabase cloud vault with optimistic concurrency and conflict detection.
- Offline play continues uninterrupted; queued changes sync automatically when reconnected.
- To backup or transfer your progress manually between devices, go to **Settings** (`/settings`) and tap **"EXPORT JSON"**.
- To rollback to any past cloud revision, go to **Settings** → **"RESTORE PREVIOUS VERSION"**.

