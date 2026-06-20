import Phaser from 'phaser';

/**
 * Procedural sound effects synthesized with the Web Audio API. No audio files
 * are loaded — every sound is built on the fly from oscillators and noise,
 * which suits the cheap, uneasy texture we want for the backrooms.
 *
 * Output is routed into the Phaser WebAudio sound manager's destination node,
 * so the existing master volume slider (game.sound.volume) and mute apply to
 * these sounds automatically — no extra wiring in the options menu.
 */
export class Sfx {
  private readonly ctx: AudioContext | null = null;
  private readonly out: AudioNode | null = null;
  private readonly noise: AudioBuffer | null = null;

  constructor(scene: Phaser.Scene) {
    const manager = scene.sound;
    // Only the Web Audio backend exposes an AudioContext. If the runtime fell
    // back to HTML5 Audio (no Web Audio), every method below no-ops gracefully.
    if (manager instanceof Phaser.Sound.WebAudioSoundManager) {
      this.ctx = manager.context;
      // `destination` is the manager's entry gain node; routing here means the
      // master volume / mute nodes downstream still scale our output.
      const dest = (manager as unknown as { destination?: AudioNode }).destination;
      this.out = dest ?? this.ctx.destination;
      this.noise = this.makeNoise(this.ctx);
    }
  }

  /** A soft, muffled thud — a footfall on damp carpet. */
  footstep(): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || !this.noise) return;
    this.wake(ctx);
    const t = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340 + Math.random() * 140; // muffled, slightly varied
    lp.Q.value = 1.1;

    const gain = ctx.createGain();
    const peak = 0.16 + Math.random() * 0.05;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    src.connect(lp).connect(gain).connect(this.out);
    src.start(t, Math.random() * 1.5); // vary the noise window per step
    src.stop(t + 0.13);
  }

  /** Played on a room change: a brief door creak over a passing breeze. */
  roomTransition(): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || !this.noise) return;
    this.wake(ctx);
    const t = ctx.currentTime;

    // --- Door creak: a wavering tone gliding downward, band-passed thin. ---
    const creak = ctx.createOscillator();
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(430, t);
    creak.frequency.linearRampToValueAtTime(170, t + 0.5);

    // A slow oscillator modulating the pitch gives the stuttering "creak".
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 11;
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.value = 38;
    wobble.connect(wobbleDepth).connect(creak.frequency);

    const creakBand = ctx.createBiquadFilter();
    creakBand.type = 'bandpass';
    creakBand.frequency.value = 620;
    creakBand.Q.value = 6;

    const creakGain = ctx.createGain();
    creakGain.gain.setValueAtTime(0, t);
    creakGain.gain.linearRampToValueAtTime(0.06, t + 0.05);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    creak.connect(creakBand).connect(creakGain).connect(this.out);
    creak.start(t);
    creak.stop(t + 0.6);
    wobble.start(t);
    wobble.stop(t + 0.6);

    // --- Breeze: a filtered noise swell sweeping up then settling. ---
    const breeze = ctx.createBufferSource();
    breeze.buffer = this.noise;
    breeze.loop = true;

    const breezeBand = ctx.createBiquadFilter();
    breezeBand.type = 'bandpass';
    breezeBand.frequency.setValueAtTime(480, t);
    breezeBand.frequency.linearRampToValueAtTime(880, t + 0.5);
    breezeBand.frequency.linearRampToValueAtTime(380, t + 1.1);
    breezeBand.Q.value = 0.8;

    const breezeGain = ctx.createGain();
    breezeGain.gain.setValueAtTime(0, t);
    breezeGain.gain.linearRampToValueAtTime(0.08, t + 0.35);
    breezeGain.gain.linearRampToValueAtTime(0.0001, t + 1.15);

    breeze.connect(breezeBand).connect(breezeGain).connect(this.out);
    breeze.start(t, Math.random());
    breeze.stop(t + 1.2);
  }

  /**
   * Played when scrolling through an open wall between two subrooms: a quick,
   * airy gust. Deliberately lighter and faster than `roomTransition` — higher in
   * pitch, softer, and over in a fraction of the time, with no door creak — so a
   * seamless scroll feels distinct from stepping through an actual door.
   */
  scroll(): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || !this.noise) return;
    this.wake(ctx);
    const t = ctx.currentTime;

    const air = ctx.createBufferSource();
    air.buffer = this.noise;
    air.loop = true;

    // High, narrow band that sweeps up fast then eases off — a passing draft.
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(900, t);
    band.frequency.linearRampToValueAtTime(1500, t + 0.18);
    band.frequency.linearRampToValueAtTime(1050, t + 0.42);
    band.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

    air.connect(band).connect(gain).connect(this.out);
    air.start(t, Math.random());
    air.stop(t + 0.45);
  }

  /** Two seconds of white noise, reused (looped) as the source for textures. */
  private makeNoise(ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** The context can start suspended until a gesture; nudge it if so. */
  private wake(ctx: AudioContext): void {
    if (ctx.state === 'suspended') void ctx.resume();
  }
}
