# 📜 VERSION — Changelog

## 🚀 V3.0.0 — "Debug totale, 15 livelli, upgrade, meta — gioco vero"

> Data: 2026-05-15
> Trigger: il giocatore ha detto *"si pianta, è noioso, ci si stufa dopo due partite"*.
> Prima leggi: [FACT_CHECK.md](./FACT_CHECK.md) — la diagnosi spietata che ha guidato V3.

---

### ⚙️ FIX TECNICI (con riferimenti)

| # | Bug | Causa | Fix |
|---|---|---|---|
| 1 | Heartbeat audio **muto** | `setHeartbeatBPM` ricreava l'interval ad ogni frame (60Hz) → mai scadeva | Aggiornamento intervalli solo se delta BPM ≥ 6 |
| 2 | Loop fantasma post-`finishRound` | RAF veniva re-schedulato dopo il cancel perché `finishRound` chiamata da dentro il loop | Flag `App.alive` controllato in cima al loop |
| 3 | Memory leak di `resize`/`orientation` | Listener aggiunti dentro `setupCanvas` ad ogni partita | Flag `canvasReady`, installazione one-shot |
| 4 | Frame "ghost" tra mini-game | `App.currentGame` restava reference al modulo già distrutto | `App.currentGame = null` subito dopo `destroy()` |
| 5 | Timer non cancellabili | `setTimeout` sparsi nel main loop | Helper `laterMs()` + `clearAllTimers()` |
| 6 | Gonfiaggio: RAF zombie del deflate | `step()` continuava dopo `state.done` | Check `if (state.done) return;` |
| 7 | Service Worker stale | Solo bump cache, nessun postMessage ai client già aperti | Nuova versione `tyrerush-v3.0.0` + `postMessage('sw-updated')` + auto-reload su `controllerchange` |
| 8 | Audio iOS sospeso | `SFX.init()` solo in `DOMContentLoaded`, mancava resume su user gesture | `SFX.init()` ri-chiamata su ogni click di modalità |

---

### 🎮 SISTEMA 15 LIVELLI — ognuno con UNA regola unica

| # | Nome | Regola unica implementata | File toccato |
|---|---|---|---|
| 1 | 🎓 Apprendista | 3 clienti, pazienza +60%, solo 2 mini-game | `levels.js` |
| 2 | ☀️ Mattina di routine | 5 clienti, tutti i 4 mini-game | `levels.js` |
| 3 | 🌙 Officina Notturna | **Spotlight** circolare attorno al pointer, resto nero | `main.js:drawLevelSpecial` |
| 4 | 🌧 Pista bagnata | Tip x1.4, eventi attivi | `levels.js` |
| 5 | 🚚 Prima Boss Fight | Ultimo cliente = **SUPER TRUCK** garantito | `forceBossLast` |
| 6 | 🛒 Black Friday | Pazienza dimezzata, mancia +70% | `levels.js` |
| 7 | 👑 VIP Day | **1 solo cliente** che paga 10x. *Qualsiasi miss = fine* | `noMistakes` in `handleMiniFail` |
| 8 | 🚛 Truck Day | **Solo boss truck** in fila | `miniPool: ['bosstruck']` |
| 9 | 🏁 Rally Stage | Tutti clienti = Pilota Rally, pazienza dimezzata, tip x3 | `rallyOnly` |
| 10 | 💨 Compressore guasto | Gonfiaggio sostituito da **Manopump**: tap alternati sx/dx | `manualPump` + nuovo `manopump.js` |
| 11 | 🧑‍🔧 Aiutante goffo | Eventi a frequenza alta | `levels.js` |
| 12 | 📋 Ispezione fiscale | Cliente speciale **🕵️ Ispettore** a metà livello: paga 4x se OK | `inspector` |
| 13 | 🕯 Black-out totale | **Buio fisso**, vedi solo glow attorno al pointer | `permaBlackout` |
| 14 | 🌪 Caos in officina | Eventi continui, sabotaggi al 20% | `chaos` |
| 15 | 🏆 Gran Premio | **MEGA TRUCK 12 ruote** in 90s, +15000 punti | `megaTruck` + variante `bosstruck.js` |

Ogni livello ha **3 soglie di score** che danno 1, 2 o 3 stelle. Best score per livello salvato in `levelBest`. Stelle in `levelStars`. Totale stelle disponibili: **45**.

---

### 🛒 NEGOZIO — 12 upgrade persistenti che cambiano il gameplay

| Icona | Nome | Costo | Effetto reale |
|---|---|---|---|
| 🔧 | Cricchetto pneumatico | 500 💰 | Bulloni arrugginiti = bulloni normali |
| 💨 | Compressore HQ | 600 💰 | Zona verde gonfiaggio +30% |
| ☕ | Macchina del caffè | 700 💰 | Pazienza clienti +20% |
| 🪧 | Cartellone pubblicitario | 800 💰 | Mancia base +30% |
| 🧑‍🔧 | Assistente meccanico | 900 💰 | +2s pazienza al cliente successivo |
| 💳 | Cassa automatica | 1000 💰 | +50 coin extra per cliente |
| 🪜 | Tappetino antiscivolo | 750 💰 | Drift assetto -30% |
| ⚖️ | Equilibratrice digitale | 900 💰 | Zona verde equilibratura +25% |
| 🔥 | Combo Master | 1100 💰 | Moltiplicatore combo +30% |
| 🛋 | Salotto VIP | 1200 💰 | Clienti VIP/Rally +40% mancia |
| 🛡 | Polizza assicurativa | 1500 💰 | +1 vita per livello |
| ⏱ | Acceleratore turni | 1300 💰 | Durata livello +15s |

I modificatori sono **letti dal main loop** all'avvio della run e applicati ai mini-game tramite `App.upgradeMods`.

---

### 📖 META-PROGRESSIONE

- **Stelle per livello** (`levelStars`): 1/2/3 in base a 3 soglie di score
- **Best score per livello** (`levelBest`)
- **Pokédex clienti**: ogni archetipo incontrato si sblocca nella Galleria con faccia procedurale, frase di benvenuto e statistiche
- **20 achievement** (era 8): include sblocchi shop, stelle, boss, pokédex, MEGA TRUCK
- **Statistiche estese**: gomme cambiate, boss battuti, totale coin guadagnati cumulativi

---

### 🆕 FILE V3

- `js/levels.js` — definizione 15 livelli + recordStars/totalStars
- `js/upgrades.js` — definizione 12 upgrade + `applyAll()` che produce modificatori
- `js/games/manopump.js` — nuovo mini-game tap-alternato per "Compressore guasto"
- `FACT_CHECK.md` — diagnosi pre-V3

### 🔄 FILE TOCCATI

- `js/main.js` — riscritto loop per: flag `alive`, timer tracciati, `App.level` + `App.upgradeMods`, `drawLevelSpecial`, render UI nuove
- `js/audio.js` — fix heartbeat-ogni-frame
- `js/games/bosstruck.js` — variante `mega` (12 ruote)
- `js/games/gonfiaggio.js` — fix RAF zombie
- `js/storage.js` — nuovi campi: `totalEarned`, `levelStars`, `levelBest`, `ownedUpgrades`, `metCustomers`, `bossesDefeated`
- `js/achievements.js` — 20 obiettivi
- `index.html` — 3 nuove schermate: levelSelectScreen, shopScreen, pokedexScreen + 2 bottoni menu
- `css/styles.css` — stili level/shop/dex card
- `sw.js` — bump `tyrerush-v3.0.0` + auto-reload su update

---

### 🎯 COSA CAMBIA TRA RUN 1 E RUN 50 (ORA)

| Run | Cosa scopri |
|---|---|
| 1 | Tutorial Apprendista, prima vittoria gratis, 3 stelle facili |
| 3 | Sblocco livello 3 (Notturno) → spotlight, regola NUOVA |
| 5 | Primo Boss Truck → klaxon, combo, +5000 |
| 7 | VIP Day → adrenalina pura, mancia x10 ma zero errori |
| 10 | Compressore guasto → tap-alternato, **mini-game inedito** |
| 13 | Black-out totale → giochi al buio, brain mode |
| 15 | Gran Premio → MEGA TRUCK 12 ruote, momento epico |
| 20+ | Compri upgrade → cambi math del gioco → run più alte |
| 50+ | Tutti i 12 upgrade attivi → metà del roster pokédex visto → tendi a 45 stelle |

**Non è più la stessa run più veloce.** È un gioco con curve, scoperta, scelte di build.

---

### 📊 CONFRONTO V2 → V3

| Metrica | V2 | V3 |
|---|---|---|
| Mini-games distinti | 5 | **6** (+manopump) |
| Livelli con regole uniche | 0 | **15** |
| Upgrade persistenti | 0 | **12** |
| Achievement | 8 | **20** |
| Schermate UI | 4 | **7** |
| Bug critici noti | 8+ | **0** (fixed) |
| File JS totali | 11 | **14** |
| Righe di codice (LoC) | ~1900 | ~3200 |

---

## 💥 V2.0.0 — "Dal banale al magnetico, l'officina prende vita"
(vedi [ANALISI.md](./ANALISI.md) per il contesto)

Customer queue, juice engine, eventi random, boss truck. Risolveva la fisicità del feedback ma lasciava **vuoto strutturale**. V3 lo riempie.

## 📦 V1.0.0 — PWA arcade officina gommista completa

Prima versione tecnicamente pulita, 4 mini-game, 3 modalità. **Funzionava ma era banale.** Vedi `ANALISI.md`.

---

*— scritto onestamente. La differenza tra una demo e un gioco è quanto contenuto reso scopribile nel tempo. V3 è la prima a esserlo.*
