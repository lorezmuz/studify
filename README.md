# Studify

**Piani di studio personali** per medie e superiori: dalla materia (o dalle foto degli appunti) a una **roadmap giorno per giorno**, **flashcard SM-2**, **quiz** e **PDF** — con AI in locale sul tuo PC, senza API key a pagamento.

> Stack: **Next.js** + **SQLite** + **Docker** · AI via **Claude Code** / **Grok CLI** · Porta default **3005**

---

## Cosa fa

| Feature | Descrizione |
|---------|-------------|
| **Piani di studio** | Materia, argomenti, data esame, voto obiettivo |
| **Roadmap** | Percorso tipo “path” (stile Duolingo): sezioni, flashcard, quiz, progressi ed XP |
| **Riassunto strutturato** | Markdown + formule **KaTeX**, sezioni navigabili |
| **Flashcard** | Spaced repetition **SM-2** (valutazione 1–4) |
| **Quiz** | Domande a scelta multipla, punteggio, feedback AI opzionale |
| **PDF** | Esportazione del piano per studio offline su carta |
| **Foto appunti** | Upload (fino a 20 immagini) per contestualizzare la generazione |
| **Docker** | Un container, volume dati su `./data` |

**Non** è pensata per serverless “edge-only” (Vercel edge): serve **Node runtime** + filesystem (SQLite) e, per generare, `child_process` verso le CLI AI sulla macchina/homelab.

---

## Requisiti

- **Node.js 20+** (dev) oppure **Docker Desktop** / Engine + Compose
- Opzionale per *generare* piani nuovi:
  - [Claude Code](https://claude.ai/code) CLI (`claude`) autenticata, e/o
  - [Grok CLI](https://x.ai) (`grok`) autenticata
- Porta libera: **3005**

---

## Avvio rapido (dev)

```bash
git clone https://github.com/lorezmuz/studify.git
cd studify
npm install
npm run dev -- -p 3005
```

Apri **http://localhost:3005**

Override opzionali (`.env.local`):

```env
CLAUDE_CLI=claude
GROK_CLI=grok
DATA_DIR=./data
```

---

## Docker

```bash
docker compose build
docker compose up -d
```

→ **http://localhost:3005**

| Dettaglio | Valore |
|-----------|--------|
| Immagine | `studify:latest` |
| Volume | `./data` → `/app/data` (SQLite + upload) |
| Healthcheck | HTTP su `:3005` |

Guida completa (firewall, CLI AI, troubleshooting): **[DOCKER.md](./DOCKER.md)**.

### Workflow consigliato su Windows

1. **Genera** i piani con `npm run dev` sul host (CLI Claude/Grok già loggate).
2. **Servi** in Docker con `./data` montato per uso stabile in rete / homelab.

---

## Flusso utente (web)

1. **/** — lista piani ordinati per urgenza esame (countdown)
2. **/nuovo** — materia, argomenti, data, voto, provider AI, eventuali foto
3. Generazione → riassunto + flashcard + quiz + roadmap
4. **/piani/[id]** — path, sezioni, studio, export PDF
5. **/piani/[id]/flashcard** — ripasso SM-2
6. **/piani/[id]/quiz** — quiz e punteggio

Consultare un piano **già generato** non richiede AI.  
**Generare** richiede CLI autenticate sulla macchina che esegue il backend.

---

## Stack tecnico

| Layer | Tecnologia |
|-------|------------|
| UI | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Runtime API | Node.js (`serverExternalPackages`: better-sqlite3) |
| DB | SQLite (`data/studify.sqlite`), WAL |
| AI | Claude / Grok via CLI (`child_process`), JSON repair + retry |
| Math / MD | KaTeX, marked / react-markdown, DOMPurify |
| PDF | jsPDF |
| Deploy locale | Docker multi-stage, `output: "standalone"` |

### Struttura (sintesi)

```
src/
  app/           # pagine + route API
  components/    # UI (home, piano, path, flash, quiz, markdown…)
  lib/           # db, AI, SM-2, roadmap, PDF, tipi
data/            # SQLite + uploads (gitignored)
Dockerfile
docker-compose.yml
```

---

## API (backend)

| Route | Metodo | Ruolo |
|-------|--------|--------|
| `/api/piani` | `GET` | Lista piani |
| `/api/piani` | `POST` | Crea piano (`stato: generando`) |
| `/api/piani/[id]` | `GET` | Dettaglio + flashcard + quiz + roadmap + progress |
| `/api/piani/[id]` | `PATCH` | Aggiornamenti (es. progress) |
| `/api/piani/[id]/complete` | `POST` | Completa nodi roadmap |
| `/api/piani/[id]/nuovo-quiz` | `POST` | Nuovo quiz |
| `/api/genera` | `POST` | Invoca CLI AI e popola il DB |
| `/api/flashcard/[id]` | `PATCH` | Aggiorna SM-2 |
| `/api/quiz/[id]/submit` | `POST` | Punteggio (+ feedback AI se online) |
| `/api/upload` | `POST` | Foto appunti |
| `/api/preferenze` | `GET/POST` | Preferenze materia / provider |

Gli ID piano sono **nanoid** pubblici (`/piani/xK2p9aB`).

---

## Dati e privacy

- Tutto resta **sulla tua macchina** (`./data`): nessun account cloud obbligatorio.
- La cartella `data/` è in **`.gitignore`** (DB e foto non finiscono su GitHub).
- Generazione AI: il testo/appunti passano alla CLI locale già autenticata (Claude/Grok), non a chiavi API del progetto.

---

## App mobile

> Stato: **implementata (v1)** in `mobile/` — Expo React Native, cache offline + sync LAN.

### Avvio app

```bash
cd mobile
npm install
npx expo start
```

Apri con **Expo Go SDK 54** (Android/iOS). Pairing: sul PC apri **[/collega](http://localhost:3005/collega)** e nell’app **Scansiona QR** (o incolla l’URL).

Dettagli: **[mobile/README.md](./mobile/README.md)**.

### Piano prodotto (riferimento)

### Obiettivo

App **Android + iOS** (Expo / React Native) con interfaccia simile al web che:

1. In **LAN** usa il PC (Docker o dev su porta **3005**) come backend unico.
2. **Offline** tiene i piani già sincronizzati: studio, roadmap, flashcard, quiz e progressi.
3. **Non** sposta la generazione AI sul telefono (resta sul PC).

### Architettura

```
┌─────────────────────┐      Wi‑Fi casa / hotspot      ┌──────────────────────┐
│  Telefono Studify   │  HTTP  ─────────────────────►  │  PC Studify backend  │
│  Expo + DB locale   │  sync bundle + push mutazioni  │  Docker :3005        │
│  (cache offline)    │  ◄───────────────────────────  │  SQLite + AI CLI     │
└─────────────────────┘                                └──────────────────────┘
         │
         │ offline → solo cache locale
         ▼
   piani già scaricati (studio completo)
```

| Modalità | Comportamento |
|----------|----------------|
| **Online (LAN)** | Sync piani, invio progressi/quiz, generazione solo se PC ha CLI |
| **Offline** | Studio completo locale; coda (outbox) delle mutazioni |
| **Senza PC** | Solo cache; niente nuovi piani AI |

- **Source of truth**: SQLite sul PC.  
- **Telefono**: copia + outbox (progress, SM-2, risultati quiz).  
- Conflitti v1: *last-write-wins*.

### Decisioni di prodotto

| Tema | Scelta |
|------|--------|
| Piattaforme | **Android e iOS insieme** (Expo) |
| Offline v1 | **Studio completo** (flash, quiz, progressi + sync) |
| Pairing | **IP manuale + QR dal web** (`studify://pair?baseUrl=…`) |
| AI on-device | No |
| Stack UI | Tema allineato al web (zinc, path, card) |

### Pairing e rete

1. Pagina web **“Collega telefono”** → QR con `http://IP_PC:3005` (+ token opzionale).
2. In Impostazioni app: inserimento manuale URL + “Prova connessione”.
3. Requisiti PC: bind `0.0.0.0:3005`, firewall Windows TCP 3005 rete privata, stesso Wi‑Fi.
4. Backend da estendere: **CORS**, `GET /api/mobile/health`, bundle sync, `POST` push mutazioni.

### Cosa funziona offline (target)

| Feature | Offline |
|---------|---------|
| Lista / riassunto / path | Sì |
| Completare step roadmap | Sì (sync dopo) |
| Flashcard SM-2 | Sì (sync dopo) |
| Quiz + punteggio | Sì (feedback AI solo online) |
| Nuovo piano / genera AI | No |
| Upload foto | No in v1 |

### Fasi di implementazione

| Fase | Contenuto |
|------|-----------|
| **0** | Backend mobile-ready: CORS, health, sync/push, pagina QR, doc firewall |
| **1** | Shell Expo, tema Studify, pairing IP/QR, lista e dettaglio online |
| **2** | Cache SQLite locale, lettura offline, badge sync |
| **3** | Flash / quiz / progress offline + outbox + flush a reconnect |
| **4** | Polish, suoni, media, build EAS store |

### Fuori scope iniziale

- Generazione AI sul telefono  
- Account multi-utente cloud  
- Sostituire del tutto il web  
- mDNS automatico (opzionale dopo IP+QR)

### Criteri di successo v1

- [ ] Stessa Wi‑Fi → stessi piani del web  
- [ ] PC spento → piani in cache ancora leggibili e studiabili  
- [ ] UI riconoscibile come Studify  
- [ ] “Sincronizza” esplicito aggiorna la cache e svuota l’outbox  
- [ ] Pairing documentato in ~5 minuti  

---

## Roadmap prodotto (alto livello)

- [x] Web: piani, roadmap, flashcard, quiz, PDF, Docker  
- [x] Branding **Studify**  
- [ ] Backend API mobile (health, sync, CORS, QR)  
- [ ] App Expo Android + iOS  
- [ ] Offline completo + outbox  
- [ ] (Futuro) notifiche esame, media sync, monorepo tipi condivisi  

---

## Script utili

| Comando | Uso |
|---------|-----|
| `npm run dev -- -p 3005` | Sviluppo |
| `npm run build` | Build produzione |
| `docker compose up -d --build` | Rebuild e avvio container |

Script in `scripts/` (import materiale, check piani, debug render) sono utility di sviluppo, non necessarie per l’uso quotidiano.

---

## Licenza

Progetto privato / uso personale finché non diversamente indicato.  
Contributi e licenza open-source: da definire.

---

## Crediti

Nato come esperimento “imparare volentieri”, evoluto in **Studify**: studio locale, AI sul tuo PC, roadmap che si può portare in tasca (app in arrivo).
