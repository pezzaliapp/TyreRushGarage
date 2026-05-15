# 🔬 FACT_CHECK — Audit V2 (pre-V3)

> **Modalità onestà brutale: ON.**
> Documento scritto DOPO aver riletto il codice riga per riga e prima di toccare un solo byte.
> Niente promesse, solo evidenze.

---

## A) 🐛 BUG HUNT (analisi statica + tracciamento di stato)

### 🔴 CRITICO 1 — Heartbeat silenzioso (`audio.js:205` chiamato da `main.js:338`)

```js
// main.js loop() — 60 volte al secondo:
if (App.heartbeatActive) SFX.setHeartbeatBPM(80 + (1 - ratio) * 80);

// audio.js — setHeartbeatBPM:
function setHeartbeatBPM(bpm) {
  if (!heartbeatInterval) return;
  clearInterval(heartbeatInterval);     // <-- distrugge ogni frame
  heartbeatInterval = setInterval(..., 60000 / bpm); // <-- riparte da zero
}
```

**Causa**: l'intervallo non riesce mai a *scadere* (lo cancello prima che fire'i a 60Hz). Quindi il heartbeat audio è **completamente muto**. Aggiungo: ogni frame creo un nuovo `setInterval` → leak di handler.

**Severità**: ALTA. Una feature dichiarata in V2 (heartbeat di pressione) **non funziona**.
**Fix**: chiamare `setHeartbeatBPM` solo se il delta BPM è significativo (>5), oppure parametrizzare la *prossima* iterazione invece che ricreare l'intervallo.

---

### 🔴 CRITICO 2 — Game loop immortale dopo finishRound (`main.js:362`)

```js
function loop(now) {
  // ... lavoro ...
  App.raf = requestAnimationFrame(loop);  // <-- SCHEDULA SEMPRE
}

function finishRound(win) {
  cancelAnimationFrame(App.raf);          // <-- ID stale se chiamato da dentro loop()
  App.raf = null;
}
```

**Causa**: quando `finishRound` viene chiamato da `handleMiniFail` (sync dentro `loop()`), l'ID `App.raf` contiene il RAF *corrente in esecuzione*, non quello successivo. Annullarlo è no-op. Poi `loop` continua, raggiunge la riga 362 e **schedula un nuovo RAF**. Il loop continua a girare con `App.currentGame === null`, sprecando frame e potenzialmente collidendo con `startMode()` successivi.

**Severità**: ALTA. Causa il "pianta del gioco" segnalato — accumulo di loop fantasma quando rigiochi.
**Fix**: aggiungere un flag `App.alive` controllato in cima a `loop()`. `finishRound` setta `App.alive = false`.

---

### 🟠 MEDIO 3 — Listeners di resize duplicati ogni partita (`main.js:105-106`)

```js
function setupCanvas() {
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', resizeCanvas);
}
```

**Causa**: `setupCanvas()` viene chiamato dentro `startMode()`. Ogni "Ancora!" → nuova coppia di listener. Dopo 5 partite hai 10 listener su `resize`. Ognuno fa fire ad ogni piccola variazione (es. apertura tastiera mobile). Su iOS la perfomance crolla.

**Severità**: MEDIA (leak progressivo).
**Fix**: aggiungere i listener una sola volta in `init()`, oppure `removeEventListener` simmetrico.

---

### 🟠 MEDIO 4 — `App.currentGame` resta "vivo" tra cliente e cliente (`main.js:248`)

```js
function handleMiniComplete() {
  App.currentGame.destroy();
  // ...
  setTimeout(spawnCustomer, 900); // 900ms vuoti
}
```

**Causa**: per 900ms `App.currentGame` è ancora il riferimento al modulo (truthy). Il loop continua a chiamare `update()` e `draw()` sullo stato vecchio → si vedono frame "ghost" della ruota precedente, particelle che permangono, particelle nuove sopra. Visivo sgradevole + spreco CPU.

**Severità**: MEDIA.
**Fix**: `App.currentGame = null;` subito dopo `destroy()`.

---

### 🟠 MEDIO 5 — `setTimeout` di `spawnCustomer` ignora `quitToMenu()` (`main.js:148`)

```js
setTimeout(() => {
  if (App.customer === c && !App.serving && !App.inBoss) startServing();
}, 2200);
```

**Causa**: c'è un check di identità su `App.customer === c` che è OK, ma se durante i 2200ms l'utente esce al menu e rientra in arcade, lo stato è sporco. Inoltre tutti i `setTimeout` (spawnCustomer x 3 punti, endBoss, ecc.) non hanno *cancellation token*: dopo `quitToMenu()` continuano a girare.

**Severità**: MEDIA.
**Fix**: registrare tutti i timer in `App.timers = []` e cancellarli in `quitToMenu`/`finishRound`.

---

### 🟠 MEDIO 6 — Service Worker non forza l'aggiornamento dei client già aperti (`sw.js`)

```js
self.addEventListener('install', (event) => {
  self.skipWaiting();
  // ...
});
self.addEventListener('activate', (event) => {
  event.waitUntil(... self.clients.claim());
});
```

In V2 `skipWaiting`/`claim` ci sono, MA: se l'utente apre la PWA installata senza fare hard-reload, il browser usa lo SW vecchio. Bisogna anche bumpare `CACHE_NAME` (per invalidare la cache dei file) E mandare un `postMessage` ai client per chiedere reload. Mancante in V2 → la gente vede ancora la vecchia versione.

**Severità**: MEDIA (rilevante per chi installa).
**Fix**: V3 bumpa cache + invia messaggio `{ type: 'sw-updated' }` ai client + reload automatico opzionale.

---

### 🟡 BASSO 7 — `animateDeflate` (gonfiaggio) continua dopo `state.done` (`gonfiaggio.js:108`)

```js
function animateDeflate() {
  const step = () => {
    if (state.pressure > 0) {
      state.pressure = Math.max(0, state.pressure - 0.15);
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}
```

**Causa**: continua a girare anche dopo che il mini-game è finito e si è passati al prossimo. Spreca CPU per ~3-4 secondi.
**Severità**: BASSA.
**Fix**: aggiungere check `if (state.done) return;` dentro `step`.

---

### 🟡 BASSO 8 — AudioContext non testato su gesture iOS prima del primo `play()`

`SFX.init()` viene chiamato in `DOMContentLoaded`, ma su iOS Safari l'`AudioContext` parte in stato `suspended`. Il primo `play()` chiama `ctx.resume()` ma se il primo evento è il `customer_in` schedulato via `setTimeout`, **non c'è una user gesture attiva**. Il context resta sospeso → click successivi funzionano, ma alcuni device potrebbero rifiutare il resume in background.

**Severità**: BASSA (degradato non-critico).
**Fix**: resume audio anche su click di `mode-card` prima di startMode().

---

### 🟡 BASSO 9 — `App.heartbeatActive` non resettato su `quitToMenu()` se heartbeat era in corso

```js
function quitToMenu() {
  SFX.stopAll();
  App.heartbeatActive = false;  // <-- SOLO se stopAll è effettivo
}
```

`SFX.stopAll()` cancella heartbeatInterval, ma se il game loop riprende per qualche frame residuo (vedi bug #2), può ri-attivare heartbeat. Side effect del bug #2.

---

## B) 🎨 DESIGN AUDIT (rispondo onesto)

### 1. Quante meccaniche distinte ci sono OGGI?
**5 meccaniche, ma 3 sono cugine strette.**

| # | Meccanica | Tipo |
|---|---|---|
| 1 | Smontagomme | tap a bersaglio fisso |
| 2 | Equilibratura | tap a bersaglio mobile-rotante |
| 3 | Gonfiaggio | hold-release con timing |
| 4 | Assetto | drag continuo |
| 5 | Boss Truck | tap a bersaglio fisso (= clone di #1) |

3 su 5 sono *tap di precisione*. La varietà reale è **2-3**.

### 2. Dopo quanti secondi un giocatore vede TUTTO?
**~90 secondi.** Una run completa di Arcade (60s) ti fa vedere tutti e 4 i mini-games, 1-2 clienti, forse 1 evento. Il Boss Truck arriva dopo 8 clienti = solitamente fuori dalla prima run. In 2 run hai visto **tutto il gioco**.

### 3. Cosa cambia tra Run 1 e Run 10?
**Solo il punteggio.** Stessi mini-games, stesso ordine random, stessi clienti random, stessi 3 eventi possibili, stesso loop. **Fallimento conclamato** secondo i criteri stessi del prompt.

### 4. Curva di difficoltà o "stessa cosa più veloce"?
**Stessa cosa più veloce.** `App.difficulty += 0.15` per cliente. L'unico effetto: `targetWindow` più piccolo, `driftStrength` più alto, `sabotageRate` leggermente su. **Zero meccaniche nuove introdotte mai.**

### 5. Ci sono scelte significative?
**No.** Il giocatore non sceglie: cliente è random, mini-game è random, evento è random. Pure reaction loop. Nessun build, nessun upgrade, nessun deck, nessuna strategia.

### 6. Cosa rende la run 50 diversa dalla run 5?
**Nulla.** Forse vedi un boss truck in più. Forse incontri un cliente che non avevi mai visto. Ma il gameplay loop è **identico**. Nessun unlock, nessuna nuova mappa, nessuna nuova arma, nessun nuovo cliente, nessuna nuova regola. Sei al run 1 mascherato da run 50.

---

## C) 📊 BENCHMARK — cosa fanno LORO che IO non faccio

### 🍉 Suika Game
- **Loro**: una sola meccanica (drop fruit) ma con *fisica emergente* che crea momenti irripetibili. Combo casuali, eventi imprevedibili dalla collisione.
- **Io**: 5 meccaniche che non si parlano. Niente emergenza, niente fisica, niente "oh guarda cos'è successo".
- **Da rubare**: una meccanica che PRODUCA situazioni che il gioco non ha previsto.

### 🧛 Vampire Survivors
- **Loro**: **20+ personaggi**, **40+ armi**, **sinergie** tra weapon evolutions. Ogni run è un build diverso. Meta-progressione: gold tra le run sblocca characters/weapons.
- **Io**: 1 personaggio (il gommista), 0 sinergie, 0 unlock, 0 meta-progressione.
- **Da rubare**: **shop tra le run**, upgrade persistenti, sinergie tra utensili.

### 🃏 Balatro
- **Loro**: il giocatore *costruisce un build* di jolly e blueprint, ogni mano è una **scelta** di combinazione. La math della stessa carta cambia con il jolly equipaggiato.
- **Io**: nessuna scelta. Il giocatore reagisce e basta.
- **Da rubare**: **scelte significative** prima/durante la run.

### 🐔 Crossy Road
- **Loro**: 1 input (tap), ma **decine di "level themes"** (autostrada, fiume, treni, vichinghi, futuristico…) e un **roster di personaggi** sbloccabili. La varietà arriva dall'**ambiente** e dal **personaggio**, non dalla meccanica.
- **Io**: 1 ambiente (officina), 0 alternative.
- **Da rubare**: **15 livelli con identità grafica e regola unica**.

---

## D) 📌 LA DIAGNOSI IN UNA FRASE

> **V2 è una demo tecnica con UN loop e CINQUE skin sopra. Per essere un GIOCO le manca: scelta, build, scoperta, varietà di regole, meta-progressione persistente, e contenuto che si riveli con il tempo.**

I tre fix design più importanti, in ordine di leva:

1. **15 livelli con regola UNICA** (notturno, bagnato, VIP, truck day, rally, black-out, ispezione, gran premio…). Risolve la noia di vedere tutto in 90 secondi.
2. **Negozio di upgrade tra le run**. Risolve "non ho motivo di ricominciare". Il loop diventa: gioca → guadagna → potenzia → torna più forte.
3. **Stelle + galleria clienti + pokédex**. Risolve "non ho meta-obiettivi". Hai sempre qualcosa da completare.

Tutto il resto (juice, audio, personaggi, eventi) è cosmesi sopra una struttura malata. **Prima si cura la struttura, poi si trucca.**

---

## 🛠 PIANO DI CURA (V3)

| Fase | Cosa | File toccati |
|---|---|---|
| 1 | Fix heartbeat-ogni-frame | `audio.js` |
| 1 | Fix loop immortale (flag `alive`) | `main.js` |
| 1 | Fix listener leak | `main.js` |
| 1 | Fix `currentGame` stale | `main.js` |
| 1 | Fix timer non cancellati | `main.js` |
| 1 | Fix gonfiaggio deflate residuo | `gonfiaggio.js` |
| 1 | SW bump v3 + force update | `sw.js` |
| 2 | 15 livelli con modificatori reali | NEW `js/levels.js` + `main.js` |
| 2 | Mini-game `manopump` (compressore guasto) | NEW `js/games/manopump.js` |
| 2 | Mega Truck a 12 ruote (gran premio) | `bosstruck.js` (variante) |
| 2 | Spotlight / Blackout permanente / Slippery / Inspector | `main.js` + patch mini-games |
| 3 | 12+ upgrade persistenti | NEW `js/upgrades.js` |
| 4 | Galleria clienti (pokédex) + stelle | `customers.js`, `storage.js`, `main.js` |
| 4 | 20+ achievement | `achievements.js` |
| 5 | Nuove schermate: campagna, shop, galleria | `index.html`, `styles.css`, `main.js` |

Tempo stimato di scrittura: ~2h di lavoro denso. Inizio adesso.

---

*Diagnosi datata 2026-05-15, firmata dal codice stesso senza pietà.*
