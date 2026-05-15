# 🔍 ANALISI — V1: cosa NON funziona

> Documento di autocritica scritta dopo che il giocatore reale ha detto:
> *"Funziona, è pulito, ma è BANALE. Non lo mostrerei a un amico."*
>
> Questo file esiste perché V1 era un **fallimento mascherato da successo tecnico**.
> Lavoro pulito ≠ gioco divertente. La differenza è qui sotto, senza pietà.

---

## ❌ 1. Sembra un esercizio di programmazione, non un gioco

V1 è **quattro puzzle in fila** con uno skin gommista incollato sopra. Tolto il tema "officina", potresti scambiarli con "premi i bottoni illuminati" senza che cambi nulla. Manca **identità**, manca **anima**, manca **mondo**.

**Sintomo concreto:** dopo 60 secondi sai già tutto. Sai cosa farai al minuto 5, al minuto 10. Non c'è **incognita**. La curva di scoperta termina sostanzialmente al primo giro completo.

## ❌ 2. Zero personaggi → zero motivo per tornare

Le auto sono sagome anonime su un ponte. Non c'è un **cliente**. Non c'è una **storia di 5 secondi**. Non c'è un *Bruno il Tamarro* che ti dice *"Aoh dotto', le low profile per stasera!"* prima di scaricarti una Smart truccata.

Senza personaggi:
- nessun motivo di **fretta emotiva**, solo un timer freddo
- nessun motivo di **mancia variabile** → il guadagno è una funzione lineare
- nessun motivo di **raccontare la partita** a qualcuno
- nessun aneddoto. *"Ti ricordi quella volta che..."* → no, perché non è successo niente.

## ❌ 3. Combo invisibile = combo inesistente

C'è una scritta `Combo x3` in un angolo dell'HUD. **Punto.** Niente fiamme, niente fuoco che si accende sui bordi, niente musica che cambia, niente schermo che pulsa. Il giocatore non *sente* il combo, lo **legge**. Brutto.

Game-design rule: se il giocatore deve leggere per capire che sta facendo bene, **hai sbagliato il feedback**.

## ❌ 4. Niente JUICE. Letteralmente niente.

Apri V1 e premi un bullone. Cosa succede?
- Cambia un colore del cerchietto.
- Riproduce un suoncino di 50ms.
- Una vibrazione opzionale.

**Cosa DEVE succedere:**
- Scintille che schizzano via dal punto di contatto
- Il bullone che vola fuori dallo schermo ruotando
- Un numero "+50" che balza e fluttua
- Lo schermo che vibra di 4 pixel
- Un suono stratificato: clang + tonalità che cresce nella combo
- Un flash giallo sull'icona che ha generato il punto

Il principio del *"juice it or lose it"* di Jan Willem Nijman è violato in ogni singola interazione. Il gioco **non risponde** in modo soddisfacente alla pressione.

## ❌ 5. Difficoltà = numero più alto

In Carriera, salire di livello significa *"il timer è più stretto, la finestra verde è più piccola"*. Insomma: meccaniche identiche, soglie diverse. **Pigro.** Non è progressione, è regolazione di un dial.

Una vera progressione introduce **regole nuove**, non solo tolleranze ridotte. Niente sabotaggi, niente eventi, niente boss, niente clienti più strani al crescere del livello.

## ❌ 6. Nessun "ancora una"

V1 non ha la trappola **"ok, ancora una run e basta"**. Finisce, mostra il punteggio, torna al menu. Punto. Nessuna ricompensa meta-persistente, nessun "ti manca poco al prossimo sblocco", nessun *daily quirk*, nessun gattino dell'officina che ti fa "ah ah ah".

I giochi che incollano (Vampire Survivors, Balatro, Slay the Spire) **chiudono** una run con un altro motivo per cliccare "Retry". V1 chiude con un muro.

## ❌ 7. Mini-games tutti uguali nel ritmo

I 4 mini-games hanno **lo stesso ritmo** (15-20 secondi cadauno, tap-and-wait). Non c'è alternanza tra *stress alto / stress basso*. Non c'è il sollievo di un mini-game contemplativo dopo uno frenetico. È un battito cardiaco a frequenza costante: noia clinica.

## ❌ 8. Zero racconto, zero meme-ability

Mostri questo a un amico a pranzo. Quale frase pronuncia? *"Carino"*. Hai perso. Non avrai un meme, non avrai uno screenshot, non avrai una clip TikTok. Un gioco mobile arcade del 2026 senza un secondo memorabile **non esiste sui social, quindi non esiste**.

---

# 🎯 LA DIAGNOSI

> **V1 ha confuso il gameplay loop con il gameplay.**
>
> Loop = clic, clic, clic, vinci, ricomincia.
> Gameplay = il *perché* premi quel clic, il *chi* ti guarda mentre lo fai, il *cosa* può andare storto.

V1 è uno **scheletro funzionante senza muscoli, senza pelle, senza voce**.

# 🔥 LA CURA — V2

Tre direzioni implementate contemporaneamente perché si rinforzano:

1. **🎭 CLIENTI con anima** → 10 archetipi con nome, faccia procedurale, frasi-tormentone, pazienza diversa, mancia variabile. Bruno Tamarro paga il doppio se nail in 15s; la Signora paga poco ma aspetta sempre; il Pilota Rally ha 15s o brucia l'officina; lo Youtuber filma e tippa se fai performance.

2. **💥 JUICE TOTALE** → ogni azione spara scintille, fa popup di numeri che ballano, scuote lo schermo, accende il vignetting rosso quando la pazienza scende, slow-motion sul boss kill, audio stratificato che cambia colore al variare del combo.

3. **🚚 BOSS TRUCK ogni 10 clienti** → 8 ruote in 45 secondi, klaxon che annuncia l'arrivo, musica che raddoppia, schermo che lampeggia arancione. Vittoria = "+5000 BOSS DEFEATED!" in arcobaleno con confetti. **Questo è il momento che racconti a tuo cugino.**

4. **🐱 EVENTI RANDOM** → blackout (10% chance, 4 secondi di buio con solo scintille visibili), gatto dell'officina che ruba un bullone (toccalo per recuperarlo), compressore che esplode e fa tremare la lancetta. **Imprevisto = aneddoto = ti racconto la run.**

5. **🔥 COMBO ESCALATION VISIBILE** → x2 popup gialli, x4 fiamme nei bordi, x6 trail di fuoco sul cursore, x8 slow-mo sui colpi perfetti, x10 schermata diventa arcobaleno per 2 secondi.

6. **🩹 SABOTAGGI** → 15% chance: bullone arrugginito (3 tap invece di 1), gomma sgonfia all'arrivo (devi pomparla due volte), squilibrio invertito. Tradimento del cliente precedente = paranoia = controllo = adrenalina.

7. **🎵 AUDIO LAYERS** → SFX procedurali stratificati. Il kick aumenta col combo. Heartbeat sotto-soglia quando la pazienza è < 30%. Klaxon di brass per il boss truck. Slow-mo cue al finale.

---

# 📊 METRICA DI SUCCESSO V2

V2 è riuscita se:

- ✅ Dopo la prima run il giocatore dice **"Ok ancora una"**
- ✅ Dopo la quinta run racconta a qualcuno **"C'è questo tipo, Bruno il Tamarro..."**
- ✅ Dopo il primo Boss Truck fa **lo screenshot** della schermata "BOSS DEFEATED"
- ✅ Dopo il gatto fa **uno scatto col cellulare**
- ✅ Vuole installarla come app — non solo aprire un link

Se tutto questo non succede, V2 è fallita esattamente come V1.

---

*— scritto a denti stretti, perché V1 ha avuto quello che si meritava.*
