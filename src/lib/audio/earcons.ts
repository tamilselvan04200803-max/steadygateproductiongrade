/**
 * SteadyGate Procedural Web Audio Earcons Synthesizer
 * ----------------------------------------------------
 * Zero-dependency, offline-first auditory feedback generator for assistive
 * gesture interaction (dwell accumulation, successful actuation, safety rejects, undo).
 * Built with standard Web Audio API (OscillatorNode + GainNode).
 */

class EarconSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Subtle woodblock tick (800 Hz) during progressive dwell accumulation.
   */
  public playDwellTick(volume: number = 0.05): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  /**
   * Harmonious C5 + E5 (523 Hz + 659 Hz) major-third chime on successful command commit.
   */
  public playCommitChime(volume: number = 0.12): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  /**
   * Low 150 Hz sawtooth alert when a gesture is rejected by safety chords or object grasp guards.
   */
  public playSafetyRejectBuzz(volume: number = 0.15): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.22);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  /**
   * Descending two-tone sound on Undo invocation.
   */
  public playUndoSound(volume: number = 0.1): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.21);
  }
}

export const earcons = new EarconSynthesizer();
