let audioCtx: AudioContext | null = null;
let soundEnabled = true;

const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
};

export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};

export const playBeep = (freq = 800, duration = 0.1) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Audio play failed:', err);
  }
};

export const playClick = () => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (err) {
    console.warn('Audio play failed:', err);
  }
};

export const playShutter = () => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    const synthOsc = ctx.createOscillator();
    const synthGain = ctx.createGain();
    
    synthOsc.type = 'sine';
    synthOsc.frequency.setValueAtTime(3000, ctx.currentTime);
    synthOsc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.04);
    
    synthGain.gain.setValueAtTime(0.05, ctx.currentTime);
    synthGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    synthOsc.connect(synthGain);
    synthGain.connect(ctx.destination);

    noiseNode.start();
    synthOsc.start();
    
    noiseNode.stop(ctx.currentTime + 0.15);
    synthOsc.stop(ctx.currentTime + 0.04);
  } catch (err) {
    console.warn('Shutter sound play failed:', err);
  }
};
