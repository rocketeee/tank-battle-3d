---
name: testing-tank-battle-3d
description: End-to-end test the 萌坦大战 (Three.js tank battle) game — TPS controls, 5-skill system, studio intro, landscape lock, levels/bosses. Use when verifying gameplay UI/feature changes in this repo.
---

# Testing 萌坦大战 (tank-battle-3d)

Browser-only Three.js + Vite + TypeScript game (no backend, no login). All assets are procedural. Test by driving a real WebGL Chrome with Puppeteer and capturing frames/screenshots.

## Build & serve the build under test
```bash
npm run build                       # tsc --noEmit && vite build  (must exit 0)
npm run preview -- --port 4173 --strictPort   # serves dist/ at http://localhost:4173
```
Check the served bundle hash to be sure you're testing the new build:
`curl -s http://localhost:4173/ | grep -o 'index-[A-Za-z0-9]*\.js'`.

## QA URL params (src/game/Game.ts)
- `?level=N` — start on level N (0=森林, 1=沙漠/黄沙沙丘, 2=外星球/虚空外星基地).
- `?boss=1` — skip waves, go straight to the boss.

## Drive with Puppeteer (headless 'new' renders WebGL via SwiftShader)
`puppeteer-core` lives in `~/scratch/node_modules`. Chrome at `C:/devin/chrome/chrome-win64/chrome.exe`.
Required flags for WebGL in headless:
`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --no-sandbox`
Use `defaultViewport` + matching `--window-size`. Capture frames by calling `page.screenshot` in a loop while a key is held down — the game keeps animating via rAF between screenshots, so held-key motion (look/move) records smoothly. Assemble a video with ffmpeg: `ffmpeg -y -framerate 9 -i frames/f%05d.png -vf format=yuv420p -c:v libx264 out.mp4`.

## Controls — keybindings (desktop fallbacks, src/game/Input.ts + Game.ts)
- Move: `W/A/S/D` (camera-relative).
- Look (whole view, NOT just turret): hold `Q`/`E` (yaw) and `R`/`F` (pitch). Touch path is a drag inside `.aim-zone` → `lookDelta`.
- Fire: hold `J` (or `.btn.fire`). Bullets go toward the center crosshair (`resolveAimPoint`, with soft aim-assist onto enemies near screen center).
- Skills: `Space`=jump🔥, `Digit1`=spread🔱, `Digit2`=shield🛡️, `Digit3`=orbital☄️, `Digit4`=dash⚡ (or tap `.btn.skill[data-skill]`).

## Key DOM selectors / assertions (src/game/HUD.ts, main.ts, styles.css)
- Menu: `.overlay .bigbtn` (开始游戏). Start game by clicking it.
- Crosshair present + game playing: `.crosshair.show`.
- 5 skill buttons: `.btn.skill[data-skill]` (count === 5).
- Skill fired → button gains `cd` class: `.btn.skill.cd` (cooldown ring). Read it within ~1–2 frames of activation; cooldowns last seconds (jump 3s, spread 4.5s, shield 12s, orbital 13s, dash 5s).
- Score: `.score-val` textContent (rises on hits, e.g. 0 → 150).
- Studio intro: `.studio-intro` (black bg `rgb(0,0,0)`), letters in `.studio-logo span` spell `Rocke`, `.studio-tag` = STUDIO. Auto-dismiss ~2.8s (removed from DOM) → menu visible. Tap also dismisses.
- Landscape lock: `.rotate-guard` is `display:flex` in portrait viewport (e.g. 540×960) showing 「请将手机横过来玩 / LANDSCAPE ONLY」, and `display:none` in landscape. Toggle by `page.setViewport(...)`.

## Surviving the swarm to demo fire/skills (temporary, never commit)
Live difficulty kills a stationary scripted tank in ~6s, which ends the run before fire/skills register. To demo them, temporarily expose the game and top up health each frame, then revert:
1. In `src/main.ts` boot(): `const g = new Game(app); (window as unknown as {__game?: Game}).__game = g;` then `npm run build`.
2. In the driver after entering play: `const g=window.__game; (function k(){g.player.hp=g.player.hpMax; g.player.lives=g.player.livesMax; requestAnimationFrame(k);})();`
3. Revert the main.ts edit afterward (keep source clean — `git status` should show no change to tracked files). This keeps skill cooldowns/VFX/score/damage as real game logic; only survival is forced. (Older `?god=1` / `window.__crit` scaffolds were removed — do not re-commit them.)

## Gotchas / fallbacks
- The managed `browser` tool (which provides the native screen recording + `annotate_recording`) may be unavailable (`No registry found for tool 'browser'`, and managed CDP `localhost:29229` empty). Fallback: drive with puppeteer-core and bake captions into frames (a fixed-position `#__cap` div) instead of `annotate_recording`.
- Windows `convert` is the disk tool, NOT ImageMagick — use `ffmpeg` `hstack` for side-by-side montages.
- Attachment upload from this box is broken; host evidence (mp4/png) on a GitHub Release and embed the release `download/<tag>/<file>` URLs in the PR comment.
- Two harmless console 404s (icon resources) are expected; no JS errors should appear.
- Headshot crit: hits high on an enemy's head deal 2× (gold number).

## Devin Secrets Needed
- None for gameplay testing (no login). A GitHub token (login `rocketeee`) is only needed to host evidence on a Release / post the PR comment.
