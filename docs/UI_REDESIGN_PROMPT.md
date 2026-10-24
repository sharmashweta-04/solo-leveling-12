# UI_REDESIGN_PROMPT.md: make the whole app look like the video

My first HUD used monospace text and a plain rounded glowing box. The video does not look like that. This kit replaces it.
Reference images (open them and look at them before coding): `docs/reference/quest_panel.png` (the target),
`docs/reference/arise.png` and `docs/reference/globe.png`.

## What the video actually looks like (the spec)
1. **Typography is an elegant serif, never monospace.** Titles ("QUEST INFO", "GOAL", "ARISE") in Cinzel-style
   capitals with letter-spacing and a soft blue glow. Body, row labels and counts in Cormorant Garamond (600).
   Text colour pale ice-blue `#dff3ff`.
2. **Frame:** tall dark-navy panel (`#030a18` with a faint blue glow at the top), a bright white-blue border
   about 4px thick (`#f0fbff` to `#7fcbff`) with a glowing halo, **stepped / chamfered corners (not rounded)**,
   a small spiky crest in the centre of the top edge, and a thin inner frame line inset about 10px.
3. **Title bar:** a boxed bar with a circled "!" in a square on the left, and the title centred.
4. **Content order:** `[Daily Quest: ... has arrived.]`, divider with a small diamond, "GOAL" with a short underline
   and diamond, **boxed rows** (thin blue-grey border, dark fill) with label left, `[0/100]` right and a square
   checkbox at the far right, another diamond divider, then `WARNING:` (bold) and centred text.
5. **Background:** a dark night-city of glowing blue data lines and nodes (some purple), light trails,
   and a faint hologram globe. Not a plain black page with a grid.
6. **Motion:** panels materialize (flash, scale up from a thin line, scan line), nodes drift and link with lines.

## Files already provided (do not rewrite from scratch)
`src/components/hud/HudFrame.tsx`, `QuestInfoPanel.tsx`, `HudBackground.tsx`, `hud.css` (replaces the old one),
`fonts.ts`, and `public/media/bg_globe.webp`.

## Paste into Antigravity
```
Read AGENTS.md and docs/UI_REDESIGN_PROMPT.md and LOOK at the three images in docs/reference/.
My current UI does not match the video. Rebuild the look so every screen matches docs/reference/quest_panel.png.
Do not change game logic.

1. app/layout.tsx: import fonts from src/components/hud/fonts.ts and add cinzel.variable and cormorant.variable to the
   <html> className. Import src/components/hud/hud.css (this replaces the old hud.css; delete any old hud-* rules
   that conflict). Render <HudBackground lite={effects==='lite'} /> once. Set data-effects on <html> from the
   Visual effects setting so the lite rule in hud.css works.
2. Typography: remove monospace (JetBrains Mono, font-mono) from the whole app. Page titles and big numbers use
   var(--font-cinzel); all other text uses var(--font-cormorant) at 600 weight. Minimum size 15px for body text.
3. Replace EVERY card and panel on every page (dashboard, quests, focus, dungeon, gate, shop, raid, grimoire, review,
   shadows, stats, settings) with <HudFrame title="...">. No more rounded translucent boxes, no hunter-* border
   boxes. Lists inside panels use the boxed-row style (.hud2-row, .hud2-div, .hud2-goal) from hud.css.
4. The daily quest list must be <QuestInfoPanel> exactly as in the reference (title bar with circled "!", subtitle in
   square brackets, GOAL, boxed rows with [done/target] and a checkbox, WARNING). Use the real quests and
   config/system_messages.json texts.
5. Page wrappers must be transparent so the background shows (remove bg-hunter-*, bg-black and min-h-screen backgrounds).
   Bottom nav: dark navy with a thin glowing top line, Cinzel labels at least 12px, active tab glows blue.
6. Opening screen text ("TAP TO ENTER THE SYSTEM") and the intro lines use Cinzel with a blue glow.
7. VERIFY BY LOOKING: run the app, open it in the browser at 390x844, take screenshots of /, /quests, /dungeon and
   /shop, and compare each with docs/reference/quest_panel.png. Fix every difference in this checklist, then re-check:
   [ ] serif fonts, no monospace   [ ] stepped corners, not rounded   [ ] bright white-blue glowing border
   [ ] crest at top centre   [ ] boxed title with circled "!"   [ ] diamond dividers   [ ] boxed rows with checkboxes
   [ ] blue network background with nodes and light trails   [ ] text readable at 390px with no horizontal scroll
   Show me the final screenshots. Run npm run build.
8. Performance: if scrolling is janky on a mid-range phone, drop the drop-shadow filter and use Lite mode by default.
```
