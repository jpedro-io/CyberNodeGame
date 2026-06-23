// CYBERNODE - Audio System
// Using MP3 file for BGM

export class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // MP3 audio element
  private bgmAudio: HTMLAudioElement | null = null;
  
  // State
  private isPlaying = false;
  private traceLevel = 0;

  constructor() {
    this.initAudio();
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create gain nodes
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
      
      this.bgmGain = this.audioContext.createGain();
      this.bgmGain.gain.value = 0.6;
      this.bgmGain.connect(this.masterGain);
      
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  }

  async startBGM(): Promise<void> {
    if (this.isPlaying || !this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Create audio element for MP3
    this.bgmAudio = new Audio('/background-music.mp3');
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.6;
    
    try {
      await this.bgmAudio.play();
      this.isPlaying = true;
    } catch (e) {
      console.warn('BGM playback failed:', e);
    }
  }

  setTraceLevel(level: number): void {
    this.traceLevel = level;
  }

  playClick(): void {
    if (!this.audioContext || !this.sfxGain) return;
    
    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;
    
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  playAlert(): void {
    if (!this.audioContext || !this.sfxGain) return;
    
    // Static noise burst
    const bufferSize = this.audioContext.sampleRate * 0.3;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;
    
    const gain = this.audioContext.createGain();
    gain.gain.value = 0.4;
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    noise.start();
    
    // Warning beep
    const osc = this.audioContext.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 150;
    
    const oscGain = this.audioContext.createGain();
    oscGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    oscGain.gain.setTargetAtTime(0.001, this.audioContext.currentTime + 0.1, 0.05);
    
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);
  }

  playSuccess(): void {
    if (!this.audioContext || !this.sfxGain) return;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const gain = this.audioContext!.createGain();
      const startTime = this.audioContext!.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.setTargetAtTime(0.001, startTime + 0.3, 0.2);
      
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      
      osc.start(startTime);
      osc.stop(startTime + 0.8);
    });
  }

  stop(): void {
    this.isPlaying = false;
    
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio = null;
    }
  }
}
