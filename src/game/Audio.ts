/** Tiny procedural sound engine (WebAudio) — no asset files needed. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  private ensure() {
    if (this.ctx) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  /** Must be called from a user gesture to unlock audio on mobile. */
  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol = 0.3, slideTo?: number) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  private noise(dur: number, vol = 0.3, filterFreq = 1200) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }

  fire() { this.tone(220, 0.12, 'square', 0.25, 90); this.noise(0.12, 0.18, 900); }
  explosion() { this.noise(0.5, 0.4, 600); this.tone(80, 0.4, 'sawtooth', 0.25, 40); }
  hit() { this.tone(440, 0.08, 'triangle', 0.2, 300); }
  crit() { this.tone(880, 0.12, 'square', 0.25, 1320); this.tone(660, 0.14, 'triangle', 0.2, 990); }
  jump() { this.tone(180, 0.35, 'sine', 0.3, 520); this.noise(0.3, 0.15, 1800); }
  hurt() { this.tone(300, 0.3, 'sawtooth', 0.3, 80); }
  enemyShot() { this.tone(660, 0.1, 'sawtooth', 0.12, 220); }
  pickup() { this.tone(660, 0.08, 'square', 0.2); this.tone(990, 0.12, 'square', 0.2); }
  levelUp() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'square', 0.25), i * 90)); }
  bossWarn() { this.tone(120, 0.6, 'sawtooth', 0.3, 220); }
  gameOver() { [440, 349, 261].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'triangle', 0.3), i * 220)); }
}
