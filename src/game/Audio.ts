/** Tiny procedural sound engine (WebAudio) — no asset files needed. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastBoom = 0;
  private hostAudible = true;
  private hostPaused = false;
  enabled = true;

  private ensure() {
    if (this.ctx) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.35 : 0;
    this.master.connect(this.ctx.destination);
  }

  /** YouTube mute. There is no in-game master mute button. */
  setHostAudible(on: boolean) {
    this.hostAudible = on;
    this.applyHostGain();
  }

  suspendForHost() {
    this.hostPaused = true;
    this.applyHostGain();
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  releaseHost() {
    this.hostPaused = false;
    this.applyHostGain();
    if (this.enabled && this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Must be called from a user gesture to unlock audio on mobile. */
  resume() {
    this.ensure();
    if (this.hostPaused) return;
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private applyHostGain() {
    this.enabled = this.hostAudible && !this.hostPaused;
    if (this.master) this.master.gain.value = this.enabled ? 0.35 : 0;
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

  fire() { this.tone(220, 0.09, 'square', 0.14, 110); this.noise(0.08, 0.1, 1400); }
  explosion() {
    const now = performance.now();
    if (now - this.lastBoom < 90) return;
    this.lastBoom = now;
    this.noise(0.42, 0.28, 700);
    this.tone(90, 0.32, 'sawtooth', 0.16, 46);
  }
  hit() { this.tone(520, 0.06, 'triangle', 0.16, 340); }
  crit() { this.tone(880, 0.1, 'square', 0.18, 1320); this.tone(660, 0.12, 'triangle', 0.14, 990); }
  jump() { this.tone(180, 0.28, 'sine', 0.22, 520); this.noise(0.18, 0.08, 1800); }
  shield() { this.tone(520, 0.18, 'sine', 0.2, 880); }
  dash() { this.noise(0.12, 0.16, 2200); this.tone(240, 0.1, 'square', 0.12, 90); }
  hurt() { this.tone(300, 0.22, 'sawtooth', 0.22, 90); }
  enemyShot() { this.tone(660, 0.08, 'sawtooth', 0.08, 240); }
  pickup() { this.tone(660, 0.08, 'square', 0.2); this.tone(990, 0.12, 'square', 0.2); }
  levelUp() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'square', 0.25), i * 90)); }
  bossWarn() { this.tone(120, 0.6, 'sawtooth', 0.3, 220); }
  gameOver() { [440, 349, 261].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'triangle', 0.3), i * 220)); }
}
