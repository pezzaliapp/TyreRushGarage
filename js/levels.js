/* ============================================================
   levels.js V3 - 15 LIVELLI con identità reale.
   Ognuno ha una REGOLA UNICA che modifica davvero il gameplay,
   non un colore diverso.
   ============================================================ */

const Levels = (() => {

  // miniPool: 'all' = tutti i 4 standard; array specifico = solo quelli
  const LEVELS = [
    /* 1 */ {
      id: 1, name: 'Apprendista', emoji: '🎓',
      desc: '3 clienti tranquilli. Imparo il mestiere.',
      customers: 3, duration: 90,
      patienceMult: 1.6, tipMult: 1.0,
      sabotageRate: 0, eventChance: 0,
      miniPool: ['smontagomme', 'gonfiaggio'],
      target: [400, 800, 1200],
      special: null,
    },
    /* 2 */ {
      id: 2, name: 'Mattina di routine', emoji: '☀️',
      desc: 'Tutti e quattro i servizi disponibili.',
      customers: 5, duration: 90,
      patienceMult: 1.0, tipMult: 1.0,
      sabotageRate: 0, eventChance: 0.05,
      miniPool: 'all',
      target: [1000, 2000, 3000],
      special: null,
    },
    /* 3 */ {
      id: 3, name: 'Officina Notturna', emoji: '🌙',
      desc: 'Vedi solo dove sono le tue mani. Spotlight ON.',
      customers: 5, duration: 100,
      patienceMult: 1.1, tipMult: 1.3,
      sabotageRate: 0.05, eventChance: 0.05,
      miniPool: 'all',
      target: [1500, 2500, 4000],
      special: 'spotlight',
    },
    /* 4 */ {
      id: 4, name: 'Pista bagnata', emoji: '🌧',
      desc: 'I bulloni scivolano. Se sbagli, si spostano.',
      customers: 5, duration: 90,
      patienceMult: 1.0, tipMult: 1.4,
      sabotageRate: 0, eventChance: 0.05,
      miniPool: 'all',
      target: [1200, 2200, 3500],
      special: 'slippery',
    },
    /* 5 */ {
      id: 5, name: '🚚 Prima Boss Fight', emoji: '🚚',
      desc: '3 clienti normali, poi arriva il SUPER TRUCK.',
      customers: 4, duration: 120,
      patienceMult: 1.0, tipMult: 1.0,
      sabotageRate: 0, eventChance: 0,
      miniPool: 'all',
      target: [3000, 5000, 7500],
      special: 'forceBossLast',
    },
    /* 6 */ {
      id: 6, name: 'Black Friday', emoji: '🛒',
      desc: 'Pazienza dimezzata. Mancia raddoppiata.',
      customers: 6, duration: 90,
      patienceMult: 0.55, tipMult: 1.7,
      sabotageRate: 0.1, eventChance: 0.05,
      miniPool: 'all',
      target: [2500, 4500, 6500],
      special: null,
    },
    /* 7 */ {
      id: 7, name: 'VIP Day', emoji: '👑',
      desc: 'UN solo cliente. Mancia x10. Zero errori.',
      customers: 1, duration: 60,
      patienceMult: 1.5, tipMult: 10.0,
      sabotageRate: 0.3, eventChance: 0,
      miniPool: 'all',
      target: [3000, 5000, 8000],
      special: 'noMistakes',
    },
    /* 8 */ {
      id: 8, name: 'Truck Day', emoji: '🚛',
      desc: 'Solo truck. Solo bulloni grossi.',
      customers: 3, duration: 120,
      patienceMult: 1.2, tipMult: 1.5,
      sabotageRate: 0, eventChance: 0,
      miniPool: ['bosstruck'],
      target: [4000, 7000, 10000],
      special: null,
    },
    /* 9 */ {
      id: 9, name: 'Rally Stage', emoji: '🏁',
      desc: 'Tutti piloti. Pazienza dimezzata. Mancia x3.',
      customers: 6, duration: 90,
      patienceMult: 0.45, tipMult: 3.0,
      sabotageRate: 0.1, eventChance: 0,
      miniPool: 'all',
      target: [3000, 5000, 7500],
      special: 'rallyOnly',
    },
    /* 10 */ {
      id: 10, name: 'Compressore guasto', emoji: '💨',
      desc: 'Compressore fuori uso. Pompa a mano! TAP TAP TAP.',
      customers: 5, duration: 90,
      patienceMult: 1.0, tipMult: 1.4,
      sabotageRate: 0, eventChance: 0,
      miniPool: 'all',
      target: [1800, 3200, 5000],
      special: 'manualPump',   // gonfiaggio → manopump
    },
    /* 11 */ {
      id: 11, name: 'Aiutante goffo', emoji: '🧑‍🔧',
      desc: 'Hai un assistente. A volte ti aiuta da solo.',
      customers: 6, duration: 90,
      patienceMult: 1.0, tipMult: 1.2,
      sabotageRate: 0.1, eventChance: 0.1,
      miniPool: 'all',
      target: [2500, 4500, 6500],
      special: 'apprentice',
    },
    /* 12 */ {
      id: 12, name: 'Ispezione fiscale', emoji: '📋',
      desc: 'Un ispettore in incognito! Perfezione obbligatoria.',
      customers: 5, duration: 100,
      patienceMult: 1.0, tipMult: 1.5,
      sabotageRate: 0.1, eventChance: 0.05,
      miniPool: 'all',
      target: [3000, 5000, 7500],
      special: 'inspector',
    },
    /* 13 */ {
      id: 13, name: 'Black-out totale', emoji: '🕯',
      desc: 'L\'officina è al buio FISSO. Solo flash sui clic.',
      customers: 5, duration: 100,
      patienceMult: 1.3, tipMult: 2.0,
      sabotageRate: 0, eventChance: 0,
      miniPool: 'all',
      target: [3000, 5000, 8000],
      special: 'permaBlackout',
    },
    /* 14 */ {
      id: 14, name: 'Caos in officina', emoji: '🌪',
      desc: 'Eventi a raffica. Sopravvivi.',
      customers: 6, duration: 100,
      patienceMult: 1.0, tipMult: 2.0,
      sabotageRate: 0.2, eventChance: 0.6,
      miniPool: 'all',
      target: [4000, 7000, 10000],
      special: 'chaos',
    },
    /* 15 */ {
      id: 15, name: '🏆 Gran Premio', emoji: '🏆',
      desc: 'IL SUPER MEGA TRUCK. 12 ruote. 90 secondi. Mancia x5.',
      customers: 1, duration: 90,
      patienceMult: 1.0, tipMult: 5.0,
      sabotageRate: 0, eventChance: 0,
      miniPool: ['bosstruck'],
      target: [5000, 10000, 15000],
      special: 'megaTruck',
    },
  ];

  function get(id) { return LEVELS.find(l => l.id === id) || null; }
  function getAll() { return LEVELS.slice(); }

  // Stelle ottenute per quel livello in base allo score (1, 2 o 3)
  function starsForScore(level, score) {
    if (!level) return 0;
    if (score >= level.target[2]) return 3;
    if (score >= level.target[1]) return 2;
    if (score >= level.target[0]) return 1;
    return 0;
  }

  function isUnlocked(id) {
    if (id === 1) return true;
    const prev = Storage.get('levelStars') || {};
    return (prev[id - 1] || 0) >= 1;
  }

  function recordStars(id, stars, score) {
    const map = Storage.get('levelStars') || {};
    const bestMap = Storage.get('levelBest') || {};
    if (!map[id] || stars > map[id]) map[id] = stars;
    if (!bestMap[id] || score > bestMap[id]) bestMap[id] = score;
    Storage.set('levelStars', map);
    Storage.set('levelBest', bestMap);
  }

  function totalStars() {
    const map = Storage.get('levelStars') || {};
    return Object.values(map).reduce((a, b) => a + b, 0);
  }

  return { get, getAll, starsForScore, isUnlocked, recordStars, totalStars };
})();
