export const playSosAlarmSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;

    // High-urgency pulsating two-tone emergency siren (3 pulses)
    const playPulse = (start, highFreq, lowFreq) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(highFreq, start);
      osc.frequency.linearRampToValueAtTime(lowFreq, start + 0.12);
      osc.frequency.setValueAtTime(highFreq, start + 0.24);
      osc.frequency.linearRampToValueAtTime(lowFreq, start + 0.36);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.setValueAtTime(0.22, start + 0.38);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.48);

      osc.start(start);
      osc.stop(start + 0.50);
    };

    // 3 successive warble bursts
    playPulse(now, 960, 720);
    playPulse(now + 0.55, 960, 720);
    playPulse(now + 1.10, 1020, 760);
  } catch (e) {
    console.warn("Failed to play SOS emergency alarm sound:", e);
  }
};

export const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (time, frequency, duration) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    const now = audioCtx.currentTime;
    playTone(now, 659.25, 0.3); // E5
    playTone(now + 0.1, 880, 0.4); // A5
  } catch (e) {
    console.warn("Failed to play notification chime:", e);
  }
};

export const playScanSuccessTone = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const playTone = (freq, time, dur) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.start(time);
      osc.stop(time + dur);
    };
    playTone(523.25, now, 0.12); // C5
    playTone(659.25, now + 0.06, 0.12); // E5
    playTone(783.99, now + 0.12, 0.25); // G5
  } catch (e) {
    console.warn("Failed to play scan success tone:", e);
  }
};

export const playScanErrorTone = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.03);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn("Failed to play scan error tone:", e);
  }
};
