import * as THREE from 'three';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Boss } from './Boss';
import { BulletManager } from './Bullet';
import { Particles } from './Particles';
import { FloatingTextManager } from './HealthBar';
import { AudioEngine } from './Audio';
import { Input } from './Input';
import { HUD, MiniDot, SettleInfo, UpgradeCard } from './HUD';
import { themeConfig, buildEnvironment, Environment, PLAY_BOUNDS, ARENA_RADIUS } from './levels';
import { rand, clamp, damp } from './util';
import { detectQuality } from './quality';
import { Settings, lookScale, Sensitivity } from './settings';
import { MetaSave, skinById, ownsSkin, syncUnlocks } from './meta';
import { gearMultipliers, goldForRun, skinGoldPrice, tryBuySkin, tryUpgrade, upgradeCost, type GearSlot } from './gear';
import { isDesktopWeb } from './platform';
import { WaveSpec, specForWave, ArenaTheme } from './waves';
import { applyUpgrade, emptyMods, rankOf, rollChoices, UPGRADES } from './upgrades';
import { canOfferRevive, canRefreshChoices, shouldShowInterstitial } from './ads';
import { createMonetization } from './monetization';
import { readMeta, writeMeta, readSettings, writeSettings, seenFlag, markFlag } from './profile';
import { hostAudioEnabled, onHostAudio, onHostPause, onHostResume } from './playablesSdk';
import { PLAYABLES } from './target';

type State = 'menu' | 'playing' | 'paused' | 'upgrade' | 'revive' | 'mockad' | 'settle' | 'hub';
type AdMode = 'revive' | 'refresh' | 'interstitial';

const PLAYER_RADIUS = 1.1;
const SCREEN_CENTER = new THREE.Vector2(0, 0);
const LOOK_SENS = 0.0042;
const DISPLAY_NAME = '萌坦大战';
const BOSS_NAME: Record<ArenaTheme, string> = {
  forest: '机械统帅',
  desert: '沙暴蝎王',
  alien: '虚空母舰',
};

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private raycaster = new THREE.Raycaster();
  private camForward = new THREE.Vector3();
  private aimBest = new THREE.Vector3();
  private aimScratch = new THREE.Vector3();

  private audio = new AudioEngine();
  private particles: Particles;
  private floaters: FloatingTextManager;
  private bullets: BulletManager;
  private player: Player;
  private hud: HUD;
  private input: Input;

  private state: State = 'menu';
  private env: Environment | null = null;
  private theme: ArenaTheme | null = null;
  private wave = 1;
  private waveOverride = 1;
  private spec: WaveSpec = specForWave(1);
  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private kills = 0;
  private runTime = 0;
  private breather = 0;
  private reviveUsed = false;
  private refreshUsed = false;
  private offered: string[] = [];
  private monetization = createMonetization();
  private runSerial = 0;
  private adMode: AdMode | null = null;
  private pendingSettle: SettleInfo | null = null;
  private coachIds: number[] = [];
  private desktop = false;
  private pointerAim = false;
  private pausedByHost = false;
  private hubFrom: 'menu' | 'settle' = 'menu';
  private runCommitted = false;

  private meta: MetaSave;
  private settings: Settings;
  private showFps = false;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private pixelRatio: number;
  private qualityDropped = false;
  private slowFrames = 0;
  private playedFor = 0;

  private camYaw = Math.PI;
  private camPitch = 0.12;

  constructor(root: HTMLElement) {
    const quality = detectQuality();
    this.renderer = new THREE.WebGLRenderer({
      antialias: quality.antialias,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, quality.maxDpr);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    root.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 320);
    this.camera.position.set(0, 12, 14);

    this.particles = new Particles(this.scene, quality.fx);
    this.floaters = new FloatingTextManager(this.scene);
    this.bullets = new BulletManager(this.scene);
    this.player = new Player(this.scene, this.particles, this.audio);
    this.desktop = PLAYABLES ? false : isDesktopWeb();
    this.pointerAim = this.desktop || PLAYABLES;
    this.hud = new HUD(root);
    this.input = new Input(this.hud.controls, { mouseAim: this.pointerAim, mouseOnStick: PLAYABLES });
    this.bindHud();
    if (PLAYABLES) this.bindPlayablesHost();

    this.meta = readMeta();
    this.settings = readSettings();
    const params = new URLSearchParams(location.search);
    const wave = parseInt(params.get('wave') ?? '', 10);
    if (!Number.isNaN(wave) && wave > 0) this.waveOverride = wave;
    this.showFps = params.get('fps') === '1';

    this.theme = 'forest';
    this.env = buildEnvironment(this.scene, themeConfig('forest'));
    this.paintPlayer();
    if (import.meta.env.DEV) {
      const debug = window as unknown as {
        __tank?: {
          down: () => void;
          dmg: () => number;
          aim: () => { x: number; y: number; dist: number } | null;
          snap: () => {
            state: string;
            enemies: number;
            bullets: number;
            fire: boolean;
            kills: number;
            gold: number;
            gun: number;
            wave: number;
            cam: number;
          };
        };
      };
      debug.__tank = {
        down: () => {
          this.player.lives = 1;
          this.player.hp = 1;
          this.player.invincible = 0;
          this.player.shieldTime = 0;
          this.damagePlayer(10);
        },
        dmg: () => this.player.damageScale(),
        aim: () => {
          let best: { x: number; y: number; dist: number } | null = null;
          const origin = this.player.pos;
          const consider = (x: number, y: number, z: number) => {
            const dist = Math.hypot(x - origin.x, z - origin.z);
            if (best && dist >= best.dist) return;
            const v = new THREE.Vector3(x, y, z).project(this.camera);
            best = {
              x: (v.x * 0.5 + 0.5) * window.innerWidth,
              y: (-v.y * 0.5 + 0.5) * window.innerHeight,
              dist,
            };
          };
          for (const e of this.enemies) {
            if (e.alive) consider(e.group.position.x, 1.1, e.group.position.z);
          }
          if (this.boss?.alive) consider(this.boss.group.position.x, 2, this.boss.group.position.z);
          return best;
        },
        snap: () => ({
            state: this.state,
            enemies: this.enemies.filter((e) => e.alive).length,
            bullets: this.bullets.list.length,
            fire: this.input.fireHeld,
            kills: this.kills,
            gold: this.meta.gold,
            gun: this.meta.gear.gun,
            wave: this.wave,
            cam: this.camYaw,
          }),
      };
    }
    window.addEventListener('resize', () => this.onResize());
    if (PLAYABLES) window.visualViewport?.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.showMenu();
    this.loop();
  }

  private bindHud() {
    this.hud.onStart = () => {
      this.audio.resume();
      this.startRun();
    };
    this.hud.onRetry = () => {
      this.audio.resume();
      this.startRun();
    };
    this.hud.onHome = () => this.showMenu();
    this.hud.onShare = () => void this.shareSettle();
    this.hud.onRevive = () => this.acceptRevive();
    this.hud.onGiveUp = () => {
      if (this.state === 'revive') this.beginSettle();
    };
    this.hud.onPick = (id) => this.pickUpgrade(id);
    this.hud.onRefresh = () => this.refreshChoices();
    this.hud.onSensitivity = (s) => this.setSensitivity(s);
    this.hud.onSkin = (id) => this.equipSkin(id);
    this.hud.onStub = (kind) => this.applyStub(kind);
    this.hud.onHub = () => this.openHub();
    this.hud.onHubBack = () => this.closeHub();
    this.hud.onSortie = () => {
      this.audio.resume();
      this.startRun();
    };
    this.hud.onResume = () => {
      this.pausedByHost = false;
      this.resume();
    };
    this.hud.onGear = (slot) => this.buyGear(slot);
    this.hud.onBuySkin = (id) => this.buySkin(id);
  }

  private bindPlayablesHost() {
    this.audio.setHostAudible(hostAudioEnabled());
    onHostAudio((on) => this.audio.setHostAudible(on));
    onHostPause(() => {
      this.audio.suspendForHost();
      if (this.state === 'playing') {
        this.pausedByHost = true;
        this.pause();
      }
    });
    onHostResume(() => {
      this.audio.releaseHost();
      if (this.pausedByHost) {
        this.pausedByHost = false;
        this.resume();
      }
    });
  }

  private showMenu() {
    this.state = 'menu';
    this.hud.setPlaying(false);
    this.hud.hideCrosshair();
    this.hud.renderMenu(this.meta, this.settings.sensitivity);
  }

  private startRun() {
    this.clearCoach();
    this.runSerial += 1;
    this.wave = this.waveOverride;
    this.kills = 0;
    this.runTime = 0;
    this.breather = 0;
    this.reviveUsed = false;
    this.refreshUsed = false;
    this.runCommitted = false;
    this.adMode = null;
    this.player.mods = emptyMods();
    this.player.gear = gearMultipliers(this.meta.gear);
    this.player.reset(new THREE.Vector3(0, 0, 0));
    this.paintPlayer();
    this.camYaw = Math.PI;
    this.camPitch = 0.12;
    this.clearEntities();
    this.meta.runs += 1;
    writeMeta(this.meta);
    this.hud.hidePanels();
    this.hud.setPlaying(true);
    this.hud.showCrosshair();
    this.hud.setKills(0);
    this.beginWave();
    if (this.wave === 1) this.maybeCoach();
  }

  private beginWave() {
    this.spec = specForWave(this.wave);
    if (this.theme !== this.spec.theme) {
      this.theme = this.spec.theme;
      this.env?.dispose();
      this.env = buildEnvironment(this.scene, themeConfig(this.spec.theme));
    }
    this.bullets.clear();
    for (const e of this.enemies) e.dispose(this.scene, this.particles);
    this.enemies = [];
    if (this.boss) {
      this.boss.dispose(this.scene);
      this.boss = null;
    }
    this.hud.hideBoss();
    this.hud.setWave(this.wave);
    this.hud.setPlaying(true);
    this.hud.showCrosshair();
    this.state = 'playing';
    this.hud.toast(`第 ${this.wave} 波`);
    this.spawnWave(this.spec);
    this.refreshVitals();
  }

  private spawnWave(spec: WaveSpec) {
    for (let i = 0; i < spec.aliens; i++) this.spawnEnemy('alien', spec);
    for (let i = 0; i < spec.ufos; i++) this.spawnEnemy('ufo', spec);
    if (!spec.boss) return;
    const visual = spec.theme === 'desert' ? 1 : spec.theme === 'alien' ? 2 : 0;
    this.boss = new Boss(this.scene, visual, {
      name: BOSS_NAME[spec.theme],
      hp: spec.bossHp,
      pressure: spec.pressure,
      dmg: spec.dmgScale,
    });
    this.boss.spawnAt(new THREE.Vector3(0, 0, -PLAY_BOUNDS * 0.58));
    this.hud.showBoss(this.boss.name);
    this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
    this.audio.bossWarn();
  }

  private spawnEnemy(kind: 'alien' | 'ufo', spec: WaveSpec) {
    const e = new Enemy(this.scene, kind, spec.hpScale, Math.floor(rand(0, 3)), spec.dmgScale, spec.speedScale);
    // Opening camera looks toward -Z. Wave 1 stays close so the bigger field
    // does not hide the first targets.
    const a = spec.wave === 1 ? -Math.PI / 2 + rand(-0.35, 0.35) : rand(0, Math.PI * 2);
    const r = spec.wave === 1 ? rand(11, 16) : rand(PLAY_BOUNDS * 0.34, PLAY_BOUNDS - 3);
    e.spawnAt(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    if (spec.wave === 1) e.arm(1.35);
    this.enemies.push(e);
  }

  private openUpgrade() {
    if (this.state !== 'playing') return;
    this.bullets.clear();
    const defs = rollChoices(this.player.mods, 3);
    this.offered = defs.map((def) => def.id);
    const cards = defs.map((def) => this.toCard(def.id, def.name, def.blurb, def.max));
    if (cards.length === 0) {
      this.wave += 1;
      this.beginWave();
      return;
    }
    this.player.y = 0;
    this.player.vy = 0;
    this.player.airborne = false;
    this.state = 'upgrade';
    this.hud.hideCrosshair();
    this.hud.showUpgrade(cards, !PLAYABLES && canRefreshChoices(this.refreshUsed));
  }

  private toCard(id: string, name: string, blurb: string, max: number): UpgradeCard {
    return { id, name, blurb, rank: rankOf(this.player.mods, id), max };
  }

  private pickUpgrade(id: string) {
    if (this.state !== 'upgrade') return;
    if (!applyUpgrade(this.player.mods, id)) return;
    this.player.resync();
    this.player.hp = Math.min(this.player.hpMax, this.player.hp + 2);
    this.hud.hidePanels();
    this.wave += 1;
    this.beginWave();
  }

  private refreshChoices() {
    if (PLAYABLES) return;
    if (this.state !== 'upgrade' || !canRefreshChoices(this.refreshUsed)) return;
    this.refreshUsed = true;
    this.playAd('refresh', '换一批');
  }

  private acceptRevive() {
    if (PLAYABLES) return;
    if (this.state !== 'revive' || !canOfferRevive(this.reviveUsed)) return;
    this.reviveUsed = true;
    this.playAd('revive', '激励复活');
  }

  private playAd(mode: AdMode, label: string) {
    this.state = 'mockad';
    this.adMode = mode;
    this.hud.showAd(label, mode, () => {
      void this.finishAdThroughAdapter();
    });
  }

  /** Mock panel first. A future live adapter replaces this when usesLiveSdk is true. */
  private async finishAdThroughAdapter() {
    const mode = this.adMode;
    if (!mode) return;
    if (mode === 'interstitial') {
      await this.monetization.ads.presentInterstitial();
      this.finishAd();
      return;
    }
    const earned = await this.monetization.ads.presentRewarded(mode);
    if (earned !== 'earned') {
      this.adMode = null;
      if (mode === 'revive') {
        this.beginSettle();
        return;
      }
      this.refreshUsed = false;
      this.state = 'upgrade';
      this.hud.showUpgrade(this.cardsFrom(this.offered), true);
      return;
    }
    this.finishAd();
  }

  private cardsFrom(ids: string[]): UpgradeCard[] {
    const cards: UpgradeCard[] = [];
    for (const id of ids) {
      const def = UPGRADES.find((u) => u.id === id);
      if (def) cards.push(this.toCard(def.id, def.name, def.blurb, def.max));
    }
    return cards;
  }

  private finishAd() {
    const mode = this.adMode;
    if (!mode) return;
    this.adMode = null;
    if (mode === 'revive') {
      this.player.revive();
      this.hud.hidePanels();
      this.hud.setPlaying(true);
      this.hud.showCrosshair();
      this.refreshVitals();
      this.state = 'playing';
      this.hud.toast('复活！本局不能再复活');
      return;
    }
    if (mode === 'refresh') {
      const defs = rollChoices(this.player.mods, 3, Math.random, this.offered);
      this.offered = defs.map((def) => def.id);
      const cards = defs.map((def) => this.toCard(def.id, def.name, def.blurb, def.max));
      this.state = 'upgrade';
      if (cards.length === 0) {
        this.wave += 1;
        this.beginWave();
        return;
      }
      this.hud.showUpgrade(cards, false);
      return;
    }
    this.state = 'settle';
    if (this.pendingSettle) this.hud.showSettle(this.pendingSettle);
  }

  private onDown() {
    if (this.state !== 'playing') return;
    this.breather = 0;
    this.hud.hideCrosshair();
    this.particles.explosion(new THREE.Vector3(this.player.pos.x, 0.8, this.player.pos.z), 0xffb7d5, 1.6);
    if (!PLAYABLES && canOfferRevive(this.reviveUsed)) {
      this.state = 'revive';
      this.hud.showRevive();
      return;
    }
    this.beginSettle();
  }

  private beginSettle() {
    if (this.state === 'settle' || this.state === 'hub' || this.adMode === 'interstitial') return;
    const result = this.commitRun();
    this.hud.setPlaying(false);
    this.hud.hideCrosshair();
    this.hud.hideDeskHint();
    this.pendingSettle = {
      wave: this.wave,
      kills: this.kills,
      time: this.runTime,
      bestWave: this.meta.bestWave,
      bestKills: this.meta.bestKills,
      unlocked: result.unlocked,
      goldGain: result.goldGain,
      gold: this.meta.gold,
    };
    this.meta.settlesSinceAd += 1;
    const ad = !PLAYABLES && shouldShowInterstitial(this.meta.settlesSinceAd, this.meta.removeAds);
    if (ad) this.meta.settlesSinceAd = 0;
    writeMeta(this.meta);
    if (ad) this.playAd('interstitial', '模拟插屏');
    else {
      this.state = 'settle';
      this.hud.showSettle(this.pendingSettle);
    }
  }

  private commitRun(): { unlocked: string[]; goldGain: number } {
    if (this.runCommitted) return { unlocked: [], goldGain: 0 };
    this.runCommitted = true;
    const goldGain = goldForRun(this.wave, this.kills);
    this.meta.gold += goldGain;
    if (this.wave > this.meta.bestWave) this.meta.bestWave = this.wave;
    if (this.kills > this.meta.bestKills) this.meta.bestKills = this.kills;
    if (this.runTime > this.meta.bestTime) this.meta.bestTime = this.runTime;
    return { unlocked: syncUnlocks(this.meta), goldGain };
  }

  private async shareSettle() {
    if (PLAYABLES || !this.pendingSettle || this.state !== 'settle') return;
    const { formatShareText, shareResult } = await import('./share');
    const info = {
      wave: this.pendingSettle.wave,
      kills: this.pendingSettle.kills,
      time: this.pendingSettle.time,
      name: DISPLAY_NAME,
    };
    const text = formatShareText(info);
    const mode = await shareResult(info);
    this.hud.setShareLine(text);
    this.hud.toast(mode === 'shared' ? '已打开分享' : mode === 'downloaded' ? '已保存战绩图并复制文字' : '已复制战绩');
  }

  private setSensitivity(s: Sensitivity) {
    this.settings.sensitivity = s;
    writeSettings(this.settings);
    if (this.state === 'menu') this.hud.renderMenu(this.meta, s);
  }

  private equipSkin(id: string) {
    if (!ownsSkin(this.meta, id)) {
      const skin = skinById(id);
      if (skin.iap && !PLAYABLES) this.hud.toast('草莓涂装要用下面的支付占位');
      else if (!skin.iap) this.hud.toast(`第 ${skin.unlockWave} 波解锁 ${skin.name}`);
      return;
    }
    this.meta.skin = id;
    writeMeta(this.meta);
    this.paintPlayer();
    if (this.state === 'menu') this.hud.renderMenu(this.meta, this.settings.sensitivity);
    this.hud.toast(`${skinById(id).name} · 只改颜色`);
  }

  private applyStub(kind: 'ads' | 'skin') {
    if (PLAYABLES) return;
    void import('./stubPurchase').then((mod) =>
      mod.runStubPurchase(kind, this.meta, {
        toast: (text) => this.hud.toast(text),
        paint: () => this.paintPlayer(),
        refreshMenu: () => {
          if (this.state === 'menu') this.hud.renderMenu(this.meta, this.settings.sensitivity);
        },
      }),
    );
  }

  private paintPlayer() {
    const skin = skinById(this.meta.skin);
    this.player.applySkin(skin.body, skin.dark);
  }

  private buyGear(slot: GearSlot) {
    if (this.state !== 'hub') return;
    const level = this.meta.gear[slot];
    if (upgradeCost(level) === null) {
      this.hud.toast('已满级');
      this.hud.showHub(this.meta);
      return;
    }
    const next = tryUpgrade(this.meta.gold, level);
    if (!next.spent) {
      this.hud.toast('金币不够');
      return;
    }
    this.meta.gold = next.gold;
    this.meta.gear[slot] = next.level;
    writeMeta(this.meta);
    this.hud.showHub(this.meta);
    this.hud.toast('升级了，下一局生效');
  }

  private buySkin(id: string) {
    if (this.state !== 'hub') return;
    if (ownsSkin(this.meta, id)) {
      this.meta.skin = id;
      writeMeta(this.meta);
      this.paintPlayer();
      this.hud.showHub(this.meta);
      this.hud.toast(`${skinById(id).name} · 只改颜色`);
      return;
    }
    const price = skinGoldPrice(id);
    const next = tryBuySkin(this.meta.gold, id, false);
    if (!next.bought || price === null) {
      this.hud.toast(price === null ? '这款涂装不能用金币买' : '金币不够');
      return;
    }
    this.meta.gold = next.gold;
    this.meta.unlocked.push(id);
    this.meta.skin = id;
    writeMeta(this.meta);
    this.paintPlayer();
    this.hud.showHub(this.meta);
    this.hud.toast(`${skinById(id).name} 已换上，火力不变`);
  }

  private openHub() {
    if (this.state !== 'menu' && this.state !== 'settle') return;
    this.hubFrom = this.state;
    this.state = 'hub';
    this.hud.setPlaying(false);
    this.hud.hideCrosshair();
    this.hud.showHub(this.meta);
  }

  private closeHub() {
    if (this.state !== 'hub') return;
    if (this.hubFrom === 'settle' && this.pendingSettle) {
      this.state = 'settle';
      this.hud.showSettle(this.pendingSettle);
      return;
    }
    this.showMenu();
  }

  private pause() {
    if (this.state !== 'playing') return;
    this.input.discardActions();
    this.state = 'paused';
    this.hud.showPause();
  }

  private resume() {
    if (this.state !== 'paused') return;
    this.input.discardActions();
    this.state = 'playing';
    this.hud.hidePanels();
    this.hud.setPlaying(true);
    if (!this.pointerAim) this.hud.showCrosshair();
  }

  private maybeCoach() {
    if (this.desktop) {
      this.maybeDeskHint();
      return;
    }
    if (seenFlag('coach')) return;
    const lines: [number, string][] = PLAYABLES
      ? [
          [400, '左摇杆或 WASD 移动'],
          [3200, '右屏滑动，或用鼠标瞄准'],
          [6200, '按住 💥 开炮，打中脑袋会暴击'],
        ]
      : [
          [400, '按住左半屏移动'],
          [3200, '右半屏滑动，准星对准敌人'],
          [6200, '按住 💥 开炮，打中脑袋会暴击'],
        ];
    for (const [ms, text] of lines) {
      this.coachIds.push(window.setTimeout(() => this.hud.coach(text), ms));
    }
    this.coachIds.push(window.setTimeout(() => markFlag('coach'), 9000));
  }

  private maybeDeskHint() {
    if (seenFlag('desk')) return;
    this.hud.showDeskHint('WASD 移动 · 鼠标瞄准 · 左键开炮 · 空格跳跃 · Esc 暂停');
    markFlag('desk');
    this.coachIds.push(window.setTimeout(() => this.hud.hideDeskHint(), 7000));
  }

  private clearCoach() {
    this.hud.hideDeskHint();
    for (const id of this.coachIds) window.clearTimeout(id);
    this.coachIds = [];
  }

  private onKey(e: KeyboardEvent) {
    if (e.repeat) return;
    if (e.code === 'Enter' && this.state === 'menu') this.hud.onStart?.();
    else if (e.code === 'Enter' && this.state === 'settle') this.hud.onRetry?.();
    else if (e.code === 'Enter' && this.state === 'hub') this.hud.onSortie?.();
    else if (e.code === 'KeyR' && this.state === 'revive') this.acceptRevive();
    else if (e.code === 'Escape' && this.state === 'revive') this.beginSettle();
    else if (e.code === 'Escape' && this.state === 'playing') this.pause();
    else if (e.code === 'Escape' && this.state === 'paused') this.resume();
    else if (e.code === 'Escape' && this.state === 'hub') this.closeHub();
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

  private loop = () => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt, this.clock.elapsedTime);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };

  private update(dt: number, time: number) {
    this.particles.update(dt);
    this.floaters.update(dt);
    if (this.state === 'playing' || this.state === 'upgrade') this.runTime += dt;
    this.playedFor += dt;
    this.watchFrame(dt);

    if (this.state === 'menu') {
      this.input.takeLook();
      this.player.cameraLerp(this.camera, dt);
      return;
    }
    if (this.state !== 'playing') {
      this.input.takeLook();
      this.cameraThirdPerson(dt);
      return;
    }

    this.updateLook(dt);
    const aim = this.resolveAimPoint();
    const desiredAimYaw = Math.atan2(aim.x - this.player.pos.x, aim.z - this.player.pos.z);
    this.player.update(dt, this.input, desiredAimYaw, this.camYaw, PLAY_BOUNDS);
    this.cameraThirdPerson(dt);

    if (this.input.fireHeld) {
      const shot = this.player.tryFire(aim);
      if (shot) {
        this.bullets.spawn({
          pos: shot.pos,
          dir: shot.dir,
          speed: 42,
          damage: 14 * this.player.damageScale(),
          fromPlayer: true,
        });
      }
    }
    if (this.input.consumeSkill('jump')) this.player.tryJump();
    if (this.input.consumeSkill('dash')) this.player.tryDash(this.camYaw);
    if (this.input.consumeSkill('shield') && this.player.tryShield()) this.hud.toast('能量护盾');
    if (this.input.consumeSkill('spread')) {
      const shots = this.player.trySpread();
      if (shots) {
        for (const s of shots) {
          this.bullets.spawn({
            pos: s.pos,
            dir: s.dir,
            speed: 38,
            damage: 12 * this.player.damageScale(),
            fromPlayer: true,
            color: 0xffa83b,
          });
        }
      }
    }
    if (this.input.consumeSkill('orbital') && this.player.tryOrbital()) this.castOrbital();

    const shock = this.player.consumeLandShock();
    if (shock) this.applyShock(shock.pos, shock.radius, shock.damage);

    const playerPos = this.player.worldPos();
    for (const e of this.enemies) {
      const intent = e.update(dt, playerPos, time);
      if (intent) {
        this.bullets.spawn({
          pos: intent.pos,
          dir: intent.dir,
          speed: intent.speed,
          damage: intent.damage,
          fromPlayer: false,
          color: intent.color,
        });
        this.audio.enemyShot();
      }
      e.faceBar(this.camera);
      if (e.kind === 'alien' && e.meleeCd <= 0) {
        const d = Math.hypot(e.group.position.x - this.player.pos.x, e.group.position.z - this.player.pos.z);
        if (d < e.radius + PLAYER_RADIUS) {
          e.meleeCd = 1.0;
          this.damagePlayer(e.meleeDamage);
        }
      }
    }

    if (this.boss && this.boss.alive) {
      const intents = this.boss.update(dt, playerPos, time);
      for (const it of intents) {
        this.bullets.spawn({
          pos: it.pos,
          dir: it.dir,
          speed: it.speed,
          damage: it.damage,
          fromPlayer: false,
          color: it.color,
        });
      }
      if (intents.length) this.audio.enemyShot();
      this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
    }

    this.bullets.update(dt, ARENA_RADIUS + 20);
    this.handleCollisions();

    if (this.state !== 'playing') return;
    if (this.breather > 0) {
      this.breather -= dt;
      if (this.breather <= 0) {
        this.breather = 0;
        this.openUpgrade();
      }
    } else {
      this.noteClear();
    }

    this.refreshVitals();
    this.updateMinimap();
  }

  private noteClear() {
    if (this.enemies.length > 0) return;
    if (this.boss && this.boss.alive) return;
    this.breather = 0.45;
  }

  private updateLook(dt: number) {
    const look = this.input.takeLook();
    const sens = lookScale(this.settings.sensitivity);
    if (look.x !== 0 || look.y !== 0) {
      this.camYaw -= look.x * LOOK_SENS * sens;
      this.camPitch -= look.y * LOOK_SENS * sens;
    }
    const k = 1.7 * dt * sens;
    if (this.input.keyHeld('KeyQ')) this.camYaw += k;
    if (this.input.keyHeld('KeyE')) this.camYaw -= k;
    if (this.input.keyHeld('KeyR')) this.camPitch += k;
    if (this.input.keyHeld('KeyF')) this.camPitch -= k;
    this.camPitch = clamp(this.camPitch, -0.45, 0.62);
  }

  private cameraThirdPerson(dt: number) {
    this.camForward.set(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const cp = Math.cos(this.camPitch);
    const sp = Math.sin(this.camPitch);
    const tgt = this.player.worldPos();
    const dist = 10.8;
    const camX = tgt.x - this.camForward.x * dist * cp;
    const camZ = tgt.z - this.camForward.z * dist * cp;
    const camY = tgt.y + 4.6 - sp * 4.0;
    this.camera.position.x = damp(this.camera.position.x, camX, 10, dt);
    this.camera.position.y = damp(this.camera.position.y, camY, 10, dt);
    this.camera.position.z = damp(this.camera.position.z, camZ, 10, dt);
    this.camera.lookAt(tgt.x + this.camForward.x * 3, tgt.y + 1.2 + sp * 7, tgt.z + this.camForward.z * 3);
  }

  private aimNdc(): THREE.Vector2 {
    return this.pointerAim ? this.input.pointerNdc : SCREEN_CENTER;
  }

  private resolveAimPoint(): THREE.Vector3 {
    this.raycaster.setFromCamera(this.aimNdc(), this.camera);
    const ray = this.raycaster.ray;
    let bestProj = Infinity;
    let found = false;
    const consider = (p: THREE.Vector3, headY: number) => {
      this.aimScratch.set(p.x, p.y + headY * 0.6, p.z);
      const dx = this.aimScratch.x - ray.origin.x;
      const dy = this.aimScratch.y - ray.origin.y;
      const dz = this.aimScratch.z - ray.origin.z;
      const proj = dx * ray.direction.x + dy * ray.direction.y + dz * ray.direction.z;
      if (proj <= 1) return;
      const cx = ray.origin.x + ray.direction.x * proj;
      const cy = ray.origin.y + ray.direction.y * proj;
      const cz = ray.origin.z + ray.direction.z * proj;
      const perp = Math.hypot(cx - this.aimScratch.x, cy - this.aimScratch.y, cz - this.aimScratch.z);
      const assist = this.input.fireHeld ? 0.34 : 0.2;
      if (perp / proj < assist && proj < bestProj) {
        bestProj = proj;
        this.aimBest.copy(this.aimScratch);
        found = true;
      }
    };
    for (const e of this.enemies) if (e.alive) consider(e.group.position, e.headY);
    if (this.boss && this.boss.alive) consider(this.boss.group.position, this.boss.headY);
    if (found) return this.aimBest;

    const hit = new THREE.Vector3();
    if (ray.intersectPlane(this.groundPlane, hit) && hit.distanceTo(ray.origin) < 170) return hit;
    return ray.origin.clone().addScaledVector(ray.direction, 70);
  }

  private castOrbital() {
    this.raycaster.setFromCamera(this.aimNdc(), this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) hit.set(this.aimBest.x, 0, this.aimBest.z);
    hit.x = clamp(hit.x, -PLAY_BOUNDS, PLAY_BOUNDS);
    hit.z = clamp(hit.z, -PLAY_BOUNDS, PLAY_BOUNDS);
    hit.y = 0;
    this.particles.orbitalBeam(hit.clone(), 0x9b6bff);
    this.hud.toast('轨道打击');
    const serial = this.runSerial;
    const damage = 140 * this.player.damageScale();
    window.setTimeout(() => {
      if (serial !== this.runSerial || this.state !== 'playing') return;
      this.particles.explosion(new THREE.Vector3(hit.x, 0.6, hit.z), 0x9b6bff, 2.2);
      this.particles.ring(new THREE.Vector3(hit.x, 0.1, hit.z), 0xc39bff, 7);
      this.audio.explosion();
      this.applyOrbital(hit, 7.5, damage);
    }, 430);
  }

  private applyOrbital(pos: THREE.Vector3, radius: number, damage: number) {
    const crit = this.player.mods.crit;
    for (const e of [...this.enemies]) {
      if (!e.alive) continue;
      const d = Math.hypot(e.group.position.x - pos.x, e.group.position.z - pos.z);
      if (d < radius) {
        const res = e.takeDamage(damage, e.group.position.y + e.headY, this.particles, crit);
        this.floaters.spawn(new THREE.Vector3(e.group.position.x, e.group.position.y + e.headY + 0.4, e.group.position.z), res.crit ? `${res.dmg}!` : `${res.dmg}`, res.crit);
        if (res.killed) this.killEnemy(e);
      }
    }
    if (this.boss && this.boss.alive) {
      const d = Math.hypot(this.boss.group.position.x - pos.x, this.boss.group.position.z - pos.z);
      if (d < radius + 2) {
        const res = this.boss.takeDamage(damage, this.boss.group.position.y + this.boss.headY, this.particles, crit);
        this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
        if (res.killed) this.killBoss();
      }
    }
  }

  private handleCollisions() {
    const crit = this.player.mods.crit;
    for (const b of this.bullets.list) {
      if (!b.alive) continue;
      const bp = b.mesh.position;
      if (b.fromPlayer) {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const ep = e.group.position;
          const dx = ep.x - bp.x;
          const dz = ep.z - bp.z;
          if (dx * dx + dz * dz < (e.radius + b.radius) ** 2 && bp.y < ep.y + e.headY + 0.8) {
            const res = e.takeDamage(b.damage, bp.y, this.particles, crit);
            this.floaters.spawn(new THREE.Vector3(ep.x, ep.y + e.headY + 0.4, ep.z), res.crit ? `${res.dmg}!` : `${res.dmg}`, res.crit);
            this.audio[res.crit ? 'crit' : 'hit']();
            this.bullets.kill(b);
            if (res.killed) this.killEnemy(e);
            break;
          }
        }
        if (!b.alive) continue;
        if (this.boss && this.boss.alive) {
          const bo = this.boss.group.position;
          const dx = bo.x - bp.x;
          const dz = bo.z - bp.z;
          if (dx * dx + dz * dz < (this.boss.radius + b.radius) ** 2 && bp.y < bo.y + this.boss.headY + 1) {
            const res = this.boss.takeDamage(b.damage, bp.y, this.particles, crit);
            this.floaters.spawn(new THREE.Vector3(bp.x, bp.y + 0.6, bp.z), res.crit ? `${res.dmg}!` : `${res.dmg}`, res.crit);
            this.audio[res.crit ? 'crit' : 'hit']();
            this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
            this.bullets.kill(b);
            if (res.killed) this.killBoss();
          }
        }
      } else {
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
    const scaled = damage * (0.7 + 0.3 * this.player.damageScale());
    for (const e of this.enemies) {
      if (!e.alive || e.kind === 'ufo') continue;
      const d = Math.hypot(e.group.position.x - pos.x, e.group.position.z - pos.z);
      if (d < radius) {
        const res = e.takeDamage(scaled, e.group.position.y + e.headY, this.particles, this.player.mods.crit);
        this.floaters.spawn(new THREE.Vector3(e.group.position.x, e.group.position.y + e.headY + 0.4, e.group.position.z), `${res.dmg}`, false);
        if (res.killed) this.killEnemy(e);
      }
    }
    if (this.boss && this.boss.alive && this.boss.level !== 2) {
      const d = Math.hypot(this.boss.group.position.x - pos.x, this.boss.group.position.z - pos.z);
      if (d < radius + 2) {
        const res = this.boss.takeDamage(scaled, this.boss.group.position.y + this.boss.headY, this.particles, this.player.mods.crit);
        this.hud.updateBoss(this.boss.hp, this.boss.hpMax);
        if (res.killed) this.killBoss();
      }
    }
  }

  private killEnemy(e: Enemy) {
    this.kills += 1;
    e.dispose(this.scene, this.particles);
    this.audio.explosion();
    const idx = this.enemies.indexOf(e);
    if (idx >= 0) this.enemies.splice(idx, 1);
    this.hud.setKills(this.kills);
  }

  private killBoss() {
    if (!this.boss) return;
    this.kills += 1;
    this.hud.setKills(this.kills);
    this.boss.explode(this.particles);
    this.audio.explosion();
    this.boss.dispose(this.scene);
    this.boss = null;
    this.hud.hideBoss();
  }

  private damagePlayer(dmg: number) {
    if (this.state !== 'playing') return;
    const res = this.player.takeDamage(dmg);
    if (res === '') return;
    this.hud.flashDamage();
    this.refreshVitals();
    if (res === 'life') this.hud.toast(`还剩 ${this.player.lives} 条命`);
    if (res === 'dead') this.onDown();
  }

  private refreshVitals() {
    this.hud.setHP(this.player.hp, this.player.hpMax);
    this.hud.setLives(this.player.lives, this.player.livesMax);
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

  private watchFrame(dt: number) {
    if (this.showFps) {
      this.fpsAccum += dt;
      this.fpsFrames += 1;
      if (this.fpsAccum >= 0.5) {
        const fps = Math.round(this.fpsFrames / this.fpsAccum);
        this.hud.setFps(`${fps} fps · dpr ${this.pixelRatio.toFixed(2)}`);
        this.fpsAccum = 0;
        this.fpsFrames = 0;
      }
    }
    if (this.qualityDropped || this.playedFor < 3) return;
    if (dt > 0.034) this.slowFrames += 1;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames < 45) return;
    this.qualityDropped = true;
    this.pixelRatio = Math.max(1, this.pixelRatio * 0.72);
    this.renderer.setPixelRatio(this.pixelRatio);
    if (this.pixelRatio <= 1.05) this.renderer.shadowMap.enabled = false;
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
