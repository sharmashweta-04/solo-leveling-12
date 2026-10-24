# VIDEO_PROMPT.md: use the ARISE video in the frontend

The video was cut into web-ready pieces (already in `public/media/`):

| File | Time in original | Use |
| :-- | :-- | :-- |
| `intro.webm` / `intro.mp4` (4.9 s, with sound) | 0.0-4.9 s: purple flames + "ARISE", cyan light streak (3.3 s), flare peak (4.1 s), fades to near-black | Opening of every new session |
| `quest_arrival.webm` / `.mp4` (2.2 s, with sound) | 4.9-7.1 s: hologram globe, circuit lines, data burst | Once per game day when the dashboard first opens |
| `*_poster.webp` | stills | Shown instantly before the video starts (no black flash) |

Why video and not 240 separate frame images: the 4.9 s intro is 1.3 MB as video; the same frames as images would be
many times larger, slower and have no sound. `scripts/video-prep.sh` has an optional line to extract frames if you ever
need scroll-scrubbing.

## Paste into Antigravity
```
Read AGENTS.md and docs/VIDEO_PROMPT.md. Do not change game logic.
The media files and the components src/components/hud/IntroVideo.tsx, QuestArrival.tsx and hud-video.css already exist.

1. app/layout.tsx: import hud-video.css. Replace <OpeningCut /> with <IntroVideo effects={effects} />, where effects
   ('full' | 'lite' | 'off') comes from the saved Visual effects setting. IntroVideo falls back to OpeningCut by itself.
2. Dashboard: render <QuestArrival dayKey={gameDateString} effects={effects} /> once. dayKey is the IST game-day
   date (YYYY-MM-DD, 05:00 boundary) so it plays once per game day. Do not show it before Day 1 or after Day 45.
3. Settings: add "Replay intro" (remove sessionStorage key sl_opened, then reload), "Daily quest cutscene On/Off"
   (skip QuestArrival when off), and keep the Visual effects Full/Lite/Off setting. Lite uses the line-cut opening,
   Off skips both.
4. Sounds: the videos already contain sound. Do not also play sfx.activate while a video plays. unlockAudio() and
   the tap-to-enter gate stay (browsers need a tap before sound).
5. Do NOT cache /media files in the service worker (Safari needs HTTP Range requests for video). If a video fails
   to load (offline), the fallback opening must appear instead of a blank screen.
6. Test: first open (tap, video, fade into dashboard), reload in the same session (no intro), new day (cutscene once,
   SKIP works), reduced-motion on (both skipped), Lite and Off, 360px width. Run npm run build and npm test.
7. Describe each change in one line and update PROGRESS.md.
```
