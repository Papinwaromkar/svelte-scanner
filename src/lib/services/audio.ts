import type { SoundEffectType, VibrationPatternType } from '../types';

class AudioManager {
  private ctx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playSound(type: SoundEffectType = 'pos_beep', volume = 0.4): void {
    if (type === 'mute') return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(Math.min(1, Math.max(0, volume)), now);

      switch (type) {
        case 'pos_beep': // Classic POS Retail Scanner Beep (2400Hz crisp square-ish burst)
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2450, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 0.08);
          break;

        case 'modern_chime': // Two-tone cheerful harmonic chime
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1046.5, now); // C6
          osc.frequency.setValueAtTime(1318.5, now + 0.05); // E6
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 0.18);
          break;

        case 'futuristic_ping': // Sci-Fi synth ping
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1800, now);
          osc.frequency.exponentialRampToValueAtTime(3200, now + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 0.12);
          break;

        case 'double_chirp': // Double chirp
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2000, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 0.04);

          setTimeout(() => {
            const ctx2 = this.getAudioContext();
            if (!ctx2) return;
            const osc2 = ctx2.createOscillator();
            const gain2 = ctx2.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(2600, ctx2.currentTime);
            gain2.gain.setValueAtTime(volume, ctx2.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.05);
            osc2.connect(gain2);
            gain2.connect(ctx2.destination);
            osc2.start(ctx2.currentTime);
            osc2.stop(ctx2.currentTime + 0.05);
          }, 50);
          break;

        case 'subtle_click': // Tactile soft mechanical click
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 0.02);
          break;
      }
    } catch {
      // Audio playback error or autoplay policy
    }
  }

  public vibratePattern(type: VibrationPatternType = 'standard'): void {
    if (type === 'off') return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        switch (type) {
          case 'crisp':
            navigator.vibrate(35);
            break;
          case 'standard':
            navigator.vibrate(75);
            break;
          case 'double':
            navigator.vibrate([40, 30, 40]);
            break;
          case 'heavy':
            navigator.vibrate(140);
            break;
        }
      } catch {
        // Vibration blocked
      }
    }
  }
}

export const audioManager = new AudioManager();
