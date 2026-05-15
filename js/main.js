/* ============================================================
   main.js V2 - orchestratore CUSTOMER-CENTRIC.
   ------------------------------------------------------------
   Flow:
     menu -> game (customer queue)
       arriva cliente con personalità + frase
       1 mini-game (random) con eventuale sabotaggio
       patience timer (vignette rosso se < 30%, heartbeat audio)
       eventi random (gatto, blackout, compressore)
       ogni 8 clienti: BOSS TRUCK
       combo escala con juice crescente
   ============================================================ */

(() => {

  const App = {
    screen: 'splash',
    mode: null,
    canvas: null, ctx: null,
    raf: null, lastT: 0,
    paused: false,

    score: 0,
    combo: 1,
    livesLeft: 3,
    customerNumber: 0,
    bossesDefeated: 0,
    runStart: 0,
    runDuration: 0,
    difficulty: 1,
    perfectRun: true,

    customer: null,
    customerStartedAt: 0,
    serving: false,

    currentGame: null,
    currentGameName: '',
    miniSequence: ['smontagomme', 'equilibratura', 'gonfiaggio', 'assetto'],

    inBoss: false,
    bossInterval: 8,
    heartbeatActive: false,
  };

  const Modules = {
    smontagomme: SmontagommeGame,
    equilibratura: EquilibraturaGame,
    gonfiaggio: GonfiaggioGame,
    assetto: AssettoGame,
    bosstruck: BossTruckGame,
  };

  const LABELS = {
    smontagomme: 'Smontagomme',
    equilibratura: 'Equilibratura',
    gonfiaggio: 'Gonfiaggio',
    assetto: 'Assetto',
    bosstruck: '🚚 BOSS TRUCK',
  };

  const $ = (id) => document.getElementById(id);

  /* ============================ Screens ============================ */
  function bootSplash() { setTimeout(() => { showScreen('menu'); refreshMenu(); }, 1100); }

  function showScreen(name) {
    ['splash', 'menu', 'game', 'achievementsScreen', 'settingsScreen'].forEach(id => {
      const el = $(id); if (!el) return;
      el.classList.toggle('hidden', id !== name);
    });
    App.screen = name;
  }

  function refreshMenu() {
    $('topCoins').textContent = Storage.get('coins');
    $('topLevel').textContent = Storage.get('level');
    $('bestScore').textContent = Storage.get('bestScore');
  }

  /* ============================ Mode start ============================ */
  function startMode(mode) {
    App.mode = mode;
    App.score = 0;
    App.combo = 1;
    App.customerNumber = 0;
    App.bossesDefeated = 0;
    App.perfectRun = true;
    App.livesLeft = mode === 'arcade' ? 3 : (mode === 'career' ? 2 : 5);
    App.difficulty = mode === 'career' ? Storage.get('level') : 1;
    App.runStart = performance.now();
    App.runDuration = mode === 'arcade' ? 60 : (mode === 'career' ? 90 : 9999);

    showScreen('game');
    setupCanvas();
    spawnCustomer();
    loop(performance.now());
  }

  /* ============================ Canvas ============================ */
  function setupCanvas() {
    App.canvas = $('stage');
    App.ctx = App.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
    FX.init(App.canvas, App.ctx);
    Events.init(App.canvas, App.ctx, {
      onCatStolen: () => {},
      onCatRecovered: () => {
        App.score += 100;
        FX.bigPopup('+100 GATTO BANDITO!', '#ffb000', 1.6);
      },
      onBlackoutStart: () => {},
      onBlackoutEnd: () => {},
    });
  }

  function resizeCanvas() {
    if (!App.canvas) return;
    const wrap = App.canvas.parentElement;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    App.canvas.width = Math.floor(w * dpr);
    App.canvas.height = Math.floor(h * dpr);
    App.canvas.style.width = w + 'px';
    App.canvas.style.height = h + 'px';
  }

  /* ============================ Customer queue ============================ */
  function spawnCustomer() {
    App.customerNumber++;
    if (App.customerNumber > 1 && (App.customerNumber - 1) % App.bossInterval === 0) {
      startBoss();
      return;
    }

    const c = Customers.pick(App.difficulty);
    App.customer = c;
    App.customerStartedAt = performance.now();
    App.serving = false;

    renderCustomerCard(c);
    setMiniLabel(`Cliente #${App.customerNumber}`);
    SFX.play('customer_in');

    setTimeout(() => {
      if (App.customer === c && !App.serving && !App.inBoss) startServing();
    }, 2200);
  }

  function renderCustomerCard(c) {
    const card = $('customerCard');
    const bubble = $('customerBubble');
    const portrait = $('customerPortrait');
    const nameEl = $('customerName');
    const tipEl = $('customerTip');
    if (!card) return;
    card.classList.remove('hidden');
    nameEl.textContent = c.name;
    bubble.textContent = `"${c.hello}"`;
    tipEl.textContent = `💰 x${c.tipMult.toFixed(1)}`;
    tipEl.style.color = c.tipMult >= 2 ? '#ffb000' : (c.tipMult >= 1.4 ? '#2ecc71' : '#94a3b8');
    const pctx = portrait.getContext('2d');
    portrait.width = 80; portrait.height = 80;
    pctx.clearRect(0,0,80,80);
    Customers.drawFace(pctx, 40, 40, 75, c);
  }

  function startServing() {
    App.serving = true;
    const pick = App.miniSequence[Math.floor(Math.random() * App.miniSequence.length)];
    startMini(pick, { sabotage: Math.random() < App.customer.sabotageRate });
  }

  function startMini(name, opts = {}) {
    App.currentGameName = name;
    App.currentGame = Modules[name];
    setMiniLabel(LABELS[name] + (opts.sabotage ? ' ⚠️' : ''));

    App.currentGame.init(App.canvas, App.ctx, {
      difficulty: App.difficulty,
      sabotage: opts.sabotage,
      onPointerExtra: (x, y) => Events.handlePointer(x, y),
      onComplete: handleMiniComplete,
      onFail: handleMiniFail,
      onProgress: () => {},
    });
  }

  /* ============================ Boss flow ============================ */
  function startBoss() {
    App.inBoss = true;
    App.serving = true;
    App.customer = {
      name: 'Capo del Truck',
      face: '🚛',
      patience: 50,
      tipMult: 5.0,
      baseTip: 1000,
      hello: 'BAMBINI, ARRIVO IO!! 45 SECONDI O TI RIBALTO L\'OFFICINA!',
      win: 'BRAVO! Sei un PILOTA della gomma!',
      lose: 'PFFF, dilettante!',
      skin: '#cd9f7a', hair: '#1a1a1a', clothes: '#ff7a00',
      sabotageRate: 0,
    };
    App.customerStartedAt = performance.now();
    renderCustomerCard(App.customer);
    setMiniLabel('🚚 BOSS TRUCK INCOMING!');
    SFX.play('klaxon');
    SFX.startDrumLoop(2.0);
    setTimeout(() => { startMini('bosstruck', {}); }, 800);
  }

  function endBoss(win) {
    App.inBoss = false;
    App.bossesDefeated += win ? 1 : 0;
    SFX.stopDrumLoop();
    if (win) {
      App.score += 5000;
      Storage.set('coins', Storage.get('coins') + 500);
      FX.bigPopup('BOSS DEFEATED! +5000', '#ffb000', 2.6);
      FX.confetti();
      FX.rainbow(2.5);
      SFX.play('boss_win');
    }
    updateHUD();
    setTimeout(spawnCustomer, 1800);
  }

  /* ============================ Mini-game callbacks ============================ */
  function handleMiniComplete() {
    if (!App.currentGame) return;
    App.currentGame.destroy();

    if (App.currentGameName === 'bosstruck') {
      endBoss(true);
      return;
    }

    const c = App.customer;
    const elapsed = (performance.now() - App.customerStartedAt) / 1000;
    const tipTimeBonus = Math.max(0.5, (c.patience - elapsed) / c.patience);
    const baseTip = c.baseTip;
    const tipScale = c.tipMult * (0.7 + tipTimeBonus * 0.6);
    const comboScale = 1 + (App.combo - 1) * 0.3;
    const total = Math.floor(baseTip * tipScale * comboScale);

    App.score += total;
    App.combo = Math.min(10, App.combo + 1);
    SFX.setComboLevel(App.combo);
    Storage.setMax('maxCombo', App.combo);

    FX.bigPopup(`+${total}  "${c.win}"`, '#2ecc71', 1.4);
    FX.setComboGlow(Math.min(1, App.combo / 8));
    SFX.play('customer_happy');
    SFX.haptic([15, 40, 15]);
    SFX.play('combo_up', App.combo);

    if (App.combo >= 3) {
      FX.popText(App.canvas.width/2, App.canvas.height*0.3, `COMBO x${App.combo}!`, {
        color: App.combo >= 8 ? '#ec4899' : (App.combo >= 5 ? '#ffb000' : '#ff7a00'),
        scale: 1.2 + App.combo * 0.06, life: 1.4,
      });
    }

    Storage.bumpStat('tiresChanged', 4);
    Storage.bumpStat('carsCompleted', 1);

    App.customer = null;
    hideCustomerCard();
    updateHUD();

    Events.maybeTrigger(App.combo, App.difficulty);
    App.difficulty += 0.15;

    setTimeout(spawnCustomer, 900);
  }

  function handleMiniFail(hard = false) {
    App.combo = 1;
    SFX.setComboLevel(1);
    FX.setComboGlow(0);
    App.perfectRun = false;
    if (hard) {
      App.livesLeft--;
      if (App.customer) {
        FX.popText(App.canvas.width/2, App.canvas.height*0.3, `"${App.customer.lose}"`, {
          color: '#e74c3c', scale: 1.2, life: 1.8,
        });
        SFX.play('customer_angry');
      }
      SFX.haptic([60, 30, 60]);
      hideCustomerCard();
      updateHUD();
      if (App.currentGame) App.currentGame.destroy();
      if (App.livesLeft <= 0) { finishRound(false); return; }
      setTimeout(spawnCustomer, 1500);
    }
  }

  /* ============================ HUD ============================ */
  function setMiniLabel(text) {
    const el = $('miniGameLabel'); if (el) el.textContent = text;
  }
  function hideCustomerCard() { const el = $('customerCard'); if (el) el.classList.add('hidden'); }

  function updateHUD() {
    $('score').textContent = App.score;
    $('lives').textContent = App.livesLeft;
    $('combo').textContent = App.combo;
    $('carCount').textContent = App.customerNumber;
    const tEl = $('timer');
    if (App.mode === 'infinite') tEl.textContent = '∞';
    else tEl.textContent = Math.max(0, Math.floor(App.runDuration - (performance.now() - App.runStart)/1000));
  }

  /* ============================ Game loop ============================ */
  function loop(now) {
    const dt = Math.min(0.05, (now - App.lastT) / 1000 || 0.016);
    App.lastT = now;

    if (!App.paused) {
      if (App.mode !== 'infinite' && App.customer && App.serving) {
        const remaining = App.runDuration - (performance.now() - App.runStart) / 1000;
        if (remaining <= 0) { finishRound(true); return; }
      }

      if (App.customer && App.serving && !App.inBoss) {
        const elapsed = (performance.now() - App.customerStartedAt) / 1000;
        const ratio = 1 - elapsed / App.customer.patience;
        if (ratio < 0.35 && !App.heartbeatActive) {
          SFX.startHeartbeat(); App.heartbeatActive = true;
        } else if (ratio >= 0.5 && App.heartbeatActive) {
          SFX.stopHeartbeat(); App.heartbeatActive = false;
        }
        if (App.heartbeatActive) SFX.setHeartbeatBPM(80 + (1 - ratio) * 80);
        FX.setVignette(Math.max(0, 0.5 - ratio));
        if (ratio <= 0) handleMiniFail(true);
      } else {
        FX.setVignette(0);
      }

      FX.update(dt);
      Events.update(dt);

      const ts = FX.timeScale();
      if (App.currentGame) {
        FX.beginTransform();
        App.currentGame.update(dt * ts);
        App.currentGame.draw();
        FX.endTransform();
      }

      Events.draw();
      FX.drawOverlay();

      if ((now | 0) % 4 === 0) updateHUD();
    }

    App.raf = requestAnimationFrame(loop);
  }

  /* ============================ Finish ============================ */
  function finishRound(win) {
    SFX.stopAll();
    App.heartbeatActive = false;
    if (App.currentGame) App.currentGame.destroy();
    if (App.raf) cancelAnimationFrame(App.raf);
    App.raf = null;
    App.currentGame = null;
    FX.reset();

    const coinsEarned = Math.floor(App.score / 10);
    Storage.update({
      coins: Storage.get('coins') + coinsEarned,
      bestScore: Math.max(Storage.get('bestScore'), App.score),
    });
    Storage.bumpStat('totalGames', 1);

    if (App.mode === 'career' && App.score >= 2000) {
      Storage.set('level', Storage.get('level') + 1);
      Storage.set('careerProgress', Storage.get('careerProgress') + 1);
      SFX.play('level');
    } else {
      win ? SFX.play('win') : SFX.play('lose');
    }

    if (App.perfectRun) Storage.bumpStat('perfectGames', 1);

    const newAch = Achievements.checkAll();
    newAch.forEach(a => showToast(`🏆 ${a.title}`));

    showOverlay({
      title: win ? '🏁 Turno chiuso!' : '💥 Fine giornata',
      bodyHtml: `
        <p>Score: <b>${App.score}</b></p>
        <p>Clienti serviti: <b>${App.customerNumber - (App.inBoss ? 1 : 0)}</b></p>
        <p>Boss truck battuti: <b>${App.bossesDefeated}</b></p>
        <p>Coin guadagnati: <b>+${coinsEarned}</b></p>
        ${App.combo >= 5 ? `<p>🔥 Combo MAX: <b>x${App.combo}</b></p>` : ''}
      `,
      resumeText: 'Ancora!',
      onResume: () => { hideOverlay(); startMode(App.mode); },
      hideRestart: true,
    });
  }

  function quitToMenu() {
    SFX.stopAll();
    App.heartbeatActive = false;
    if (App.currentGame) App.currentGame.destroy();
    if (App.raf) cancelAnimationFrame(App.raf);
    App.raf = null;
    App.currentGame = null;
    App.paused = false;
    FX.reset();
    hideCustomerCard();
    showScreen('menu');
    refreshMenu();
  }

  /* ============================ Overlay ============================ */
  function showOverlay({ title, bodyHtml, onResume, resumeText='Riprendi', hideRestart=true }) {
    $('overlayTitle').textContent = title;
    $('overlayBody').innerHTML = bodyHtml;
    $('overlayResume').textContent = resumeText;
    $('overlay').classList.remove('hidden');
    $('overlayResume').onclick = onResume;
    $('overlayRestart').classList.toggle('hidden', hideRestart);
    $('overlayRestart').onclick = () => { hideOverlay(); startMode(App.mode); };
    $('overlayQuit').onclick = () => { hideOverlay(); quitToMenu(); };
  }
  function hideOverlay() { $('overlay').classList.add('hidden'); }

  function pauseGame() {
    if (App.paused) return;
    App.paused = true;
    SFX.stopAll();
    showOverlay({
      title: '⏸ Pausa',
      bodyHtml: `<p>Score corrente: <b>${App.score}</b></p>`,
      onResume: () => { App.paused = false; hideOverlay(); },
      hideRestart: false,
    });
  }

  let toastTimer = null;
  function showToast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 1600);
  }

  /* ============================ Achievements UI ============================ */
  function renderAchievements() {
    const list = $('achList');
    list.innerHTML = '';
    Achievements.getAll().forEach(a => {
      const unlocked = Storage.isUnlocked(a.id);
      const div = document.createElement('div');
      div.className = `ach-card ${unlocked ? 'unlocked' : 'locked'}`;
      div.innerHTML = `
        <div class="ach-icon">${a.icon}</div>
        <div class="ach-info">
          <div class="ach-title">${a.title}</div>
          <div class="ach-desc">${a.desc}</div>
        </div>
        <div>${unlocked ? '✅' : '🔒'}</div>
      `;
      list.appendChild(div);
    });
  }

  /* ============================ Settings UI ============================ */
  function bindSettings() {
    const s = Storage.get('settings');
    $('setAudio').checked = s.audio;
    $('setHaptic').checked = s.haptic;
    $('setFX').checked = s.fx;
    $('setAudio').addEventListener('change', e => { s.audio = e.target.checked; Storage.set('settings', s); SFX.setMuted(!s.audio); });
    $('setHaptic').addEventListener('change', e => { s.haptic = e.target.checked; Storage.set('settings', s); });
    $('setFX').addEventListener('change', e => { s.fx = e.target.checked; Storage.set('settings', s); });
    $('btnReset').addEventListener('click', () => {
      if (confirm('Resettare TUTTI i progressi?')) { Storage.reset(); refreshMenu(); showToast('Progressi azzerati'); }
    });
  }

  /* ============================ Events binding ============================ */
  function bindEvents() {
    document.querySelectorAll('.mode-card').forEach(btn => {
      btn.addEventListener('click', () => { SFX.play('click'); startMode(btn.dataset.mode); });
    });
    $('btnAchievements').addEventListener('click', () => { SFX.play('click'); renderAchievements(); showScreen('achievementsScreen'); });
    $('btnSettings').addEventListener('click', () => { SFX.play('click'); showScreen('settingsScreen'); });
    $('btnAchBack').addEventListener('click', () => { SFX.play('click'); showScreen('menu'); });
    $('btnSetBack').addEventListener('click', () => { SFX.play('click'); showScreen('menu'); });
    $('btnBack').addEventListener('click', () => { if (confirm('Uscire dalla partita?')) quitToMenu(); });
    $('btnPause').addEventListener('click', pauseGame);

    let installPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); installPrompt = e; $('btnInstall').classList.remove('hidden');
    });
    $('btnInstall').addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      $('btnInstall').classList.add('hidden');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && App.screen === 'game' && App.currentGame && !App.paused) pauseGame();
    });
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW error', err));
      });
    }
  }

  function init() {
    SFX.init();
    SFX.setMuted(!Storage.get('settings').audio);
    bindEvents();
    bindSettings();
    registerSW();
    bootSplash();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
