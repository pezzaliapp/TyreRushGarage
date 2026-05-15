/* ============================================================
   assetto.js - mini-game: convergenza / assetto
   Gameplay: trascina il volante per centrare il laser nel mirino.
   Il bersaglio "deriva" continuamente (campanatura instabile).
   Resta dentro la zona verde per N secondi totali.
   ============================================================ */

const AssettoGame = (() => {
  let canvas, ctx, state, onComplete, onFail, onProgress;
  let dragging = false;

  function init(_canvas, _ctx, opts = {}) {
    canvas = _canvas; ctx = _ctx;
    onComplete = opts.onComplete || (() => {});
    onFail = opts.onFail || (() => {});
    onProgress = opts.onProgress || (() => {});

    const diff = opts.difficulty || 1;
    state = {
      // posizione laser (proporzioni -1..1)
      laser: { x: (Math.random()-.5)*1.4, y: (Math.random()-.5)*1.4 },
      drift: { x: (Math.random()-.5)*0.6, y: (Math.random()-.5)*0.6 },
      targetTimeNeeded: 3.0,            // secondi nel green totali
      timeInGreen: 0,
      done: false,
      driftStrength: 0.4 + diff * 0.1,
      maxOff: 0.35,                     // raggio zona verde
      hasFailedHard: false,
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    setInstructions('Trascina per centrare il laser nel mirino verde 🎯');
  }

  function setInstructions(t) {
    const el = document.getElementById('instructions');
    if (el) el.textContent = t;
  }

  function onDown(e) { if (!state.done) { dragging = true; updateFromPointer(e); } }
  function onMove(e) { if (dragging) updateFromPointer(e); }
  function onUp() { dragging = false; }

  function updateFromPointer(e) {
    const rect = canvas.getBoundingClientRect();
    // valore normalizzato -1..1 sulla posizione del pointer relativa al centro canvas
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    // la posizione del laser è una correzione del drift: trascinando sposti il laser
    state.laser.x = Math.max(-1.2, Math.min(1.2, nx));
    state.laser.y = Math.max(-1.2, Math.min(1.2, ny));
  }

  function update(dt) {
    if (state.done) return;

    // drift random continuo (vibrazione)
    state.drift.x += (Math.random()-.5) * state.driftStrength * dt;
    state.drift.y += (Math.random()-.5) * state.driftStrength * dt;
    state.drift.x = Math.max(-0.6, Math.min(0.6, state.drift.x));
    state.drift.y = Math.max(-0.6, Math.min(0.6, state.drift.y));

    // tendenza a tornare leggermente al centro
    state.drift.x *= (1 - 0.4 * dt);
    state.drift.y *= (1 - 0.4 * dt);

    const dx = state.laser.x - state.drift.x;
    const dy = state.laser.y - state.drift.y;
    const dist = Math.hypot(dx, dy);

    if (dist < state.maxOff) {
      state.timeInGreen += dt;
      onProgress(Math.min(1, state.timeInGreen / state.targetTimeNeeded));
      if (state.timeInGreen >= state.targetTimeNeeded) {
        state.done = true;
        SFX.play('good');
        SFX.haptic([20, 50, 20]);
        setTimeout(onComplete, 200);
      }
    } else {
      state.timeInGreen = Math.max(0, state.timeInGreen - dt * 0.5);
    }
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2;
    const scale = Math.min(W, H) * 0.4;

    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(0, 0, W, H);

    // griglia di sfondo
    ctx.strokeStyle = '#1a222c';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (W / 10) * i;
      const y = (H / 10) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // mirino al centro - cerchio verde "tollerance"
    ctx.strokeStyle = 'rgba(46,204,113,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, state.maxOff * scale, 0, Math.PI*2);
    ctx.stroke();

    // crocette
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy); ctx.lineTo(cx + 30, cy);
    ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy + 30);
    ctx.stroke();

    // drift bersaglio (croce rossa che si muove)
    const tx = cx + state.drift.x * scale;
    const ty = cy + state.drift.y * scale;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tx, ty, 16, 0, Math.PI*2);
    ctx.moveTo(tx - 12, ty); ctx.lineTo(tx + 12, ty);
    ctx.moveTo(tx, ty - 12); ctx.lineTo(tx, ty + 12);
    ctx.stroke();

    // laser (puntatore controllato)
    const lx = cx + state.laser.x * scale;
    const ly = cy + state.laser.y * scale;
    ctx.fillStyle = '#ffb000';
    ctx.beginPath();
    ctx.arc(lx, ly, 14, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // linea tra laser e bersaglio
    ctx.strokeStyle = 'rgba(255,176,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    // barra di progresso tempo
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
