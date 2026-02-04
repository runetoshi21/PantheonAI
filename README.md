# Pantheon Liquidity Terminal

Pantheon Liquidity Terminal is a Next.js UI backed by a Node/Express API for scanning Solana liquidity across Raydium, Meteora, and PumpSwap. The UI renders a depth band view and pool diagnostics while the API aggregates protocol data and exposes CLMM helpers.

## Repo Layout

- `src/` Next.js app (UI + API proxy)
- `server/` Express API, integrations, and on-chain helpers

## Quick Start

Install dependencies:

```bash
npm install
npm -C server install
```

Configure the API:

1. Create `server/.env` based on `server/.env.example`.
2. Set at least `SOLANA_RPC_URL` and `RAYDIUM_API_BASE_URL`.

Run the backend:

```bash
npm -C server run dev
```

Run the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Configuration

Server environment variables (see `server/.env.example`):

- `SOLANA_RPC_URL` (required)
- `RAYDIUM_API_BASE_URL` (required)
- `SOLANA_CLUSTER` (optional, default `mainnet-beta`)
- `TX_VERSION` (optional, `v0` or `legacy`)
- `SERVER_PAYER_SECRET_KEY` (optional, for server-side signing)
- `RAYDIUM_API_BASE_HOST` (optional override)

Frontend API proxy (optional):

- `PANTHEON_API_BASE_URL` (default `http://localhost:3001`)

## Key Endpoints

- `GET /v1/liquidity/by-mint/:mint`
- `GET /v1/raydium/pools/by-mint/:mint`
- `GET /v1/meteora/pools/:mint`
- `GET /api/pumpswap/pool/:mint`
- `POST /api/pumpswap/liquidity/deposit/build`

## Scripts

Frontend:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Backend:

```bash
npm -C server run dev
npm -C server run build
npm -C server run start
npm -C server run lint
npm -C server run typecheck
```
