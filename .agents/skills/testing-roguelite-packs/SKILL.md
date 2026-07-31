---
name: testing-roguelite-packs
description: Test roguelite skill packs for the tank-battle-3d game. Use when verifying new skill/upgrade pack files.
---

# Testing Roguelite Packs

## Environment Setup

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173 (or next available port)
```

## Quick Checks

1. **Typecheck + Build**: `npm run typecheck && npm run build` — strict mode with `noUnusedLocals` + `noUnusedParameters`.
2. **Module Load**: Fetch the pack file via the Vite dev server (e.g. `curl http://localhost:5173/src/game/roguelite/packs/<pack>.ts`) — should return transformed JS without errors.
3. **Registration**: Verify `packs/index.ts` includes the new pack import. Verify no duplicate IDs across other pack files.

## Architecture Notes

- **Registry** (`src/game/roguelite/registry.ts`): `registerSkill()` and `registerUpgrade()` throw on duplicate IDs. All packs self-register at import time via side effects.
- **Packs index** (`src/game/roguelite/packs/index.ts`): One import per pack. Adding a new pack = new file + one import line.
- **Card pool**: `RunState.rollCards(3)` draws 3 weighted-random cards from all registered upgrades. Cards appear during level-up (triggered by XP from kills).
- **Level-up XP curve**: First level needs 6 XP (2 alien kills at 3 XP each). Quick to trigger in-game.
- **Skills**: `trigger:'auto'` skills fire automatically on cooldown. `trigger:'button'` skills need HUD button press.
- **Stats**: Use `hyperbolic()` from `stats.ts` for diminishing returns on chance-based stats. Never add new stat fields to `PlayerStats`.
- **ID namespacing**: Use a prefix for all IDs in a pack (e.g. `drn_` for skills, `c_drn_` for cards) to avoid collisions.

## Programmatic Verification Script

You can verify pack registration without gameplay by fetching modules through the Vite dev server:

```javascript
// Run with: node test-script.mjs
const BASE = 'http://localhost:5173';
const resp = await fetch(BASE + '/src/game/roguelite/packs/<pack>.ts');
const text = await resp.text();
// Check for expected IDs, Chinese names, API calls, etc.
```

## QA URL Params

- `?level=N` — start at level N (0=forest, 1=desert, 2=alien)
- `?boss=1` — skip waves, jump to boss fight

## Gameplay Testing Limitations

The 3D game requires real-time input (WASD movement, mouse aiming, click-to-fire). Browser automation of gameplay is impractical. For gameplay testing:
- Play manually via the dev server
- Kill enemies to trigger level-ups
- Look for new pack cards in the 3-card selection screen
- Cards are random — may need multiple level-ups to see specific pack cards

## Devin Secrets Needed

- `GITHUB_API_KEY` — for pushing branches and creating PRs
