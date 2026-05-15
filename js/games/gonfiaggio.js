/* ============================================================
   gonfiaggio.js V2 - hold to pump. Rilascia nella zona verde.
   FX completi + variante SABOTAGGIO: gomma sgonfia all'arrivo
   con valore residuo casuale (sembra che parta da 0 e invece no!).
   ============================================================ */

const GonfiaggioGame = (() => {
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
    const window = Math.max(0.15, 0.5 - diff * 0.04);

    state = {
      pressure: opts.sabotage ? Math.random() * 1.2 + 0.6 : 0,
      pumping: false,
      target,
      window,
      done: false,
      success: 0,
      required: 3,
      currentTry: 0,
      maxTries: 5,
      flash: 0,
      sabotage: opts.sabotage || false,
    };

    canvas.addEventListener('pointerdown', startPump);
    canvas.addEventListener('pointerup', stopPump);
    canvas.addEventListener('pointercancel', stopPump);
    canvas.addEventListener('pointerleave', stopPump);

    setInstructions(
      state.sabotage
        ? `⚠️ GOMMA SGONFIA! Inizia da ${state.pressure.toFixed(1)} bar! Target ${target.toFixed(1)}`
        : `Tieni premuto per gonfiare · Target ${target.toFixed(1)} bar`
    );
  }

  function setInstructions(t) {
    const el = document.getElementById('instructions');
    if (el) el.textContent = t;
  }

  function startPump(e) {
    if (state.done) return;
    if (onPointerExtra) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top)  * (canvas.height / rect.height);
      if (onPointerExtra(x, y)) return;
    }
    state.pumping = true;
    SFX.play('pump');
  }

  function stopPump() {
    if (state.done || !state.pumping) return;
    state.pumping = false;
    state.currentTry++;

    const diff = Math.abs(state.pressure - state.target);
    const cx = canvas.width / 2, cy = canvas.height * 0.45;

    if (diff <= state.window) {
      state.success++;
      state.flash = 1;
      FX.spark(cx, cy, { color: '#2ecc71', count: 22, speed: 320 });
      FX.popText(cx, cy - 80, 'PERFETTO!', { color: '#2ecc71', scale: 1.2 });
      FX.screenShake(8);
      FX.screenFlash('#2ecc71', 0.25);
      SFX.play('coin');
      SFX.haptic([10, 30, 10]);
      onProgress(state.success / state.required);

      if (state.success >= state.required) {
        state.done = true;
        setTimeout(() => {
          SFX.play('good');
          SFX.haptic([20, 50, 20]);
          onComplete();
        }, 300);
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
      if (state.pressure > 0) {
        state.pressure = Math.max(0, state.pressure - 0.15);
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  function update(dt) {
    if (state.pumping && !state.done) {
      state.pressure = Math.min(PRESSURE_MAX, state.pressure + dt * 1.8);
      if (state.pressure >= PRESSURE_MAX) stopPump();
    }
    if (state.flash !== 0) {
      state.flash *= (1 - dt * 3);
      if (Math.abs(state.flash) < 0.05) state.flash = 0;
    }
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H * 0.45;
    const r = Math.min(W, H) * 0.32;

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(46,204,113,${state.flash * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    } else if (state.flash < 0) {
      ctx.fillStyle = `rgba(231,76,60,${-state.flash * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = '#11161c';
    ctx.fillRect(0, H*0.85, W, H*0.15);

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

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#222';
    ctx.font = `${Math.floor(r*0.12)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= PRESSURE_MAX; i += 0.5) {
      const a = startA + i / PRESSURE_MAX * fullA;
      const x1 = cx + Math.cos(a) * r * 0.7;
      const y1 = cy + Math.sin(a) * r * 0.7;
      const x2 = cx + Math.cos(a) * r * 0.82;
      const y2 = cy + Math.sin(a) * r * 0.82;
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.stroke();
      if (i % 1 === 0) {
        const tx = cx + Math.cos(a) * r * 0.55;
        const ty = cy + Math.sin(a) * r * 0.55;
        ctx.fillText(i.toFixed(0), tx, ty);
      }
    }

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

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r*1.2);
    ctx.bezierCurveTo(cx, H*0.9, W*0.2, H*0.9, W*0.15, H*0.92);
    ctx.stroke();
    ctx.fillStyle = '#ff7a00';
    ctx.fillRect(W*0.05, H*0.88, W*0.2, H*0.08);

    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(W*0.04)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${state.pressure.toFixed(2)} bar`, cx, H * 0.85);
    ctx.font = `${Math.floor(W*0.025)}px sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`OK ${state.success}/${state.required}   Tentativi ${state.currentTry}/${state.maxTries}`, cx, H * 0.9);
  }

  function destroy() {
    canvas.removeEventListener('pointerdown', startPump);
    canvas.removeEventListener('pointerup', stopPump);
    canvas.removeEventListener('pointercancel', stopPump);
    canvas.removeEventListener('pointerleave', stopPump);
  }

  return { init, update, draw, destroy };
})();
