/* ============================================================
   assetto.js V2 - convergenza, drag per centrare il laser.
   FX + variante SABOTAGGIO: drift molto più aggressivo.
   Scintille sul perfect, popup quando entri in zona.
   ============================================================ */

const AssettoGame = (() => {
  let canvas, ctx, state, onComplete, onFail, onProgress;
  let onPointerExtra = null;
  let dragging = false;

  function init(_canvas, _ctx, opts = {}) {
    canvas = _canvas; ctx = _ctx;
    onComplete = opts.onComplete || (() => {});
    onFail = opts.onFail || (() => {});
    onProgress = opts.onProgress || (() => {});
    onPointerExtra = opts.onPointerExtra || null;

    const diff = opts.difficulty || 1;
    state = {
      laser: { x: (Math.random()-.5)*1.4, y: (Math.random()-.5)*1.4 },
      drift: { x: (Math.random()-.5)*0.6, y: (Math.random()-.5)*0.6 },
      targetTimeNeeded: 2.6,
      timeInGreen: 0,
      wasInGreen: false,
      perfectStreak: 0,
      done: false,
      driftStrength: (opts.sabotage ? 0.9 : 0.4) + diff * 0.1,
      maxOff: 0.35,
      sabotage: opts.sabotage || false,
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    setInstructions(state.sabotage ? '🌪 ASSETTO INSTABILE! Trascina velocissimo!' : 'Trascina per centrare il laser 🎯');
  }

  function setInstructions(t) {
    const el = document.getElementById('instructions');
    if (el) el.textContent = t;
  }

  function onDown(e) {
    if (state.done) return;
    if (onPointerExtra) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top)  * (canvas.height / rect.height);
      if (onPointerExtra(x, y)) return;
    }
    dragging = true; updateFromPointer(e);
  }
  function onMove(e) { if (dragging) updateFromPointer(e); }
  function onUp() { dragging = false; }

  function updateFromPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    state.laser.x = Math.max(-1.2, Math.min(1.2, nx));
    state.laser.y = Math.max(-1.2, Math.min(1.2, ny));
  }

  function update(dt) {
    if (state.done) return;

    state.drift.x += (Math.random()-.5) * state.driftStrength * dt;
    state.drift.y += (Math.random()-.5) * state.driftStrength * dt;
    state.drift.x = Math.max(-0.6, Math.min(0.6, state.drift.x));
    state.drift.y = Math.max(-0.6, Math.min(0.6, state.drift.y));
    state.drift.x *= (1 - 0.4 * dt);
    state.drift.y *= (1 - 0.4 * dt);

    const dx = state.laser.x - state.drift.x;
    const dy = state.laser.y - state.drift.y;
    const dist = Math.hypot(dx, dy);

    const inGreen = dist < state.maxOff;
    if (inGreen) {
      // entrata in zona = sparks
      if (!state.wasInGreen) {
        const W = canvas.width, H = canvas.height;
        const scale = Math.min(W, H) * 0.4;
        const lx = W/2 + state.laser.x * scale;
        const ly = H/2 + state.laser.y * scale;
        FX.spark(lx, ly, { color: '#2ecc71', count: 10, speed: 200 });
        SFX.haptic(15);
      }
      state.timeInGreen += dt;
      onProgress(Math.min(1, state.timeInGreen / state.targetTimeNeeded));
      if (state.timeInGreen >= state.targetTimeNeeded) {
        state.done = true;
        FX.popText(canvas.width/2, canvas.height/2, 'ASSETTO PERFETTO!', { color: '#2ecc71', scale: 1.4 });
        FX.screenFlash('#2ecc71', 0.35);
        FX.screenShake(12);
        SFX.play('good');
        SFX.haptic([20, 50, 20]);
        setTimeout(onComplete, 280);
      }
    } else {
      state.timeInGreen = Math.max(0, state.timeInGreen - dt * 0.5);
    }
    state.wasInGreen = inGreen;
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2;
    const scale = Math.min(W, H) * 0.4;

    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#1a222c';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (W / 10) * i;
      const y = (H / 10) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(46,204,113,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, state.maxOff * scale, 0, Math.PI*2);
    ctx.stroke();

    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy); ctx.lineTo(cx + 30, cy);
    ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy + 30);
    ctx.stroke();

    const tx = cx + state.drift.x * scale;
    const ty = cy + state.drift.y * scale;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tx, ty, 16, 0, Math.PI*2);
    ctx.moveTo(tx - 12, ty); ctx.lineTo(tx + 12, ty);
    ctx.moveTo(tx, ty - 12); ctx.lineTo(tx, ty + 12);
    ctx.stroke();

    const lx = cx + state.laser.x * scale;
    const ly = cy + state.laser.y * scale;
    ctx.fillStyle = '#ffb000';
    ctx.beginPath();
    ctx.arc(lx, ly, 14, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,176,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    const pad = 40;
    const barW = W - pad*2;
    const barH = 16;
    ctx.fillStyle = '#1a222c';
    ctx.fillRect(pad, H*0.92, barW, barH);
    const pct = Math.min(1, state.timeInGreen / state.targetTimeNeeded);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(pad, H*0.92, barW * pct, barH);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(pad, H*0.92, barW, barH);

    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(W*0.028)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Allineamento ${(pct*100).toFixed(0)}%`, cx, H*0.91);
  }

  function destroy() {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
  }

  return { init, update, draw, destroy };
})();
