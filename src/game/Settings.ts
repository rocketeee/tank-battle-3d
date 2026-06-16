/**
 * Settings — player-tunable controls persisted to localStorage:
 *  - left / right virtual-stick sensitivity
 *  - gyroscope look toggle (right-stick view via device tilt) + its own sensitivity
 * Owns a gear button + modal panel; Input reads `data` every frame.
 */

export interface SettingsData {
  leftSens: number;
  rightSens: number;
  gyroEnabled: boolean;
  gyroSens: number;
}

type DeviceOrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

const KEY = 'tankbattle.settings.v1';
const DEFAULTS: SettingsData = { leftSens: 1, rightSens: 1, gyroEnabled: false, gyroSens: 1 };
const SENS_MIN = 0.4;
const SENS_MAX = 2.5;

function clampSens(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.min(SENS_MAX, Math.max(SENS_MIN, v));
}

export class Settings {
  data: SettingsData;
  /** Notified when the gyro toggle changes (Input may attach/detach listeners). */
  onGyroChange: ((enabled: boolean) => void) | null = null;

  private panel: HTMLElement;

  constructor(root: HTMLElement) {
    this.data = Settings.load();

    const wrap = document.createElement('div');
    wrap.innerHTML = TEMPLATE;
    while (wrap.firstChild) root.appendChild(wrap.firstChild);

    const gear = root.querySelector('.settings-gear') as HTMLElement;
    this.panel = root.querySelector('.settings-panel') as HTMLElement;

    gear.addEventListener('click', () => this.open());
    (this.panel.querySelector('.settings-close') as HTMLElement).addEventListener('click', () => this.close());
    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) this.close();
    });

    this.bindSlider('left', 'leftSens');
    this.bindSlider('right', 'rightSens');
    this.bindSlider('gyro', 'gyroSens');
    this.bindGyroToggle();
    this.syncUI();
  }

  static load(): SettingsData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw) as Partial<SettingsData>;
      return {
        leftSens: clampSens(parsed.leftSens ?? DEFAULTS.leftSens),
        rightSens: clampSens(parsed.rightSens ?? DEFAULTS.rightSens),
        gyroEnabled: !!parsed.gyroEnabled,
        gyroSens: clampSens(parsed.gyroSens ?? DEFAULTS.gyroSens),
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable; settings stay in-memory */
    }
  }

  open() {
    this.panel.classList.add('show');
  }

  close() {
    this.panel.classList.remove('show');
  }

  private bindSlider(key: 'left' | 'right' | 'gyro', field: 'leftSens' | 'rightSens' | 'gyroSens') {
    const slider = this.panel.querySelector(`.sens-${key}`) as HTMLInputElement;
    const label = this.panel.querySelector(`.val-${key}`) as HTMLElement;
    slider.addEventListener('input', () => {
      const v = clampSens(parseFloat(slider.value));
      this.data[field] = v;
      label.textContent = `${v.toFixed(2)}x`;
      this.save();
    });
  }

  private bindGyroToggle() {
    const toggle = this.panel.querySelector('.gyro-toggle') as HTMLInputElement;
    toggle.addEventListener('change', async () => {
      if (toggle.checked) {
        const ok = await this.requestGyroPermission();
        if (!ok) {
          toggle.checked = false;
          this.data.gyroEnabled = false;
          this.save();
          return;
        }
      }
      this.data.gyroEnabled = toggle.checked;
      this.save();
      this.panel.classList.toggle('gyro-on', this.data.gyroEnabled);
      this.onGyroChange?.(this.data.gyroEnabled);
    });
  }

  /** iOS 13+ requires an explicit gesture-gated permission for motion sensors. */
  private async requestGyroPermission(): Promise<boolean> {
    const ctor = (typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : undefined) as
      | DeviceOrientationCtor
      | undefined;
    if (!ctor) return false;
    if (typeof ctor.requestPermission !== 'function') return true; // no gate on this platform
    try {
      const res = await ctor.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }

  private syncUI() {
    const set = (key: string, field: keyof SettingsData) => {
      const slider = this.panel.querySelector(`.sens-${key}`) as HTMLInputElement;
      const label = this.panel.querySelector(`.val-${key}`) as HTMLElement;
      const v = this.data[field] as number;
      slider.value = String(v);
      label.textContent = `${v.toFixed(2)}x`;
    };
    set('left', 'leftSens');
    set('right', 'rightSens');
    set('gyro', 'gyroSens');
    (this.panel.querySelector('.gyro-toggle') as HTMLInputElement).checked = this.data.gyroEnabled;
    this.panel.classList.toggle('gyro-on', this.data.gyroEnabled);
  }
}

const TEMPLATE = `
  <button class="settings-gear" aria-label="设置">⚙</button>
  <div class="settings-panel">
    <div class="settings-card">
      <h2>设置 <span class="sub">SETTINGS</span></h2>
      <div class="setting-row">
        <label>左摇杆灵敏度（移动）</label>
        <div class="setting-ctl"><input type="range" class="sens-left" min="0.4" max="2.5" step="0.05"><span class="val val-left">1.00x</span></div>
      </div>
      <div class="setting-row">
        <label>右摇杆灵敏度（视角）</label>
        <div class="setting-ctl"><input type="range" class="sens-right" min="0.4" max="2.5" step="0.05"><span class="val val-right">1.00x</span></div>
      </div>
      <div class="setting-row">
        <label>陀螺仪控制视角</label>
        <div class="setting-ctl toggle-ctl">
          <label class="switch"><input type="checkbox" class="gyro-toggle"><span class="slider-track"></span></label>
        </div>
      </div>
      <div class="setting-row gyro-only">
        <label>陀螺仪灵敏度</label>
        <div class="setting-ctl"><input type="range" class="sens-gyro" min="0.4" max="2.5" step="0.05"><span class="val val-gyro">1.00x</span></div>
      </div>
      <p class="settings-hint">陀螺仪开启后，倾斜手机即可微调视角，可与右摇杆叠加使用。</p>
      <button class="bigbtn settings-close">关闭</button>
    </div>
  </div>
`;
