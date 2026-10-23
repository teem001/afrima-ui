# AfriSmart UI

React + Vite + TypeScript frontend for AfriSmart — the agentic smart-city marketplace.
Talks to the backend over a single WebSocket (`/ws`).

Backend: https://github.com/teem001/afrima

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Vercel builds from this repo. Set `VITE_WS_URL` to `wss://afrima-cyan.vercel.app/ws` (also in `.env.production`).

Merchants can create a shop with photos/videos, add products with media, and restock when the shelf runs low.
