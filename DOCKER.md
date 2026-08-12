# Studify — Docker

## Requisiti

- Docker Desktop (Windows/Mac) o Docker Engine + Compose (Linux)
- Porte libere: **3005**
- Per l’**app mobile** sulla stessa Wi‑Fi: firewall Windows deve consentire **TCP 3005** (rete privata). Pagina pairing: `http://IP_PC:3005/collega`

## Avvio rapido

```bash
cd volentieri   # cartella del progetto
docker compose build
docker compose up -d
```

Apri: **http://localhost:3005**

Log:

```bash
docker compose logs -f studify
```

Stop:

```bash
docker compose down
```

## Dati persistenti

Di default Compose monta **`./data` del host** → `/app/data` nel container  
(stesso DB SQLite e foto che usi con `npm run dev`).

Alternative:

```yaml
# volume Docker (DB separato dal host)
- studify-data:/app/data
```

Dopo un cambio di volume:

```bash
docker compose up -d
```

## Generazione AI (Claude / Grok CLI)

La generazione chiama `claude` / `grok` via `child_process`.

| Ambiente | Comportamento |
|----------|----------------|
| **Container “base”** | App e PDF/roadmap/quiz ok. **Genera nuovo piano** richiede CLI nel container. |
| **Host (npm run dev)** | CLI già sul PC → generazione ok. |
| **Container + mount CLI** (Linux/Mac più semplice) | Monta binari + cartelle auth (vedi commenti in `docker-compose.yml`). |

Su **Windows** montare `claude.exe` / login nel container è scomodo. Workflow consigliato:

1. **Genera** piani su host (`npm run dev -- -p 3005`)
2. **Serve** in Docker con `./data` montato per compagni / homelab

Oppure genera solo in container se installi e autentichi le CLI lì (immagine custom).

## Build standalone

Il `Dockerfile` usa `output: "standalone"` di Next.js + `better-sqlite3` nativo (compilato in stage `builder` su Debian bookworm).

## Healthcheck

Compose verifica `http://127.0.0.1:3005` ogni 30s.

## Troubleshooting

```bash
# rebuild pulito
docker compose build --no-cache
docker compose up -d

# shell nel container
docker compose exec studify sh

# ispeziona DB
docker compose exec studify ls -la /app/data
```

Se `better-sqlite3` non carica: rebuild completo (`--no-cache`) — il binding deve essere linux/glibc, non copiato da Windows.
