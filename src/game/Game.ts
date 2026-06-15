import * as THREE from 'three';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Boss } from './Boss';
import { BulletManager } from './Bullet';
import { Particles } from './Particles';
import { FloatingTextManager } from './HealthBar';
import { AudioEngine } from './Audio';
import { Input } from './Input';
import { HUD, MiniDot } from './HUD';
import { LEVELS, buildEnvironment, Environment, PLAY_BOUNDS, ARENA_RADIUS } from './levels';
import { rand } from './util';

type State = 'menu' | 'intro' | 'playing' | 'cleared' | 'gameover' | 'victory';

const PLAYER_RADIUS = 1.1;

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
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 14, 14);
    this.camera.lookAt(0, 0, 0);

    this.particles = new Particles(this.scene);
    this.floaters = new FloatingTextManager(this.scene);
    this.bullets = new BulletManager(this.scene);
    this.player = new Player(this.scene, this.particles, this.audio);

    this.hud = new HUD(root);
    this.input = new Input(this.hud.controls);
    this.hud.onPrimary = () => this.onPrimary();

    window.addEventListener('resize', () => this.onResize());

    const params = new URLSearchParams(location.search);
    const lv = parseInt(params.get('level') ?? '', 10);
    if (!Number.isNaN(lv) && lv >= 0 && lv < LEVELS.length) this.startLevel = lv;
    this.skipWaves = params.get('boss') === '1';

    this.showMenu();
    this.loop();
  }

  // -------------------------------------------------------------- state flow
  private showMenu() {
    this.state = 'menu';
    this.hud.showOverlay(
      '萌坦大战 <span class="sub">TANK BATTLE 3D</span>',
      `驾驶萌系小坦克,横扫<span class="tag">森林 · 沙漠 · 外星球</span>三大战场,击败每关 BOSS!<br/><br/>
       <span class="hint-row">
         <span><b>左侧摇杆</b> 移动</span>
         <span><b>右侧拖动</b> 瞄准</span>
         <span><b>💥 开炮</b> 射击(爆头暴击)</span>
         <span><b>🔥 跳跃</b> 喷火冲击波</span>
       </span><br/>
       <span style="opacity:.8;font-size:13px">3 条命 · 阵亡后无敌闪烁 3 秒 · 电脑端可用 WASD + 鼠标</span>`,
      '开始游戏',
    );
  }

  private onPrimary() {
    this.audio.resume();
    if (this.state === 'menu' || this.state === 'gameover' || this.state === 'victory') {
      this.score = 0;
      this.levelIndex = this.startLevel;
      this.player.reset(new THREE.Vector3(0, 0, 0));
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
    // keep score across levels; refresh HUD
    this.waveIndex = 0;
    this.boss = null;
    this.hud.hideBoss();
    this.hud.setChips(index, index);
    this.hud.setLevel(cfg.name, '');
    this.hud.setHP(this.player.hp, this.player.hpMax);
    this.hud.setLives(this.player.lives, this.player.livesMax);
    this.hud.setScore(this.score);
    this.hud.hideOverlay();
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
      `得分 <span class="tag">${this.score}</span> · 剩余生命 <span class="tag">${this.player.lives}</span><br/>${last ? '你解放了被外星人控制的星球!' : '准备进入下一战场……'}`,
      last ? '查看战绩' : '下一关',
    );
    this.audio.levelUp();
  }

  private victory() {
    this.state = 'victory';
    this.clearEntities();
    this.hud.showOverlay(
      '通关胜利! <span class="sub">VICTORY</span>',
      `最终得分 <span class="tag">${this.score}</span><br/>恭喜击败全部三关 BOSS,守护了和平!`,
      '再玩一次',
    );
  }

  private gameOver() {
    this.state = 'gameover';
    this.hud.hideBoss();
    this.hud.showOverlay(
      '游戏结束 <span class="sub">GAME OVER</span>',
      `最终得分 <span class="tag">${this.score}</span><br/>再接再厉,坦克指挥官!`,
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
      this.player.cameraLerp(this.camera, dt);
      if (this.introTimer <= 0) this.startWaves();
      return;
    }
    if (this.state !== 'playing') {
      this.player.cameraLerp(this.camera, dt);
      return;
    }

    // ---- aim resolution: touch manual > mouse > auto-aim ----
    const desiredAimYaw = this.resolveAim();

    // ---- player ----
    this.player.update(dt, this.input, desiredAimYaw, PLAY_BOUNDS);
    this.player.cameraLerp(this.camera, dt);

    if (this.input.fireHeld) {
      const shot = this.player.tryFire();
      if (shot) {
        this.bullets.spawn({ pos: shot.pos, dir: shot.dir, speed: 38, damage: 14, fromPlayer: true });
      }
    }
    if (this.input.consumeJump()) this.player.tryJump();

    // jump landing shockwave AOE
    const shock = this.player.consumeLandShock();
    if (shock) this.applyShock(shock.pos, shock.radius, shock.damage);

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

    // ---- bullets + collisions ----
    this.bullets.update(dt, ARENA_RADIUS + 20);
    this.handleCollisions();

    // ---- wave / boss progression ----
    this.progress();

    // ---- HUD ----
    this.hud.setHP(this.player.hp, this.player.hpMax);
    this.hud.setLives(this.player.lives, this.player.livesMax);
    this.hud.setScore(this.score);
    this.hud.setJumpCd(this.player.jumpCdRatio);
    this.updateMinimap();
  }

  private resolveAim(): number {
    const aim = this.input.aimDir;
    if (this.input.aimActive && (Math.abs(aim.x) > 0.01 || Math.abs(aim.y) > 0.01)) {
      return Math.atan2(aim.x, aim.y);
    }
    // auto-aim nearest target (mobile assist)
    const target = this.nearestTarget();
    if (target && !this.input.mouseAiming) {
      return Math.atan2(target.x - this.player.pos.x, target.z - this.player.pos.z);
    }
    if (this.input.mouseAiming) {
      this.raycaster.setFromCamera(this.input.pointerNDC, this.camera);
      const hit = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, hit)) {
        return Math.atan2(hit.x - this.player.pos.x, hit.z - this.player.pos.z);
      }
    }
    if (target) {
      return Math.atan2(target.x - this.player.pos.x, target.z - this.player.pos.z);
    }
    return this.player.aimYaw;
  }

  private nearestTarget(): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestD = Infinity;
    const px = this.player.pos.x;
    const pz = this.player.pos.z;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = (e.group.position.x - px) ** 2 + (e.group.position.z - pz) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e.group.position;
      }
    }
    if (this.boss && this.boss.alive) {
      const d = (this.boss.group.position.x - px) ** 2 + (this.boss.group.position.z - pz) ** 2;
      if (d < bestD) best = this.boss.group.position;
    }
    return best;
  }

  private handleCollisions() {
    for (const b of this.bullets.list) {
      if (!b.alive) continue;
      const bp = b.mesh.position;
      if (b.fromPlayer) {
        // vs enemies
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const ep = e.group.position;
          const dx = ep.x - bp.x;
          const dz = ep.z - bp.z;
          if (dx * dx + dz * dz < (e.radius + b.radius) ** 2 && bp.y < ep.y + e.headY + 0.8) {
            const res = e.takeDamage(b.damage, bp.y, this.particles);
            this.floaters.spawn(new THREE.Vector3(ep.x, ep.y + e.headY + 0.4, ep.z), res.crit ? `${res.dmg}!` : `${res.dmg}`, res.crit);
            this.audio[res.crit ? 'crit' : 'hit']();
            this.bullets.kill(b);
            if (res.killed) this.killEnemy(e);
            break;
          }
        }
        if (!b.alive) continue;
        // vs boss
        if (this.boss && this.boss.alive) {
          const bo = this.boss.group.position;
          const dx = bo.x - bp.x;
          const dz = bo.z - bp.z;
          if (dx * dx + dz * dz < (this.boss.radius + b.radius) ** 2 && bp.y < bo.y + this.boss.headY + 1) {
            const res = this.boss.takeDamage(b.damage, bp.y, this.particles);
            this.floaters.spawn(new THREE.Vector3(bp.x, bp.y + 0.6, bp.z), res.crit ? `${res.dmg}!` : `${res.dmg}`, res.crit);
            this.audio[res.crit ? 'crit' : 'hit']();
            this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
            this.bullets.kill(b);
            if (res.killed) this.killBoss();
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

  private applyShock(pos: THREE.Vector3, radius: number, damage: number) {
    for (const e of this.enemies) {
      if (!e.alive || e.kind === 'ufo') continue; // shock hits ground units
      const d = Math.hypot(e.group.position.x - pos.x, e.group.position.z - pos.z);
      if (d < radius) {
        const res = e.takeDamage(damage, e.group.position.y + e.headY, this.particles);
        this.floaters.spawn(new THREE.Vector3(e.group.position.x, e.group.position.y + e.headY + 0.4, e.group.position.z), `${res.dmg}`, false);
        if (res.killed) this.killEnemy(e);
      }
    }
    if (this.boss && this.boss.alive && this.boss.level !== 2) {
      const d = Math.hypot(this.boss.group.position.x - pos.x, this.boss.group.position.z - pos.z);
      if (d < radius + 2) {
        const res = this.boss.takeDamage(damage, this.boss.group.position.y + this.boss.headY, this.particles);
        this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
        if (res.killed) this.killBoss();
      }
    }
  }

  private killEnemy(e: Enemy) {
    this.score += e.scoreValue;
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
