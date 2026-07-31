---
name: testing-tank-battle-3d
description: End-to-end runtime testing for the tank-battle-3d game (Three.js + Vite). Use when verifying gameplay, settings, the roguelike level-up/skill system, or boss behavior — especially via headless Chrome on a machine without a real GPU.
---

# Testing tank-battle-3d (headless WebGL E2E)

This is a Three.js + Vite + TypeScript browser game (no backend). Tests are driven
by loading the built site in a browser and asserting on DOM + in-engine state.

## Build & serve the build under test
```bash
npm run typecheck && npm run build      # build to dist/ (clean prod bundle)
npx vite preview --port 4317            # serves dist/ at http://localhost:4317/index.html
```
Verify the served bundle hash matches the clean build (no test hooks leaked).

## Driving the browser
- The hosted `browser` tool has been unreliable on the Windows VM ("No registry found for tool 'browser'"). Fallback that works: **puppeteer-core** against the bundled Chrome.
- Headless WebGL needs these Chrome flags or the canvas renders black:
  `--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --enable-webgl --ignore-gpu-blocklist`
- Use a mobile viewport with touch (`isMobile:true, hasTouch:true`) to mirror the real target.
- Intro: the studio LOGO splash must be dismissed with a center click; then wait for the start overlay.

## Recording caveat (important)
- Under swiftshader, reading the framebuffer (`page.screenshot` / CDP `Page.screencast`) is **very slow** — "GPU stall due to ReadPixels". Cost scales with scene complexity: ~0.3s/frame on light menus, up to ~3.7s/frame during heavy boss + particle scenes. CDP `Page.startScreencast` may emit almost no frames.
- Net effect: smooth real-time video is generally NOT achievable headless here. Strategy that works:
  - Treat **full-resolution screenshots + runtime assertion data (JSON)** as the primary, authoritative evidence.
  - For a demo clip, capture at a reduced viewport (e.g. 640x300, `optimizeForSpeed:true, captureBeyondViewport:false`) and stitch a **fast montage** with ffmpeg. Be transparent that it is a montage, not real-time.
  - This ffmpeg build lacks `-pattern_type glob`. Frames may have index gaps (a counter increments even when a screenshot throws). Renumber to a contiguous sequence, then `ffmpeg -framerate N -i 'g%05d.jpg' ...`.
  - Bake captions into frames via an absolutely-positioned `#__cap` overlay div updated per phase (annotate_recording only works for hosted recordings).
- If smooth real-time video is required, ask the user to run on an environment with a real GPU or when the hosted recorder is available.

## In-engine hooks useful for scripted testing
- QA URL params (do NOT ship): `?level=N` (0=forest,1=desert,2=alien), `?boss=1` (skip waves -> spawn boss).
- Expose the game for the driver with a TEMPORARY hook in `src/main.ts` boot: assign the `new Game(app)` instance to `window.__game`. This is a test scaffold — see hygiene below.
- Firing is `input.fireHeld -> player.tryFire(aimPoint) -> fireMain`. Aim follows `camYaw`. An **aim-assist** that每 ~70ms sets `g.camYaw = atan2(enemy.x-p.x, enemy.z-p.z)` and `g.input.fireHeld = true` produces **real kills** (real bullets/score/XP), so the level-up flow it triggers is genuine.
- Skill button casts are event-delegated on the `.btns` container via **`pointerdown`**, NOT `click`. To cast a skill from script, dispatch `new PointerEvent('pointerdown', {bubbles:true})` on `.btn.skill[data-skill=ID]` (a `.click()` does nothing).
- Level-up drafts **chain**: picking a card calls `openLevelUp` again while `run.leveling.pendingLevels > 0`, so a draft can stay open (`state === 'levelup'`). Before asserting on casts, **drain all drafts** until `state === 'playing'` and `.cardpick` lacks `.show` — otherwise the overlay blocks the buttons and casts silently no-op.

## Key facts for assertions
- Roguelike start: the run owns ONLY `shield` as a button skill (`run.buttonSkills()` and the DOM `.btn.skill[data-skill]` cluster). Auto skills live in `run.ownedSkills()` but are not buttons.
- Leveling curve (`roguelite/leveling.ts`): Lv1 needs 6 XP; alien kill = 3 XP ⇒ ~2 alien kills = first level-up. Use real kills to trigger it; only fall back to `run.leveling.addXp(n)` to force later drafts deterministically (the roll/pick/grant/stat-change paths are all real either way — disclose any injection).
- Card draft: `.cardpick.show` contains exactly 3 `.card` with `.card-name/.card-desc/.card-rarity/.card-lvl`. Picks change `run.stats` (e.g. `regen`, `projSpeed`, `markDmgMult`, `areaMult`, `critChance`) and may add a new `.btn.skill` (dynamic, data-driven HUD).
- Skill cooldown after cast: button gets class `cd` and a `--cd` mask angle > 0.
- Settings (`Settings.ts`): selectors `.settings-gear`, `.settings-panel.show`, `.sens-left/.sens-right/.sens-gyro` (set `.value` then dispatch `input`), `.gyro-toggle` (set `.checked` then dispatch `change` — panel gains `.gyro-on`, revealing `.gyro-only`). Labels `.val-left/.val-right/.val-gyro` read `"X.XXx"`. Persisted to `localStorage["tankbattle.settings.v1"]` as `{leftSens,rightSens,gyroEnabled,gyroSens}`.
- Boss: `?boss=1&level=0` spawns the forest boss (`hpMax=1500`) with a billboard head HP bar; real hits make `g.boss.hp` decrease monotonically. Player has `livesMax=3`; on life loss the tank blinks with ~3s invincibility (`Player.invincible`/`protectedNow`).

## Test scaffold hygiene (MUST follow)
These are test-only and must NEVER be committed or deployed:
- `window.__game` hook in `main.ts`.
- aim-assist / keepalive intervals (e.g. keep `g.player.lives` topped so a scripted, non-dodging driver isn't insta-killed during a boss demo — boss damage numbers stay real).
- `addXp` injection.
After recording: revert `main.ts` to `new Game(app);`, run `npm run build` again, and confirm the clean bundle (`grep -c __game dist/assets/*.js` == 0) before re-syncing the deploy dir.

## Publishing test evidence
- Attachment upload from the Windows VM has been unreliable. A reliable path for PR-embedded images: upload screenshots (and an mp4) as assets on a **prerelease** GitHub Release, then reference the `…/releases/download/<tag>/<file>` URLs in the PR comment markdown (they render inline).
- Post ONE results comment on the PR with collapsible `<details>` sections (pre-expand the most important one) and a link to the Devin session.

## Devin Secrets Needed
- A GitHub Personal Access Token (repo scope) for creating Releases and posting PR comments via the REST API. The ambient `GITHUB_API_KEY` env var has been observed invalid (401); normal `git push` still works through the auth proxy, and `gh` CLI has been unreliable here — prefer the REST API with a valid PAT. Never echo the token.
