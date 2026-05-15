/* ============================================================
   audio.js - Web Audio API per SFX procedurali
   Niente file esterni: tutto generato al volo (zero dipendenze)
   ============================================================ */

const SFX = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;

  function init() {
    if (ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio non supportata', e);
    }
  }

  function setMuted(v) {
    muted = v;
    if (masterGain) masterGain.gain.value = v ? 0 : 0.4;
  }

  function tone({ freq = 440, dur = 0.1, type = 'sine', vol = 0.5, slide = 0 }) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(freq + slide, ctx.currentTime + dur);
    }
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g); g.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function noise({ dur = 0.15, vol = 0.3, freq = 1000 }) {
    if (!ctx || muted) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(filter); filter.connect(g); g.connect(masterGain);
    src.start();
    src.stop(ctx.currentTime + dur);
  }

  // ===== SFX preconfezionati =====
  const sfx = {
    click: () => tone({ freq: 800, dur: 0.05, type: 'square', vol: 0.2 }),
    good:  () => { tone({ freq: 660, dur: 0.08, type: 'triangle', vol: 0.4 }); setTimeout(()=>tone({ freq: 880, dur: 0.1, type: 'triangle', vol: 0.4 }), 60); },
    bad:   () => { tone({ freq: 200, dur: 0.2, type: 'sawtooth', vol: 0.4, slide: -100 }); },
    coin:  () => { tone({ freq: 1200, dur: 0.06, type: 'square', vol: 0.3 }); setTimeout(()=>tone({ freq: 1800, dur: 0.08, type: 'square', vol: 0.3 }), 50); },
    bolt:  () => noise({ dur: 0.18, vol: 0.25, freq: 1400 }),  // svitamento
    pump:  () => noise({ dur: 0.1, vol: 0.2, freq: 600 }),     // gonfiaggio
    hiss:  () => noise({ dur: 0.3, vol: 0.15, freq: 3000 }),   // aria
    win:   () => {
      [0, 0.08, 0.16].forEach((t,i) => {
        setTimeout(() => tone({ freq: 523 + i*200, dur: 0.15, type: 'triangle', vol: 0.4 }), t*1000);
      });
    },
    lose:  () => {
      [0, 0.1, 0.2].forEach((t,i) => {
        setTimeout(() => tone({ freq: 400 - i*80, dur: 0.18, type: 'sawtooth', vol: 0.4 }), t*1000);
      });
    },
    level: () => {
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.45 }), i*100);
      });
    },
  };

  function play(name) {
    if (muted) return;
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (sfx[name]) sfx[name]();
  }

  function haptic(pattern = 30) {
    if (!Storage.get('settings').haptic) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  return { init, play, setMuted, haptic };
})();
