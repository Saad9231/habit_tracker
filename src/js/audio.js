/**
 * CyberAudio — High-performance sound synthesis for tactile interfaces.
 * No external assets required.
 */
class CyberAudio {
    constructor() {
        this.ctx = null;
        this.isMuted = localStorage.getItem('cyber-audio-muted') === 'true';
        this.masterVolume = 0.4;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('cyber-audio-muted', this.isMuted);
        return this.isMuted;
    }

    // ── Sound Presets ──────────────────────────────────────────

    /**
     * Sharp Mechanical Click
     */
    playClick() {
        if (this.isMuted) return;
        this.init();
        
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);

        gain.gain.setValueAtTime(this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.06);
    }

    /**
     * Airy Success Chime (Major Triad)
     */
    playSuccess() {
        if (this.isMuted) return;
        this.init();

        const t = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5

        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t + (i * 0.05));
            
            gain.gain.setValueAtTime(0, t + (i * 0.05));
            gain.gain.linearRampToValueAtTime(0.15, t + (i * 0.05) + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + (i * 0.05) + 0.8);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t + (i * 0.05));
            osc.stop(t + (i * 0.05) + 0.9);
        });
    }

    /**
     * Digital Sweep (Theme Toggle)
     */
    playDigital() {
        if (this.isMuted) return;
        this.init();

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(1200, t + 0.15);

        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.16);
    }

    /**
     * Error Buzz
     */
    playError() {
        if (this.isMuted) return;
        this.init();

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.15);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.16);
    }
}

export const cyberAudio = new CyberAudio();
