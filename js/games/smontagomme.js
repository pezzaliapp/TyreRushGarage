/* ============================================================
   smontagomme.js V2 - tap rapido sui 5 bulloni.
   Variante SABOTAGGIO: 1 bullone arrugginito (richiede 2 tap)
   con anello rosso pulsante. Scintille epiche per ogni hit.
   ============================================================ */

const SmontagommeGame = (() => {
  let canvas, ctx, state, onComplete, onFail, onProgress;
  let onPointerExtra = null;

  function init(_canvas, _ctx, opts = {}) {
    canvas = _canvas; ctx = _ctx;
    onComplete = opts.onComplete || (() => {});
    onFail = opts.onFail || (() => {});
    onProgress = opts.onProgress || (() => {});
    onPointerExtra = opts.onPointerExtra || null;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.32;

    state = {
      bolts: [],
      currentIndex: 0,
      done: false,
      tireRemoved: false,
      sabotage: opts.sabotage || false,
      rustyBoltIdx: -1,
    };

    const N = 5;
    for (let i = 0; i < N; i++) {
      const ang = (Math.PI * 2 * i / N) - Math.PI / 2;
      state.bolts.push({
        x: cx + Math.cos(ang) * radius * 0.55,
        y: cy + Math.sin(ang) * radius * 0.55,
        loosened: false,
        taps: 0,
        targetTaps: 1,
        angle: 0,
        targetAngle: 0,
      });
    }

    if (state.sabotage) {
      state.rustyBoltIdx = Math.floor(Math.random() * N);
      state.bolts[state.rustyBoltIdx].targetTaps = 2;
    }

    canvas.addEventListener('pointerdown', handlePointer);
    setInstructions(state.sabotage ? 'C\'è un bullone ARRUGGINITO! 🟥' : 'Tocca i 5 bulloni in ordine 🔩');
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

    const target = state.bolts[state.currentIndex];
    if (!target) return;
    const dist = Math.hypot(x - target.x, y - target.y);
    const hitR = Math.min(canvas.width, canvas.height) * 0.09;

    if (dist <= hitR) {
      target.taps++;
      if (target.taps >= target.targetTaps) {
        target.loosened = true;
        target.targetAngle = Math.PI * 3;
        state.currentIndex++;
        FX.spark(target.x, target.y, { color: '#ffb000', count: 18, speed: 320 });
        FX.popText(target.x, target.y - 30, '+10', { color: '#ffb000', scale: 1.0 });
        FX.screenShake(5);
        SFX.play('bolt');
        SFX.haptic(20);
        onProgress(state.currentIndex / state.bolts.length);

        if (state.currentIndex >= state.bolts.length) {
          state.tireRemoved = true;
          FX.smoke(canvas.width / 2, canvas.height * 0.7);
          FX.screenFlash('#ffb000', 0.3);
          FX.screenShake(14);
          setTimeout(() => {
            state.done = true;
            SFX.play('good');
            SFX.haptic([20, 50, 20]);
            onComplete();
          }, 400);
        }
      } else {
        FX.spark(target.x, target.y, { color: '#e74c3c', count: 8, speed: 220 });
        FX.popText(target.x, target.y - 20, 'ANCORA!', { color: '#e74c3c', scale: 0.9 });
        FX.screenShake(4);
        SFX.play('bolt');
        SFX.haptic(40);
      }
    } else {
      FX.hitBad(x, y);
      SFX.play('bad');
      SFX.haptic(60);
      onFail();
    }
  }

  function update(dt) {
    state.bolts.forEach(b => {
      if (b.angle < b.targetAngle) b.angle = Math.min(b.targetAngle, b.angle + dt * 12);
    });
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W / 2;
    const cy = H / 2 + (state.tireRemoved ? 200 : 0);

    const floor = ctx.createLinearGradient(0, 0, 0, H);
    floor.addColorStop(0, '#1c2530');
    floor.addColorStop(1, '#0b0d10');
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#2a2f37';
    ctx.fillRect(W * 0.1, H * 0.75, W * 0.8, 16);
    ctx.fillStyle = '#11161c';
    ctx.fillRect(W * 0.2, H * 0.78, 30, H * 0.2);
    ctx.fillRect(W * 0.8 - 30, H * 0.78, 30, H * 0.2);

    const r = Math.min(W, H) * 0.32;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 4;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.lineTo(Math.cos(a) * r * 1.0, Math.sin(a) * r * 1.0);
      ctx.stroke();
    }
    const rimGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 0.7);
    rimGrad.addColorStop(0, '#c8ccd2');
    rimGrad.addColorStop(0.7, '#6c7480');
    rimGrad.addColorStop(1, '#2a2f37');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a4250';
    ctx.lineWidth = r * 0.08;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
      ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    state.bolts.forEach((b, i) => {
      const isNext = i === state.currentIndex;
      const isRusty = i === state.rustyBoltIdx && !b.loosened;
      const sizeBase = r * 0.1;
      ctx.save();
      ctx.translate(b.x, cy + (b.y - H / 2));
      ctx.rotate(b.angle);

      if (isNext && !b.loosened) {
        ctx.fillStyle = 'rgba(255,176,0,0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, sizeBase * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffb000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, sizeBase * 1.6 + Math.sin(Date.now() / 200) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (isRusty) {
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, sizeBase * 1.9 + Math.sin(Date.now() / 150) * 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = b.loosened ? '#3a4250' : (isRusty ? '#a04a3a' : '#dadde2');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = s / 6 * Math.PI * 2;
        const x = Math.cos(a) * sizeBase;
        const y = Math.sin(a) * sizeBase;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(0, 0, sizeBase * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function destroy() {
    canvas.removeEventListener('pointerdown', handlePointer);
  }

  return { init, update, draw, destroy };
})();
