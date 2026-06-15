# 萌坦大战 · Tank Battle 3D

A mobile 3D Q-version (chibi/cute) tank battle game built with **Three.js + Vite + TypeScript**, designed for touch and packaged for Android via **Capacitor** (AAB for the Google Play Store).

Everything is **procedural** — low-poly meshes, particle VFX and sound effects are all generated in code, so there are no binary game assets to ship.

## Gameplay

- **Left touch joystick** — drive the tank.
- **Right touch drag** — aim the turret (auto-aim assist when idle; mouse-aim on desktop).
- **💥 开炮 (Fire)** — shoot. Hitting an enemy's head deals a **critical hit** (2×, gold damage numbers).
- **🔥 跳跃 (Jump)** — leap with a jet-flame VFX; the landing creates a shockwave that damages nearby ground enemies. Has a cooldown.
- **3 lives.** When your HP hits zero you lose a life, then blink with **3 seconds of invincibility**.

### Enemies
- **小灰人** — ground gray aliens that chase and melee/shoot you.
- **飞碟 (UFO)** — flying saucers that strafe and fire beams.
- Every enemy has a **health bar above its head**.

### Levels (3, each with a boss)
1. **森林 Forest** — 机械统帅 (stone-golem mech boss)
2. **沙漠 Desert** — 沙暴蝎王 (beetle/scorpion mech boss)
3. **外星球 Alien planet** — 虚空母舰 (void mothership UFO boss)

## Controls (desktop, for testing)
- **WASD / Arrow keys** — move
- **Mouse** — aim, **left click** — fire
- **Space** — jump

## Development

```bash
npm install
npm run dev        # vite dev server at http://localhost:5173
npm run typecheck  # tsc --noEmit (strict)
npm run build      # tsc --noEmit && vite build  -> dist/
```

### QA URL params
- `?level=N` — start at level N (0=forest, 1=desert, 2=alien).
- `?boss=1` — skip the waves and jump straight to the level boss.

## Android packaging (Capacitor)

The web build (`dist/`) is wrapped in a native Android shell with Capacitor and exported as an AAB for the Play Store. Requires the Android SDK + JDK + Gradle.

```bash
npm run build
npx cap add android        # first time only
npm run cap:sync           # cap sync android
# then build the AAB from the android/ project (Gradle / Android Studio)
```

## Tech stack
- [Three.js](https://threejs.org/) `0.160` — WebGL 3D
- [Vite](https://vitejs.dev/) `5` + [TypeScript](https://www.typescriptlang.org/) `5` (strict)
- [Capacitor](https://capacitorjs.com/) — Android packaging

## Project layout
```
src/
  main.ts            # bootstrap + loading screen
  styles.css         # HUD / touch controls / overlays
  game/
    Game.ts          # orchestrator + state machine + collisions
    Player.ts        # tank: move / aim / jump skill / lives / invincibility
    Enemy.ts         # gray aliens + UFOs (AI, health bars, crits)
    Boss.ts          # per-level boss attack patterns
    levels.ts        # data-driven level configs + environment builder
    HUD.ts           # DOM HUD (status, boss bar, level chips, minimap, overlays)
    Input.ts         # touch joystick + aim zone + buttons + keyboard/mouse
    Bullet.ts        # bullet pool + movement
    Particles.ts     # explosion / muzzle / hit / ring / jet-flame VFX
    Audio.ts         # procedural WebAudio SFX
    HealthBar.ts     # 3D billboard health bars + floating damage text
    AssetFactory.ts  # all procedural low-poly meshes
    util.ts          # math helpers
```
