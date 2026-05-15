/* ============================================================
   upgrades.js V3 - 12 upgrade persistenti che modificano davvero
   il gameplay. Acquisto con coin guadagnati nelle run. Effetti
   letti dal main.js prima di applicare modificatori del livello.
   ============================================================ */

const Upgrades = (() => {

  const LIST = [
    {
      id: 'ratchet',
      name: 'Cricchetto pneumatico',
      desc: 'Smontagomme: i bulloni arrugginiti contano come normali.',
      icon: '🔧', cost: 500,
      effect: (mods) => { mods.rustyAsNormal = true; },
    },
    {
      id: 'compressor_hq',
      name: 'Compressore HQ',
      desc: 'Gonfiaggio: zona verde +30%.',
      icon: '💨', cost: 600,
      effect: (mods) => { mods.gonfWindowMult = 1.30; },
    },
    {
      id: 'coffee',
      name: 'Macchina del caffè ☕',
      desc: 'Tutti i clienti hanno +20% di pazienza.',
      icon: '☕', cost: 700,
      effect: (mods) => { mods.patienceBoost = 1.20; },
    },
    {
      id: 'billboard',
      name: 'Cartellone pubblicitario',
      desc: 'Mancia base di ogni cliente +30%.',
      icon: '🪧', cost: 800,
      effect: (mods) => { mods.tipBoost = 1.30; },
    },
    {
      id: 'assistant',
      name: 'Assistente meccanico',
      desc: 'A fine cliente, +2s di pazienza al prossimo.',
      icon: '🧑‍🔧', cost: 900,
      effect: (mods) => { mods.assistantBonus = 2; },
    },
    {
      id: 'cash_register',
      name: 'Cassa automatica',
      desc: '+50 coin extra per ogni cliente servito.',
      icon: '💳', cost: 1000,
      effect: (mods) => { mods.coinPerCustomer = 50; },
    },
    {
      id: 'antislip',
      name: 'Tappetino antiscivolo',
      desc: 'Assetto: drift instabilità -30%.',
      icon: '🪜', cost: 750,
      effect: (mods) => { mods.driftMult = 0.70; },
    },
    {
      id: 'digital_balancer',
      name: 'Equilibratrice digitale',
      desc: 'Equilibratura: zona verde +25%.',
      icon: '⚖️', cost: 900,
      effect: (mods) => { mods.eqWindowMult = 1.25; },
    },
    {
      id: 'combo_master',
      name: 'Combo Master',
      desc: 'Moltiplicatore combo: +30% (più punti per cliente).',
      icon: '🔥', cost: 1100,
      effect: (mods) => { mods.comboMult = 1.30; },
    },
    {
      id: 'vip_lounge',
      name: 'Salotto VIP',
      desc: 'Clienti VIP/Rally pagano +40%.',
      icon: '🛋', cost: 1200,
      effect: (mods) => { mods.vipTipMult = 1.40; },
    },
    {
      id: 'safety_net',
      name: 'Polizza assicurativa',
      desc: 'Inizi ogni livello con +1 vita.',
      icon: '🛡', cost: 1500,
      effect: (mods) => { mods.extraLives = 1; },
    },
    {
      id: 'time_extender',
      name: 'Acceleratore turni',
      desc: 'Durata del livello +15s.',
      icon: '⏱', cost: 1300,
      effect: (mods) => { mods.durationBonus = 15; },
    },
  ];

  function owned() { return Storage.get('ownedUpgrades') || []; }
  function isOwned(id) { return owned().includes(id); }

  function buy(id) {
    const u = LIST.find(x => x.id === id);
    if (!u) return { ok: false, reason: 'not-found' };
    if (isOwned(id)) return { ok: false, reason: 'already' };
    const coins = Storage.get('coins') || 0;
    if (coins < u.cost) return { ok: false, reason: 'broke' };
    Storage.set('coins', coins - u.cost);
    const arr = owned();
    arr.push(id);
    Storage.set('ownedUpgrades', arr);
    return { ok: true, upgrade: u };
  }

  function applyAll() {
    const mods = {
      rustyAsNormal: false,
      gonfWindowMult: 1.0,
      eqWindowMult: 1.0,
      driftMult: 1.0,
      patienceBoost: 1.0,
      tipBoost: 1.0,
      assistantBonus: 0,
      coinPerCustomer: 0,
      comboMult: 1.0,
      vipTipMult: 1.0,
      extraLives: 0,
      durationBonus: 0,
    };
    owned().forEach(id => {
      const u = LIST.find(x => x.id === id);
      if (u && u.effect) u.effect(mods);
    });
    return mods;
  }

  function getAll() { return LIST.slice(); }

  return { LIST, getAll, owned, isOwned, buy, applyAll };
})();
