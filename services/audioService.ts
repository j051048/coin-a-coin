// Audio Service handling BGM and SFX
class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = true;
  private bgmAudio: HTMLAudioElement | null = null;
  private nextNoteTime: number = 0;
  private timerID: number | null = null;
  private noteIndex: number = 0;

  // Funny "Marimba" Melody Sequence (64 steps)
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
    // DO NOT initialize AudioContext here.
    // It causes crashes in strict browsers if done without user gesture.
  }

  // Called ONCE on the first user interaction (Start Game)
  public initialize() {
    if (this.ctx) return; // Already initialized

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.error("Web Audio API not supported or blocked", e);
    }

    // Setup BGM Audio Element
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio();
      this.bgmAudio.src = 'bgm.mp3'; 
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.5;
      
      this.bgmAudio.onerror = () => {
        console.log("BGM file not found, switching to procedural funny beat.");
      };
    }
  }

  private initCtx() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn("Audio resume failed", e));
    }
    // Double check initialization if not done yet
    if (!this.ctx) {
       this.initialize();
    }
  }

  // --- Procedural Funny Music Generator ---
  private scheduleNote(stepIndex: number, time: number) {
    if (!this.ctx || this.isMuted || !this.isBgmPlaying) return;

    // 1. Melody Voice (Marimba style)
    const noteFreq = this.melodyPattern[stepIndex % this.melodyPattern.length];
    
    if (noteFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine'; 
      osc.frequency.setValueAtTime(noteFreq, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3); 
      
      osc.start(time);
      osc.stop(time + 0.35);
    }

    // 2. Bass/Rhythm Voice
    if (stepIndex % 2 === 0) {
      const oscBass = this.ctx.createOscillator();
      const gainBass = this.ctx.createGain();
      oscBass.connect(gainBass);
      gainBass.connect(this.ctx.destination);
      
      oscBass.type = 'triangle';
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
    this.initCtx(); // Ensure context is ready
    if (this.isMuted || !this.isBgmPlaying || !this.bgmAudio) return;

    const playPromise = this.bgmAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Fallback to procedural
        if (this.ctx && !this.timerID) {
          this.nextNoteTime = this.ctx.currentTime + 0.1;
          this.scheduler();
        }
      });
    }
  }

  stopBGM() {
    if (this.bgmAudio) {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0; 
    }
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.bgmAudio) this.bgmAudio.pause();
      if (this.timerID) {
        clearTimeout(this.timerID);
        this.timerID = null;
      }
    } else {
      if (this.isBgmPlaying) this.startBGM();
    }
    return this.isMuted;
  }

  toggleBGMOnly() {
    this.isBgmPlaying = !this.isBgmPlaying;
    
    if (this.isBgmPlaying) {
      if (!this.isMuted) this.startBGM();
    } else {
      this.stopBGM();
    }
    return this.isBgmPlaying;
  }

  // --- SFX ---
  playClick() {
    if (this.isMuted) return;
    this.initCtx(); // Try to init if not yet
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
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
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1046.50, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playError() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
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
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [0, 0.15, 0.3].forEach((delay, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
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