import { ControlEls } from './Input';

export interface MiniDot {
  x: number;
  z: number;
  color: string;
  size: number;
}

export class HUD {
  root: HTMLElement;
  controls: ControlEls;

  private hpFill: HTMLElement;
  private hpText: HTMLElement;
  private livesEl: HTMLElement;
  private levelName: HTMLElement;
  private levelSub: HTMLElement;
  private scoreVal: HTMLElement;

  private bossWrap: HTMLElement;
  private bossName: HTMLElement;
  private bossFill: HTMLElement;
  private bossNum: HTMLElement;

  private chips: HTMLElement[] = [];
  private skillEls: { name: string; el: HTMLElement; mask: HTMLElement }[] = [];
  private crosshair: HTMLElement;

  private overlay: HTMLElement;
  private overlayTitle: HTMLElement;
  private overlayBody: HTMLElement;
  private overlayBtn: HTMLButtonElement;

  private toastEl: HTMLElement;
  private vignette: HTMLElement;
  private mini: HTMLCanvasElement;
  private miniCtx: CanvasRenderingContext2D;

  onPrimary: (() => void) | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    const hud = document.createElement('div');
    hud.innerHTML = TEMPLATE;
    while (hud.firstChild) root.appendChild(hud.firstChild);

    this.hpFill = root.querySelector('.hpbar > i')!;
    this.hpText = root.querySelector('.hp-text')!;
    this.livesEl = root.querySelector('.lives')!;
    this.levelName = root.querySelector('.level-name')!;
    this.levelSub = root.querySelector('.level-sub')!;
    this.scoreVal = root.querySelector('.score-val')!;

    this.bossWrap = root.querySelector('.boss')!;
    this.bossName = root.querySelector('.boss .name')!;
    this.bossFill = root.querySelector('.boss .bar > i')!;
    this.bossNum = root.querySelector('.boss .hpnum')!;

    this.chips = Array.from(root.querySelectorAll('.chip'));
    this.crosshair = root.querySelector('.crosshair')!;
    const skillNodes = Array.from(root.querySelectorAll('.btn.skill')) as HTMLElement[];
    this.skillEls = skillNodes.map((el) => ({
      name: el.dataset.skill!,
      el,
      mask: el.querySelector('.cdmask') as HTMLElement,
    }));

    this.overlay = root.querySelector('.overlay')!;
    this.overlayTitle = root.querySelector('.overlay h1')!;
    this.overlayBody = root.querySelector('.overlay .ov-body')!;
    this.overlayBtn = root.querySelector('.overlay .bigbtn')!;

    this.toastEl = root.querySelector('.toast')!;
    this.vignette = root.querySelector('.vignette')!;
    this.mini = root.querySelector('.minimap canvas')!;
    this.mini.width = 116;
    this.mini.height = 116;
    this.miniCtx = this.mini.getContext('2d')!;

    this.controls = {
      joystick: root.querySelector('.joystick')!,
      knob: root.querySelector('.joystick .knob')!,
      aimZone: root.querySelector('.aim-zone')!,
      fireBtn: root.querySelector('.btn.fire')!,
      skills: this.skillEls.map((s) => ({ name: s.name, el: s.el })),
    };

    this.overlayBtn.addEventListener('click', () => this.onPrimary?.());
  }

  setHP(hp: number, max: number) {
    this.hpFill.style.transform = `scaleX(${Math.max(0, hp / max)})`;
    this.hpText.textContent = `${Math.max(0, Math.ceil(hp))}/${max}`;
  }

  setLives(lives: number, max: number) {
    let html = '';
    for (let i = 0; i < max; i++) html += `<span class="life${i < lives ? '' : ' lost'}">❤</span>`;
    this.livesEl.innerHTML = html;
  }

  setLevel(name: string, sub: string) {
    this.levelName.textContent = name;
    this.levelSub.textContent = sub;
  }

  setScore(n: number) {
    this.scoreVal.textContent = String(n);
  }

  setChips(activeIdx: number, doneCount: number) {
    this.chips.forEach((c, i) => {
      c.classList.toggle('active', i === activeIdx);
      c.classList.toggle('done', i < doneCount);
    });
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
    // force reflow to restart animation
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
  }

  flashDamage() {
    this.vignette.classList.add('hit');
    setTimeout(() => this.vignette.classList.remove('hit'), 140);
  }

  showOverlay(title: string, bodyHtml: string, btnLabel: string) {
    this.overlayTitle.innerHTML = title;
    this.overlayBody.innerHTML = bodyHtml;
    this.overlayBtn.textContent = btnLabel;
    this.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  drawMinimap(player: MiniDot, dots: MiniDot[], worldRadius: number) {
    const ctx = this.miniCtx;
    const w = this.mini.width;
    const c = w / 2;
    ctx.clearRect(0, 0, w, w);
    const scale = (c - 6) / worldRadius;
    const map = (x: number, z: number) => [c + x * scale, c + z * scale] as const;
    // dots
    for (const d of dots) {
      const [px, pz] = map(d.x, d.z);
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(px, pz, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    // player (triangle)
    const [px, pz] = map(player.x, player.z);
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(px, pz, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

const TEMPLATE = `
  <div class="vignette"></div>
  <div class="hud">
    <div class="status hud-panel">
      <div class="row"><span class="ico">❤️</span><div class="hpbar"><i></i></div><span class="hp-text">10/10</span></div>
      <div class="row"><span class="ico">🛡️</span><div class="lives"></div></div>
      <div class="row"><span class="ico">🚩</span><span class="level-name">森林竞技场</span></div>
      <div class="row"><span class="ico">🏆</span><span class="score-val">0</span><span class="level-sub" style="opacity:.7;font-size:12px"></span></div>
    </div>

    <div class="boss">
      <div class="name"><b>BOSS</b></div>
      <div class="bar"><i></i></div>
      <div class="hpnum"></div>
    </div>

    <div class="levels">
      <div class="chip">第1关<br/>森林</div>
      <div class="chip">第2关<br/>沙漠</div>
      <div class="chip">第3关<br/>外星球</div>
    </div>

    <div class="minimap"><canvas></canvas></div>
  </div>

  <div class="controls">
    <div class="joystick"><div class="knob"></div></div>
    <div class="aim-zone"></div>
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

  <div class="toast"></div>

  <div class="overlay">
    <h1></h1>
    <p class="ov-body"></p>
    <button class="bigbtn">开始</button>
  </div>
`;
