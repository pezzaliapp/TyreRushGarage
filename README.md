# 🛞 TyreRush Garage

> **PWA arcade dell'officina gommista.** Smonta, equilibra, gonfia e assetta il prima possibile! Mobile-first, 100% vanilla, offline-ready.

![status](https://img.shields.io/badge/status-V1-success) ![pwa](https://img.shields.io/badge/PWA-ready-orange) ![license](https://img.shields.io/badge/license-MIT-blue)

---

## 🎮 Concept

TyreRush Garage è un mini-game arcade automotive in formato PWA. Vesti i panni di un gommista in officina e completa quattro lavori per ogni vettura sulla rampa:

1. **🔩 Smontagomme** — tap rapido sui 5 bulloni della ruota
2. **⚖️ Equilibratura** — piazza i contrappesi sul settore verde mobile
3. **💨 Gonfiaggio** — rilascia la lancetta nella zona target del manometro
4. **🎯 Assetto** — trascina per centrare il laser sul mirino instabile

Più sei veloce, più alto è il **combo** e il **punteggio**. Auto consegnata = bonus 💰.

## 🕹️ Modalità

| Modalità | Descrizione |
|---|---|
| 🏁 **Arcade** | 60 secondi + tempo bonus per ogni auto, 3 vite |
| 🛠️ **Carriera** | 3 auto per livello, difficoltà crescente, sblocchi |
| ♾️ **Infinite Garage** | Niente timer, 5 vite, auto a raffica |

## ⭐ Features

- ✅ 4 mini-games con canvas 2D fluido a 60 fps
- ✅ Progressione livelli + coin + high score (localStorage)
- ✅ 8 achievement sbloccabili
- ✅ Audio procedurale **Web Audio API** (zero file esterni)
- ✅ Vibrazione haptic su mobile
- ✅ PWA: manifest + service worker offline-first
- ✅ Pausa automatica quando l'app va in background
- ✅ Installabile su iOS / Android / desktop
- ✅ Zero dipendenze npm, **vanilla puro**

## 🚀 Come giocare

### Online
👉 https://pezzaliapp.github.io/TyreRushGarage/

### Locale
```bash
git clone https://github.com/pezzaliapp/TyreRushGarage.git
cd TyreRushGarage
python3 -m http.server 8000
# apri http://localhost:8000
```

## 📦 Deploy su GitHub Pages

Il workflow `.github/workflows/pages.yml` pubblica automaticamente la `main` su GitHub Pages.

**Setup una tantum:**

1. Repository → **Settings** → **Pages**
2. **Source** → seleziona **GitHub Actions**
3. Pusha su `main`: il deploy parte da solo
4. URL finale: `https://pezzaliapp.github.io/TyreRushGarage/`

## 📱 Installa come app

| Piattaforma | Come fare |
|---|---|
| **iOS Safari** | Condividi → "Aggiungi a Home" |
| **Android Chrome** | Menù → "Installa app" (o usa il bottone 📲 Installa in-app) |
| **Desktop Chrome/Edge** | Icona "Installa" nella barra indirizzi |

## 🗂️ Struttura

```
TyreRushGarage/
├── index.html              # entry + DOM screens
├── manifest.json           # PWA manifest
├── sw.js                   # service worker offline-first
├── css/
│   └── styles.css          # tema officina, mobile-first
├── js/
│   ├── main.js             # state machine + loop 60fps
│   ├── storage.js          # localStorage wrapper
│   ├── audio.js            # SFX procedurali Web Audio
│   ├── achievements.js     # definizione obiettivi
│   └── games/
│       ├── smontagomme.js
│       ├── equilibratura.js
│       ├── gonfiaggio.js
│       └── assetto.js
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── .github/workflows/
    └── pages.yml           # deploy automatico
```

## 🎨 Stack tecnico

- **HTML5 + CSS3** custom (variabili, safe-area, animazioni CSS)
- **JavaScript ES6+** vanilla (IIFE modules, niente framework)
- **Canvas 2D** per i mini-games
- **Web Audio API** per SFX procedurali
- **Vibration API** per haptic
- **Service Worker** per offline + cache versionata

## 🛣️ Roadmap

- [ ] Sprite illustrate per i pneumatici
- [ ] Modalità multiplayer P2P (WebRTC)
- [ ] Skin officine sbloccabili con i coin
- [ ] Leaderboard locale settimanale
- [ ] Brand pack: gomme estive / invernali / racing

## 📜 Licenza

MIT © [pezzaliAPP](https://github.com/pezzaliapp)

---

Made with vanilla JS · for the open web
