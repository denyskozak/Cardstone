# Cardstone

Cardstone is a minimal yet production-minded boilerplate for a Hearthstone-inspired online card game. It ships with a PixiJS client, an authoritative Node.js WebSocket server, and a shared type layer that keeps the simulation deterministic and cheat-resistant.

## Project layout

```
client/      – Vite + React + PixiJS match UI
server/      – Node.js WebSocket authoritative game server
shared/      – Reusable types, constants, and demo card definitions
tests/       – Vitest unit tests for core reducer/validation logic
```

## Getting started

```bash
npm install
npm run dev
```

* The client is served on [http://localhost:5173](http://localhost:5173).
* The WebSocket server runs on `ws://localhost:8787`.
* Open the client in two browser tabs to play a demo match.

### Admin access

* Server-side credentials are configured through `ADMIN_USERNAME` and `ADMIN_PASSWORD` (defaults: `admin` / `password`).
* Tokens issued by `/api/admin/login` expire after `ADMIN_TOKEN_TTL_MS` milliseconds (1 hour by default) and can be validated via `/api/admin/me`.
* The client exposes a `/admin` page to request and store a token.

### Other scripts

```bash
npm run build   # build shared -> server -> client
npm run lint    # ESLint across all workspaces
npm run test    # Vitest suite for reducers & validation
```

## Gameplay rules (MVP)

* 1v1 duels, 30 card decks, four card mulligan-less opening hand.
* Player B receives an extra **Coin** spell that grants +1 mana for the current turn only.
* Mana starts at 1, increases by one (to a cap of 10) and refreshes each turn.
* Card types: **Minion** (cost/attack/health) and **Spell** (Firebolt, Heal, Coin demo effects).
* Turn phases: Start → Main → End. Players can only play cards during Main. End turn passes control to the opponent.
* Damage reduces hero HP; 30 HP per hero. When a hero reaches 0 HP the game ends.

## Networking model

* The server is the single source of truth. Clients send *intent* commands (`PlayCard`, `EndTurn`, etc.) with a `seq` and `nonce`. Duplicate or out-of-order commands are ignored.
* Messages are JSON with discriminated unions defined in `/shared/types.ts`.
* Server validation covers: turn/phase ownership, mana availability, card presence, target legality, and replay protections.
* `StateSync` broadcasts ship the full authoritative state (can be swapped with Immer patches later).
* Lightweight rate limiting (20 messages / 10s) and command queues throttle spam.
* RNG is seeded per match on the server; decks are shuffled server-side.

## Extending the prototype

* Add attacks by introducing `applyAttack` reducer helpers and extending `validateAttack` to enforce summoning sickness/taunt rules.
* Support keywords such as *Taunt*, *Charge*, or deathrattles via richer card definitions in `/shared` and corresponding reducer hooks.
* Expand the `Lobby` into matchmaking + deck selection, persisting player decks and stats.
* Replace full state syncs with Immer patches or CRDT-style diffs for bandwidth savings.
* Introduce persistence (Redis/Postgres) for long-lived matches and reconnect resilience beyond in-memory timers.

## Conventions

* ESLint + Prettier enforce consistent style; avoid try/catch around imports.
* Shared types are imported via the `@cardstone/shared` workspace alias.
* Keep validation pure (`/server/src/match/validate.ts`) and reducers deterministic (`/server/src/match/reducer.ts`).
