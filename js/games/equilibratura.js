/* ============================================================
   equilibratura.js V2 - piazza i contrappesi sul settore verde.
   FX completi + variante SABOTAGGIO: inversione del senso di
   rotazione a metà partita.
   ============================================================ */

const EquilibraturaGame = (() => {
  let canvas, ctx, state, onComplete, onFail, onProgress;
  let onPointerExtra = null;

  function init(_canvas, _ctx, opts = {}) {
    canvas = _canvas; ctx = _ctx;
    onComplete = opts.onComplete || (() => {});
    onFail = opts.onFail || (() => {});
    onProgress = opts.onProgress || (() => {});
    onPointerExtra = opts.onPointerExtra || null;

    const diff = opts.difficulty || 1;
    state = {
      angle: 0,
      speed: 1.2 + diff * 0.22,
      imbalance: Math.random() * Math.PI * 2,
      targetWindow: Math.max(0.18, 0.4 - diff * 0.02),
      placed: 0,
      required: 3,
      misses: 0,
      maxMisses: 3,
      done: false,
      pulse: 0,
      sabotage: opts.sabotage || false,
      direction: 1,
      flipped: false,
    };

    canvas.addEventListener('pointerdown', handlePointer);
    setInstructions(state.sabotage ? 'ATTENZIONE: la ruota può INVERTIRE! 🔄' : 'Tocca il settore verde per piazzare i pesi 🔧');
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

    const cx = canvas.width / 2, cy = canvas.height / 2;
    const ang = Math.atan2(y - cy, x - cx);
    const dist = Math.hypot(x - cx, y - cy);
    const r = Math.min(canvas.width, canvas.height) * 0.3;

    if (dist < r * 0.7 || dist > r * 1.2) return;

    const targetAng = state.imbalance + Math.PI + state.angle * state.direction;
    const diff = angDiff(ang, targetAng);

    if (Math.abs(diff) < state.targetWindow / 2) {
      state.placed++;
      state.pulse = 1;
      FX.spark(x, y, { color: '#2ecc71', count: 20, speed: 320 });
      FX.popText(x, y - 30, '+1 PESO', { color: '#2ecc71', scale: 1.0 });
      FX.screenShake(6);
      FX.screenFlash('#2ecc71', 0.2);
      SFX.play('coin');
      SFX.haptic(30);
      onProgress(state.placed / state.required);

      state.imbalance = Math.random() * Math.PI * 2;
      state.speed = Math.max(0.4, state.speed * 0.78);

      if (state.sabotage && !state.flipped && state.placed === Math.ceil(state.required / 2)) {
        state.direction *= -1;
        state.flipped = true;
        FX.popText(canvas.width/2, canvas.height/2, '⚠️ INVERTITA!', { color: '#e74c3c', scale: 1.4 });
        FX.screenFlash('#e74c3c', 0.4);
        FX.screenShake(12);
        SFX.play('hiss');
        SFX.haptic([20, 80, 20]);
      }

      if (state.placed >= state.required) {
        state.done = true;
        FX.smoke(cx, cy);
        setTimeout(() => {
          SFX.play('good');
          SFX.haptic([20, 50, 20]);
          onComplete();
        }, 300);
      }
    } else {
      state.misses++;
      FX.hitBad(x, y);
      SFX.play('bad');
      SFX.haptic(60);
      if (state.misses >= state.maxMisses) {
        state.done = true;
        setTimeout(() => onFail(true), 200);
      } else {
        onFail(false);
      }
    }
  }

  function angDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function update(dt) {
    if (!state.done) state.angle += state.speed * dt;
    if (state.pulse > 0) state.pulse = Math.max(0, state.pulse - dt * 2);
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2;
    const r = Math.min(W, H) * 0.3;

    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#1a222c';
    ctx.fillRect(W*0.15, H*0.78, W*0.7, H*0.12);
    ctx.fillStyle = '#11161c';
    ctx.fillRect(W*0.4, H*0.55, W*0.2, H*0.25);

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, Math.PI*2);
    ctx.fill();
    const g = ctx.createRadialGradient(0, 0, r*0.3, 0, 0, r);
    g.addColorStop(0, '#c8ccd2');
    g.addColorStop(1, '#3a4250');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fill();

    ctx.rotate(state.angle * state.direction);
    ctx.strokeStyle = '#2a2f37';
    ctx.lineWidth = r * 0.12;
    for (let i = 0; i < 5; i++) {
      const a = (i/5)*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a)*r*0.85, Math.sin(a)*r*0.85);
      ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, 0, r*0.18, 0, Math.PI*2);
    ctx.fill();

    ctx.save();
    ctx.rotate(state.imbalance);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(r*0.85, 0, r*0.08, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    const targetAng = state.imbalance + Math.PI + state.angle * state.direction;
    const half = state.targetWindow / 2;
    ctx.save();
    ctx.translate(cx, cy);
    const pulse = 1 + state.pulse * 0.4;
    ctx.strokeStyle = `rgba(46,204,113,${0.6 + state.pulse*0.4})`;
    ctx.lineWidth = 16 * pulse;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.1, targetAng - half, targetAng + half);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < state.placed; i++) {
      ctx.fillStyle = '#ffb000';
      const a = (i / state.required) * Math.PI * 2;
      const px = cx + Math.cos(a) * r * 1.15;
      const py = cy + Math.sin(a) * r * 1.15;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(W*0.025)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Pesi ${state.placed}/${state.required}   Err ${state.misses}/${state.maxMisses}`, cx, H * 0.96);
  }

  function destroy() {
    canvas.removeEventListener('pointerdown', handlePointer);
  }

  return { init, update, draw, destroy };
})();
