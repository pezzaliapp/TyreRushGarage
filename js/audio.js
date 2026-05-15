/* ============================================================
   audio.js - Web Audio API, SFX procedurali + LAYERED INTENSITY.
   Niente file esterni. Tutto generato. Suono che cambia col combo,
   con la pazienza, con i boss. Heartbeat quando il giocatore suda.
   ============================================================ */

const SFX = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;
  let heartbeatInterval = null;
  let drumInterval = null;
  let comboLevel = 0;

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

  function tone({ freq = 440, dur = 0.1, type = 'sine', vol = 0.5, slide = 0, delay = 0, attack = 0.005 }) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    const t0 = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) {
      const dest = Math.max(20, freq + slide);
      osc.frequency.exponentialRampToValueAtTime(dest, t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.15, vol = 0.3, freq = 1000, q = 1 }) {
    if (!ctx || muted) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(filter); filter.connect(g); g.connect(masterGain);
    src.start();
    src.stop(ctx.currentTime + dur);
  }

  /* ===== SFX preconfezionati ===== */
  const sfx = {
    click: () => tone({ freq: 800, dur: 0.05, type: 'square', vol: 0.2 }),

    good: () => {
      tone({ freq: 660, dur: 0.08, type: 'triangle', vol: 0.4 });
      tone({ freq: 880, dur: 0.1, type: 'triangle', vol: 0.4, delay: 0.06 });
      // armonico extra se combo alto
      if (comboLevel >= 3) tone({ freq: 1320, dur: 0.12, type: 'triangle', vol: 0.3, delay: 0.12 });
    },

    bad: () => tone({ freq: 200, dur: 0.2, type: 'sawtooth', vol: 0.4, slide: -120 }),

    coin: () => {
      tone({ freq: 1200, dur: 0.06, type: 'square', vol: 0.3 });
      tone({ freq: 1800, dur: 0.08, type: 'square', vol: 0.3, delay: 0.05 });
    },

    bolt: () => {
      noise({ dur: 0.16, vol: 0.22, freq: 1400 });
      tone({ freq: 1500 + comboLevel * 80, dur: 0.08, type: 'square', vol: 0.15 });
    },

    pump: () => noise({ dur: 0.1, vol: 0.18, freq: 600 }),
    hiss: () => noise({ dur: 0.35, vol: 0.18, freq: 3200 }),

    win: () => {
      [0, 0.08, 0.16].forEach((t, i) => {
        setTimeout(() => tone({ freq: 523 + i * 200, dur: 0.15, type: 'triangle', vol: 0.4 }), t * 1000);
      });
    },

    lose: () => {
      [0, 0.1, 0.2].forEach((t, i) => {
        setTimeout(() => tone({ freq: 400 - i * 80, dur: 0.18, type: 'sawtooth', vol: 0.4 }), t * 1000);
      });
    },

    level: () => {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        setTimeout(() => tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.45 }), i * 90);
      });
    },

    /* === NUOVI: pressione + boss + combo === */
    klaxon: () => {
      // KLAXON brass per arrivo BOSS
      [0, 0.18, 0.36].forEach(t => {
        tone({ freq: 196, dur: 0.18, type: 'sawtooth', vol: 0.45, delay: t });
        tone({ freq: 392, dur: 0.18, type: 'sawtooth', vol: 0.35, delay: t });
      });
    },

    boss_win: () => {
      // fanfara di vittoria boss
      const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
      notes.forEach((f, i) => {
        setTimeout(() => {
          tone({ freq: f, dur: 0.15, type: 'triangle', vol: 0.5 });
          tone({ freq: f / 2, dur: 0.15, type: 'sawtooth', vol: 0.25 });
        }, i * 80);
      });
    },

    cat: () => {
      // miagolio
      tone({ freq: 660, dur: 0.12, type: 'sine', vol: 0.3, slide: 200 });
      tone({ freq: 880, dur: 0.18, type: 'sine', vol: 0.25, delay: 0.12, slide: -300 });
    },

    blackout: () => {
      // bzzzt → silenzio
      tone({ freq: 110, dur: 0.3, type: 'sawtooth', vol: 0.4, slide: -90 });
      noise({ dur: 0.4, vol: 0.2, freq: 200 });
    },

    customer_in: () => {
      // campanellino "ding-dong" porta officina
      tone({ freq: 988, dur: 0.18, type: 'sine', vol: 0.3 });
      tone({ freq: 784, dur: 0.22, type: 'sine', vol: 0.3, delay: 0.18 });
    },

    customer_happy: () => {
      tone({ freq: 880, dur: 0.1, type: 'triangle', vol: 0.35 });
      tone({ freq: 1320, dur: 0.12, type: 'triangle', vol: 0.35, delay: 0.08 });
    },

    customer_angry: () => {
      tone({ freq: 130, dur: 0.25, type: 'sawtooth', vol: 0.4 });
      tone({ freq: 110, dur: 0.3, type: 'sawtooth', vol: 0.35, delay: 0.1 });
    },

    combo_up: (level) => {
      const f = 440 + level * 60;
      tone({ freq: f, dur: 0.08, type: 'triangle', vol: 0.4 });
      tone({ freq: f * 1.5, dur: 0.1, type: 'triangle', vol: 0.3, delay: 0.05 });
    },

    slowmo_in: () => {
      // whoosh discendente
      tone({ freq: 800, dur: 0.4, type: 'sine', vol: 0.3, slide: -500 });
    },
  };

  function play(name, ...args) {
    if (muted) return;
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (sfx[name]) sfx[name](...args);
  }

  /* ===== Layered intensity ===== */
  function setComboLevel(level) {
    comboLevel = level;
  }

  function startHeartbeat() {
    if (heartbeatInterval) return;
    let bpm = 80;
    const tick = () => {
      if (!ctx || muted) return;
      tone({ freq: 60, dur: 0.08, type: 'sine', vol: 0.5 });
      tone({ freq: 50, dur: 0.06, type: 'sine', vol: 0.4, delay: 0.12 });
    };
    tick();
    heartbeatInterval = setInterval(tick, 60000 / bpm);
  }

  function stopHeartbeat() {
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
  }

  function setHeartbeatBPM(bpm) {
    if (!heartbeatInterval) return;
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (!ctx || muted) return;
      tone({ freq: 60, dur: 0.08, type: 'sine', vol: 0.5 });
      tone({ freq: 50, dur: 0.06, type: 'sine', vol: 0.4, delay: 0.12 });
    }, 60000 / bpm);
  }

  function startDrumLoop(speed = 1) {
    if (drumInterval) return;
    const tick = () => {
      noise({ dur: 0.05, vol: 0.18, freq: 200, q: 2 });
    };
    tick();
    drumInterval = setInterval(tick, 250 / speed);
  }

  function stopDrumLoop() {
    if (drumInterval) { clearInterval(drumInterval); drumInterval = null; }
  }

  function haptic(pattern = 30) {
    if (!Storage.get('settings').haptic) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function stopAll() {
    stopHeartbeat();
    stopDrumLoop();
  }

  return {
    init, play, setMuted, haptic, setComboLevel,
    startHeartbeat, stopHeartbeat, setHeartbeatBPM,
    startDrumLoop, stopDrumLoop, stopAll,
  };
})();
