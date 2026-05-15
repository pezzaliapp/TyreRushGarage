# 📜 VERSION — Changelog

## 🔥 V2.0.0 — "Dal banale al magnetico, l'officina prende vita"

> Data: 2026-05-15
> Trigger: il giocatore ha detto *"funziona ma è banale, non lo mostrerei a un amico"*.
> Vedi anche: [ANALISI.md](./ANALISI.md) per la critica spietata di V1.

### 🎭 PRIMA (V1) — il chore simulator

| Aspetto | V1 |
|---|---|
| Loop | 4 mini-games in fila per ogni "auto" anonima |
| Feedback | un cerchietto cambia colore + suoncino |
| Difficoltà | stessa meccanica con timer più stretto |
| Personaggi | nessuno — auto sagomate |
| Storia | nessuna |
| Eventi | nessuno |
| Boss | nessuno |
| Momento memorabile | nessuno |
| Combo | testo `x3` in un angolo |
| Reazione del giocatore | *"carino"* (= morto) |

### 💥 DOPO (V2) — l'officina che ti incolla

| Aspetto | V2 |
|---|---|
| Loop | **customer queue**: arrivano clienti uno a uno con nome, faccia, frase, mancia variabile |
| Feedback | scintille, popup numerici che ballano, screen shake, vignette rossa di pressione, slow-motion sui colpi epici |
| Difficoltà | + sabotaggi (bullone arrugginito, gomma sgonfia, drift aggressivo, inversione di rotazione) |
| Personaggi | **10 archetipi** con dialoghi: Bruno Tamarro, Pilota Rally, Signora Esposito, Tassinaro Romano, Trapper Rookie, Youtuber, Punk, Preside, Nonno Pino, Influencer Boomer |
| Storia | una frase di benvenuto, una di vittoria, una di rabbia, per ogni cliente |
| Eventi | **🐱 Gatto dell'officina** ruba bulloni · **💡 Blackout** (4s al buio) · **💨 Compressore impazzito** (shake continuo) |
| Boss | **🚚 SUPER TRUCK** ogni 8 clienti: 8 ruote, klaxon, musica raddoppia, +5000 + confetti rainbow |
| Momento memorabile | "BOSS DEFEATED!" in rainbow con slow-motion e fanfara — *quello* che il giocatore racconterà |
| Combo | escalation visiva: x3 popup, x5 flash colorati + slow-mo, x8 rainbow + chromatic aberration, x10 schermo arcobaleno |
| Audio | layered: heartbeat quando la pazienza è bassa, klaxon brass per il boss, drum loop nei momenti intensi, armonici extra al combo alto |
| Reazione attesa | *"oh m\* il gattino mi ha rubato il bullone!"* |

---

### ⚙️ DETTAGLI TECNICI

#### Nuovi moduli

- **`js/fx.js`** — JUICE engine: particelle, popup numerici scalanti, screen shake, screen flash, vignette pulsante, slow-motion, confetti, combo glow, rainbow overlay, chromatic aberration cue.
- **`js/customers.js`** — 10 archetipi clienti con nome, faccia procedurale disegnata su canvas, 3-4 frasi per ogni stato (hello/win/lose), pazienza calibrata, moltiplicatore mancia, probabilità sabotaggio.
- **`js/events.js`** — sistema eventi random (gatto, blackout, compressore) con disegno canvas, interazione (tap sul gatto = recupero +100), pesata sul combo del giocatore.
- **`js/games/bosstruck.js`** — boss truck a 8 ruote, intro klaxon, banner "SUPER TRUCK!", sfondo arancione pulsante, +5000 al kill.

#### Rewrite

- **`js/main.js`** — completamente riscritto: da loop "auto = 4 mini-game in fila" a loop **customer-centric** con pazienza variabile per cliente, eventi random, boss ogni 8 clienti, vignette di urgenza, heartbeat dinamico.
- **`js/audio.js`** — `Audio` → `SFX`, nuovi suoni (klaxon, heartbeat, boss_win, cat, blackout, customer_in/happy/angry, combo_up, slowmo_in), layered intensity con `setComboLevel`, `startHeartbeat`/`setHeartbeatBPM`, drum loop dinamico.
- **Tutti i 4 mini-games** — patchati: ogni hit chiama `FX.spark()`, `FX.popText()`, `FX.screenShake()`, ogni miss chiama `FX.hitBad()`. Aggiunto supporto `sabotage` per varianti.

#### UI

- **`index.html`** — nuova `customerCard` con portrait procedurale + speech bubble + indicatore mancia.
- **`css/styles.css`** — stili `.customer-card` con animazione di entrata bounce, pulse del tip indicator, glow arancio sul portrait.

#### PWA

- **`sw.js`** — bumpata cache `tyrerush-v2.0.0`, aggiunti i 5 nuovi file al pre-cache.

---

### 🎯 COSA È CAMBIATO IN UNA FRASE PER OGNI MINUTO

| Minuto 1 di V1 | Minuto 1 di V2 |
|---|---|
| "Premo bottoni" | "Bruno il Tamarro vuole le low profile e mi guarda" |
| "Score sale" | "Combo x3, lo schermo lampeggia, +250!" |
| "Avanti, prossimo bullone" | "OH C'È UN GATTO CHE MI RUBA IL BULLONE" |
| "Auto cambiata" | "*'Ti devo la VITTORIA!'* dice il Pilota Rally" |
| "Carino" | "Aspetta è arrivato il SUPER TRUCK" |

---

*— scritto dopo che il giocatore ha chiesto di stupirlo. La pressione produce gli upgrade migliori.*
