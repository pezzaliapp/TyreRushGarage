/* ============================================================
   customers.js - roster clienti con personalità + dialoghi.
   Ogni cliente ha: nome, faccia procedurale, pazienza, mancia,
   reazione alla pressione, una frase di benvenuto e una d'uscita.
   ============================================================ */

const Customers = (() => {

  /* Archetipi: difficoltà / mancia / pazienza calibrati per loop 60s */
  const ARCHETYPES = [
    {
      id: 'tamarro', name: 'Bruno il Tamarro', face: '😎',
      skin: '#ffd1a8', hair: '#1a1a1a', clothes: '#ff5e3a',
      patience: 22, tipMult: 1.6, baseTip: 120, sabotageRate: 0.10,
      hello: ["Oh dotto', le low profile per stasera!", "Aoh fai veloce, ho Jessica in macchina!", "Pure cera ai cerchioni eh!", "Ho lo spoiler nuovo, NON ME LO GRAFFIARE."],
      win:   ["Tu sì che lavori, fra'!", "STAI A DIO ZIO.", "Ti prendo na pizza una sera!"],
      lose:  ["MA TI PARE NORMALE?!", "Vado dal Mario all'angolo!", "Scrivo na recensione PESANTISSIMA!"],
    },
    {
      id: 'rally', name: 'Il Pilota Rally', face: '🏁',
      skin: '#f4c597', hair: '#8b4513', clothes: '#ffb000',
      patience: 13, tipMult: 3.0, baseTip: 250, sabotageRate: 0.20,
      hello: ["VINCO O MUORO. Veloce!", "Tredici secondi, NON UNO DI PIÙ!", "Gomme da pioggia!! Si parte ORA!", "Conto su di te, campione."],
      win:   ["Ti devo la VITTORIA!", "Sei un PILOTA della gomma!", "Ci vediamo sul podio!"],
      lose:  ["Hai rovinato la STAGIONE!", "Maledetto dilettante!", "Pago il MINIMO sindacale!"],
    },
    {
      id: 'signora', name: 'Sig.ra Esposito', face: '👵',
      skin: '#f8d9b9', hair: '#dadde2', clothes: '#a78bfa',
      patience: 55, tipMult: 0.85, baseTip: 80, sabotageRate: 0.0,
      hello: ["Piano piano caro, non c'è fretta!", "Mio nipote fa l'avvocato sai?", "Le porto un caffè? Senza zucchero per lei.", "Le quattro ruote, ma una alla volta!"],
      win:   ["Grazie tesoro, sei un angelo!", "Ti meriti un panino al bar.", "Tornerò sicuramente!"],
      lose:  ["Pazienza caro, capita.", "Magari la prossima va meglio.", "Saluti tua mamma!"],
    },
    {
      id: 'youtuber', name: 'Lo Youtuber', face: '🎬',
      skin: '#fce0c2', hair: '#ec4899', clothes: '#ec4899',
      patience: 30, tipMult: 2.0, baseTip: 180, sabotageRate: 0.05,
      hello: ["Sto registrando, SORRIDA!", "Like e iscrivetevi al canale!", "Lo metto su TikTok eh!", "Sponsorizzami i cerchioni!"],
      win:   ["VIRAL CONTENT! GRAZIE!", "Ti taggiamo nei reel!", "Sei in trending fra!"],
      lose:  ["TAGLIO IN MONTAGGIO.", "Story negativa in arrivo!", "Mai più con voi!"],
    },
    {
      id: 'trapper', name: 'Trapper Rookie', face: '💎',
      skin: '#c89f7c', hair: '#22d3ee', clothes: '#84cc16',
      patience: 26, tipMult: 1.8, baseTip: 160, sabotageRate: 0.10,
      hello: ["Money money money, fa'!", "Cerchi DRIP? Cerchi GHIACCIO?", "Skrr skrr fra'!", "Bling bling sulle gomme!"],
      win:   ["DOPE, DOPE, DOPE!", "Sei il GOAT bro!", "Featuring sul mio prossimo brano!"],
      lose:  ["Trash content fra'.", "Levaculo il flow!", "MASSACRO sul mio prossimo dissing!"],
    },
    {
      id: 'taxi', name: 'Tassinaro Romano', face: '🚖',
      skin: '#e8b894', hair: '#444', clothes: '#facc15',
      patience: 18, tipMult: 1.4, baseTip: 100, sabotageRate: 0.15,
      hello: ["A capo', si moveeee!", "Cliente che m'aspetta in macchina!", "VOI DEL NORD SIETE TUTTI UGUALI!", "Aripijate ar volo!"],
      win:   ["BELLO MIO! Bravo bravo!", "Ti scarrozzo gratis fino al Colosseo!", "T'ho fatto pubblicità a Trastevere!"],
      lose:  ["MAVAFFANCULOTUEFFRATELLI!", "Cojone! E pago pure!", "ZERO STELLE!"],
    },
    {
      id: 'punk', name: 'Punk Anarchico', face: '🤘',
      skin: '#d8b08c', hair: '#22d3ee', clothes: '#0f172a',
      patience: 35, tipMult: 1.1, baseTip: 90, sabotageRate: 0.0,
      hello: ["Anarchia anche sulle gomme!", "Down with the carburatore!", "Adesivo NO TAV sul cerchione?", "Smash the patriarchy!"],
      win:   ["RISPETTO COMPAGNO!", "Antifa per sempre!", "Stasera concerto, vieni gratis!"],
      lose:  ["Sistema capitalista vince ancora!", "Boicotto ufficiale!", "Ti volantino davanti casa!"],
    },
    {
      id: 'preside', name: 'Il Preside', face: '👔',
      skin: '#e8c5a0', hair: '#94a3b8', clothes: '#0891b2',
      patience: 45, tipMult: 1.0, baseTip: 110, sabotageRate: 0.0,
      hello: ["Lavoro pulito, mi raccomando.", "Mi serve fattura elettronica.", "In ricreazione passo a prenderla.", "Disciplina, ragazzo."],
      win:   ["10 e lode in officina!", "Encomio solenne!", "Le scrivo una lettera di referenze."],
      lose:  ["Nota disciplinare!", "Convocazione genitori!", "Bocciato in officina!"],
    },
    {
      id: 'nonno', name: 'Nonno Pino', face: '👴',
      skin: '#e0c0a0', hair: '#fafafa', clothes: '#94a3b8',
      patience: 70, tipMult: 0.7, baseTip: 60, sabotageRate: 0.0,
      hello: ["Ai miei tempi le gomme...", "Pino, piacere. Pi-no.", "Mia moglie fa il babà, vuoi?", "Il bar qua sotto fa il caffè buono!"],
      win:   ["Bravo guaglione!", "Ti porto il babà la prossima!", "Tornerò con tutti i miei amici!"],
      lose:  ["Eh, oggi non è giornata.", "Pazienza, son cose.", "Ci si vede al circolo bocce!"],
    },
    {
      id: 'youtuber_old', name: 'Influencer Boomer', face: '📱',
      skin: '#f0c89c', hair: '#94a3b8', clothes: '#ef4444',
      patience: 28, tipMult: 1.7, baseTip: 150, sabotageRate: 0.0,
      hello: ["Sto facendo una storia su Insta!", "Mio figlio mi ha detto di taggarvi!", "Ma 'sto manometro come si usa?", "Hashtag #officinatop !!"],
      win:   ["Vi metto in evidenza!", "5 stelle su Tripadvisor!", "Diventerete VIRALI!"],
      lose:  ["Recensione su LinkedIn!", "Lo dico al gruppo whatsapp del condominio!", "TRADITORI!"],
    },
  ];

  /* Disegna faccia procedurale su un canvas (32x32 base, scalabile) */
  function drawFace(ctx, x, y, size, customer) {
    const s = size;
    // testa
    ctx.fillStyle = customer.skin;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // capelli
    ctx.fillStyle = customer.hair;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.25, s * 0.45, Math.PI, 0);
    ctx.fill();
    // occhi
    ctx.fillStyle = '#0b0d10';
    ctx.beginPath(); ctx.arc(x - s*0.13, y - s*0.05, s*0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s*0.13, y - s*0.05, s*0.05, 0, Math.PI*2); ctx.fill();
    // bocca
    ctx.strokeStyle = '#0b0d10';
    ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.arc(x, y + s*0.1, s*0.13, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // colletto / vestito
    ctx.fillStyle = customer.clothes;
    ctx.beginPath();
    ctx.moveTo(x - s*0.4, y + s*0.45);
    ctx.quadraticCurveTo(x, y + s*0.25, x + s*0.4, y + s*0.45);
    ctx.lineTo(x + s*0.45, y + s*0.6);
    ctx.lineTo(x - s*0.45, y + s*0.6);
    ctx.closePath();
    ctx.fill();
  }

  /* Pesco un cliente in base alla difficoltà attuale */
  function pick(difficulty = 1) {
    // più sale la difficoltà più aumenta la probabilità di Rally / Tassinaro
    const danger = ARCHETYPES.filter(a => a.tipMult >= 1.5);
    const chill  = ARCHETYPES.filter(a => a.tipMult <  1.5);
    const useDanger = Math.random() < Math.min(0.65, 0.25 + difficulty * 0.05);
    const pool = useDanger ? danger : chill;
    return clone(pool[Math.floor(Math.random() * pool.length)]);
  }

  function clone(a) {
    return {
      ...a,
      patience: a.patience,
      currentPatience: a.patience,
      hello: a.hello[Math.floor(Math.random() * a.hello.length)],
      win:   a.win[Math.floor(Math.random() * a.win.length)],
      lose:  a.lose[Math.floor(Math.random() * a.lose.length)],
    };
  }

  return { pick, drawFace, ARCHETYPES };
})();
