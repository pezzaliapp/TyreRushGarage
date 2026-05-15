/* ============================================================
   fx.js - JUICE engine. Particelle, popup numerici, screen shake,
   vignette, slow-motion, screen flash, confetti, trail di combo.
   Ogni mini-game chiama questi hook -> il gioco prende vita.
   ============================================================ */

const FX = (() => {
  let canvas, ctx;
  let particles = [];
  let popups = [];
  let shake = { x: 0, y: 0, magnitude: 0 };
  let flash = { color: '#fff', alpha: 0 };
  let vignette = 0;          // 0..1 rosso urgenza
  let vignetteColor = '231,76,60';
  let slowmoUntil = 0;
  let comboGlow = 0;         // 0..1 alone arancione
  let rainbowUntil = 0;
  let chromaticUntil = 0;

  function init(_canvas, _ctx) {
    canvas = _canvas;
    ctx = _ctx;
    reset();
  }

  function reset() {
    particles = []; popups = [];
    shake = { x: 0, y: 0, magnitude: 0 };
    flash = { color: '#fff', alpha: 0 };
    vignette = 0; comboGlow = 0;
    slowmoUntil = 0; rainbowUntil = 0; chromaticUntil = 0;
  }

  /* ===== Particelle (scintille, fumo, brillantini) ===== */
  function spark(x, y, opts = {}) {
    const count = opts.count ?? 14;
    const color = opts.color ?? '#ffb000';
    const speed = opts.speed ?? 280;
    const gravity = opts.gravity ?? 600;
    const life = opts.life ?? 0.6;
    const size = opts.size ?? 4;
    const spread = opts.spread ?? Math.PI * 2;
    const angle0 = opts.angle ?? 0;
    for (let i = 0; i < count; i++) {
      const ang = angle0 + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.8);
      particles.push({
        x, y,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v,
        gravity,
        life: life * (0.7 + Math.random() * 0.6),
        age: 0,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        type: opts.type ?? 'dot',
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 12,
      });
    }
  }

  function smoke(x, y, color = '180,180,180') {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x + (Math.random()-.5)*30,
        y,
        vx: (Math.random()-.5)*40,
        vy: -40 - Math.random()*60,
        gravity: -30,
        life: 1.2,
        age: 0,
        size: 16 + Math.random()*12,
        color: `rgba(${color},`,
        type: 'smoke',
      });
    }
  }

  function confetti() {
    const colors = ['#ff7a00', '#ffb000', '#2ecc71', '#3498db', '#e74c3c', '#a78bfa', '#ec4899'];
    for (let i = 0; i < 100; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: canvas.width * Math.random(),
        y: -10,
        vx: (Math.random()-.5)*150,
        vy: 100 + Math.random()*200,
        gravity: 250,
        life: 2.5,
        age: 0,
        size: 5 + Math.random()*5,
        color: c,
        type: 'rect',
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 20,
      });
    }
  }

  /* ===== Popup numerico ("+50 COMBO!") ===== */
  function popText(x, y, text, opts = {}) {
    popups.push({
      x, y,
      text,
      color: opts.color ?? '#ffb000',
      stroke: opts.stroke ?? '#000',
      scale: opts.scale ?? 1.0,
      drift: opts.drift ?? -120,
      age: 0,
      life: opts.life ?? 1.1,
      weight: opts.weight ?? 800,
      bounce: opts.bounce ?? true,
    });
  }

  /* ===== Screen shake, flash, vignette, slowmo ===== */
  function screenShake(magnitude = 12) {
    shake.magnitude = Math.max(shake.magnitude, magnitude);
  }
  function screenFlash(color = '#fff', alpha = 0.55) {
    flash.color = color; flash.alpha = Math.max(flash.alpha, alpha);
  }
  function setVignette(v, color) {
    vignette = Math.max(0, Math.min(1, v));
    if (color) vignetteColor = color;
  }
  function slowmo(seconds = 0.35) {
    slowmoUntil = performance.now() + seconds * 1000;
  }
  function isSlowmo() {
    return performance.now() < slowmoUntil;
  }
  function timeScale() {
    return isSlowmo() ? 0.25 : 1.0;
  }
  function setComboGlow(g) { comboGlow = Math.max(0, Math.min(1, g)); }
  function rainbow(seconds = 1.5) { rainbowUntil = performance.now() + seconds * 1000; }
  function chromatic(seconds = 0.6) { chromaticUntil = performance.now() + seconds * 1000; }

  /* ===== Update (chiamato dal loop principale) ===== */
  function update(dt) {
    // particelle
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.985;
      if (p.spin) p.rot += p.spin * dt;
    }
    // popup
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.age += dt;
      if (p.age >= p.life) { popups.splice(i, 1); continue; }
      p.y += p.drift * dt;
    }
    // shake
    if (shake.magnitude > 0) {
      shake.magnitude = Math.max(0, shake.magnitude - dt * 60);
      shake.x = (Math.random() - 0.5) * shake.magnitude * 2;
      shake.y = (Math.random() - 0.5) * shake.magnitude * 2;
    } else {
      shake.x = 0; shake.y = 0;
    }
    // flash
    if (flash.alpha > 0) flash.alpha = Math.max(0, flash.alpha - dt * 3.5);
    // combo glow decay
    if (comboGlow > 0) comboGlow = Math.max(0, comboGlow - dt * 0.3);
  }

  /* ===== Transform helpers (per shake globale) ===== */
  function beginTransform() {
    ctx.save();
    ctx.translate(shake.x, shake.y);
  }
  function endTransform() {
    ctx.restore();
  }

  /* ===== Disegno overlay (chiamato dopo ogni mini-game) ===== */
  function drawOverlay() {
    const W = canvas.width, H = canvas.height;

    // particelle
    particles.forEach(p => {
      const t = p.age / p.life;
      const alpha = 1 - t;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color.startsWith('rgba') ? p.color + (alpha * 0.6) + ')' : p.color;
      if (p.type === 'rect') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size*0.4, p.size*2, p.size*0.8);
        ctx.restore();
      } else if (p.type === 'smoke') {
        const r = p.size + p.age * 16;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI*2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    // popup
    popups.forEach(p => {
      const t = p.age / p.life;
      const alpha = t < 0.75 ? 1 : (1 - (t - 0.75) / 0.25);
      const bounce = p.bounce ? (1 + Math.sin(t * Math.PI) * 0.4) : 1;
      const scale = bounce * p.scale;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.floor(canvas.width * 0.038);
      ctx.font = `${p.weight} ${fontSize}px -apple-system, system-ui, sans-serif`;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = p.stroke;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    // combo glow (alone arancione che pulsa ai bordi)
    if (comboGlow > 0) {
      const grad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.7);
      grad.addColorStop(0, 'rgba(255,122,0,0)');
      grad.addColorStop(1, `rgba(255,122,0,${comboGlow*0.55})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // vignette urgenza (rossa pulsante)
    if (vignette > 0) {
      const pulse = 0.85 + Math.sin(performance.now() / 200) * 0.15;
      const grad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.65);
      grad.addColorStop(0, `rgba(${vignetteColor},0)`);
      grad.addColorStop(1, `rgba(${vignetteColor},${vignette * pulse * 0.7})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // rainbow overlay (sui colpi epici)
    if (performance.now() < rainbowUntil) {
      const remaining = (rainbowUntil - performance.now()) / 1500;
      const hue = (performance.now() / 6) % 360;
      ctx.fillStyle = `hsla(${hue}, 90%, 55%, ${remaining * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }

    // chromatic aberration cue (semplice: overlay bicolore sui bordi)
    if (performance.now() < chromaticUntil) {
      const r = (chromaticUntil - performance.now()) / 600;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255,0,80,${r*0.18})`;
      ctx.fillRect(0, 0, W/2, H);
      ctx.fillStyle = `rgba(0,180,255,${r*0.18})`;
      ctx.fillRect(W/2, 0, W/2, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    // flash globale
    if (flash.alpha > 0) {
      ctx.fillStyle = flash.color;
      ctx.globalAlpha = flash.alpha;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  /* ===== Hook combinati pronti all'uso ===== */
  function hitGood(x, y, value, comboLevel = 1) {
    const colors = ['#ffb000', '#ff9500', '#ff5e3a', '#e74c3c', '#a78bfa', '#22d3ee'];
    const c = colors[Math.min(colors.length - 1, comboLevel - 1)];
    spark(x, y, { color: c, count: 8 + comboLevel * 2, speed: 220 + comboLevel * 40 });
    popText(x, y - 30, `+${value}`, { color: c, scale: 0.9 + comboLevel * 0.08 });
    screenShake(3 + comboLevel * 1.5);
    if (comboLevel >= 3) screenFlash(c, 0.18);
    if (comboLevel >= 5) slowmo(0.18);
    if (comboLevel >= 8) { rainbow(0.7); chromatic(0.4); }
  }

  function hitBad(x, y) {
    spark(x, y, { color: '#e74c3c', count: 10, speed: 180 });
    popText(x, y - 30, 'MISS', { color: '#e74c3c', stroke: '#000' });
    screenShake(10);
    screenFlash('#e74c3c', 0.3);
  }

  function bigPopup(text, color = '#ffb000', size = 2.2) {
    popText(canvas.width / 2, canvas.height / 2, text, {
      color, scale: size, life: 1.6, drift: -40, weight: 900,
    });
    screenFlash(color, 0.45);
    screenShake(14);
    confetti();
    rainbow(1.2);
    chromatic(0.6);
  }

  return {
    init, reset,
    spark, smoke, confetti, popText,
    screenShake, screenFlash, setVignette,
    slowmo, isSlowmo, timeScale,
    setComboGlow, rainbow, chromatic,
    hitGood, hitBad, bigPopup,
    update, drawOverlay, beginTransform, endTransform,
    get canvas() { return canvas; },
    get ctx() { return ctx; },
  };
})();
