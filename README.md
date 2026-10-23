# AfriSmart UI

React + Vite + TypeScript frontend for AfriSmart — the agentic smart-city marketplace.
Talks to the backend exclusively over a single WebSocket (`/ws`); the only HTTP left is map tiles.

Backend: https://github.com/teem001/afrima

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173, proxies /ws to the backend on localhost:8087
```

Start the backend first (see the backend repo). Demo accounts (password `Password123!`):

| Email | Role |
|---|---|
| ada@afrismart.ng | consumer |
| yaba@afrismart.ng | merchant |

## Deploy to Vercel

This repo is Vercel-ready (`vercel.json`: Vite framework, `npm run build`, `dist` output, SPA rewrites).

1. Import this repo in Vercel.
2. Set (or rely on `.env.production`):

   | Name | Value |
   |---|---|
   | `VITE_WS_URL` | `wss://afrima-cyan.vercel.app/ws` |

3. Deploy. Wallet / Payouts / Twin / Verify are included: fund demo money from **Wallet**, then place orders.

## Build

```bash
npm run build      # tsc -b && vite build -> dist/
npm run preview
```
