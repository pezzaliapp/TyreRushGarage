/* ============================================================
   manopump.js V3 - mini-game ESCLUSIVO del livello "Compressore guasto".
   Niente compressore: pompi a mano con TAP RAPIDI alternati su due tasti
   (sinistra/destra). Il manometro sale veloce ma si svuota se rallenti.
   Ferma nella zona verde target.
   ============================================================ */

const ManopumpGame = (() => {
  let canvas, ctx, state, onComplete, onFail, onProgress;
  let onPointerExtra = null;

  const PRESSURE_MAX = 4.0;

  function init(_canvas, _ctx, opts = {}) {
    canvas = _canvas; ctx = _ctx;
    onComplete = opts.onComplete || (() => {});
    onFail = opts.onFail || (() => {});
    onProgress = opts.onProgress || (() => {});
    onPointerExtra = opts.onPointerExtra || null;

    const diff = opts.difficulty || 1;
    const target = 1.8 + Math.random() * 1.0;
    const window = Math.max(0.18, 0.6 - diff * 0.04);

    state = {
      pressure: 0,
      target,
      window,
      done: false,
      success: 0,
      required: 3,
      currentTry: 0,
      maxTries: 5,
      lastSide: 0,            // 1 = sx, 2 = dx (per imporre alternanza)
      lastPumpAt: 0,
      flash: 0,
    };

    canvas.addEventListener('pointerdown', handlePointer);
    setInstructions('Pompa a mano! TAP alternati sx ↔ dx · Ferma sul verde');
  }

  function setInstructions(t) {
    const el = document.getElementById('instructions');
    if (el) el.textContent = t;
  }

  function handlePointer(e) {
    if (state.done) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;

    if (onPointerExtra && onPointerExtra(x, y)) return;

    // due "pomelli" sx/dx in basso
    const W = canvas.width, H = canvas.height;
    const inLeft  = x < W/2 && y > H*0.6;
    const inRight = x > W/2 && y > H*0.6;

    // tap "stop" in alto = blocca la pressione
    if (y < H * 0.6) {
      // decisione: ferma la pressione qui
      stopPump();
      return;
    }

    if (!inLeft && !inRight) return;

    const side = inLeft ? 1 : 2;

    // alternanza obbligata: se premi due volte lo stesso lato, niente boost
    let boost = 0.55;
    if (side === state.lastSide) {
      boost = 0.12; // mezzo gas
      FX.popText(x, y - 30, 'ALTERNA!', { color: '#e74c3c', scale: 0.9, life: 0.6 });
    } else {
      FX.spark(x, y - 8, { color: '#ffb000', count: 6, speed: 220 });
    }
    state.lastSide = side;
    state.pressure = Math.min(PRESSURE_MAX, state.pressure + boost);
    state.lastPumpAt = performance.now();
    SFX.play('pump');
    SFX.haptic(10);
    FX.screenShake(2);
  }

  function stopPump() {
    if (state.done) return;
    state.currentTry++;
    const cx = canvas.width / 2, cy = canvas.height * 0.4;
    const diff = Math.abs(state.pressure - state.target);

    if (diff <= state.window) {
      state.success++;
      state.flash = 1;
      FX.spark(cx, cy, { color: '#2ecc71', count: 22, speed: 320 });
      FX.popText(cx, cy - 80, 'STOP PERFETTO!', { color: '#2ecc71', scale: 1.2 });
      FX.screenShake(8);
      FX.screenFlash('#2ecc71', 0.25);
      SFX.play('coin');
      SFX.haptic([10, 30, 10]);
      onProgress(state.success / state.required);
      if (state.success >= state.required) {
        state.done = true;
        setTimeout(() => { SFX.play('good'); onComplete(); }, 300);
        return;
      }
      animateDeflate();
    } else {
      state.flash = -1;
      FX.hitBad(cx, cy);
      FX.smoke(cx, cy, '180,40,40');
      SFX.play('hiss');
      SFX.haptic(80);
      onFail(false);
      if (state.currentTry >= state.maxTries) {
        state.done = true;
        setTimeout(() => onFail(true), 200);
        return;
      }
      animateDeflate();
    }
  }

  function animateDeflate() {
    const step = () => {
      if (state.done) return;
      if (state.pressure > 0) {
        state.pressure = Math.max(0, state.pressure - 0.2);
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  function update(dt) {
    // sgonfio passivo se non pompi
    const elapsed = (performance.now() - state.lastPumpAt) / 1000;
    if (elapsed > 0.4 && state.pressure > 0 && state.lastPumpAt > 0 && !state.done) {
      state.pressure = Math.max(0, state.pressure - dt * 0.5);
    }
    if (state.flash !== 0) {
      state.flash *= (1 - dt * 3);
      if (Math.abs(state.flash) < 0.05) state.flash = 0;
    }
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H * 0.35;
    const r = Math.min(W, H) * 0.26;

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(46,204,113,${state.flash * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    } else if (state.flash < 0) {
      ctx.fillStyle = `rgba(231,76,60,${-state.flash * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }

    // sfondo
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1c2530');
    bg.addColorStop(1, '#0b0d10');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // banner di emergenza
    ctx.fillStyle = '#e74c3c';
    ctx.font = `bold ${Math.floor(W*0.04)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ COMPRESSORE GUASTO ⚠️', cx, 28);

    // manometro (più piccolo, in alto)
    ctx.fillStyle = '#1a222c';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.2, 0, Math.PI*2);
    ctx.fill();

    const dial = ctx.createRadialGradient(cx, cy, r*0.3, cx, cy, r);
    dial.addColorStop(0, '#f8f8f0');
    dial.addColorStop(1, '#d8d8d0');
    ctx.fillStyle = dial;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();

    const startA = Math.PI * 0.75;
    const endA   = Math.PI * 2.25;
    const fullA  = endA - startA;
    const tStart = startA + (state.target - state.window) / PRESSURE_MAX * fullA;
    const tEnd   = startA + (state.target + state.window) / PRESSURE_MAX * fullA;
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, tStart, tEnd);
    ctx.stroke();

    // tacche
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#222';
    ctx.font = `${Math.floor(r*0.14)}px sans-serif`;
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= PRESSURE_MAX; i += 0.5) {
      const a = startA + i / PRESSURE_MAX * fullA;
      const x1 = cx + Math.cos(a) * r * 0.7;
      const y1 = cy + Math.sin(a) * r * 0.7;
      const x2 = cx + Math.cos(a) * r * 0.82;
      const y2 = cy + Math.sin(a) * r * 0.82;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      if (i % 1 === 0) {
        const tx = cx + Math.cos(a) * r * 0.55;
        const ty = cy + Math.sin(a) * r * 0.55;
        ctx.fillText(i.toFixed(0), tx, ty);
      }
    }

    // lancetta
    const a = startA + state.pressure / PRESSURE_MAX * fullA;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(r * 0.85, 0);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(0, 0, r*0.08, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // pomelli sx/dx in basso
    const padY = H * 0.62;
    const halfW = W / 2;
    drawPumpButton(W * 0.25, padY + H * 0.18, halfW * 0.7, H * 0.32, state.lastSide === 1, '◀ SX');
    drawPumpButton(W * 0.75, padY + H * 0.18, halfW * 0.7, H * 0.32, state.lastSide === 2, 'DX ▶');

    // pressione
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(W*0.04)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${state.pressure.toFixed(2)} bar`, cx, H * 0.55);
    ctx.font = `${Math.floor(W*0.025)}px sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`OK ${state.success}/${state.required}   Tentativi ${state.currentTry}/${state.maxTries}`, cx, H * 0.6);
    ctx.fillStyle = '#ffb000';
    ctx.font = `${Math.floor(W*0.022)}px sans-serif`;
    ctx.fillText('TAP in alto per FERMARE 🛑', cx, H * 0.92);
  }

  function drawPumpButton(cx, cy, w, h, glow, label) {
    const x = cx - w/2, y = cy - h/2;
    ctx.fillStyle = glow ? '#ff7a00' : '#1a222c';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffb000';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(canvas.width * 0.06)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  }

  function destroy() {
    canvas.removeEventListener('pointerdown', handlePointer);
  }

  return { init, update, draw, destroy };
})();
