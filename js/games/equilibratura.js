/* ============================================================
   equilibratura.js - mini-game: equilibrare la ruota
   Gameplay: la ruota oscilla per uno sbilanciamento. Il giocatore
   tocca la circonferenza per piazzare contrappesi nel punto
   opposto allo squilibrio. Mira nel "settore verde" mobile.
   ============================================================ */

const EquilibraturaGame = (() => {
  let canvas, ctx, state, onComplete, onFail, onProgress;

  function init(_canvas, _ctx, opts = {}) {
    canvas = _canvas; ctx = _ctx;
    onComplete = opts.onComplete || (() => {});
    onFail = opts.onFail || (() => {});
    onProgress = opts.onProgress || (() => {});

    const diff = opts.difficulty || 1;
    state = {
      angle: 0,
      speed: 1 + diff * 0.2,            // velocità rotazione
      imbalance: Math.random() * Math.PI * 2,
      targetWindow: 0.35 - Math.min(0.2, diff * 0.02), // più stretto se difficile
      placed: 0,
      required: 3,
      misses: 0,
      maxMisses: 2,
      done: false,
      shake: 0,
      pulse: 0,
    };

    canvas.addEventListener('pointerdown', handlePointer);

    setInstructions('Tocca il settore verde per piazzare i pesi 🔧');
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

    const cx = canvas.width / 2, cy = canvas.height / 2;
    const ang = Math.atan2(y - cy, x - cx);
    const dist = Math.hypot(x - cx, y - cy);
    const r = Math.min(canvas.width, canvas.height) * 0.3;

    if (dist < r * 0.7 || dist > r * 1.2) return; // fuori cerchione

    // posizione corrente del target (opposto allo squilibrio + offset rotante)
    const targetAng = state.imbalance + Math.PI + state.angle;
    const diff = angDiff(ang, targetAng);

    if (Math.abs(diff) < state.targetWindow / 2) {
      state.placed++;
      state.pulse = 1;
      SFX.play('coin');
      SFX.haptic(30);
      onProgress(state.placed / state.required);

      // ricalcola squilibrio (più piccolo)
      state.imbalance = Math.random() * Math.PI * 2;
      state.speed = Math.max(0.3, state.speed * 0.7);

      if (state.placed >= state.required) {
        state.done = true;
        setTimeout(() => {
          SFX.play('good');
          SFX.haptic([20, 50, 20]);
          onComplete();
        }, 300);
      }
    } else {
      state.misses++;
      state.shake = 10;
      SFX.play('bad');
      SFX.haptic(60);
      if (state.misses >= state.maxMisses) {
        state.done = true;
        setTimeout(() => onFail(true), 200); // fail definitivo
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
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 50);
    if (state.pulse > 0) state.pulse = Math.max(0, state.pulse - dt * 2);
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2;
    const r = Math.min(W, H) * 0.3;

    ctx.save();
    if (state.shake) ctx.translate((Math.random()-.5)*state.shake, (Math.random()-.5)*state.shake);

    // sfondo
    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(0, 0, W, H);

    // base macchina equilibratrice
    ctx.fillStyle = '#1a222c';
    ctx.fillRect(W*0.15, H*0.78, W*0.7, H*0.12);
    ctx.fillStyle = '#11161c';
    ctx.fillRect(W*0.4, H*0.55, W*0.2, H*0.25);

    // ruota
    ctx.save();
    ctx.translate(cx, cy);

    // pneumatico
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, Math.PI*2);
    ctx.fill();
    // cerchio
    const g = ctx.createRadialGradient(0, 0, r*0.3, 0, 0, r);
    g.addColorStop(0, '#c8ccd2');
    g.addColorStop(1, '#3a4250');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fill();

    // razze rotanti
    ctx.rotate(state.angle);
    ctx.strokeStyle = '#2a2f37';
    ctx.lineWidth = r * 0.12;
    for (let i = 0; i < 5; i++) {
      const a = (i/5)*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a)*r*0.85, Math.sin(a)*r*0.85);
      ctx.stroke();
    }
    // hub
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, 0, r*0.18, 0, Math.PI*2);
    ctx.fill();

    // indicatore squilibrio (rosso)
    ctx.save();
    ctx.rotate(state.imbalance);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(r*0.85, 0, r*0.08, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // settore target verde
    const targetAng = state.imbalance + Math.PI + state.angle;
    const half = state.targetWindow / 2;
    ctx.save();
    ctx.translate(cx, cy);
    const pulse = 1 + state.pulse * 0.4;
    ctx.strokeStyle = `rgba(46,204,113,${0.6 + state.pulse*0.4})`;
    ctx.lineWidth = 14 * pulse;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.1, targetAng - half, targetAng + half);
    ctx.stroke();
    ctx.restore();

    // pesi piazzati
    for (let i = 0; i < state.placed; i++) {
      ctx.fillStyle = '#ffb000';
      const a = (i / state.required) * Math.PI * 2;
      const px = cx + Math.cos(a) * r * 1.15;
      const py = cy + Math.sin(a) * r * 1.15;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();

    // indicatore vita
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(W*0.025)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Pesi: ${state.placed}/${state.required}   Errori: ${state.misses}/${state.maxMisses}`, cx, H * 0.96);
  }

  function destroy() {
    canvas.removeEventListener('pointerdown', handlePointer);
  }

  return { init, update, draw, destroy };
})();
