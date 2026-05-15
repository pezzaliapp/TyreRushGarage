/* ============================================================
   achievements.js V3 - 20 obiettivi sbloccabili.
   ============================================================ */

const Achievements = (() => {
  const list = [
    { id: 'first_blood',  icon: '🔧', title: 'Primo bullone',    desc: 'Completa il tuo primo lavoro.',          test: (s) => (s.totalGames || 0) >= 1 },
    { id: 'speed_demon',  icon: '⚡', title: 'Mani veloci',       desc: 'Combo x5 in un mini-game.',              test: (s) => (s.maxCombo || 1) >= 5 },
    { id: 'combo_x10',    icon: '🔥', title: 'Combo BESTIA',     desc: 'Combo x10 in una run.',                  test: (s) => (s.maxCombo || 1) >= 10 },
    { id: 'perfect',      icon: '✨', title: 'Lavoro perfetto',   desc: 'Completa un livello senza errori.',      test: (s) => (s.perfectGames || 0) >= 1 },
    { id: 'tire_master',  icon: '🛞', title: 'Maestro gommista', desc: 'Cambia 50 gomme totali.',                test: (s) => (s.tiresChanged || 0) >= 50 },
    { id: 'tire_legend',  icon: '🌟', title: 'Leggenda della gomma', desc: '500 gomme cambiate.',               test: (s) => (s.tiresChanged || 0) >= 500 },
    { id: 'rich',         icon: '💰', title: 'Cassiere',          desc: 'Accumula 1000 coin.',                   test: ()  => Storage.get('coins') >= 1000 },
    { id: 'rich_x10',     icon: '💎', title: 'Milionario',        desc: 'Accumula 10.000 coin totali.',          test: ()  => (Storage.get('totalEarned') || 0) >= 10000 },
    { id: 'first_upgrade',icon: '🛒', title: 'Primo acquisto',    desc: 'Compra il tuo primo upgrade.',          test: ()  => (Storage.get('ownedUpgrades') || []).length >= 1 },
    { id: 'half_shop',    icon: '🏪', title: 'Mezza officina',    desc: 'Possiedi 6 upgrade.',                   test: ()  => (Storage.get('ownedUpgrades') || []).length >= 6 },
    { id: 'all_shop',     icon: '🏆', title: 'Tutto in vetrina',  desc: 'Possiedi tutti i 12 upgrade.',          test: ()  => (Storage.get('ownedUpgrades') || []).length >= 12 },
    { id: 'star_3',       icon: '⭐', title: 'Tre stelle',         desc: '3 stelle in un livello.',               test: ()  => Math.max(0, ...Object.values(Storage.get('levelStars') || {0:0})) >= 3 },
    { id: 'star_15',      icon: '🌠', title: '15 stelle',         desc: 'Accumula 15 stelle totali.',            test: ()  => Levels.totalStars() >= 15 },
    { id: 'star_30',      icon: '✨', title: '30 stelle',         desc: 'Metà galassia.',                        test: ()  => Levels.totalStars() >= 30 },
    { id: 'star_45',      icon: '👑', title: '45 stelle (MAX)',   desc: 'Tutto a tre stelle.',                   test: ()  => Levels.totalStars() >= 45 },
    { id: 'boss_first',   icon: '🚚', title: 'Primo Boss',        desc: 'Batti un Super Truck.',                 test: (s) => (s.bossesDefeated || 0) >= 1 },
    { id: 'boss_5',       icon: '🚛', title: 'Boss Hunter',       desc: 'Batti 5 Super Truck.',                  test: (s) => (s.bossesDefeated || 0) >= 5 },
    { id: 'mega',         icon: '🏁', title: 'Gran Premio',       desc: 'Completa il Gran Premio finale.',       test: ()  => ((Storage.get('levelStars') || {})[15] || 0) >= 1 },
    { id: 'pokedex',      icon: '📖', title: 'Galleria piena',    desc: 'Incontra tutti i 10 tipi di cliente.',  test: ()  => (Storage.get('metCustomers') || []).length >= 10 },
    { id: 'all_levels',   icon: '🥇', title: 'Tutti i livelli',   desc: 'Completa tutti i 15 livelli.',          test: ()  => Object.keys(Storage.get('levelStars') || {}).length >= 15 },
  ];

  function checkAll() {
    const stats = Storage.get('stats') || {};
    const unlocked = [];
    list.forEach(a => {
      if (!Storage.isUnlocked(a.id) && a.test(stats)) {
        if (Storage.unlockAchievement(a.id)) unlocked.push(a);
      }
    });
    return unlocked;
  }

  function getAll() { return list; }

  return { checkAll, getAll };
})();
