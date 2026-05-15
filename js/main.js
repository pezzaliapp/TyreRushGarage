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
    alive: false,            // BUG FIX V3: flag per fermare il loop in modo affidabile
    timers: [],              // BUG FIX V3: tracking timer per cancellarli a quit/finish
    canvasReady: false,      // BUG FIX V3: listener resize installati una sola volta

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
    manopump: ManopumpGame, // V3
  };

  const LABELS = {
    smontagomme: 'Smontagomme',
    equilibratura: 'Equilibratura',
    gonfiaggio: 'Gonfiaggio',
    assetto: 'Assetto',
    bosstruck: '🚚 BOSS TRUCK',
    manopump: '💨 Pompa Manuale',
  };

  const $ = (id) => document.getElementById(id);

  // BUG FIX V3: timer tracciati, cancellabili in massa
  function laterMs(fn, ms) {
    const id = setTimeout(() => {
      App.timers = App.timers.filter(t => t !== id);
      fn();
    }, ms);
    App.timers.push(id);
    return id;
  }
  function clearAllTimers() {
    App.timers.forEach(id => clearTimeout(id));
    App.timers = [];
  }

  /* ============================ Screens ============================ */
  function bootSplash() { setTimeout(() => { showScreen('menu'); refreshMenu(); }, 1100); }

  function showScreen(name) {
    ['splash', 'menu', 'game', 'achievementsScreen', 'settingsScreen',
     'levelSelectScreen', 'shopScreen', 'pokedexScreen'].forEach(id => {
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
  function startMode(mode, levelId = null) {
    App.mode = mode;
    App.level = (mode === 'campaign' && levelId) ? Levels.get(levelId) : null;
    App.upgradeMods = Upgrades.applyAll();      // V3: legge gli upgrade posseduti

    App.score = 0;
    App.combo = 1;
    App.customerNumber = 0;
    App.bossesDefeated = 0;
    App.perfectRun = true;

    // vite & durata variano per modalità (con bonus da upgrade)
    let baseLives = mode === 'arcade' ? 3 : (mode === 'campaign' ? 2 : 5);
    let baseDuration = mode === 'arcade' ? 60 : (mode === 'campaign' ? (App.level?.duration || 90) : 9999);

    App.livesLeft = baseLives + (App.upgradeMods.extraLives || 0);
    App.runDuration = baseDuration + (App.upgradeMods.durationBonus || 0);
    App.difficulty = mode === 'campaign' ? Math.max(1, App.level.id * 0.4) : 1;
    App.runStart = performance.now();

    // BUG FIX V3: ferma loop precedente e cancella timer pendenti prima di ricominciare
    App.alive = false;
    if (App.raf) cancelAnimationFrame(App.raf);
    App.raf = null;
    clearAllTimers();
    if (App.currentGame) App.currentGame.destroy();
    App.currentGame = null;
    FX.reset();
    SFX.stopAll();
    App.heartbeatActive = false;

    showScreen('game');
    setupCanvas();
    App.alive = true;

    // Special: black-out permanente → gestito da drawLevelSpecial nel loop
    spawnCustomer();
    App.lastT = performance.now();
    loop(App.lastT);
  }

  /* ============================ Canvas ============================ */
  function setupCanvas() {
    App.canvas = $('stage');
    App.ctx = App.canvas.getContext('2d');
    resizeCanvas();
    // BUG FIX V3: i listener resize si installano UNA volta sola, non per ogni partita
    if (!App.canvasReady) {
      window.addEventListener('resize', resizeCanvas);
      window.addEventListener('orientationchange', resizeCanvas);
      App.canvasReady = true;
    }
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

    // CAMPAGNA: se ho raggiunto i clienti del livello, finisco vittoriosamente
    if (App.level && App.customerNumber > App.level.customers) {
      finishRound(true);
      return;
    }

    // forceBossLast: livello 5 → ultimo cliente è il boss
    if (App.level && App.level.special === 'forceBossLast' &&
        App.customerNumber === App.level.customers) {
      startBoss(); return;
    }
    // megaTruck: livello 15 → unico cliente è il MEGA TRUCK 12 ruote
    if (App.level && App.level.special === 'megaTruck' && App.customerNumber === 1) {
      startBoss(true); return;
    }
    // miniPool = ['bosstruck'] (truck day): tutto truck
    if (App.level && Array.isArray(App.level.miniPool) && App.level.miniPool[0] === 'bosstruck') {
      startBoss(); return;
    }

    // ARCADE/INFINITE: boss ogni 8 clienti
    if (!App.level && App.customerNumber > 1 && (App.customerNumber - 1) % App.bossInterval === 0) {
      startBoss(); return;
    }

    let c = Customers.pick(App.difficulty);

    // Special: Rally Stage → tutti piloti
    if (App.level && App.level.special === 'rallyOnly') {
      const all = Customers.ARCHETYPES;
      const rally = all.find(a => a.id === 'rally');
      if (rally) c = JSON.parse(JSON.stringify(rally));
      c.hello = rally.hello[Math.floor(Math.random() * rally.hello.length)];
      c.win   = rally.win[Math.floor(Math.random() * rally.win.length)];
      c.lose  = rally.lose[Math.floor(Math.random() * rally.lose.length)];
      c.currentPatience = c.patience;
    }

    // Special: Inspector → uno dei clienti è ispettore (di solito il 3° o 4°)
    if (App.level && App.level.special === 'inspector' &&
        App.customerNumber === Math.ceil(App.level.customers / 2)) {
      c = {
        id: 'inspector', name: '🕵️ Ispettore Anonimo', face: '🕵️',
        skin: '#dfc9a8', hair: '#0b0d10', clothes: '#0891b2',
        patience: 40, currentPatience: 40, tipMult: 4.0, baseTip: 400, sabotageRate: 0,
        hello: 'Buongiorno. Sono qui per un controllo casuale.',
        win:   '*estrae taccuino* Lavoro... approvato.',
        lose:  'Multa di 500 coin. Si arrangi.',
        isInspector: true,
      };
    }

    // Special: noMistakes (VIP) → cliente sempre VIP
    if (App.level && App.level.special === 'noMistakes') {
      c.tipMult = Math.max(c.tipMult, 10);
      c.baseTip = 500;
      c.name = '👑 ' + c.name;
      c.isVIP = true;
    }

    // applica patience moltiplicatore livello + upgrade
    const patienceMod = (App.level?.patienceMult || 1) * (App.upgradeMods?.patienceBoost || 1);
    c.patience = c.patience * patienceMod + (App.assistantBonusPending || 0);
    c.currentPatience = c.patience;
    App.assistantBonusPending = 0;

    App.customer = c;
    App.customerStartedAt = performance.now();
    App.serving = false;

    // POKEDEX: traccia clienti incontrati (solo archetipi)
    if (c.id && !c.isInspector) {
      const met = Storage.get('metCustomers') || [];
      if (!met.includes(c.id)) {
        met.push(c.id);
        Storage.set('metCustomers', met);
      }
    }

    renderCustomerCard(c);
    setMiniLabel(`Cliente #${App.customerNumber}${App.level ? '/' + App.level.customers : ''}`);
    SFX.play('customer_in');

    laterMs(() => {
      if (App.customer === c && !App.serving && !App.inBoss && App.alive) startServing();
    }, 2000);
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
    let pool = App.miniSequence;
    if (App.level) {
      if (Array.isArray(App.level.miniPool)) pool = App.level.miniPool.slice();
    }
    let pick = pool[Math.floor(Math.random() * pool.length)];
    // Special: Compressore guasto → gonfiaggio diventa manopump
    if (App.level && App.level.special === 'manualPump' && pick === 'gonfiaggio') {
      pick = 'manopump';
    }
    const sabRate = Math.max(App.customer.sabotageRate, App.level?.sabotageRate || 0);
    startMini(pick, { sabotage: Math.random() < sabRate });
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
  function startBoss(isMega = false) {
    App.inBoss = true;
    App.bossIsMega = isMega;
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
    laterMs(() => {
      if (!App.alive) return;
      startMini('bosstruck', { mega: isMega });
    }, 800);
  }

  function endBoss(win) {
    App.inBoss = false;
    SFX.stopDrumLoop();
    if (win) {
      App.bossesDefeated++;
      Storage.bumpStat('bossesDefeated', 1);
      const reward = App.bossIsMega ? 15000 : 5000;
      const coinReward = App.bossIsMega ? 2000 : 500;
      App.score += reward;
      const cur = Storage.get('coins') || 0;
      Storage.set('coins', cur + coinReward);
      Storage.set('totalEarned', (Storage.get('totalEarned') || 0) + coinReward);
      FX.bigPopup(`BOSS DEFEATED! +${reward}`, '#ffb000', 2.6);
      FX.confetti();
      FX.rainbow(2.5);
      SFX.play('boss_win');
    }
    updateHUD();
    // Se è l'ultimo cliente del livello, finiamo
    if (App.level && App.customerNumber >= App.level.customers) {
      laterMs(() => finishRound(true), 1800);
    } else {
      laterMs(spawnCustomer, 1800);
    }
  }

  /* ============================ Mini-game callbacks ============================ */
  function handleMiniComplete() {
    if (!App.currentGame) return;
    App.currentGame.destroy();
    App.currentGame = null; // BUG FIX V3: evita ghost frames sullo stato vecchio

    if (App.currentGameName === 'bosstruck') {
      endBoss(true);
      return;
    }

    const c = App.customer;
    const elapsed = (performance.now() - App.customerStartedAt) / 1000;
    const tipTimeBonus = Math.max(0.5, (c.patience - elapsed) / c.patience);
    const baseTip = c.baseTip * (App.upgradeMods?.tipBoost || 1);
    let tipScale = c.tipMult * (0.7 + tipTimeBonus * 0.6) * (App.level?.tipMult || 1);
    if ((c.isVIP || c.tipMult >= 2) && App.upgradeMods?.vipTipMult) tipScale *= App.upgradeMods.vipTipMult;
    const comboScale = (1 + (App.combo - 1) * 0.3) * (App.upgradeMods?.comboMult || 1);
    const total = Math.floor(baseTip * tipScale * comboScale);
    // bonus assistente: applica al prossimo cliente
    if (App.upgradeMods?.assistantBonus) App.assistantBonusPending = App.upgradeMods.assistantBonus;
    // cassa automatica: +50 coin per cliente
    if (App.upgradeMods?.coinPerCustomer) {
      const coinsNow = Storage.get('coins') + App.upgradeMods.coinPerCustomer;
      Storage.set('coins', coinsNow);
      Storage.set('totalEarned', (Storage.get('totalEarned') || 0) + App.upgradeMods.coinPerCustomer);
    }

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

    laterMs(spawnCustomer, 900);
  }

  function handleMiniFail(hard = false) {
    App.combo = 1;
    SFX.setComboLevel(1);
    FX.setComboGlow(0);
    App.perfectRun = false;
    // VIP DAY: anche un soft miss costa caro
    if (App.level && App.level.special === 'noMistakes' && !hard) {
      App.livesLeft = 0;
      hard = true;
    }
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
      if (App.currentGame) { App.currentGame.destroy(); App.currentGame = null; }
      if (App.livesLeft <= 0) { finishRound(false); return; }
      laterMs(spawnCustomer, 1500);
    }
  }

  /* ============================ Level specials drawing ============================ */
  // Tracking pointer per spotlight
  App.pointer = { x: 0, y: 0 };
  document.addEventListener('pointermove', (e) => {
    const c = App.canvas;
    if (!c) return;
    const r = c.getBoundingClientRect();
    App.pointer.x = (e.clientX - r.left) * (c.width / r.width);
    App.pointer.y = (e.clientY - r.top)  * (c.height / r.height);
  });

  function drawLevelSpecial() {
    if (!App.level || !App.ctx) return;
    const ctx = App.ctx;
    const W = App.canvas.width, H = App.canvas.height;

    if (App.level.special === 'spotlight') {
      // overlay nero con foro circolare attorno al pointer
      const r = Math.min(W, H) * 0.28;
      const px = App.pointer.x || W/2;
      const py = App.pointer.y || H/2;
      const grad = ctx.createRadialGradient(px, py, r * 0.55, px, py, r);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      // ring esterno fisso per fare buio sui bordi
      ctx.fillRect(0, 0, W, py - r);
      ctx.fillRect(0, py + r, W, H - (py + r));
    }

    if (App.level.special === 'permaBlackout') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, W, H);
      // sottile glow sul pointer
      const px = App.pointer.x || W/2;
      const py = App.pointer.y || H/2;
      const r = Math.min(W, H) * 0.12;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, 'rgba(255,176,0,0.55)');
      grad.addColorStop(1, 'rgba(255,176,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    if (App.level.special === 'chaos') {
      // più probabilità di triggerare eventi
      if (Math.random() < 0.005) Events.maybeTrigger(App.combo + 5, App.difficulty);
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
    if (!App.alive) return; // BUG FIX V3: il loop muore davvero quando il round finisce
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

      // SPECIAL livello: overlay aggiuntivi sopra al disegno del mini-game
      drawLevelSpecial();

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
    App.alive = false; // BUG FIX V3: stop loop in modo dichiarativo
    clearAllTimers();
    if (App.currentGame) App.currentGame.destroy();
    if (App.raf) cancelAnimationFrame(App.raf);
    App.raf = null;
    App.currentGame = null;
    FX.reset();

    const coinsEarned = Math.floor(App.score / 10);
    Storage.update({
      coins: Storage.get('coins') + coinsEarned,
      bestScore: Math.max(Storage.get('bestScore'), App.score),
      totalEarned: (Storage.get('totalEarned') || 0) + coinsEarned,
    });
    Storage.bumpStat('totalGames', 1);

    // CAMPAGNA: registra stelle e best per livello
    let stars = 0;
    if (App.level && win) {
      stars = Levels.starsForScore(App.level, App.score);
      Levels.recordStars(App.level.id, stars, App.score);
      if (stars >= 1) Storage.set('level', Math.max(Storage.get('level'), App.level.id + 1));
      SFX.play('level');
    } else {
      win ? SFX.play('win') : SFX.play('lose');
    }

    if (App.perfectRun) Storage.bumpStat('perfectGames', 1);

    const newAch = Achievements.checkAll();
    newAch.forEach(a => showToast(`🏆 ${a.title}`));

    const starsRow = App.level && win
      ? `<p style="font-size:1.6rem">${'⭐'.repeat(stars)}${'☆'.repeat(3-stars)}</p>`
      : '';

    showOverlay({
      title: win ? (App.level ? `${App.level.emoji} Livello ${App.level.id} completato!` : '🏁 Turno chiuso!') : '💥 Fine giornata',
      bodyHtml: `
        ${starsRow}
        <p>Score: <b>${App.score}</b></p>
        <p>Clienti serviti: <b>${App.customerNumber - (App.inBoss ? 1 : 0)}</b></p>
        <p>Boss truck battuti: <b>${App.bossesDefeated}</b></p>
        <p>Coin guadagnati: <b>+${coinsEarned}</b></p>
        ${App.combo >= 5 ? `<p>🔥 Combo MAX: <b>x${App.combo}</b></p>` : ''}
      `,
      resumeText: App.level ? '📋 Mappa livelli' : 'Ancora!',
      onResume: () => {
        hideOverlay();
        if (App.level) {
          quitToMenu();
          showScreen('levelSelectScreen');
          renderLevelSelect();
        } else {
          startMode(App.mode);
        }
      },
      hideRestart: false,
    });
  }

  function quitToMenu() {
    SFX.stopAll();
    App.heartbeatActive = false;
    App.alive = false;
    clearAllTimers();
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

  /* ============================ Level Select UI ============================ */
  function renderLevelSelect() {
    const list = $('levelList');
    if (!list) return;
    list.innerHTML = '';
    Levels.getAll().forEach(lvl => {
      const unlocked = Levels.isUnlocked(lvl.id);
      const stars = (Storage.get('levelStars') || {})[lvl.id] || 0;
      const best  = (Storage.get('levelBest')  || {})[lvl.id] || 0;
      const card = document.createElement('div');
      card.className = `level-card ${unlocked ? '' : 'locked'}`;
      card.innerHTML = `
        <div class="level-num">${lvl.id}</div>
        <div class="level-emoji">${lvl.emoji}</div>
        <div class="level-info">
          <div class="level-name">${lvl.name}</div>
          <div class="level-desc">${unlocked ? lvl.desc : '🔒 Sblocca il livello precedente'}</div>
          <div class="level-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3-stars)} ${best ? `· best ${best}` : ''}</div>
        </div>
        <button class="level-play" data-id="${lvl.id}" ${unlocked ? '' : 'disabled'}>${unlocked ? '▶' : '🔒'}</button>
      `;
      list.appendChild(card);
    });
    list.querySelectorAll('.level-play').forEach(btn => {
      btn.addEventListener('click', () => {
        SFX.init(); SFX.play('click');
        const id = parseInt(btn.dataset.id, 10);
        if (Levels.isUnlocked(id)) startMode('campaign', id);
      });
    });
    const tot = $('totalStars');
    if (tot) tot.textContent = `${Levels.totalStars()}/45`;
  }

  /* ============================ Shop UI ============================ */
  function renderShop() {
    const list = $('shopList');
    if (!list) return;
    list.innerHTML = '';
    const coins = Storage.get('coins') || 0;
    $('shopCoins').textContent = coins;
    Upgrades.getAll().forEach(u => {
      const owned = Upgrades.isOwned(u.id);
      const card = document.createElement('div');
      card.className = `shop-card ${owned ? 'owned' : (coins >= u.cost ? 'affordable' : 'expensive')}`;
      card.innerHTML = `
        <div class="shop-icon">${u.icon}</div>
        <div class="shop-info">
          <div class="shop-name">${u.name}</div>
          <div class="shop-desc">${u.desc}</div>
        </div>
        <button class="shop-buy" data-id="${u.id}" ${owned ? 'disabled' : ''}>${owned ? '✅' : `${u.cost} 💰`}</button>
      `;
      list.appendChild(card);
    });
    list.querySelectorAll('.shop-buy').forEach(btn => {
      btn.addEventListener('click', () => {
        SFX.init();
        const id = btn.dataset.id;
        const res = Upgrades.buy(id);
        if (res.ok) {
          SFX.play('coin');
          showToast(`Sbloccato: ${res.upgrade.name}`);
        } else if (res.reason === 'broke') {
          SFX.play('bad');
          showToast('Non hai abbastanza coin!');
        }
        renderShop();
        refreshMenu();
      });
    });
  }

  /* ============================ Pokédex UI ============================ */
  function renderPokedex() {
    const list = $('pokedexList');
    if (!list) return;
    list.innerHTML = '';
    const met = Storage.get('metCustomers') || [];
    Customers.ARCHETYPES.forEach(a => {
      const found = met.includes(a.id);
      const card = document.createElement('div');
      card.className = `dex-card ${found ? '' : 'unfound'}`;
      const canvas = document.createElement('canvas');
      canvas.width = 80; canvas.height = 80;
      card.appendChild(canvas);
      if (found) {
        const c = canvas.getContext('2d');
        Customers.drawFace(c, 40, 40, 75, a);
      } else {
        const c = canvas.getContext('2d');
        c.fillStyle = '#1a222c';
        c.fillRect(0, 0, 80, 80);
        c.fillStyle = '#94a3b8';
        c.font = 'bold 36px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('?', 40, 45);
      }
      const info = document.createElement('div');
      info.className = 'dex-info';
      info.innerHTML = found
        ? `<div class="dex-name">${a.name}</div>
           <div class="dex-stat">💰 x${a.tipMult.toFixed(1)} · ⏱ ${a.patience}s</div>
           <div class="dex-quote">"${a.hello[0]}"</div>`
        : `<div class="dex-name">???</div>
           <div class="dex-stat">Cliente sconosciuto</div>
           <div class="dex-quote">Incontralo in una run.</div>`;
      card.appendChild(info);
      list.appendChild(card);
    });
    const tot = $('dexCount');
    if (tot) tot.textContent = `${met.length}/${Customers.ARCHETYPES.length}`;
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
      btn.addEventListener('click', () => {
        // BUG FIX V3 iOS: assicura il resume dell'AudioContext dentro la user gesture
        SFX.init(); SFX.play('click');
        startMode(btn.dataset.mode);
      });
    });
    $('btnAchievements').addEventListener('click', () => { SFX.play('click'); renderAchievements(); showScreen('achievementsScreen'); });
    $('btnSettings').addEventListener('click', () => { SFX.play('click'); showScreen('settingsScreen'); });
    $('btnAchBack').addEventListener('click', () => { SFX.play('click'); showScreen('menu'); refreshMenu(); });
    $('btnSetBack').addEventListener('click', () => { SFX.play('click'); showScreen('menu'); refreshMenu(); });

    // V3 nuovi pulsanti
    const bCamp = $('btnCampaign');
    if (bCamp) bCamp.addEventListener('click', () => { SFX.init(); SFX.play('click'); renderLevelSelect(); showScreen('levelSelectScreen'); });
    const bShop = $('btnShop');
    if (bShop) bShop.addEventListener('click', () => { SFX.init(); SFX.play('click'); renderShop(); showScreen('shopScreen'); });
    const bDex = $('btnPokedex');
    if (bDex) bDex.addEventListener('click', () => { SFX.init(); SFX.play('click'); renderPokedex(); showScreen('pokedexScreen'); });
    const bLvlBack = $('btnLvlBack');
    if (bLvlBack) bLvlBack.addEventListener('click', () => { SFX.play('click'); showScreen('menu'); refreshMenu(); });
    const bShopBack = $('btnShopBack');
    if (bShopBack) bShopBack.addEventListener('click', () => { SFX.play('click'); showScreen('menu'); refreshMenu(); });
    const bDexBack = $('btnDexBack');
    if (bDexBack) bDexBack.addEventListener('click', () => { SFX.play('click'); showScreen('menu'); refreshMenu(); });
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
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW error', err));
    });
    // V3: forza reload se la nuova SW prende il controllo (per i client già aperti)
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'sw-updated') {
        showToast('🔄 Nuova versione disponibile');
      }
    });
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
