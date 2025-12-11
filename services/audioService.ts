// Audio Service handling BGM and SFX
class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = true;
  private bgmAudio: HTMLAudioElement;
  private nextNoteTime: number = 0;
  private timerID: number | null = null;
  private noteIndex: number = 0;

  // Funny "Marimba" Melody Sequence (64 steps)
  // 0 represents a rest
  // Frequencies approx: C4=261, D4=293, E4=329, F4=349, G4=392, A4=440, B4=493, C5=523
  private melodyPattern: number[] = [
    // Bar 1
    261.63, 0, 329.63, 392.00, 440.00, 392.00, 329.63, 261.63, 
    293.66, 0, 293.66, 329.63, 293.66, 0, 392.00, 0,
    // Bar 2
    261.63, 0, 329.63, 392.00, 440.00, 392.00, 523.25, 0,
    493.88, 440.00, 392.00, 329.63, 261.63, 293.66, 261.63, 0,
    // Bar 3
    329.63, 392.00, 523.25, 392.00, 440.00, 392.00, 329.63, 261.63,
    349.23, 440.00, 523.25, 440.00, 349.23, 329.63, 293.66, 0,
    // Bar 4
    392.00, 0, 349.23, 0, 329.63, 0, 293.66, 0,
    261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 0
  ];

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.error("Web Audio API not supported");
    }

    // Try to load external BGM first
    this.bgmAudio = new Audio();
    this.bgmAudio.src = 'bgm.mp3'; 
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.5;
    
    this.bgmAudio.onerror = () => {
      console.log("BGM file not found, switching to procedural funny beat.");
    };
  }

  private initCtx() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) this.ctx = new AudioContextClass();
    }
  }

  // --- Procedural Funny Music Generator ---
  // Style: "Marimba/Woodblock" (Organic, not electronic buzzing)
  private scheduleNote(stepIndex: number, time: number) {
    if (!this.ctx || this.isMuted || !this.isBgmPlaying) return;

    // 1. Melody Voice (Marimba style)
    const noteFreq = this.melodyPattern[stepIndex % this.melodyPattern.length];
    
    if (noteFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      // Sine wave sounds like a pure wood hit or bell
      osc.type = 'sine'; 
      osc.frequency.setValueAtTime(noteFreq, time);
      
      // Envelope: Fast attack, quick decay (Percussive)
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3); // Short "bonk" sound
      
      osc.start(time);
      osc.stop(time + 0.35);
    }

    // 2. Bass/Rhythm Voice (Soft walking bass)
    // Play on every 2nd step (quarter notes if steps are 8th notes)
    if (stepIndex % 2 === 0) {
      const oscBass = this.ctx.createOscillator();
      const gainBass = this.ctx.createGain();
      oscBass.connect(gainBass);
      gainBass.connect(this.ctx.destination);
      
      oscBass.type = 'triangle'; // Softer than square
      // Simple alternating bass: C3 (130Hz) and G2 (98Hz)
      const bassFreq = (Math.floor(stepIndex / 4) % 2 === 0) ? 130.8 : 98.0; 
      
      oscBass.frequency.setValueAtTime(bassFreq, time);
      
      gainBass.gain.setValueAtTime(0, time);
      gainBass.gain.linearRampToValueAtTime(0.15, time + 0.05);
      gainBass.gain.linearRampToValueAtTime(0, time + 0.2);
      
      oscBass.start(time);
      oscBass.stop(time + 0.25);
    }
  }

  private scheduler() {
    // 150ms per step ~= 100 BPM for 1/16th notes or 200 BPM for 1/8th notes.
    // Let's aim for a "walking" tempo.
    const secondsPerStep = 0.16; 
    const lookahead = 0.1; 

    if (!this.ctx) return;

    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      this.scheduleNote(this.noteIndex, this.nextNoteTime);
      this.nextNoteTime += secondsPerStep;
      this.noteIndex++;
      if (this.noteIndex >= this.melodyPattern.length) this.noteIndex = 0;
    }
    
    this.timerID = window.setTimeout(this.scheduler.bind(this), 25);
  }

  // --- Controls ---

  startBGM() {
    if (this.isMuted || !this.isBgmPlaying) return;

    // Try HTML5 Audio first
    const playPromise = this.bgmAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Fallback to procedural
        this.initCtx();
        if (this.ctx && !this.timerID) {
          this.nextNoteTime = this.ctx.currentTime + 0.1;
          this.scheduler();
        }
      });
    }
  }

  stopBGM() {
    this.bgmAudio.pause();
    this.bgmAudio.currentTime = 0; 
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      // Stop everything
      this.bgmAudio.pause();
      if (this.timerID) {
        clearTimeout(this.timerID);
        this.timerID = null;
      }
    } else {
      // Resume if valid
      if (this.isBgmPlaying) this.startBGM();
    }
    return this.isMuted;
  }

  toggleBGMOnly() {
    this.isBgmPlaying = !this.isBgmPlaying;
    
    if (this.isBgmPlaying) {
      // Turned ON
      if (!this.isMuted) this.startBGM();
    } else {
      // Turned OFF
      this.stopBGM();
    }
    return this.isBgmPlaying;
  }

  // --- SFX (Woodblock / Pop style to match music) ---
  playClick() {
    if (this.isMuted || !this.ctx) return;
    this.initCtx();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    // High pitch woodblock
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playMatch() {
    if (this.isMuted || !this.ctx) return;
    this.initCtx();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    // Magic chime
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc.frequency.linearRampToValueAtTime(1046.50, this.ctx.currentTime + 0.1); // C6
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playError() {
    if (this.isMuted || !this.ctx) return;
    this.initCtx();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    // Low thud
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playWin() {
    if (this.isMuted || !this.ctx) return;
    this.initCtx();
    const now = this.ctx.currentTime;
    // Major triad arpeggio
    [0, 0.15, 0.3].forEach((delay, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      // C, E, G
      const freqs = [523.25, 659.25, 783.99]; 
      osc.frequency.setValueAtTime(freqs[i], now + delay);
      gain.gain.setValueAtTime(0.3, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });
  }
}

export const audio = new AudioService();