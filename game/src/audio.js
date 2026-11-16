// Every sound is synthesised with WebAudio: short oscillator envelopes for the
// effects and a slow scheduled pad-and-pluck loop for the music. Nothing is
// loaded, so the game stays silent until the first gesture unlocks the context,
// and headless runs (which never gesture) simply stay quiet.

const MUSIC_BPM = 84;
const STEP_SECONDS = 60 / MUSIC_BPM / 2;
/** One chord per bar: A minor, F major, C major, G major, as low triangle pads. */
const CHORDS = [
  [110.0, 164.81, 261.63],
  [87.31, 174.61, 261.63],
  [130.81, 196.0, 261.63],
  [98.0, 196.0, 293.66],
];
/** A fixed pluck pattern over A minor pentatonic, one entry per 8th-note step. */
const PLUCKS = [440, 0, 523.25, 0, 659.25, 0, 523.25, 392, 440, 0, 587.33, 0, 659.25, 523.25, 0, 392];

export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let nextNoteTime = 0;
  let stepIndex = 0;
  let lastShoot = 0;
  let noiseBuffer = null;

  function ensure() {
    if (context !== null) return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
    musicGain = context.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(master);
    const length = Math.floor(context.sampleRate * 0.5);
    noiseBuffer = context.createBuffer(1, length, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone({ freq, end = freq, type = 'sine', dur = 0.15, vol = 0.2, at = 0, to = null }) {
    if (!context) return;
    const start = context.currentTime + at;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (end !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + dur);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(to ?? master);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  function noise({ dur = 0.1, vol = 0.2, at = 0, filter = 1200, type = 'lowpass' }) {
    if (!context) return;
    const start = context.currentTime + at;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filterNode = context.createBiquadFilter();
    filterNode.type = type;
    filterNode.frequency.value = filter;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    source.connect(filterNode);
    filterNode.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + dur + 0.05);
  }

  const EFFECTS = {
    shoot() {
      const now = context.currentTime;
      if (now - lastShoot < 0.05) return;
      lastShoot = now;
      tone({ freq: 920, end: 540, type: 'square', dur: 0.06, vol: 0.07 });
    },
    hit() {
      tone({ freq: 210, end: 120, type: 'triangle', dur: 0.07, vol: 0.16 });
      noise({ dur: 0.05, vol: 0.1, filter: 2600, type: 'highpass' });
    },
    kill() {
      tone({ freq: 640, end: 170, type: 'sawtooth', dur: 0.16, vol: 0.12 });
      noise({ dur: 0.09, vol: 0.14, filter: 900 });
    },
    hurt() {
      tone({ freq: 170, end: 65, type: 'sawtooth', dur: 0.28, vol: 0.22 });
      noise({ dur: 0.14, vol: 0.12, filter: 500 });
    },
    dash() {
      noise({ dur: 0.18, vol: 0.14, filter: 1800, type: 'bandpass' });
    },
    pickup() {
      tone({ freq: 659.25, type: 'sine', dur: 0.1, vol: 0.16 });
      tone({ freq: 987.77, type: 'sine', dur: 0.16, vol: 0.16, at: 0.07 });
    },
    heart() {
      tone({ freq: 523.25, type: 'triangle', dur: 0.14, vol: 0.16 });
      tone({ freq: 659.25, type: 'triangle', dur: 0.14, vol: 0.16, at: 0.08 });
      tone({ freq: 783.99, type: 'triangle', dur: 0.22, vol: 0.16, at: 0.16 });
    },
    wave() {
      tone({ freq: 392, type: 'triangle', dur: 0.12, vol: 0.15 });
      tone({ freq: 523.25, type: 'triangle', dur: 0.12, vol: 0.15, at: 0.1 });
      tone({ freq: 659.25, type: 'triangle', dur: 0.2, vol: 0.15, at: 0.2 });
    },
    upgrade() {
      tone({ freq: 523.25, type: 'sine', dur: 0.1, vol: 0.16 });
      tone({ freq: 659.25, type: 'sine', dur: 0.1, vol: 0.16, at: 0.08 });
      tone({ freq: 783.99, type: 'sine', dur: 0.1, vol: 0.16, at: 0.16 });
      tone({ freq: 1046.5, type: 'sine', dur: 0.24, vol: 0.16, at: 0.24 });
    },
    boss() {
      tone({ freq: 82.41, type: 'sawtooth', dur: 0.9, vol: 0.2 });
      tone({ freq: 87.31, type: 'sawtooth', dur: 0.9, vol: 0.2 });
      noise({ dur: 0.5, vol: 0.1, filter: 300 });
    },
    bloomHurt() {
      tone({ freq: 300, end: 180, type: 'triangle', dur: 0.14, vol: 0.13 });
    },
    bloomLost() {
      tone({ freq: 420, end: 110, type: 'triangle', dur: 0.5, vol: 0.18 });
      noise({ dur: 0.3, vol: 0.1, filter: 700 });
    },
    click() {
      tone({ freq: 740, type: 'sine', dur: 0.05, vol: 0.1 });
    },
    victory() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, i) => tone({ freq, type: 'triangle', dur: 0.22, vol: 0.17, at: i * 0.13 }));
    },
    defeat() {
      const notes = [392, 349.23, 311.13, 261.63];
      notes.forEach((freq, i) => tone({ freq, type: 'triangle', dur: 0.34, vol: 0.16, at: i * 0.26 }));
    },
  };

  function scheduleMusic() {
    if (!context) return;
    while (nextNoteTime < context.currentTime + 0.25) {
      const bar = Math.floor(stepIndex / 16) % CHORDS.length;
      const step = stepIndex % 16;
      const at = nextNoteTime - context.currentTime;
      if (step === 0) {
        for (const freq of CHORDS[bar]) {
          tone({ freq, type: 'triangle', dur: STEP_SECONDS * 16, vol: 0.05, at, to: musicGain });
        }
      }
      const pluck = PLUCKS[step];
      if (pluck > 0) {
        tone({ freq: pluck, type: 'sine', dur: 0.32, vol: 0.06, at, to: musicGain });
      }
      nextNoteTime += STEP_SECONDS;
      stepIndex += 1;
    }
  }

  return {
    /** Create (or resume) the context; call from a user gesture. */
    unlock() {
      if (!ensure()) return;
      if (context.state === 'suspended') context.resume();
    },
    play(name) {
      if (!context || muted) return;
      const effect = EFFECTS[name];
      if (effect) effect();
    },
    startMusic() {
      if (!ensure() || musicTimer !== null) return;
      nextNoteTime = context.currentTime + 0.1;
      stepIndex = 0;
      musicTimer = setInterval(scheduleMusic, 80);
    },
    stopMusic() {
      if (musicTimer !== null) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
