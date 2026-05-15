/* ============================================================
   bosstruck.js - LA BOSS FIGHT. Ogni 8-10 clienti arriva il
   SUPER TRUCK con 8 ruote. Klaxon, schermo flash, musica
   raddoppia, 45 secondi. +5000 se completi tutto.
   QUESTA È LA SCENA CHE IL GIOCATORE RACCONTERÀ.
   ============================================================ */

const BossTruckGame = (() => {
  let canvas, ctx, state, onComplete, onFail, onProgress, onBoltHit;

  function init(_canvas, _ctx, opts = {}) {
    canvas = _canvas; ctx = _ctx;
    onComplete = opts.onComplete || (() => {});
    onFail = opts.onFail || (() => {});
    onProgress = opts.onProgress || (() => {});
    onBoltHit = opts.onBoltHit || (() => {});

    const W = canvas.width, H = canvas.height;
    const totalWheels = 8;
    const wheels = [];
    // 4 ruote a sinistra + 4 a destra del truck stilizzato
    const rowY = [H * 0.45, H * 0.72];
    const cols = [W*0.15, W*0.38, W*0.62, W*0.85];
    let idx = 0;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        wheels.push({
          x: cols[c],
          y: rowY[r],
          r: Math.min(W, H) * 0.09,
          bolts: 4,
          loosened: 0,
          done: false,
          angle: 0,
        });
      }
    }
    state = {
      wheels,
      currentWheelIdx: 0,
      totalBolts: totalWheels * 4,
      hitBolts: 0,
      done: false,
      introTime: 1.6, // banner SUPER TRUCK!
      bannerAlpha: 1,
      finishedAt: 0,
      shake: 0,
    };

    canvas.addEventListener('pointerdown', handlePointer);

    setInstructions('🚚 SUPER TRUCK! Tap su tutti i bulloni!');

    SFX.play('klaxon');
    FX.bigPopup('🚚 SUPER TRUCK!', '#ff7a00', 2.4);
    FX.rainbow(2.0);
    FX.chromatic(1.2);
  }

  function setInstructions(t) {
    const el = document.getElementById('instructions');
    if (el) el.textContent = t;
  }

  function handlePointer(e) {
    if (state.done || state.introTime > 0) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;

    // bersaglio: ruota corrente in lavorazione
    let target = state.wheels[state.currentWheelIdx];
    if (!target) return;
    const dist = Math.hypot(x - target.x, y - target.y);

    if (dist < target.r * 1.4) {
      target.loosened++;
      state.hitBolts++;
      onBoltHit(x, y);
      FX.spark(x, y, { color: '#ffb000', count: 14, speed: 280 });
      FX.popText(x, y - 20, '+50', { color: '#ffb000' });
      FX.screenShake(4);
      SFX.play('bolt');
      SFX.haptic(20);
      onProgress(state.hitBolts / state.totalBolts);

      if (target.loosened >= target.bolts) {
        target.done = true;
        FX.spark(target.x, target.y, { color: '#2ecc71', count: 30, speed: 380 });
        FX.popText(target.x, target.y, 'WHEEL!', { color: '#2ecc71', scale: 1.3 });
        FX.screenFlash('#2ecc71', 0.3);
        FX.screenShake(10);
        SFX.play('good');
        state.currentWheelIdx++;
        if (state.currentWheelIdx >= state.wheels.length) {
          // BOSS DEFEATED
          state.done = true;
          state.finishedAt = performance.now();
          FX.bigPopup('BOSS DEFEATED!', '#ffb000', 3.0);
          FX.rainbow(3.0);
          FX.confetti();
          FX.slowmo(0.8);
          SFX.play('boss_win');
          SFX.haptic([40, 30, 40, 30, 80]);
          setTimeout(onComplete, 1400);
        }
      }
    } else {
      // miss - shake + niente penalità seria
      FX.hitBad(x, y);
      SFX.play('bad');
      SFX.haptic(40);
    }
  }

  function update(dt) {
    if (state.introTime > 0) {
      state.introTime -= dt;
      state.bannerAlpha = Math.min(1, state.introTime);
      return;
    }
    state.wheels.forEach((w, i) => {
      if (i <= state.currentWheelIdx) w.angle += dt * (2 + i * 0.2);
    });
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    // sfondo officina + linee diagonali energiche
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#ff7a00');
    bg.addColorStop(0.3, '#1a1a1a');
    bg.addColorStop(1, '#0b0d10');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // strisce diagonali pulsanti
    const stripeOffset = (performance.now() / 8) % 40;
    ctx.fillStyle = 'rgba(255,176,0,0.08)';
    for (let i = -20; i < W + H; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i + stripeOffset, 0);
      ctx.lineTo(i + stripeOffset + H, H);
      ctx.lineTo(i + stripeOffset + H + 16, H);
      ctx.lineTo(i + stripeOffset + 16, 0);
      ctx.closePath();
      ctx.fill();
    }

    // corpo del truck
    ctx.fillStyle = '#1a222c';
    ctx.fillRect(W*0.05, H*0.35, W*0.9, H*0.05);
    ctx.fillRect(W*0.05, H*0.62, W*0.9, H*0.05);
    // cabina del truck (top)
    ctx.fillStyle = '#ff7a00';
    ctx.fillRect(W*0.05, H*0.2, W*0.9, H*0.15);
    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(W*0.08, H*0.22, W*0.84, H*0.09);
    ctx.fillStyle = '#ffb000';
    ctx.font = `bold ${Math.floor(W*0.06)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('SUPER TRUCK', W/2, H*0.29);

    // ruote
    state.wheels.forEach((wheel, i) => {
      const isCurrent = i === state.currentWheelIdx && !state.done;
      const isDone = wheel.done;

      ctx.save();
      ctx.translate(wheel.x, wheel.y);
      ctx.rotate(wheel.angle);

      // alone se è la ruota corrente
      if (isCurrent) {
        const pulse = 1 + Math.sin(performance.now()/180) * 0.15;
        ctx.fillStyle = 'rgba(255,176,0,0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, wheel.r * 1.6 * pulse, 0, Math.PI*2);
        ctx.fill();
      }

      // pneumatico
      ctx.fillStyle = isDone ? '#2ecc71' : '#0a0a0a';
      ctx.beginPath();
      ctx.arc(0, 0, wheel.r, 0, Math.PI*2);
      ctx.fill();
      // cerchione
      ctx.fillStyle = isDone ? '#84cc16' : '#c8ccd2';
      ctx.beginPath();
      ctx.arc(0, 0, wheel.r * 0.65, 0, Math.PI*2);
      ctx.fill();
      // bulloni
      const bolts = wheel.bolts;
      for (let b = 0; b < bolts; b++) {
        const a = (b/bolts) * Math.PI * 2;
        const bx = Math.cos(a) * wheel.r * 0.4;
        const by = Math.sin(a) * wheel.r * 0.4;
        const loose = b < wheel.loosened;
        ctx.fillStyle = loose ? '#3a4250' : '#dadde2';
        ctx.beginPath();
        ctx.arc(bx, by, wheel.r * 0.12, 0, Math.PI*2);
        ctx.fill();
      }
      // hub
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(0, 0, wheel.r * 0.15, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      // numero ruota
      ctx.fillStyle = isDone ? '#2ecc71' : (isCurrent ? '#ffb000' : '#666');
      ctx.font = `bold ${Math.floor(W*0.02)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`#${i+1}`, wheel.x, wheel.y + wheel.r + 24);
    });

    // intro banner
    if (state.introTime > 0) {
      ctx.fillStyle = `rgba(255,122,0,${state.bannerAlpha * 0.5})`;
      ctx.fillRect(0, H*0.42, W, H*0.16);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.floor(W*0.12)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🚚 BOSS!', W/2, H/2 + 30);
    }

    // hud progresso bulloni
    const pct = state.hitBolts / state.totalBolts;
    ctx.fillStyle = '#1a222c';
    ctx.fillRect(W*0.05, H*0.92, W*0.9, 14);
    ctx.fillStyle = '#ffb000';
    ctx.fillRect(W*0.05, H*0.92, W*0.9 * pct, 14);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(W*0.024)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Bulloni ${state.hitBolts}/${state.totalBolts}  ·  Ruota ${Math.min(state.wheels.length, state.currentWheelIdx+1)}/${state.wheels.length}`, W/2, H*0.97);
  }

  function destroy() {
    canvas.removeEventListener('pointerdown', handlePointer);
  }

  return { init, update, draw, destroy };
})();
