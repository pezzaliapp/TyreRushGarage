/* ============================================================
   main.js - orchestratore di gioco
   ------------------------------------------------------------
   - State machine: splash → menu → game → overlay
   - 3 modalità: arcade, career, infinite
   - Sequenza per "auto": smontagomme → equilibratura → gonfiaggio → assetto
   - Loop a 60fps via requestAnimationFrame
   - Resize canvas con DPR
   - PWA install prompt
   ============================================================ */

(() => {
  // ===== State =====
  const App = {
    screen: 'splash',
    mode: null,                 // arcade / career / infinite
    canvas: null,
    ctx: null,
    raf: null,
    lastT: 0,
    paused: false,

    // round state
    currentGame: null,          // module corrente
    currentGameName: '',
    miniIndex: 0,
    miniSequence: ['smontagomme', 'equilibratura', 'gonfiaggio', 'assetto'],
    carCount: 0,
    livesLeft: 3,
    score: 0,
    combo: 1,
    perfectRun: true,
    timeLeft: 30,
    timer: null,
    difficulty: 1,
  };

  const Modules = {
    smontagomme: SmontagommeGame,
    equilibratura: EquilibraturaGame,
    gonfiaggio: GonfiaggioGame,
    assetto: AssettoGame,
  };

  const LABELS = {
    smontagomme: 'Smontagomme',
    equilibratura: 'Equilibratura',
    gonfiaggio: 'Gonfiaggio',
    assetto: 'Assetto',
  };

  // ===== Riferimenti DOM =====
  const $ = (id) => document.getElementById(id);

  // ===== Splash → Menu =====
  function bootSplash() {
    setTimeout(() => {
      showScreen('menu');
      refreshMenu();
    }, 1100);
  }

  function showScreen(name) {
    ['splash', 'menu', 'game', 'achievementsScreen', 'settingsScreen'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.classList.toggle('hidden', id !== name);
    });
    App.screen = name;
  }

  function refreshMenu() {
    $('topCoins').textContent = Storage.get('coins');
    $('topLevel').textContent = Storage.get('level');
    $('bestScore').textContent = Storage.get('bestScore');
  }

  // ===== Avvio modalità =====
  function startMode(mode) {
    App.mode = mode;
    App.miniIndex = 0;
    App.carCount = 0;
    App.score = 0;
    App.combo = 1;
    App.perfectRun = true;
    App.livesLeft = mode === 'arcade' ? 3 : (mode === 'career' ? 1 : 5);
    App.difficulty = mode === 'career' ? Storage.get('level') : 1;

    if (mode === 'arcade' || mode === 'infinite') {
      App.timeLeft = mode === 'arcade' ? 60 : 999;
    } else {
      App.timeLeft = 90;
    }

    showScreen('game');
    setupCanvas();
    startMini();
    startTimer();
    updateHUD();
  }

  // ===== Canvas + DPR + resize =====
  function setupCanvas() {
    App.canvas = $('stage');
    App.ctx = App.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
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

  // ===== Mini-game lifecycle =====
  function startMini() {
    const name = App.miniSequence[App.miniIndex];
    App.currentGameName = name;
    App.currentGame = Modules[name];
    $('miniGameLabel').textContent = LABELS[name];

    App.currentGame.init(App.canvas, App.ctx, {
      difficulty: App.difficulty,
      onComplete: handleMiniComplete,
      onFail: handleMiniFail,
      onProgress: () => {},
    });

    if (!App.raf) loop(performance.now());
  }

  function handleMiniComplete() {
    // bonus tempo + combo
    const baseScore = 100;
    const timeBonus = Math.floor(App.timeLeft) * 2;
    const comboBonus = baseScore * (App.combo - 1) * 0.5;
    const total = Math.floor(baseScore + timeBonus + comboBonus);

    App.score += total;
    App.combo = Math.min(10, App.combo + 1);
    Storage.setMax('maxCombo', App.combo);

    showToast(`+${total} 💰 · combo x${App.combo}`);
    updateHUD();

    // avanza al prossimo mini-game
    App.currentGame.destroy();
    App.miniIndex++;

    if (App.miniIndex >= App.miniSequence.length) {
      // auto completata!
      App.carCount++;
      App.miniIndex = 0;
      Storage.bumpStat('carsCompleted', 1);
      Storage.bumpStat('tiresChanged', 4);
      if (App.perfectRun) Storage.bumpStat('perfectGames', 1);

      // bonus auto
      App.score += 500;
      showToast(`🚗 Auto consegnata! +500`);

      // progressione: in career, salire di livello ogni N auto
      if (App.mode === 'career') {
        if (App.carCount >= 3) {
          finishRound(true);
          return;
        }
      }

      // tempo extra in arcade/infinite
      if (App.mode === 'arcade') App.timeLeft += 15;
      App.difficulty += 0.5;
    }

    setTimeout(startMini, 600);
  }

  function handleMiniFail(hard = false) {
    App.combo = 1;
    App.perfectRun = false;
    if (hard) {
      App.livesLeft--;
      updateHUD();
      if (App.livesLeft <= 0) {
        finishRound(false);
        return;
      }
      // riavvia stesso mini-game
      App.currentGame.destroy();
      setTimeout(startMini, 400);
    } else {
      updateHUD();
    }
  }

  // ===== Round end =====
  function finishRound(win) {
    if (App.timer) clearInterval(App.timer);
    if (App.currentGame) App.currentGame.destroy();
    if (App.raf) cancelAnimationFrame(App.raf);
    App.raf = null;

    // coin = score / 10
    const coinsEarned = Math.floor(App.score / 10);
    Storage.update({
      coins: Storage.get('coins') + coinsEarned,
      bestScore: Math.max(Storage.get('bestScore'), App.score),
    });
    Storage.bumpStat('totalGames', 1);

    if (App.mode === 'career' && win) {
      Storage.set('level', Storage.get('level') + 1);
      Storage.set('careerProgress', Storage.get('careerProgress') + 1);
      SFX.play('level');
    } else {
      win ? SFX.play('win') : SFX.play('lose');
    }

    // achievements
    const newAch = Achievements.checkAll();
    newAch.forEach(a => showToast(`🏆 ${a.title}`));

    showOverlay({
      title: win ? '🏁 Vittoria!' : '💥 Game Over',
      bodyHtml: `
        <p>Score: <b>${App.score}</b></p>
        <p>Auto consegnate: <b>${App.carCount}</b></p>
        <p>Coin guadagnati: <b>+${coinsEarned}</b></p>
        ${win && App.mode === 'career' ? `<p>🆙 Livello ${Storage.get('level')}!</p>` : ''}
      `,
      resumeText: 'Continua',
      onResume: () => { hideOverlay(); showScreen('menu'); refreshMenu(); },
      hideRestart: false,
    });
  }

  // ===== Timer principale =====
  function startTimer() {
    if (App.timer) clearInterval(App.timer);
    if (App.mode === 'infinite') return; // no timer
    App.timer = setInterval(() => {
      if (App.paused) return;
      App.timeLeft--;
      updateHUD();
      if (App.timeLeft <= 0) {
        finishRound(App.mode === 'arcade' ? true : false);
      }
    }, 1000);
  }

  // ===== HUD =====
  function updateHUD() {
    $('timer').textContent = App.mode === 'infinite' ? '∞' : Math.max(0, App.timeLeft);
    $('score').textContent = App.score;
    $('lives').textContent = App.livesLeft;
    $('carCount').textContent = App.carCount;
    $('combo').textContent = App.combo;
  }

  // ===== Game loop =====
  function loop(now) {
    const dt = Math.min(0.05, (now - App.lastT) / 1000 || 0.016);
    App.lastT = now;
    if (!App.paused && App.currentGame) {
      App.currentGame.update(dt);
      App.currentGame.draw();
    }
    App.raf = requestAnimationFrame(loop);
  }

  // ===== Overlay (pausa / fine) =====
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
    showOverlay({
      title: '⏸ Pausa',
      bodyHtml: `<p>Score corrente: <b>${App.score}</b></p>`,
      onResume: () => { App.paused = false; hideOverlay(); },
    });
  }

  function quitToMenu() {
    if (App.timer) clearInterval(App.timer);
    if (App.currentGame) App.currentGame.destroy();
    if (App.raf) cancelAnimationFrame(App.raf);
    App.raf = null;
    App.currentGame = null;
    App.paused = false;
    showScreen('menu');
    refreshMenu();
  }

  // ===== Toast =====
  let toastTimer = null;
  function showToast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 1600);
  }

  // ===== Achievements UI =====
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

  // ===== Settings UI =====
  function bindSettings() {
    const s = Storage.get('settings');
    $('setAudio').checked = s.audio;
    $('setHaptic').checked = s.haptic;
    $('setFX').checked = s.fx;

    $('setAudio').addEventListener('change', e => {
      s.audio = e.target.checked;
      Storage.set('settings', s);
      SFX.setMuted(!s.audio);
    });
    $('setHaptic').addEventListener('change', e => {
      s.haptic = e.target.checked;
      Storage.set('settings', s);
    });
    $('setFX').addEventListener('change', e => {
      s.fx = e.target.checked;
      Storage.set('settings', s);
    });
    $('btnReset').addEventListener('click', () => {
      if (confirm('Resettare TUTTI i progressi?')) {
        Storage.reset();
        refreshMenu();
        showToast('Progressi azzerati');
      }
    });
  }

  // ===== Event binding =====
  function bindEvents() {
    document.querySelectorAll('.mode-card').forEach(btn => {
      btn.addEventListener('click', () => {
        SFX.play('click');
        startMode(btn.dataset.mode);
      });
    });

    $('btnAchievements').addEventListener('click', () => {
      SFX.play('click');
      renderAchievements();
      showScreen('achievementsScreen');
    });
    $('btnSettings').addEventListener('click', () => {
      SFX.play('click');
      showScreen('settingsScreen');
    });
    $('btnAchBack').addEventListener('click', () => { SFX.play('click'); showScreen('menu'); });
    $('btnSetBack').addEventListener('click', () => { SFX.play('click'); showScreen('menu'); });

    $('btnBack').addEventListener('click', () => {
      if (confirm('Uscire dalla partita?')) quitToMenu();
    });
    $('btnPause').addEventListener('click', pauseGame);

    // PWA install
    let installPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPrompt = e;
      $('btnInstall').classList.remove('hidden');
    });
    $('btnInstall').addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      $('btnInstall').classList.add('hidden');
    });

    // pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && App.screen === 'game' && App.currentGame && !App.paused) {
        pauseGame();
      }
    });
  }

  // ===== Service Worker =====
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW error', err));
      });
    }
  }

  // ===== Init =====
  function init() {
    SFX.init();
    const audioMuted = !Storage.get('settings').audio;
    SFX.setMuted(audioMuted);
    bindEvents();
    bindSettings();
    registerSW();
    bootSplash();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
