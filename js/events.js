/* ============================================================
   events.js - eventi random che spezzano la routine.
   Il GATTO ruba un bullone -> toccalo per recuperarlo.
   Il BLACKOUT spegne le luci per 4 secondi (vedi solo scintille).
   Il COMPRESSORE TROPPO POTENTE fa tremare lo schermo.
   ============================================================ */

const Events = (() => {
  let canvas, ctx;
  let active = null;             // evento corrente
  let cooldown = 0;              // sec prima di poter riattivare un evento
  let blackoutAlpha = 0;
  let listeners = { onCatStolen: () => {}, onCatRecovered: () => {}, onBlackoutStart: () => {}, onBlackoutEnd: () => {} };

  function init(_canvas, _ctx, opts = {}) {
    canvas = _canvas; ctx = _ctx;
    active = null; cooldown = 8;
    blackoutAlpha = 0;
    Object.assign(listeners, opts);
  }

  /* Triggera un evento random (chiamato dal main quando combo >= soglia o casualmente) */
  function maybeTrigger(combo = 1, difficulty = 1) {
    if (active || cooldown > 0) return false;
    // probabilità sale col combo (più sei in forma più cose vanno storte)
    const chance = 0.04 + Math.min(0.18, combo * 0.02);
    if (Math.random() > chance) return false;
    const roll = Math.random();
    if (roll < 0.45) trigger('cat');
    else if (roll < 0.75) trigger('blackout');
    else trigger('compressor');
    return true;
  }

  function trigger(type) {
    if (type === 'cat') {
      const W = canvas.width, H = canvas.height;
      active = {
        type: 'cat',
        x: -60,
        y: H * (0.55 + Math.random() * 0.2),
        vx: 320,
        captured: false,
        carryUntil: 0,
        boltStolen: true,
        bone: 16 + Math.random() * 12, // micro shake durante la corsa
      };
      listeners.onCatStolen(active);
      SFX.play('cat');
    }
    if (type === 'blackout') {
      active = { type: 'blackout', t: 0, dur: 3.8 };
      blackoutAlpha = 0.0;
      listeners.onBlackoutStart();
      SFX.play('blackout');
    }
    if (type === 'compressor') {
      active = { type: 'compressor', t: 0, dur: 2.5 };
      SFX.play('hiss');
      FX.screenShake(14);
    }
  }

  function update(dt) {
    if (cooldown > 0) cooldown = Math.max(0, cooldown - dt);
    if (!active) return;

    if (active.type === 'cat') {
      if (!active.captured) {
        active.x += active.vx * dt;
        if (active.x > canvas.width + 80) {
          // gatto è scappato col bullone
          active = null;
          cooldown = 10;
        }
      } else {
        // catturato -> animazione di vittoria
        active.carryUntil -= dt;
        if (active.carryUntil <= 0) {
          listeners.onCatRecovered();
          active = null;
          cooldown = 12;
        }
      }
    }

    if (active.type === 'blackout') {
      active.t += dt;
      const halfway = active.dur / 2;
      blackoutAlpha = active.t < halfway
        ? Math.min(0.92, active.t * 2.5)
        : Math.max(0, 0.92 - (active.t - halfway) * 1.8);
      if (active.t >= active.dur) {
        active = null;
        blackoutAlpha = 0;
        cooldown = 14;
        listeners.onBlackoutEnd();
      }
    }

    if (active.type === 'compressor') {
      active.t += dt;
      FX.screenShake(6 + Math.random() * 6);
      if (active.t >= active.dur) {
        active = null;
        cooldown = 12;
      }
    }
  }

  /* Toccato lo schermo: controlla se ho toccato il gatto */
  function handlePointer(x, y) {
    if (!active || active.type !== 'cat' || active.captured) return false;
    const dx = x - active.x;
    const dy = y - active.y;
    if (Math.hypot(dx, dy) < 75) {
      active.captured = true;
      active.carryUntil = 0.9;
      FX.spark(active.x, active.y, { color: '#ffb000', count: 24 });
      FX.popText(active.x, active.y - 40, 'GATTO PRESO!', { color: '#ffb000', scale: 1.4 });
      FX.screenShake(8);
      FX.screenFlash('#ffb000', 0.3);
      SFX.play('coin');
      SFX.haptic([15, 40, 15]);
      return true;
    }
    return false;
  }

  /* Disegno overlay (chiamato dopo i mini-games) */
  function draw() {
    if (active && active.type === 'cat') {
      drawCat(active);
    }
    if (blackoutAlpha > 0) {
      // sfondo nero + leggera vignette
      ctx.fillStyle = `rgba(0,0,0,${blackoutAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // banner "BLACKOUT!"
      if (active && active.type === 'blackout' && active.t < 0.8) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, active.t * 2.5);
        ctx.fillStyle = '#ffb000';
        ctx.textAlign = 'center';
        ctx.font = `bold ${Math.floor(canvas.width*0.08)}px sans-serif`;
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#000';
        ctx.strokeText('BLACKOUT!', canvas.width/2, canvas.height/2);
        ctx.fillText('BLACKOUT!', canvas.width/2, canvas.height/2);
        ctx.restore();
      }
    }
    if (active && active.type === 'compressor' && active.t < 0.8) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, 1 - active.t / 0.8);
      ctx.fillStyle = '#e74c3c';
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.floor(canvas.width*0.06)}px sans-serif`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000';
      ctx.strokeText('COMPRESSORE!', canvas.width/2, canvas.height*0.3);
      ctx.fillText('COMPRESSORE!', canvas.width/2, canvas.height*0.3);
      ctx.restore();
    }
  }

  function drawCat(c) {
    const s = 60;
    ctx.save();
    ctx.translate(c.x, c.y);
    if (c.captured) {
      const tt = 1 - c.carryUntil / 0.9;
      ctx.scale(1 + tt * 0.4, 1 + tt * 0.4);
      ctx.rotate(tt * Math.PI * 2);
    }
    // corpo
    ctx.fillStyle = '#2a2f37';
    ctx.fillRect(-s*0.55, -s*0.2, s, s*0.45);
    // testa
    ctx.beginPath();
    ctx.arc(s*0.45, 0, s*0.32, 0, Math.PI*2);
    ctx.fill();
    // orecchie
    ctx.beginPath();
    ctx.moveTo(s*0.32, -s*0.22);
    ctx.lineTo(s*0.42, -s*0.5);
    ctx.lineTo(s*0.5, -s*0.22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s*0.5, -s*0.22);
    ctx.lineTo(s*0.6, -s*0.5);
    ctx.lineTo(s*0.66, -s*0.22);
    ctx.closePath();
    ctx.fill();
    // coda
    ctx.strokeStyle = '#2a2f37';
    ctx.lineWidth = s*0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s*0.5, 0);
    ctx.quadraticCurveTo(-s*0.9, -s*0.4, -s*0.95, -s*0.65);
    ctx.stroke();
    // occhi gialli
    ctx.fillStyle = '#ffb000';
    ctx.beginPath();
    ctx.arc(s*0.4, -s*0.05, s*0.06, 0, Math.PI*2);
    ctx.arc(s*0.55, -s*0.05, s*0.06, 0, Math.PI*2);
    ctx.fill();
    // pupille
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(s*0.4, -s*0.05, s*0.02, 0, Math.PI*2);
    ctx.arc(s*0.55, -s*0.05, s*0.02, 0, Math.PI*2);
    ctx.fill();
    // bullone in bocca
    if (!c.captured) {
      ctx.fillStyle = '#dadde2';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i/6 * Math.PI*2;
        const px = s*0.7 + Math.cos(a) * s*0.1;
        const py = s*0.05 + Math.sin(a) * s*0.1;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    // hint "TOCCAMI!"
    if (!c.captured) {
      ctx.fillStyle = '#ffb000';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TOCCAMI!', 0, -s*0.7);
    }
    ctx.restore();
  }

  function isCompressor() { return active && active.type === 'compressor'; }
  function isBlackout()   { return active && active.type === 'blackout'; }

  return { init, maybeTrigger, trigger, update, draw, handlePointer, isCompressor, isBlackout, get active() { return active; } };
})();
