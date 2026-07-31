---
name: testing-roguelite-packs
description: How to test roguelite skill/upgrade packs in tank-battle-3d. Use when verifying new packs or changes to existing packs.
---

# Testing Roguelite Skill Packs

## Dev Commands
```bash
npm install
npm run dev          # Vite dev server (default port 5173)
npm run typecheck    # tsc --noEmit (strict: noUnusedLocals + noUnusedParameters)
npm run build        # tsc --noEmit && vite build -> dist/
```

## QA URL Params
- `?level=N` — start at level N (0=forest, 1=desert, 2=alien)
- `?boss=1` — skip waves, jump to boss

## Architecture Notes
- All skills/upgrades self-register via `registerSkill()` / `registerUpgrade()` in `src/game/roguelite/registry.ts`
- Pack files are imported as side-effects from `src/game/roguelite/packs/index.ts`
- `registerSkill` / `registerUpgrade` throw on duplicate IDs — game will crash on load if there are conflicts
- Game instance is NOT exposed on `window` — cannot directly manipulate RunState from browser console
- However, in Vite dev mode, dynamic imports work from the browser console:
  ```js
  import('/src/game/roguelite/registry.ts').then(m => console.log(m.allUpgrades()));
  ```

## Headless Pack Verification (Vite SSR)
When no browser with WebGL is available, use Vite's SSR module loading to programmatically verify:
```bash
npx tsx test-melee-verify.ts   # example test script
```
Key pattern:
```ts
import { createServer } from 'vite';
const vite = await createServer({ configFile: false, root: process.cwd() });
const registry = await vite.ssrLoadModule('./src/game/roguelite/registry.ts');
const run = await vite.ssrLoadModule('./src/game/roguelite/run.ts');
// Now verify skills, cards, apply() logic, evolution gating, etc.
await vite.close();
```

This approach can verify:
1. All packs import without duplicate ID errors
2. Skills registered with correct name/trigger/maxLevel
3. Cards registered with correct rarity/kind/maxLevel
4. Evolution `available()` gating logic (test fresh run vs prereqs met)
5. Card `apply()` effects on RunState (stat changes, pendingHeal, gainSkill)
6. `desc()` functions return non-empty Chinese text

Cannot verify via this method:
- Visual VFX (particles.ring, explosion, dashTrail, etc.)
- Audio SFX (audio.explosion, hit, jump, etc.)
- In-game card draw appearance during level-up
- Actual gameplay feel and balance

## Gameplay Testing (when browser is available)
- Start the game, kill aliens to gain XP (2 aliens = 6 XP = first level-up)
- Level-up triggers card draw (3 random cards from pool)
- Card pool is weighted by rarity; melee cards may take several level-ups to appear
- Button skills appear as HUD buttons after picking a `kind:'skill'` card
- Auto skills fire automatically when cooldown expires
- Desktop controls: WASD move, mouse aim, left-click fire, Space jump, 1/2/3/4 skills

## Devin Secrets Needed
- `GITHUB_API_KEY` — for pushing branches and creating PRs
