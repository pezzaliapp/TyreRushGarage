/* ============================================================
   storage.js - gestione persistenza con localStorage
   Salva: high score, livello, coin, achievements, settings
   ============================================================ */

const Storage = (() => {
  const KEY = 'tyrerush_v1';

  const defaults = {
    bestScore: 0,
    level: 1,
    coins: 0,
    totalEarned: 0,           // V3: coin cumulativi guadagnati (mai diminuisce)
    careerProgress: 0,
    unlockedAchievements: [],
    levelStars: {},           // V3: { 1: 3, 2: 2, ... } stelle per livello
    levelBest: {},            // V3: { 1: 1450, ... } score massimo per livello
    ownedUpgrades: [],        // V3: id degli upgrade acquistati
    metCustomers: [],         // V3: pokédex clienti incontrati
    stats: {
      totalGames: 0,
      perfectGames: 0,
      tiresChanged: 0,
      maxCombo: 1,
      carsCompleted: 0,
      bossesDefeated: 0,
    },
    settings: {
      audio: true,
      haptic: true,
      fx: true,
    },
  };

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(defaults);
      const parsed = JSON.parse(raw);
      return Object.assign(structuredClone(defaults), parsed);
    } catch (e) {
      console.warn('Storage load failed', e);
      return structuredClone(defaults);
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }

  function get(key) { return data[key]; }
  function set(key, value) { data[key] = value; save(); }

  function update(patch) {
    Object.assign(data, patch);
    save();
  }

  function reset() {
    data = structuredClone(defaults);
    save();
  }

  function unlockAchievement(id) {
    if (!data.unlockedAchievements.includes(id)) {
      data.unlockedAchievements.push(id);
      save();
      return true;
    }
    return false;
  }

  function isUnlocked(id) {
    return data.unlockedAchievements.includes(id);
  }

  function bumpStat(key, delta = 1) {
    data.stats[key] = (data.stats[key] || 0) + delta;
    save();
  }

  function setMax(key, value) {
    if (!data.stats[key] || value > data.stats[key]) {
      data.stats[key] = value;
      save();
    }
  }

  return {
    get, set, update, reset,
    save, load,
    unlockAchievement, isUnlocked,
    bumpStat, setMax,
    get data() { return data; },
  };
})();
