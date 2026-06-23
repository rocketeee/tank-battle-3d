import * as THREE from 'three';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Boss } from './Boss';
import { BulletManager, Bullet } from './Bullet';
import { Particles } from './Particles';
import { FloatingTextManager } from './HealthBar';
import { AudioEngine } from './Audio';
import { Input } from './Input';
import { HUD, MiniDot } from './HUD';
import { Settings } from './Settings';
import { LEVELS, buildEnvironment, Environment, PLAY_BOUNDS, ARENA_RADIUS } from './levels';
import { rand, clamp, damp } from './util';
import { RunState } from './roguelite/run';
import { BASE } from './roguelite/stats';
import type { GameApi, Damageable, HitOpts, StatusApply, SpawnBulletOpts, BulletEffect, Upgrade } from './roguelite/api';
import './roguelite/packs'; // side-effect: registers the whole skill + upgrade catalog

type State = 'menu' | 'intro' | 'playing' | 'levelup' | 'cleared' | 'gameover' | 'victory';

const PLAYER_RADIUS = 1.1;
const SCREEN_CENTER = new THREE.Vector2(0, 0);
const LOOK_SENS = 0.0042;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private raycaster = new THREE.Raycaster();

  private audio = new AudioEngine();
  private particles: Particles;
  private floaters: FloatingTextManager;
  private bullets: BulletManager;
  private player: Player;
  private hud: HUD;
  private input: Input;
  private settings: Settings;

  // roguelike run state (stats / xp / owned skills / upgrades)
  private run = new RunState();
  private readonly api: GameApi;

  private state: State = 'menu';
  private levelIndex = 0;
  private waveIndex = 0;
  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private env: Environment | null = null;
  private score = 0;
  private waveTimer = 0;
  private introTimer = 0;
  private spawnsPending = false;

  // free-look third-person camera (right-thumb / mouse drag controls the whole view)
  private camYaw = Math.PI;
  private camPitch = 0.12;
  private lookIdle = 0;
  private aimPoint = new THREE.Vector3(0, 1, -10);

  // optional QA aids via URL params (?level=N, ?boss=1)
  private startLevel = 0;
  private skipWaves = false;

  constructor(root: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    root.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 220);
    this.camera.position.set(0, 4, 9);
    this.camera.lookAt(0, 1.4, -3);

    this.particles = new Particles(this.scene);
    this.floaters = new FloatingTextManager(this.scene);
    this.bullets = new BulletManager(this.scene);
    this.player = new Player(this.scene, this.particles, this.audio);
    this.player.bindStats(this.run.stats);

    this.hud = new HUD(root);
    this.settings = new Settings(root);
    this.input = new Input(this.hud.controls, this.settings);
    this.hud.onPrimary = () => this.onPrimary();

    this.api = this.buildApi();

    window.addEventListener('resize', () => this.onResize());

    const params = new URLSearchParams(location.search);
    const lv = parseInt(params.get('level') ?? '', 10);
    if (!Number.isNaN(lv) && lv >= 0 && lv < LEVELS.length) this.startLevel = lv;
    this.skipWaves = params.get('boss') === '1';

    this.showMenu();
    this.loop();
  }

  // --------------------------------------------------------------- game api
  /** The world-facing surface passed to every skill so packs never import Game. */
  private buildApi(): GameApi {
    const self = this;
    return {
      get stats() {
        return self.run.stats;
      },
      get run() {
        return self.run;
      },
      get player() {
        return self.player;
      },
      get camYaw() {
        return self.camYaw;
      },
      set camYaw(v: number) {
        self.camYaw = v;
      },
      get aimPoint() {
        return self.aimPoint;
      },
      set aimPoint(v: THREE.Vector3) {
        self.aimPoint = v;
      },
      particles: this.particles,
      audio: this.audio,
      playerPos: () => self.player.worldPos(),
      groundAim: () => self.groundAim(),
      enemies: () => self.aliveDamageables(),
      nearest: (pos, count, maxRange, exclude) => self.nearest(pos, count, maxRange, exclude),
      spawnBullet: (opts) => self.spawnBullet(opts),
      dealDamage: (target, amount, opts, statuses) => self.dealDamage(target, amount, opts, statuses),
      dealAoe: (pos, radius, amount, opts, statuses) => self.dealAoe(pos, radius, amount, opts, statuses),
      applyStatus: (target, apply) => self.applyStatusToTarget(target, apply),
      toast: (text) => self.hud.toast(text),
    };
  }

  // -------------------------------------------------------------- state flow
  private showMenu() {
    this.state = 'menu';
    this.hud.hideCrosshair();
    this.hud.showOverlay(
      '萌坦大战 <span class="sub">ROGUELIKE</span>',
      `<span class="tag">森林 · 沙漠 · 外星球</span> — 三大战场，击败每关 BOSS!<br/>
       <span class="hint-compact">🛡️ 初始仅护盾 → 击杀升级 → 三选一技能卡 → 火/冰/雷 build</span><br/>
       <span class="hint-tiny">⚙ 右上角设置灵敏度/陀螺仪 · 电脑端 WASD / 鼠标右键 / J·空格·1234</span>`,
      '开始游戏',
    );
  }

  private onPrimary() {
    this.audio.resume();
    if (this.state === 'menu' || this.state === 'gameover' || this.state === 'victory') {
      this.score = 0;
      this.levelIndex = this.startLevel;
      this.run.reset();
      this.player.bindStats(this.run.stats);
      this.player.syncMaxHp(true);
      this.hud.setButtonSkills(this.run.buttonSkills());
      this.loadLevel(this.startLevel);
    } else if (this.state === 'cleared') {
      if (this.levelIndex + 1 >= LEVELS.length) {
        this.victory();
      } else {
        this.loadLevel(this.levelIndex + 1);
      }
    }
  }

  private loadLevel(index: number) {
    this.clearEntities();
    this.levelIndex = index;
    const cfg = LEVELS[index];
    if (this.env) this.env.dispose();
    this.env = buildEnvironment(this.scene, cfg);
    this.player.reset(new THREE.Vector3(0, 0, 0));
    this.camYaw = Math.PI;
    this.camPitch = 0.12;
    this.lookIdle = 0;
    this.hud.showCrosshair();
    // keep score + run progression across levels; refresh HUD
    this.waveIndex = 0;
    this.boss = null;
    this.hud.hideBoss();
    this.hud.setChips(index, index);
    this.hud.setLevel(cfg.name, '');
    this.hud.setHP(this.player.hp, this.player.hpMax);
    this.hud.setLives(this.player.lives, this.player.livesMax);
    this.hud.setScore(this.score);
    this.hud.setXp(this.run.leveling.level, this.run.leveling.ratio());
    this.hud.setButtonSkills(this.run.buttonSkills());
    this.hud.hideOverlay();
    this.hud.hideCards();
    this.hud.toast(`第 ${index + 1} 关 · ${cfg.shortName}`);
    this.audio.levelUp();
    this.state = 'intro';
    this.introTimer = 2.0;
  }

  private startWaves() {
    this.state = 'playing';
    this.waveIndex = 0;
    if (this.skipWaves) {
      this.spawnBoss();
      return;
    }
    this.spawnWave();
  }

  private spawnWave() {
    const cfg = LEVELS[this.levelIndex];
    const def = cfg.waves[this.waveIndex];
    this.hud.setLevel(cfg.name, `第 ${this.waveIndex + 1}/${cfg.waves.length} 波`);
    for (let i = 0; i < def.aliens; i++) this.spawnEnemy('alien', cfg.hpScale);
    for (let i = 0; i < def.ufos; i++) this.spawnEnemy('ufo', cfg.hpScale);
    this.spawnsPending = false;
  }

  private spawnEnemy(kind: 'alien' | 'ufo', hpScale: number) {
    const variant = Math.floor(rand(0, 3));
    const e = new Enemy(this.scene, kind, hpScale, variant);
    const a = rand(0, Math.PI * 2);
    const r = rand(PLAY_BOUNDS * 0.6, PLAY_BOUNDS - 1);
    e.spawnAt(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    this.enemies.push(e);
  }

  private spawnBoss() {
    const cfg = LEVELS[this.levelIndex];
    this.boss = new Boss(this.scene, this.levelIndex);
    this.boss.spawnAt(new THREE.Vector3(0, 0, -PLAY_BOUNDS * 0.7));
    this.hud.showBoss(this.boss.name);
    this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
    this.hud.setLevel(cfg.name, 'BOSS 战!');
    this.hud.toast('⚠ BOSS 来袭!');
    this.audio.bossWarn();
  }

  private levelCleared() {
    this.state = 'cleared';
    this.hud.hideBoss();
    this.hud.setChips(this.levelIndex, this.levelIndex + 1);
    const last = this.levelIndex + 1 >= LEVELS.length;
    this.hud.showOverlay(
      last ? '最终胜利!' : '关卡完成!',
      `得分 <span class="tag">${this.score}</span> · 等级 <span class="tag">Lv.${this.run.leveling.level}</span> · 剩余生命 <span class="tag">${this.player.lives}</span><br/>${last ? '你解放了被外星人控制的星球!' : '战力与技能将带入下一战场……'}`,
      last ? '查看战绩' : '下一关',
    );
    this.audio.levelUp();
  }

  private victory() {
    this.state = 'victory';
    this.clearEntities();
    this.hud.showOverlay(
      '通关胜利! <span class="sub">VICTORY</span>',
      `最终得分 <span class="tag">${this.score}</span> · 等级 <span class="tag">Lv.${this.run.leveling.level}</span><br/>恭喜击败全部三关 BOSS,守护了和平!`,
      '再玩一次',
    );
  }

  private gameOver() {
    this.state = 'gameover';
    this.hud.hideBoss();
    this.hud.hideCards();
    this.hud.showOverlay(
      '游戏结束 <span class="sub">GAME OVER</span>',
      `最终得分 <span class="tag">${this.score}</span> · 等级 <span class="tag">Lv.${this.run.leveling.level}</span><br/>再接再厉,坦克指挥官!`,
      '重新开始',
    );
  }

  private clearEntities() {
    for (const e of this.enemies) e.dispose(this.scene, this.particles);
    this.enemies = [];
    if (this.boss) {
      this.boss.dispose(this.scene);
      this.boss = null;
    }
    this.bullets.clear();
  }

  // -------------------------------------------------------------- main loop
  private loop = () => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    this.update(dt, time);
    this.render();
    requestAnimationFrame(this.loop);
  };

  private update(dt: number, time: number) {
    this.particles.update(dt);
    this.floaters.update(dt);

    if (this.state === 'intro') {
      this.introTimer -= dt;
      this.updateLook(dt);
      this.cameraThirdPerson(dt);
      if (this.introTimer <= 0) this.startWaves();
      return;
    }
    if (this.state === 'levelup') {
      // freeze the simulation while the card draft is open; keep framing the tank
      this.cameraThirdPerson(dt);
      return;
    }
    if (this.state !== 'playing') {
      this.player.cameraLerp(this.camera, dt);
      return;
    }

    // ---- free-look camera + crosshair aim ----
    this.updateLook(dt);
    this.aimPoint.copy(this.resolveAimPoint());
    const desiredAimYaw = Math.atan2(this.aimPoint.x - this.player.pos.x, this.aimPoint.z - this.player.pos.z);

    // ---- player ----
    this.player.update(dt, this.input, desiredAimYaw, this.camYaw, PLAY_BOUNDS);
    this.cameraThirdPerson(dt);

    // ---- fire (multishot via projCount) ----
    if (this.input.fireHeld) {
      const shot = this.player.tryFire(this.aimPoint);
      if (shot) this.fireMain(shot.pos, shot.dir);
    }

    // ---- button skills (dynamic, driven by owned skills) ----
    for (const s of this.run.buttonSkills()) {
      if (this.input.consumeSkill(s.id)) this.run.castButton(s.id, this.api);
    }
    this.input.clearSkillQueue();

    // ---- auto skills + cooldowns ----
    this.run.updateSkills(dt, this.api);

    // jump landing shockwave AOE
    const shock = this.player.consumeLandShock();
    if (shock) {
      this.dealAoe(
        new THREE.Vector3(shock.pos.x, 0.5, shock.pos.z),
        shock.radius * this.run.stats.areaMult,
        shock.damage * this.run.stats.damageMult,
        {},
      );
    }

    // ---- enemies ----
    const playerPos = this.player.worldPos();
    for (const e of this.enemies) {
      const intent = e.update(dt, playerPos, time);
      if (intent) {
        this.bullets.spawn({ pos: intent.pos, dir: intent.dir, speed: intent.speed, damage: intent.damage, fromPlayer: false, color: intent.color });
        this.audio.enemyShot();
      }
      e.faceBar(this.camera);
      // melee contact (ground aliens)
      if (e.kind === 'alien' && e.meleeCd <= 0) {
        const d = Math.hypot(e.group.position.x - this.player.pos.x, e.group.position.z - this.player.pos.z);
        if (d < e.radius + PLAYER_RADIUS) {
          e.meleeCd = 1.0;
          this.damagePlayer(2);
        }
      }
    }

    // ---- boss ----
    if (this.boss && this.boss.alive) {
      const intents = this.boss.update(dt, playerPos, time);
      for (const it of intents) {
        this.bullets.spawn({ pos: it.pos, dir: it.dir, speed: it.speed, damage: it.damage, fromPlayer: false, color: it.color });
      }
      if (intents.length) this.audio.enemyShot();
      this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
    }

    // ---- damage-over-time + status timers ----
    this.tickStatuses(dt);

    // ---- bullets + collisions ----
    this.bullets.update(dt, ARENA_RADIUS + 20);
    this.handleCollisions();

    // ---- wave / boss progression ----
    this.progress();

    // ---- level-up draft (open after combat resolution) ----
    if (this.state === 'playing' && this.run.leveling.pendingLevels > 0) this.openLevelUp();

    // ---- HUD ----
    this.hud.setHP(this.player.hp, this.player.hpMax);
    this.hud.setLives(this.player.lives, this.player.livesMax);
    this.hud.setScore(this.score);
    this.hud.setXp(this.run.leveling.level, this.run.leveling.ratio());
    for (const s of this.run.buttonSkills()) this.hud.setSkillCd(s.id, this.run.cdRatio(s.id));
    this.updateMinimap();
  }

  // ----------------------------------------------------------- level-up flow
  private openLevelUp() {
    this.state = 'levelup';
    this.audio.levelUp();
    const cards = this.run.rollCards(3);
    this.hud.showCards(cards, this.run, (up) => this.pickCard(up));
  }

  private pickCard(up: Upgrade) {
    this.run.applyUpgrade(up);
    const heal = this.run.consumeHeal();
    if (heal > 0) this.player.heal(heal);
    this.player.syncMaxHp(false);
    this.run.leveling.pendingLevels -= 1;
    this.hud.setButtonSkills(this.run.buttonSkills());
    this.hud.hideCards();
    if (this.run.leveling.pendingLevels > 0) this.openLevelUp();
    else this.state = 'playing';
  }

  /** Apply look input (touch drag / mouse drag / keyboard / gyro) to the free-look camera. */
  private updateLook(dt: number) {
    const look = this.input.takeLook();
    let active = false;
    if (look.x !== 0 || look.y !== 0) {
      this.camYaw -= look.x * LOOK_SENS;
      this.camPitch -= look.y * LOOK_SENS;
      active = true;
    }
    const k = 1.7 * dt;
    if (this.input.keyHeld('KeyQ')) { this.camYaw += k; active = true; }
    if (this.input.keyHeld('KeyE')) { this.camYaw -= k; active = true; }
    if (this.input.keyHeld('KeyR')) { this.camPitch += k; active = true; }
    if (this.input.keyHeld('KeyF')) { this.camPitch -= k; active = true; }
    this.camPitch = clamp(this.camPitch, -0.5, 0.62);

    if (active) this.lookIdle = 0;
    else this.lookIdle += dt;
  }

  /** Third-person follow camera positioned behind/above the tank, orbited by camYaw/camPitch. */
  private cameraThirdPerson(dt: number) {
    const f = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const cp = Math.cos(this.camPitch);
    const sp = Math.sin(this.camPitch);
    const tgt = this.player.worldPos();
    const dist = 8.4;
    const height = 3.6;
    const camX = tgt.x - f.x * dist * cp;
    const camZ = tgt.z - f.z * dist * cp;
    const camY = tgt.y + height - sp * 3.4;
    this.camera.position.x = damp(this.camera.position.x, camX, 10, dt);
    this.camera.position.y = damp(this.camera.position.y, camY, 10, dt);
    this.camera.position.z = damp(this.camera.position.z, camZ, 10, dt);
    const lookY = tgt.y + 1.2 + sp * 7;
    this.camera.lookAt(tgt.x + f.x * 3, lookY, tgt.z + f.z * 3);
  }

  /** Screen-center crosshair target, with soft aim-assist toward whatever is under it. */
  private resolveAimPoint(): THREE.Vector3 {
    this.raycaster.setFromCamera(SCREEN_CENTER, this.camera);
    const ray = this.raycaster.ray;
    let best: THREE.Vector3 | null = null;
    let bestProj = Infinity;
    const consider = (p: THREE.Vector3, headY: number) => {
      const center = new THREE.Vector3(p.x, p.y + headY * 0.6, p.z);
      const to = new THREE.Vector3().subVectors(center, ray.origin);
      const proj = to.dot(ray.direction);
      if (proj <= 1) return;
      const closest = ray.origin.clone().addScaledVector(ray.direction, proj);
      const perp = closest.distanceTo(center);
      if (perp / proj < 0.16 && proj < bestProj) {
        bestProj = proj;
        best = center;
      }
    };
    for (const e of this.enemies) if (e.alive) consider(e.group.position, e.headY);
    if (this.boss && this.boss.alive) consider(this.boss.group.position, this.boss.headY);
    if (best) return best;

    const hit = new THREE.Vector3();
    if (ray.intersectPlane(this.groundPlane, hit) && hit.distanceTo(ray.origin) < 90) return hit;
    return ray.origin.clone().addScaledVector(ray.direction, 45);
  }

  /** Clamped ground point under the crosshair (used by orbital-style skills). */
  private groundAim(): THREE.Vector3 {
    this.raycaster.setFromCamera(SCREEN_CENTER, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) {
      hit.set(this.aimPoint.x, 0, this.aimPoint.z);
    }
    hit.x = clamp(hit.x, -PLAY_BOUNDS, PLAY_BOUNDS);
    hit.z = clamp(hit.z, -PLAY_BOUNDS, PLAY_BOUNDS);
    hit.y = 0;
    return hit;
  }

  // ----------------------------------------------------------- combat helpers
  /** Main cannon: fan of `projCount` pellets through the on-hit pipeline. */
  private fireMain(pos: THREE.Vector3, dir: THREE.Vector3) {
    const stats = this.run.stats;
    const count = Math.max(1, Math.round(stats.projCount));
    const speed = BASE.fireSpeed * stats.projSpeed;
    const damage = BASE.fireDamage * stats.damageMult;
    const half = (count - 1) / 2;
    const spreadAng = 0.07;
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const a = (i - half) * spreadAng;
      const d = dir.clone().applyAxisAngle(up, a);
      this.spawnBullet({ pos: pos.clone(), dir: d, speed, damage });
    }
  }

  /** Spawn a player projectile, folding global on-hit statuses + pierce into its effect. */
  private spawnBullet(opts: SpawnBulletOpts) {
    const stats = this.run.stats;
    const statuses: StatusApply[] = [...(opts.effect?.statuses ?? [])];
    if (stats.onHitBurn > 0) statuses.push({ type: 'burn', amount: stats.onHitBurn * stats.burnDmgMult, dur: 3 });
    if (stats.onHitChill > 0) statuses.push({ type: 'chill', amount: stats.onHitChill, dur: 2.2 });
    if (stats.onHitShock) statuses.push({ type: 'shock', dur: 4 });
    if (stats.onHitMarkStacks > 0) statuses.push({ type: 'mark', stacks: stats.onHitMarkStacks, dur: 5 });
    const effect: BulletEffect = {
      pierce: (opts.effect?.pierce ?? 0) + stats.pierce,
      statuses,
      bonusCritChance: opts.effect?.bonusCritChance ?? 0,
      source: opts.effect?.source ?? 'basic',
    };
    this.bullets.spawn({
      pos: opts.pos,
      dir: opts.dir,
      speed: opts.speed,
      damage: opts.damage,
      fromPlayer: true,
      color: opts.color,
      size: opts.size,
      life: opts.life,
      effect,
    });
  }

  /** Resolve a damage instance against a target, applying stat-derived crit + mark. */
  private dealHit(target: Damageable, amount: number, hitY: number, opts?: HitOpts) {
    const stats = this.run.stats;
    const o: HitOpts = { ...opts };
    if (o.critMult === undefined) o.critMult = stats.critMult;
    if (!o.noCrit && !o.forceCrit) {
      let cc = (o.critChance ?? stats.critChance) + (o.bonusCritChance ?? 0);
      if (stats.chillCritBonus > 0 && (target.status.has('chill') || target.status.frozen)) cc += stats.chillCritBonus;
      o.critChance = cc;
      o.bonusCritChance = 0;
    }
    let dm = o.damageMult ?? 1;
    if (target.status.markStacks > 0) dm *= target.status.markMultiplier(stats.markPerStack) * stats.markDmgMult;
    o.damageMult = dm;
    return target.takeDamage(amount, hitY, this.particles, o);
  }

  private spawnFloater(target: Damageable, res: { crit: boolean; dmg: number; killed: boolean }) {
    const p = target.group.position;
    this.floaters.spawn(
      new THREE.Vector3(p.x, p.y + target.headY + 0.4, p.z),
      res.crit ? `${res.dmg}!` : `${res.dmg}`,
      res.crit,
    );
  }

  private onDamageableKilled(target: Damageable) {
    if (target.isBoss) {
      this.killBoss();
      return;
    }
    const e = this.enemies.find((x) => x === target);
    if (e) this.killEnemy(e);
  }

  /** Skill / AOE damage (no headshot bias — uses target center height). */
  private dealDamage(target: Damageable, amount: number, opts?: HitOpts, statuses?: StatusApply[]) {
    if (!target.alive) return;
    const hitY = target.group.position.y + target.headY * 0.5;
    const res = this.dealHit(target, amount, hitY, opts);
    this.spawnFloater(target, res);
    if (statuses) for (const s of statuses) this.applyStatusToTarget(target, s);
    if (res.killed) this.onDamageableKilled(target);
    else if (target.isBoss && this.boss) this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
  }

  private dealAoe(pos: THREE.Vector3, radius: number, amount: number, opts?: HitOpts, statuses?: StatusApply[]) {
    for (const t of this.aliveDamageables()) {
      const dx = t.group.position.x - pos.x;
      const dz = t.group.position.z - pos.z;
      const rr = radius + (t.isBoss ? 2 : 0);
      if (dx * dx + dz * dz < rr * rr) this.dealDamage(t, amount, opts, statuses);
    }
  }

  private applyStatusToTarget(target: Damageable, apply: StatusApply) {
    const st = target.status;
    switch (apply.type) {
      case 'burn':
        st.applyBurn(apply.amount ?? 0, apply.dur);
        break;
      case 'chill':
        if (this.run.stats.freezeOnChill && st.has('chill')) st.freeze(Math.max(1, apply.dur));
        else st.applyChill(apply.amount ?? 0, apply.dur);
        break;
      case 'shock':
        st.applyShock(apply.dur);
        break;
      case 'mark':
        st.applyMark(apply.stacks ?? 1, apply.dur);
        break;
    }
  }

  /** Per-frame status ticking (burn DoT + timer decay) for all live targets. */
  private tickStatuses(dt: number) {
    for (const t of this.aliveDamageables()) {
      const burn = t.status.tick(dt);
      if (burn > 0 && t.alive) this.dealDamage(t, burn, { noCrit: true });
    }
  }

  private aliveDamageables(): Damageable[] {
    const out: Damageable[] = this.enemies.filter((e) => e.alive);
    if (this.boss && this.boss.alive) out.push(this.boss);
    return out;
  }

  private nearest(pos: THREE.Vector3, count: number, maxRange: number, exclude?: Damageable[]): Damageable[] {
    const ex = new Set(exclude ?? []);
    return this.aliveDamageables()
      .filter((t) => !ex.has(t))
      .map((t) => ({ t, d: Math.hypot(t.group.position.x - pos.x, t.group.position.z - pos.z) }))
      .filter((o) => o.d <= maxRange)
      .sort((a, b) => a.d - b.d)
      .slice(0, count)
      .map((o) => o.t);
  }

  private bulletHit(b: Bullet, target: Damageable) {
    const res = this.dealHit(target, b.damage, b.mesh.position.y, { bonusCritChance: b.effect.bonusCritChance });
    this.spawnFloater(target, res);
    this.audio[res.crit ? 'crit' : 'hit']();
    for (const s of b.effect.statuses) this.applyStatusToTarget(target, s);
    if (res.killed) this.onDamageableKilled(target);
    else if (target.isBoss && this.boss) this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
  }

  private handleCollisions() {
    for (const b of this.bullets.list) {
      if (!b.alive) continue;
      const bp = b.mesh.position;
      if (b.fromPlayer) {
        for (const e of [...this.enemies]) {
          if (!e.alive || b.hits.has(e)) continue;
          const ep = e.group.position;
          const dx = ep.x - bp.x;
          const dz = ep.z - bp.z;
          if (dx * dx + dz * dz < (e.radius + b.radius) ** 2 && bp.y < ep.y + e.headY + 0.8) {
            b.hits.add(e);
            this.bulletHit(b, e);
            b.hitsLeft -= 1;
            if (b.hitsLeft <= 0) {
              this.bullets.kill(b);
              break;
            }
          }
        }
        if (!b.alive) continue;
        if (this.boss && this.boss.alive && !b.hits.has(this.boss)) {
          const bo = this.boss.group.position;
          const dx = bo.x - bp.x;
          const dz = bo.z - bp.z;
          if (dx * dx + dz * dz < (this.boss.radius + b.radius) ** 2 && bp.y < bo.y + this.boss.headY + 1) {
            b.hits.add(this.boss);
            this.bulletHit(b, this.boss);
            b.hitsLeft -= 1;
            if (b.hitsLeft <= 0) this.bullets.kill(b);
          }
        }
      } else {
        // enemy bullet vs player
        const dx = this.player.pos.x - bp.x;
        const dz = this.player.pos.z - bp.z;
        const dy = this.player.y + 0.6 - bp.y;
        if (dx * dx + dz * dz < (PLAYER_RADIUS + b.radius) ** 2 && Math.abs(dy) < 1.4) {
          this.bullets.kill(b);
          this.damagePlayer(b.damage);
        }
      }
    }
  }

  /** Spread fire to nearby foes when a burning enemy dies (Inferno evolution). */
  private spreadBurn(dead: Enemy) {
    const dps = Math.max(4, dead.status.burnDps * 0.6);
    for (const t of this.nearest(dead.group.position, 4, 6, [dead])) t.status.applyBurn(dps, 2.5);
    this.particles.explosion(new THREE.Vector3(dead.group.position.x, 0.6, dead.group.position.z), 0xff6b3b, 1.4);
  }

  private killEnemy(e: Enemy) {
    if (this.run.stats.burnSpread && e.status.has('burn')) this.spreadBurn(e);
    this.score += e.scoreValue;
    this.run.leveling.addKill(e.kind, this.run.stats.xpGain);
    e.dispose(this.scene, this.particles);
    this.audio.explosion();
    const idx = this.enemies.indexOf(e);
    if (idx >= 0) this.enemies.splice(idx, 1);
  }

  private killBoss() {
    if (!this.boss) return;
    this.score += 2000;
    this.boss.explode(this.particles);
    this.audio.explosion();
    setTimeout(() => {
      if (this.boss) {
        this.boss.dispose(this.scene);
        this.boss = null;
      }
    }, 900);
    this.levelCleared();
  }

  private damagePlayer(dmg: number) {
    const res = this.player.takeDamage(dmg);
    if (res === '') return;
    this.hud.flashDamage();
    this.hud.setHP(this.player.hp, this.player.hpMax);
    this.hud.setLives(this.player.lives, this.player.livesMax);
    if (res === 'life') this.hud.toast(`失去一条命! 剩余 ${this.player.lives}`);
    if (res === 'dead') this.gameOver();
  }

  private progress() {
    if (this.state !== 'playing') return;
    if (this.enemies.length > 0 || this.spawnsPending) return;
    if (this.boss) return; // boss in progress

    const cfg = LEVELS[this.levelIndex];
    if (this.waveIndex + 1 < cfg.waves.length) {
      this.spawnsPending = true;
      this.waveTimer = 1.4;
      this.waveIndex += 1;
      this.hud.toast(`第 ${this.waveIndex + 1} 波`);
      window.setTimeout(() => {
        if (this.state === 'playing') this.spawnWave();
      }, this.waveTimer * 1000);
    } else if (!this.boss) {
      this.spawnsPending = true;
      window.setTimeout(() => {
        if (this.state === 'playing') {
          this.spawnBoss();
          this.spawnsPending = false;
        }
      }, 1000);
    }
  }

  private updateMinimap() {
    const dots: MiniDot[] = [];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      dots.push({ x: e.group.position.x, z: e.group.position.z, color: e.kind === 'ufo' ? '#b06bff' : '#ff5252', size: 2.5 });
    }
    if (this.boss && this.boss.alive) {
      dots.push({ x: this.boss.group.position.x, z: this.boss.group.position.z, color: '#ff3b3b', size: 5 });
    }
    this.hud.drawMinimap({ x: this.player.pos.x, z: this.player.pos.z, color: '#6bdf5a', size: 4 }, dots, ARENA_RADIUS + 4);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
