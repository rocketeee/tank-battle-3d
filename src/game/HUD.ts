import { formatClock } from './clock';
import { GearSlot, GEAR_SLOTS, SOFT_CAP, skinGoldPrice, upgradeCost } from './gear';
import { ControlEls } from './Input';
import { MetaSave, SKINS, ownsSkin } from './meta';
import { Sensitivity } from './settings';
import { PLAYABLES } from './target';
import { PRIVACY_POLICY_URL } from './store';

export interface MiniDot {
  x: number;
  z: number;
  color: string;
  size: number;
}

export interface UpgradeCard {
  id: string;
  name: string;
  blurb: string;
  rank: number;
  max: number;
}

export interface SettleInfo {
  wave: number;
  kills: number;
  time: number;
  bestWave: number;
  bestKills: number;
  unlocked: string[];
  goldGain: number;
  gold: number;
}

export class HUD {
  root: HTMLElement;
  controls: ControlEls;

  onStart: (() => void) | null = null;
  onRetry: (() => void) | null = null;
  onHome: (() => void) | null = null;
  onShare: (() => void) | null = null;
  onRevive: (() => void) | null = null;
  onGiveUp: (() => void) | null = null;
  onPick: ((id: string) => void) | null = null;
  onRefresh: (() => void) | null = null;
  onSensitivity: ((s: Sensitivity) => void) | null = null;
  onSkin: ((id: string) => void) | null = null;
  onStub: ((kind: 'ads' | 'skin') => void) | null = null;
  onHub: (() => void) | null = null;
  onHubBack: (() => void) | null = null;
  onSortie: (() => void) | null = null;
  onResume: (() => void) | null = null;
  onGear: ((slot: GearSlot) => void) | null = null;
  onBuySkin: ((id: string) => void) | null = null;

  private hpFill: HTMLElement;
  private hpText: HTMLElement;
  private hpBar: HTMLElement;
  private livesEl: HTMLElement;
  private livesShown = -1;
  private scoreVal: HTMLElement;
  private waveNum: HTMLElement;
  private waveBadge: HTMLElement;
  private bossWrap: HTMLElement;
  private bossName: HTMLElement;
  private bossFill: HTMLElement;
  private bossNum: HTMLElement;
  private skillEls: { name: string; el: HTMLElement; mask: HTMLElement }[] = [];
  private crosshair: HTMLElement;
  private toastEl: HTMLElement;
  private coachEl: HTMLElement;
  private vignette: HTMLElement;
  private mini: HTMLCanvasElement;
  private miniCtx: CanvasRenderingContext2D;
  private fpsEl: HTMLElement;

  private menu: HTMLElement;
  private upgrade: HTMLElement;
  private cardsEl: HTMLElement;
  private refreshBtn: HTMLButtonElement | null;
  private revive: HTMLElement | null;
  private ad: HTMLElement | null;
  private adKind: HTMLElement | null;
  private settle: HTMLElement;
  private settleStats: HTMLElement;
  private bestLine: HTMLElement;
  private shareLine: HTMLElement | null;
  private adsBtn: HTMLButtonElement | null;
  private skinRow: HTMLElement;
  private menuGold: HTMLElement;
  private hub: HTMLElement;
  private hubGold: HTMLElement;
  private slotsEl: HTMLElement;
  private skinShop: HTMLElement;
  private pause: HTMLElement;
  private deskHint: HTMLElement;
  private sensBtns: HTMLButtonElement[];
  private adTimer = 0;
  private adDone: (() => void) | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    const hud = document.createElement('div');
    hud.innerHTML = TEMPLATE;
    while (hud.firstChild) root.appendChild(hud.firstChild);

    this.hpFill = root.querySelector('.hpbar > i')!;
    this.hpBar = root.querySelector('.hpbar')!;
    this.hpText = root.querySelector('.hp-text')!;
    this.livesEl = root.querySelector('.lives')!;
    this.scoreVal = root.querySelector('.score-val')!;
    this.waveNum = root.querySelector('.wave-badge b')!;
    this.waveBadge = root.querySelector('.wave-badge')!;

    this.bossWrap = root.querySelector('.boss')!;
    this.bossName = root.querySelector('.boss .name')!;
    this.bossFill = root.querySelector('.boss .bar > i')!;
    this.bossNum = root.querySelector('.boss .hpnum')!;

    this.crosshair = root.querySelector('.crosshair')!;
    const skillNodes = Array.from(root.querySelectorAll('.btn.skill')) as HTMLElement[];
    this.skillEls = skillNodes.map((el) => ({
      name: el.dataset.skill!,
      el,
      mask: el.querySelector('.cdmask') as HTMLElement,
    }));

    this.toastEl = root.querySelector('.toast')!;
    this.coachEl = root.querySelector('.coach')!;
    this.vignette = root.querySelector('.vignette')!;
    this.mini = root.querySelector('.minimap canvas')!;
    this.mini.width = 116;
    this.mini.height = 116;
    this.miniCtx = this.mini.getContext('2d')!;
    this.fpsEl = root.querySelector('.fps')!;

    this.menu = root.querySelector('.menu-panel')!;
    this.upgrade = root.querySelector('.upgrade-panel')!;
    this.cardsEl = root.querySelector('.cards')!;
    this.refreshBtn = root.querySelector('.refresh');
    this.revive = root.querySelector('.revive-panel');
    this.ad = root.querySelector('.ad-panel');
    this.adKind = root.querySelector('.ad-kind');
    this.settle = root.querySelector('.settle-panel')!;
    this.settleStats = root.querySelector('.settle-stats')!;
    this.shareLine = root.querySelector('.share-result');
    this.adsBtn = root.querySelector('[data-stub="ads"]');
    this.bestLine = root.querySelector('.bestline')!;
    this.skinRow = root.querySelector('.skins')!;
    this.menuGold = root.querySelector('.menu-gold')!;
    this.hub = root.querySelector('.hub-panel')!;
    this.hubGold = root.querySelector('.hub-gold')!;
    this.slotsEl = root.querySelector('.slots')!;
    this.skinShop = root.querySelector('.skin-shop')!;
    this.pause = root.querySelector('.pause-panel')!;
    this.deskHint = root.querySelector('.desk-hint')!;
    this.sensBtns = Array.from(root.querySelectorAll('.sens button')) as HTMLButtonElement[];

    this.controls = {
      moveZone: root.querySelector('.move-zone')!,
      joystick: root.querySelector('.joystick')!,
      knob: root.querySelector('.joystick .knob')!,
      aimZone: root.querySelector('.aim-zone')!,
      fireBtn: root.querySelector('.btn.fire')!,
      skills: this.skillEls.map((s) => ({ name: s.name, el: s.el })),
    };

    root.querySelector('.start')!.addEventListener('click', () => this.onStart?.());
    root.querySelector('.open-hub')!.addEventListener('click', () => this.onHub?.());
    root.querySelector('.retry')!.addEventListener('click', () => this.onRetry?.());
    root.querySelector('.to-hub')!.addEventListener('click', () => this.onHub?.());
    root.querySelector('.sortie')!.addEventListener('click', () => this.onSortie?.());
    root.querySelector('.hub-back')!.addEventListener('click', () => this.onHubBack?.());
    root.querySelector('.resume')!.addEventListener('click', () => this.onResume?.());
    root.querySelector('.home')!.addEventListener('click', () => this.onHome?.());
    root.querySelector('.share')?.addEventListener('click', () => this.onShare?.());
    root.querySelector('.do-revive')?.addEventListener('click', () => this.onRevive?.());
    root.querySelector('.giveup')?.addEventListener('click', () => this.onGiveUp?.());
    this.refreshBtn?.addEventListener('click', () => this.onRefresh?.());
    root.querySelector('.ad-done')?.addEventListener('click', () => this.finishAd());
    for (const btn of this.sensBtns) {
      btn.addEventListener('click', () => this.onSensitivity?.(btn.dataset.sens as Sensitivity));
    }
    root.querySelector('[data-stub="ads"]')?.addEventListener('click', () => this.onStub?.('ads'));
    root.querySelector('[data-stub="skin"]')?.addEventListener('click', () => this.onStub?.('skin'));
    if (!PLAYABLES) {
      const privacy = root.querySelector('.privacy') as HTMLAnchorElement | null;
      if (privacy) privacy.href = PRIVACY_POLICY_URL;
    }
  }

  renderMenu(meta: MetaSave, sensitivity: Sensitivity) {
    const best = meta.bestWave > 0 ? `最佳 第 ${meta.bestWave} 波 · 击杀 ${meta.bestKills}` : '还没有纪录，第一波很温柔';
    this.bestLine.textContent = best;
    this.menuGold.textContent = `金币 ${meta.gold}`;
    for (const btn of this.sensBtns) btn.classList.toggle('active', btn.dataset.sens === sensitivity);
    if (!PLAYABLES && this.adsBtn) {
      this.adsBtn.disabled = meta.removeAds;
      this.adsBtn.textContent = meta.removeAds ? '插屏已关闭（模拟支付）' : '去除广告（未接入支付）';
    }
    this.skinRow.innerHTML = '';
    for (const skin of SKINS) {
      if (PLAYABLES && skin.iap) continue;
      const owned = ownsSkin(meta, skin.id);
      const b = document.createElement('button');
      b.className = 'skin' + (meta.skin === skin.id ? ' on' : '') + (owned ? '' : ' locked');
      b.style.background = `#${skin.body.toString(16).padStart(6, '0')}`;
      const lockedTitle = !PLAYABLES && skin.iap ? `${skin.name} · 支付占位` : `${skin.name} · 第 ${skin.unlockWave} 波`;
      b.title = owned ? skin.name : lockedTitle;
      b.textContent = owned ? '' : '锁';
      b.addEventListener('click', () => this.onSkin?.(skin.id));
      this.skinRow.appendChild(b);
    }
    this.showOnly('menu');
  }

  showUpgrade(cards: UpgradeCard[], canRefresh: boolean) {
    this.cardsEl.innerHTML = '';
    for (const card of cards) {
      const b = document.createElement('button');
      b.className = 'card';
      b.dataset.id = card.id;
      b.innerHTML = `<b>${card.name}</b><span class="lv">Lv.${card.rank + 1}/${card.max}</span><span>${card.blurb}</span>`;
      b.addEventListener('click', () => this.onPick?.(card.id));
      this.cardsEl.appendChild(b);
    }
    if (this.refreshBtn) this.refreshBtn.hidden = !canRefresh;
    this.showOnly('upgrade');
  }

  showRevive() {
    this.showOnly('revive');
  }

  showSettle(info: SettleInfo) {
    const fresh = info.unlocked.length ? `<br/>新涂装 ${info.unlocked.join('、')}（仅外观）` : '';
    this.settleStats.innerHTML =
      `第 <b>${info.wave}</b> 波<br/>击杀 ${info.kills} · 存活 ${formatClock(info.time)}<br/>金币 +${info.goldGain} · 持有 ${info.gold}<br/>最佳 第 ${info.bestWave} 波 · ${info.bestKills} 杀${fresh}`;
    this.showOnly('settle');
  }

  showHub(meta: MetaSave) {
    this.hubGold.textContent = `金币 ${meta.gold}`;
    this.slotsEl.innerHTML = '';
    for (const slot of GEAR_SLOTS) {
      const level = meta.gear[slot.id];
      const cost = upgradeCost(level);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card gear';
      b.dataset.slot = slot.id;
      b.disabled = cost === null;
      const action = cost === null ? '已满级' : `升级 ${cost} 金币`;
      b.innerHTML = `<b>${slot.name}</b><span class="lv">Lv.${level}/${SOFT_CAP}</span><span>${slot.blurb} · ${action}</span>`;
      b.addEventListener('click', () => this.onGear?.(slot.id));
      this.slotsEl.appendChild(b);
    }
    this.skinShop.innerHTML = '';
    for (const skin of SKINS) {
      if (skin.iap || skin.unlockWave <= 0) continue;
      const price = skinGoldPrice(skin.id);
      if (price === null) continue;
      const owned = ownsSkin(meta, skin.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'textbtn skinbuy';
      b.dataset.skin = skin.id;
      if (owned && meta.skin === skin.id) {
        b.disabled = true;
        b.textContent = `${skin.name} 使用中`;
      } else if (owned) {
        b.textContent = `装备${skin.name}`;
      } else {
        b.textContent = `${skin.name} ${price} 金币`;
      }
      b.addEventListener('click', () => this.onBuySkin?.(skin.id));
      this.skinShop.appendChild(b);
    }
    this.showOnly('hub');
  }

  showPause() {
    this.showOnly('pause');
  }

  showDeskHint(text: string) {
    this.deskHint.textContent = text;
    this.deskHint.classList.remove('hidden');
  }

  hideDeskHint() {
    this.deskHint.classList.add('hidden');
  }

  showAd(label: string, mode: string, onDone: () => void) {
    if (PLAYABLES || !this.ad || !this.adKind) return;
    this.adKind.textContent = label;
    this.ad.dataset.mode = mode;
    this.adDone = onDone;
    window.clearTimeout(this.adTimer);
    this.menu.classList.add('hidden');
    this.upgrade.classList.add('hidden');
    this.revive?.classList.add('hidden');
    this.settle.classList.add('hidden');
    this.hub.classList.add('hidden');
    this.pause.classList.add('hidden');
    this.ad.classList.remove('hidden');
    this.adTimer = window.setTimeout(() => this.finishAd(), 1600);
  }

  setShareLine(text: string) {
    if (this.shareLine) this.shareLine.textContent = text;
  }

  hideAd() {
    window.clearTimeout(this.adTimer);
    this.ad?.classList.add('hidden');
    this.adDone = null;
  }

  private finishAd() {
    const done = this.adDone;
    this.hideAd();
    done?.();
  }

  hidePanels() {
    this.showOnly(null);
    this.hideAd();
  }

  private showOnly(which: 'menu' | 'upgrade' | 'revive' | 'settle' | 'hub' | 'pause' | null) {
    this.menu.classList.toggle('hidden', which !== 'menu');
    this.upgrade.classList.toggle('hidden', which !== 'upgrade');
    this.revive?.classList.toggle('hidden', which !== 'revive');
    this.settle.classList.toggle('hidden', which !== 'settle');
    this.hub.classList.toggle('hidden', which !== 'hub');
    this.pause.classList.toggle('hidden', which !== 'pause');
    if (which !== null) this.hideDeskHint();
    this.hideAd();
  }

  setPlaying(on: boolean) {
    this.waveBadge.classList.toggle('show', on);
    this.root.querySelector('.minimap')!.classList.toggle('hidden', !on);
  }

  setHP(hp: number, max: number) {
    const ratio = Math.max(0, hp / max);
    this.hpFill.style.transform = `scaleX(${ratio})`;
    this.hpText.textContent = `${Math.max(0, Math.ceil(hp))}/${max}`;
    this.hpBar.classList.toggle('low', ratio > 0 && ratio <= 0.35);
  }

  setLives(lives: number, max: number) {
    if (lives === this.livesShown) return;
    this.livesShown = lives;
    let html = '';
    for (let i = 0; i < max; i++) html += `<span class="life${i < lives ? '' : ' lost'}">❤</span>`;
    this.livesEl.innerHTML = html;
  }

  setKills(n: number) {
    this.scoreVal.textContent = String(n);
  }

  setWave(n: number) {
    this.waveNum.textContent = String(n);
  }

  setSkillCd(name: string, ratio: number) {
    const s = this.skillEls.find((x) => x.name === name);
    if (!s) return;
    s.el.classList.toggle('cd', ratio > 0.001);
    s.mask.style.setProperty('--cd', `${ratio * 360}deg`);
  }

  showCrosshair() {
    this.crosshair.classList.add('show');
  }

  hideCrosshair() {
    this.crosshair.classList.remove('show');
  }

  toast(text: string) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
  }

  coach(text: string) {
    this.coachEl.textContent = text;
    this.coachEl.classList.remove('show');
    void this.coachEl.offsetWidth;
    this.coachEl.classList.add('show');
  }

  flashDamage() {
    this.vignette.classList.add('hit');
    window.setTimeout(() => this.vignette.classList.remove('hit'), 140);
  }

  showBoss(name: string) {
    this.bossName.innerHTML = `<b>BOSS</b>${name}`;
    this.bossWrap.classList.add('show');
  }

  updateBoss(hp: number, max: number) {
    this.bossFill.style.transform = `scaleX(${Math.max(0, hp / max)})`;
    this.bossNum.textContent = `${Math.max(0, Math.ceil(hp))} / ${max}`;
  }

  hideBoss() {
    this.bossWrap.classList.remove('show');
  }

  setFps(text: string) {
    this.fpsEl.textContent = text;
    this.fpsEl.classList.toggle('show', text.length > 0);
  }

  drawMinimap(player: MiniDot, dots: MiniDot[], worldRadius: number) {
    const ctx = this.miniCtx;
    const w = this.mini.width;
    const c = w / 2;
    ctx.clearRect(0, 0, w, w);
    const scale = (c - 6) / worldRadius;
    for (const d of dots) {
      const px = c + d.x * scale;
      const pz = c + d.z * scale;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(px, pz, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    const px = c + player.x * scale;
    const pz = c + player.z * scale;
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(px, pz, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

const MENU_STUBS = PLAYABLES
  ? ''
  : `<div class="stubs">
      <button class="textbtn" type="button" data-stub="ads">去除广告（未接入支付）</button>
      <button class="textbtn" type="button" data-stub="skin">草莓涂装（未接入支付）</button>
      <a class="textbtn privacy" href="${PRIVACY_POLICY_URL}" target="_blank" rel="noopener">隐私政策</a>
    </div>`;

const REFRESH_BUTTON = PLAYABLES
  ? ''
  : '<button class="textbtn refresh" type="button">换一批（激励 · 本局 1 次）</button>';

const REVIVE_PANEL = PLAYABLES
  ? ''
  : `<div class="panel revive-panel hidden">
    <h2>坦克趴窝了</h2>
    <p class="subp">本局还能激励复活 1 次。放弃就结算。</p>
    <button class="bigbtn do-revive" type="button">激励复活</button>
    <button class="textbtn giveup" type="button">放弃并结算</button>
  </div>`;

const AD_PANEL = PLAYABLES
  ? ''
  : `<div class="panel ad-panel hidden">
    <div class="adbox">
      <b class="ad-kind">模拟广告</b>
      <p>模拟广告位 · 未接入任何广告网络，不会发放战斗力。</p>
      <button class="bigbtn ad-done" type="button">完成</button>
    </div>
  </div>`;

const SHARE_BUTTON = PLAYABLES
  ? ''
  : '<button class="textbtn share" type="button">分享战绩</button><p class="share-result"></p>';

const PAUSE_HINT = PLAYABLES
  ? '左摇杆移动 · 右屏或鼠标瞄准 · 按住开炮'
  : 'WASD 移动 · 鼠标瞄准 · 左键开炮 · 空格跳跃';

const TEMPLATE = `
  <div class="vignette"></div>
  <div class="wave-badge">第 <b>1</b> 波</div>
  <div class="hud">
    <div class="status hud-panel">
      <div class="row"><span class="ico">❤️</span><div class="hpbar"><i></i></div><span class="hp-text">10/10</span></div>
      <div class="row"><span class="ico">💗</span><div class="lives"></div></div>
      <div class="row"><span class="ico">💥</span><span class="score-val">0</span><span class="level-sub">击杀</span></div>
    </div>
    <div class="boss">
      <div class="name"><b>BOSS</b></div>
      <div class="bar"><i></i></div>
      <div class="hpnum"></div>
    </div>
    <div class="minimap"><canvas></canvas></div>
  </div>
  <div class="controls">
    <div class="move-zone"></div>
    <div class="aim-zone"></div>
    <div class="joystick"><div class="knob"></div></div>
    <div class="crosshair"><i></i></div>
    <div class="btns">
      <div class="btn fire"><span class="emoji">💥</span><span class="lbl">开炮</span></div>
      <div class="btn skill jump" data-skill="jump"><span class="emoji">🔥</span><span class="lbl">跳跃</span><div class="cdmask"></div></div>
      <div class="btn skill spread" data-skill="spread"><span class="emoji">🔱</span><span class="lbl">散射</span><div class="cdmask"></div></div>
      <div class="btn skill shield" data-skill="shield"><span class="emoji">🛡️</span><span class="lbl">护盾</span><div class="cdmask"></div></div>
      <div class="btn skill orbital" data-skill="orbital"><span class="emoji">☄️</span><span class="lbl">天罚</span><div class="cdmask"></div></div>
      <div class="btn skill dash" data-skill="dash"><span class="emoji">⚡</span><span class="lbl">冲刺</span><div class="cdmask"></div></div>
    </div>
  </div>
  <div class="coach"></div>
  <div class="toast"></div>
  <div class="fps"></div>

  <div class="panel menu-panel">
    <h1>萌坦大战 <span class="sub">TANK BATTLE 3D</span></h1>
    <p class="tagline">无尽波次。活下去，波间三选一，倒下再开一局。</p>
    <p class="bestline"></p>
    <p class="menu-gold goldline"></p>
    <div class="sens">
      <span>瞄准灵敏度</span>
      <button type="button" data-sens="low">低</button>
      <button type="button" data-sens="mid">中</button>
      <button type="button" data-sens="high">高</button>
    </div>
    <div class="skins"></div>
    <p class="cosmetic-note">涂装只改颜色。金币升主炮、装甲、履带、雷达，每项 20 级后显示已满级。</p>
    <button class="bigbtn start" type="button">开始游戏</button>
    <button class="textbtn open-hub" type="button">整备</button>
    ${MENU_STUBS}
    <p class="desk">手机：左半屏移动 · 右半屏瞄准 · 按住开炮。电脑：WASD 移动 · 鼠标瞄准 · 左键开炮 · 空格跳跃 · Esc 暂停</p>
  </div>

  <div class="panel upgrade-panel hidden">
    <h2>波间整备</h2>
    <p class="subp">三选一，只在本局生效。选定后回复 2 点生命。</p>
    <div class="cards"></div>
    ${REFRESH_BUTTON}
  </div>

  ${REVIVE_PANEL}
  ${AD_PANEL}

  <div class="panel settle-panel hidden">
    <h2>本局结束</h2>
    <div class="settle-stats"></div>
    <button class="bigbtn retry" type="button">再来一局</button>
    <button class="textbtn to-hub" type="button">去整备</button>
    <div class="stubs">
      ${SHARE_BUTTON}
      <button class="textbtn home" type="button">主页</button>
    </div>
  </div>

  <div class="panel hub-panel hidden">
    <h2>整备</h2>
    <p class="hub-gold goldline"></p>
    <p class="subp">四项各 20 级。满级后按钮是已满级，金币改去买涂装。涂装不加伤害。</p>
    <div class="slots"></div>
    <div class="skin-shop"></div>
    <button class="bigbtn sortie" type="button">出发</button>
    <button class="textbtn hub-back" type="button">返回</button>
  </div>

  <div class="panel pause-panel hidden">
    <h2>暂停</h2>
    <p class="subp">${PAUSE_HINT}</p>
    <button class="bigbtn resume" type="button">继续</button>
  </div>

  <div class="desk-hint hidden"></div>
`;
