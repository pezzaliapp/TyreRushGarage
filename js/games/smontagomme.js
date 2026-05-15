/* ============================================================
   smontagomme.js - mini-game: svitare i 5 bulloni della ruota
   Gameplay: tap rapido sui bulloni nell'ordine giallo, poi
   sfila la gomma con uno swipe. Tap fuori bersaglio = errore.
   ============================================================ */

const SmontagommeGame = (() => {
  let canvas, ctx, state, onComplete, onFail, onProgress;
  let pointerX = 0, pointerY = 0;
  let dpr = 1;

  function init(_canvas, _ctx, opts = {}) {
    canvas = _canvas; ctx = _ctx;
    onComplete = opts.onComplete || (() => {});
    onFail = opts.onFail || (() => {});
    onProgress = opts.onProgress || (() => {});
    dpr = window.devicePixelRatio || 1;

    resetState(opts.difficulty || 1);

    canvas.addEventListener('pointerdown', handlePointer);

    drawInstructions('Tocca i 5 bulloni in ordine 🔩');
  }

  function resetState(difficulty) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.32;

    state = {
      bolts: [],
      currentIndex: 0,
      done: false,
      tireRemoved: false,
      difficulty,
      shake: 0,
    };

    // 5 bulloni a stella
    const N = 5;
    for (let i = 0; i < N; i++) {
      const ang = (Math.PI * 2 * i / N) - Math.PI / 2;
      state.bolts.push({
        x: cx + Math.cos(ang) * radius * 0.55,
        y: cy + Math.sin(ang) * radius * 0.55,
        loosened: false,
        angle: 0,
        targetAngle: 0,
      });
    }
  }

  function handlePointer(e) {
    if (state.done) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const target = state.bolts[state.currentIndex];
    if (!target) return;
    const dx = x - target.x;
    const dy = y - target.y;
    const dist = Math.hypot(dx, dy);
    const hitR = Math.min(canvas.width, canvas.height) * 0.08;

    if (dist <= hitR) {
      target.loosened = true;
      target.targetAngle = Math.PI * 3;
      state.currentIndex++;
      SFX.play('bolt');
      SFX.haptic(20);
      onProgress(state.currentIndex / state.bolts.length);

      if (state.currentIndex >= state.bolts.length) {
        // rimuovi gomma con piccola animazione
        state.tireRemoved = true;
        setTimeout(() => {
          state.done = true;
          SFX.play('good');
          SFX.haptic([20, 50, 20]);
          onComplete();
        }, 500);
      }
    } else {
      // miss
      state.shake = 12;
      SFX.play('bad');
      SFX.haptic(60);
      onFail();
    }
  }

  function update(dt) {
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 50);
    state.bolts.forEach(b => {
      if (b.angle < b.targetAngle) b.angle = Math.min(b.targetAngle, b.angle + dt * 12);
    });
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W / 2;
    const cy = H / 2 + (state.tireRemoved ? 200 : 0);

    ctx.save();
    if (state.shake) {
      ctx.translate((Math.random()-.5)*state.shake, (Math.random()-.5)*state.shake);
    }

    // sfondo pavimento
    const floor = ctx.createLinearGradient(0, 0, 0, H);
    floor.addColorStop(0, '#1c2530');
    floor.addColorStop(1, '#0b0d10');
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, W, H);

    // ponte sollevatore
    ctx.fillStyle = '#2a2f37';
    ctx.fillRect(W*0.1, H*0.75, W*0.8, 16);
    ctx.fillStyle = '#11161c';
    ctx.fillRect(W*0.2, H*0.78, 30, H*0.2);
    ctx.fillRect(W*0.8 - 30, H*0.78, 30, H*0.2);

    // pneumatico
    const r = Math.min(W, H) * 0.32;
    ctx.save();
    ctx.translate(cx, cy);
    // gomma esterna
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fill();
    // battistrada
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 4;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*r*0.85, Math.sin(a)*r*0.85);
      ctx.lineTo(Math.cos(a)*r*1.0, Math.sin(a)*r*1.0);
      ctx.stroke();
    }
    // cerchione
    const rimGrad = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r*0.7);
    rimGrad.addColorStop(0, '#c8ccd2');
    rimGrad.addColorStop(0.7, '#6c7480');
    rimGrad.addColorStop(1, '#2a2f37');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r*0.7, 0, Math.PI*2);
    ctx.fill();

    // razze
    ctx.strokeStyle = '#3a4250';
    ctx.lineWidth = r*0.08;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI/2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a)*r*0.6, Math.sin(a)*r*0.6);
      ctx.stroke();
    }
    // hub centrale
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, 0, r*0.15, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // bulloni
    state.bolts.forEach((b, i) => {
      const isNext = i === state.currentIndex;
      const sizeBase = r * 0.1;
      ctx.save();
      ctx.translate(b.x, cy + (b.y - H/2));
      ctx.rotate(b.angle);

      // alone target
      if (isNext && !b.loosened) {
        ctx.fillStyle = 'rgba(255,176,0,0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, sizeBase * 2, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#ffb000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, sizeBase * 1.6 + Math.sin(Date.now()/200)*4, 0, Math.PI*2);
        ctx.stroke();
      }

      // bullone esagonale
      ctx.fillStyle = b.loosened ? '#3a4250' : '#dadde2';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = s/6 * Math.PI*2;
        const x = Math.cos(a) * sizeBase;
        const y = Math.sin(a) * sizeBase;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // foro al centro
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(0, 0, sizeBase * 0.25, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
  }

  function drawInstructions(text) {
    const el = document.getElementById('instructions');
    if (el) el.textContent = text;
  }

  function destroy() {
    canvas.removeEventListener('pointerdown', handlePointer);
  }

  return { init, update, draw, destroy };
})();
