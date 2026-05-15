/* ============================================================
   achievements.js - definizione e gestione obiettivi
   ============================================================ */

const Achievements = (() => {
  const list = [
    { id: 'first_blood',  icon: '🔧', title: 'Primo bullone',     desc: 'Completa il tuo primo lavoro.', test: (s) => s.totalGames >= 1 },
    { id: 'speed_demon',  icon: '⚡', title: 'Mani veloci',        desc: 'Combo x5 in un mini-game.',     test: (s) => s.maxCombo >= 5 },
    { id: 'perfect',      icon: '✨', title: 'Lavoro perfetto',    desc: 'Completa un livello senza errori.', test: (s) => s.perfectGames >= 1 },
    { id: 'tire_master',  icon: '🛞', title: 'Maestro gommista',   desc: 'Cambia 50 gomme totali.',        test: (s) => s.tiresChanged >= 50 },
    { id: 'rich',         icon: '💰', title: 'Cassiere',            desc: 'Accumula 1000 coin.',           test: () => Storage.get('coins') >= 1000 },
    { id: 'lvl5',         icon: '⭐', title: 'Apprendista',         desc: 'Raggiungi il livello 5.',       test: () => Storage.get('level') >= 5 },
    { id: 'lvl10',        icon: '🌟', title: 'Capo officina',       desc: 'Raggiungi il livello 10.',      test: () => Storage.get('level') >= 10 },
    { id: 'marathon',     icon: '🏃', title: 'Maratoneta',          desc: 'Completa 10 auto in Infinite.', test: () => Storage.get('stats').carsCompleted >= 10 },
  ];

  function checkAll() {
    const stats = Storage.get('stats');
    const unlocked = [];
    list.forEach(a => {
      if (!Storage.isUnlocked(a.id) && a.test(stats)) {
        if (Storage.unlockAchievement(a.id)) {
          unlocked.push(a);
        }
      }
    });
    return unlocked;
  }

  function getAll() { return list; }

  return { checkAll, getAll };
})();
