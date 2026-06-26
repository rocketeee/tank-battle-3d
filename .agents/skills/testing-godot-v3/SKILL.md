---
name: testing-godot-v3
description: Test the Godot 4.7 tank battle roguelike game end-to-end. Use when verifying Godot GDScript game logic, APK/web export artifacts, or code linkage after changes.
---

# Testing Godot v3.0 Tank Battle Roguelike

## Overview

This skill covers end-to-end testing of the Godot 4.7 rewrite of the tank battle roguelike game. The game is a complete GDScript project in the `godot/` subdirectory of the tank-battle-3d repo.

## Devin Secrets Needed

None — Godot is MIT-licensed and requires no login/credentials.

## Environment Setup

### Godot Editor Location
- **Executable**: `C:\Users\Administrator\scratch\godot_editor\Godot_v4.7-stable_win64.exe`
- **Export templates**: `C:\Users\Administrator\AppData\Roaming\Godot\export_templates\4.7.stable`
- **Project dir**: `C:\Users\Administrator\repos\tank-battle-3d\godot\`

### VM Limitations (Windows Server 2022)
- **No GPU**: Only software rendering via ANGLE/Microsoft Basic Render Driver
- **No CJK fonts**: Chinese text won't render in Godot's UI
- **Godot native window**: Renders background color but UI text is invisible
- **Web export**: Wasm may fail to initialize in Chrome (WebGL2 issues with software renderer)
- **Consequence**: Visual/UI testing is NOT possible on this VM. Use headless logic tests instead.

### What Works on This VM
1. **Headless GDScript tests** via `Godot --headless --script res://path/to/test.gd`
2. **APK structure inspection** via `unzip -l` / `unzip -t`
3. **Web export file verification** (file existence, sizes)
4. **Project import** via `Godot --headless --import` (validates all classes compile)
5. **Godot with OpenGL3**: `--display-driver windows --rendering-driver opengl3` renders background but no readable text

## Testing Strategy

### Phase 1: Code Linkage Validation
Run `Godot --headless --verbose --import` and check for:
- All global classes registered (should see 33+ classes)
- **SCRIPT ERROR** lines — these are real parse errors that break runtime
- Common GDScript 4.7 issues:
  - Type inference failures inside lambdas (`var x := dict.value` fails, use `var x: float = dict.value`)
  - `match true:` with method calls in patterns (must be constant expressions — use `if/elif` instead)
  - Missing function references

### Phase 2: Headless GDScript Logic Tests
Write a test script extending `SceneTree` with `_init()` that exercises:

```gdscript
extends SceneTree
func _init() -> void:
    # ... test code ...
    quit(0)  # or quit(1) on failure
```

Run with: `Godot --headless --script res://scripts/test_runner.gd`

**Key gotchas:**
- **Autoload singletons** (GameManager, SettingsManager, AudioManager) are NOT available in `--script` mode. Only test non-autoload classes.
- **Classes with required constructor args** (e.g. `SkillDefs.new(def: Dictionary)`, `StatusEffect.new(t, dur, pot, st)`) — must pass args, can't call `.new()` bare.
- **Pack registration** (RegisterAll.ensure_registered()) may hang or fail if pack scripts have parse errors. Test with manual registration instead.
- **Import first**: Run `--headless --import` before `--headless --script` to ensure class cache is populated.

### Phase 3: Artifact Verification
- **APK**: Check exists, valid ZIP, contains `lib/arm64-v8a/libgodot_android.so`, `assets/` dir with `.gdc` files, `AndroidManifest.xml`, META-INF signing
- **Web**: Check `index.html`, `index.js`, `index.wasm` (>30MB), `index.pck` all exist

### What to Test in Logic

| System | How to Test | Key Assertions |
|--------|-------------|----------------|
| RunState | `RunState.new()` | owned_skills=["shield"], stats at base values |
| Leveling | `Leveling.new(); add_xp(N)` | XP curve increasing, exact boundary level-up, multi-level overflow |
| PlayerStats | Set stacks, read getters | Hyperbolic formula `x/(1+x)`, convergence, all 14 stats |
| LevelConfig | `LevelConfig.get_levels()` | 3 levels (forest/desert/alien), waves have enemies, hp_scale increasing |
| StatusEffect | `StatusEffect.new(type, dur, pot, st)` | 4 types, tick expiry, type_name/color |
| SkillDefs | `SkillDefs.new(def_dict)` | Cooldown, tick, is_ready, effective_cooldown with CDR |
| UpgradeRegistry | Manual register + draw_cards + apply_upgrade | Cards drawn, no duplicates, skills added to owned, tags counted, pool exhaustion |

## Known Issues

- Pack registration (`RegisterAll.ensure_registered()`) might fail due to GDScript parse errors in lambda closures. Check `--verbose --import` output for SCRIPT ERROR lines.
- Type inference in lambdas: `var x := api.stats.damage * 0.6` fails because `api` is `Dictionary` and Godot can't infer the resulting type. Fix: `var x: float = api.stats.damage * 0.6`.
- `match true:` pattern with `.contains()` calls is invalid in GDScript 4 match statements. Use `if/elif` chain instead.
- Godot web export on software-rendering VMs may show black screen or fail to initialize wasm. This is expected — test on real device for visual verification.

## Reporting

Post ONE GitHub comment on the PR with:
- Results summary table (suite / result / assertion count)
- Critical issues expanded by default (`<details open>`)
- Passing details collapsed (`<details>`)
- "Not Tested" section listing VM limitations
- Link to Devin session
