# UI_HUD_PROMPT.md: Blue Holographic HUD + Particles + Opening Cut + System Sounds

## Files in this folder (already type-checked against your project)

| File | Put it at | What it does |
| :-- | :-- | :-- |
| `HudBackground.tsx` | `src/components/hud/` | Full-screen canvas: #050816 background, drifting blue/cyan particles, pulsing cyan energy waves, shimmering grid lines. Capped at about 30 fps, paused when the tab is hidden, static if reduced-motion is on. |
| `HudFrame.tsx` | `src/components/hud/` | Glowing holographic panel with white corner brackets, a boxed "!" title bar, a scan-line, a "materialize" entrance and a gentle glow pulse. |
| `QuestInfoPanel.tsx` | `src/components/hud/` | The **QUEST INFO** window from your reference: `[Daily Quest: ... has arrived.]`, underlined **GOAL**, rows like `Push-ups [0/100] ☐`, and a **WARNING** line. |
| `OpeningCut.tsx` | `src/components/hud/` | "TAP TO ENTER THE SYSTEM", then a bright horizontal line cuts the screen and the two halves slide apart. Plays once per browser session. |
| `hud.css` | `src/components/hud/` | All HUD styles and keyframes. Palette: `#050816`, `#00BFFF`, `#00FFFF`. |
| `systemAudio.ts` | `src/utils/` | Synthesized sounds: `notify`, `activate`, `hum`, `quest`, `penalty`, `levelUp`, `click`. No audio files needed. |

## About the sounds
The real anime sound effects are copyrighted, so I didn't copy them. `systemAudio.ts` generates a similar digital chime, UI-activation sweep, hologram hum and quest notification in code. They sound close to that style, not identical. If you want real files, download only **CC0 / royalty-free** ones (for example from freesound.org with the CC0 filter, or Pixabay or Mixkit, and check each license). Use the search terms from your message, keep each file under about 100 KB, and ask Antigravity to load `public/sfx/*.mp3` first and fall back to the synthesized sound.

## Paste this into Antigravity (new chat, plan first)
```
Read AGENTS.md. Do not change game logic. Apply the Blue Holographic HUD look.

1. The six HUD files are already in src/components/hud/ and src/utils/. Import
   hud.css once in app/layout.tsx. Keep the old src/utils/audio.ts until all callers use systemAudio.ts.

2. Layout (app/layout.tsx): render <HudBackground lite={effects==='lite'} /> once, and <OpeningCut /> once.
   Remove opaque backgrounds (bg-hunter-950, bg-hunter-900/80, min-h-screen bg-*) from every page wrapper and
   card so the animated background shows through; panels should use translucent dark fills.
   Remove the body grid background-image in globals.css (the canvas draws the grid now).
   Tap-to-enter must be the first thing on every new session, because browsers only allow sound after a tap.

3. Convert the main cards on the dashboard, shop, raid, gate, grimoire, review, stats and settings pages to
   <HudFrame title="..."> (stagger the delay prop by 80 ms per card on page load). Convert the daily quest
   list to <QuestInfoPanel> using the real quests: heading "QUEST INFO", subtitle from
   config/system_messages.json ("daily_quest_arrived"), one row per quest with done/target counts,
   and the warning text from the same file. Rows keep their existing completion handlers.

4. Sounds (call unlockAudio() on the first tap, honour a Sound on/off setting via setSoundEnabled):
   - app opened after tap: sfx.activate() then sfx.hum() (already inside OpeningCut)
   - daily quest list appears / any [ SYSTEM ] toast: sfx.notify()
   - quest completed: sfx.quest()
   - level up or rank up: sfx.levelUp()
   - penalty or lockout message: sfx.penalty()
   - buttons: sfx.click() (very quiet)

5. Performance and accessibility (the user is on a mid-range Android phone):
   - Settings: "Visual effects: Full / Lite / Off" (Lite = fewer particles and no waves, Off = plain dark
     background, no animations) and "Sound: On / Off", both saved in settings.
   - Default to Lite on devices where navigator.hardwareConcurrency <= 4.
   - Respect prefers-reduced-motion. Keep text at least 12px with strong contrast on the glowing panels.
   - Test at 360, 380 and 414px. Make sure the canvas never blocks taps (pointer-events none).
   - Measure: dashboard must stay smooth while scrolling; if it janks, lower the particle count.

6. Run npm run build and npm test. Describe each visual change in one line. Update PROGRESS.md.
```

## Optional additions inspired by your habit-tracker screenshot
Ask for these one at a time, after the HUD is done:
1. **Skill areas with XP bars.** Show INT, VIT, AGI and PER each as `value / next-level` bars with their own small level. This matches the "Skill Points" card.
2. **45-day heatmap calendar.** One square per day in a weekly grid on `/stats`: dark = missed, dim blue = cleared, bright cyan = all-clear, a star = raid. This matches the "Track Your Progress" card.
3. **Goal completion bar.** A "Syllabus completion: X of 37 gates cleared" progress bar with a Level-up bar beneath it, on the dashboard.
4. **Radar chart with a glow** for the four stats (the spider chart in step 2 of the screenshot).

```
Add optional item N from hud/UI_HUD_PROMPT.md, using HudFrame and the existing data. Plan first, keep it
under 150 lines of new code, and do not change game logic.
```
