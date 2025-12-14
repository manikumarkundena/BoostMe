/* ==========================================
   🔊 PROCEDURAL AUDIO ENGINE (No Files Needed)
   ========================================== */
class SynthAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3; // Global volume (0.0 to 1.0)
        this.muted = localStorage.getItem("app_muted") === "true";
    }

    // Toggle Mute
    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem("app_muted", this.muted);
        return this.muted;
    }

    // Helper to create a quick tone
    playTone(freq, type, duration, vol = 1) {
        if (this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    /* --- 🎹 SOUND PRESETS --- */

    // 1. Soft UI Click (Buttons)
    click() {
        // High pitch sine wave, very short
        this.playTone(600, 'sine', 0.1, 0.5); 
    }

    // 2. Hover Tick (Cards)
    hover() {
        // Very quick, subtle tick
        this.playTone(300, 'triangle', 0.05, 0.1); 
    }

    // 3. Success Chime (Focus Complete)
    success() {
        // A Major Chord (C - E - G)
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 'sine', 1.5, 0.4);
            }, i * 100); // Staggered arpeggio effect
        });
    }

    // 4. Error / Alert
    error() {
        this.playTone(150, 'sawtooth', 0.4, 0.3);
    }
    
    // 5. Typing Sound (AI Generating)
    typing() {
        // Random pitch variations
        const freq = 200 + Math.random() * 500;
        this.playTone(freq, 'sine', 0.05, 0.1); 
    }
    // ... inside class SynthAudio ...

    // 🫧 NEW: Realistic Pop Sound
    pop() {
        if (this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Frequency sweep (High to Low = "Bloop")
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

        // Volume envelope
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
}

// Global Instance
window.synth = new SynthAudio();