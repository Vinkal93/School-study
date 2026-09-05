/**
 * PROCEDURAL WEB AUDIO SCHOOL BELL SYNTHESIZER
 * 
 * Synthesizes a realistic resonant brass school bell chime using Web Audio API.
 * Requires zero external audio files, zero network requests, and zero latency.
 * Respects browser autoplay permissions through interactive user activation.
 */

class BellSoundManager {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private volume: number = 0.8;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("school_bell_sound_enabled");
      if (stored !== null) {
        this.soundEnabled = stored === "true";
      }
      const storedVol = localStorage.getItem("school_bell_sound_volume");
      if (storedVol !== null) {
        const parsed = parseFloat(storedVol);
        if (!isNaN(parsed)) this.volume = Math.max(0, Math.min(1, parsed));
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Synthesizes a single bell strike with harmonic metallic resonances.
   */
  private strikeBell(ctx: AudioContext, time: number, vol: number) {
    // School Bell fundamental & overtone harmonics
    const harmonics = [
      { freq: 587.33, gain: 0.6, decay: 1.2 }, // Fundamental (D5)
      { freq: 880.0, gain: 0.35, decay: 0.9 }, // 1.5x harmonic
      { freq: 1480.0, gain: 0.25, decay: 0.6 }, // Metallic strike overtone
      { freq: 2350.0, gain: 0.15, decay: 0.3 }, // Crisp clang transient
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(1, vol)), time);
    masterGain.connect(ctx.destination);

    harmonics.forEach(({ freq, gain: harmGain, decay }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      gainNode.gain.setValueAtTime(harmGain, time);
      // Exponential volume decay for bell resonance
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + decay);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start(time);
      osc.stop(time + decay);
    });
  }

  /**
   * Plays the school bell sound.
   * Number of rings corresponds to the bell number (Bell 1 -> 1 ring, Bell 2 -> 2 rings, etc.).
   */
  public play(rings: number = 1): Promise<void> {
    return new Promise((resolve) => {
      if (!this.soundEnabled) {
        resolve();
        return;
      }

      const ctx = this.getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      const count = Math.max(1, Math.min(rings, 10)); // Safe bounds
      const interval = 0.75; // 750ms between strikes
      const now = ctx.currentTime + 0.05;

      for (let i = 0; i < count; i++) {
        this.strikeBell(ctx, now + i * interval, this.volume);
      }

      const totalDuration = (count - 1) * interval + 1.2;
      setTimeout(() => {
        resolve();
      }, totalDuration * 1000);
    });
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("school_bell_sound_enabled", String(enabled));
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== "undefined") {
      localStorage.setItem("school_bell_sound_volume", String(this.volume));
    }
  }

  /**
   * Triggers a test ring with 2 strikes so the user can verify audio permissions.
   */
  public testBell(rings: number = 2): Promise<void> {
    return this.play(rings);
  }
}

export const bellSound = new BellSoundManager();
