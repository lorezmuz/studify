# Studify Mobile

App **Expo SDK 54** (React Native 0.81) per Android e iOS: usa il PC come backend in LAN e tiene i piani **offline**.

## Requisiti

- Node 20+
- [Expo Go](https://expo.dev/go) compatibile con **SDK 54** sul telefono
- Backend Studify avviato sul PC (`npm run dev -- -p 3005` o Docker) sulla **stessa Wi‑Fi**

## Avvio

```bash
cd mobile
npm install
npx expo start
```

Scansiona il QR con Expo Go.

## Pairing

1. Sul PC apri **http://localhost:3005/collega** (o `http://IP_PC:3005/collega`)
2. Nell’app: **Collega al PC** → **Scansiona QR** (oppure incolla l’URL)
3. Sync automatico dei piani

Supportati anche deep link `studify://pair?baseUrl=…`.

Firewall Windows: porta **TCP 3005** rete privata.

## Funzionalità v1

| Feature | Online | Offline |
|---------|--------|---------|
| Lista piani | sync da PC | cache |
| Studio sezioni (MD + KaTeX) | sì | sì* |
| Roadmap / complete | sì | sì + outbox |
| Flashcard SM-2 | sì | sì + outbox |
| Quiz | sì | sì + outbox |
| Scanner QR pairing | sì | — |
| Genera piano AI | no (solo web/PC) | no |

\* KaTeX/marked via CDN la prima volta (poi cache WebView).

## API usate

- `GET /api/mobile/health`
- `GET /api/mobile/sync`
- `POST /api/mobile/push`
- `GET /api/mobile/pair` (pagina web QR)

## Struttura

```
App.tsx                 # navigazione a stack semplice
src/
  context/AppContext    # settings, cache, sync
  lib/                  # api, storage, sm2, sync
  screens/              # Home, Pair, Settings, Piano, Studio, Flash, Quiz
```

Cache e outbox: **AsyncStorage**.
