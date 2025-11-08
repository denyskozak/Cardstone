import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import type { MatchJoinInfo, PlayerSide } from '@cardstone/shared/types.js';
import { clientMessageSchema, type ValidatedClientMessage } from './net/protocol.js';
import { Lobby } from './lobby/Lobby.js';
import { RateLimiter } from './util/rateLimit.js';
import { Match } from './match/Match.js';
import {
  type CreateDeckPayload,
  type Deck,
  type DeckCardEntry,
  type DeckUpdatePayload,
  HERO_CLASSES,
  MAX_CARD_COPIES,
  MAX_DECK_SIZE,
  MAX_LEGENDARY_COPIES
} from '@cardstone/shared/decks.js';
import { DEFAULT_DECK } from '@cardstone/shared/constants.js';
import { cardsById, catalogCards } from './data/cards.js';

interface ConnectionContext {
  ws: WebSocket;
  playerId?: string;
  match?: Match;
  side?: PlayerSide;
  rateLimiter: RateLimiter;
  queue: Promise<void>;
  alive: boolean;
}

const server = createServer();
const wss = new WebSocketServer({ server });

const lobby = new Lobby();

const playerConnections = new Map<string, ConnectionContext>();
const matchConnections = new Map<string, Set<ConnectionContext>>();
const chatVisibilityByMatch = new Map<string, boolean>();
const deckStore = new Map<string, Deck>();

const DEFAULT_DECK_ID = 'starter-deck';
const DEFAULT_DECK_NAME = 'Starter Deck';
const DEFAULT_DECK_HERO_CLASS: Deck['heroClass'] = 'Mage';

function createDeckEntriesFromCardIds(cardIds: readonly string[]): DeckCardEntry[] {
  const counts = new Map<string, number>();
  for (const cardId of cardIds) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([cardId, count]) => ({ cardId, count }))
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
}

function seedDefaultDeck(): void {
  if (deckStore.has(DEFAULT_DECK_ID)) {
    return;
  }
  const cards = createDeckEntriesFromCardIds(DEFAULT_DECK);
  const now = new Date().toISOString();
  deckStore.set(DEFAULT_DECK_ID, {
    id: DEFAULT_DECK_ID,
    name: DEFAULT_DECK_NAME,
    heroClass: DEFAULT_DECK_HERO_CLASS,
    cards,
    createdAt: now,
    updatedAt: now
  });
}

seedDefaultDeck();

interface MatchTimerEntry {
  mulligan?: NodeJS.Timeout;
  turn?: NodeJS.Timeout;
  mulliganDeadline?: number | null;
  turnDeadline?: number | null;
}

const matchTimers = new Map<string, MatchTimerEntry>();

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T | undefined> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  return JSON.parse(raw) as T;
}

function normalizeDeckCards(entries?: DeckCardEntry[]): DeckCardEntry[] {
  const counts = new Map<string, number>();
  for (const entry of entries ?? []) {
    if (!entry || !entry.cardId) {
      continue;
    }
    const current = counts.get(entry.cardId) ?? 0;
    const amount = Number.isFinite(entry.count) ? Math.max(0, Math.floor(entry.count)) : 0;
    if (amount <= 0) {
      continue;
    }
    counts.set(entry.cardId, current + amount);
  }
  return Array.from(counts.entries())
    .map(([cardId, count]) => ({ cardId, count }))
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
}

function isHeroClass(value: string): value is Deck['heroClass'] {
  return HERO_CLASSES.includes(value as Deck['heroClass']);
}

function evaluateDeckPayload(payload: DeckUpdatePayload): {
  errors: string[];
  cards: DeckCardEntry[];
  total: number;
} {
  const errors: string[] = [];
  if (!payload.name || !payload.name.trim()) {
    errors.push('Deck name is required.');
  }
  if (!payload.heroClass || !isHeroClass(payload.heroClass)) {
    errors.push('A valid hero class is required.');
  }
  const normalized = normalizeDeckCards(payload.cards);
  let total = 0;
  for (const entry of normalized) {
    const card = cardsById.get(entry.cardId);
    if (!card) {
      errors.push(`Unknown card: ${entry.cardId}`);
      continue;
    }
    total += entry.count;
    if (payload.heroClass && isHeroClass(payload.heroClass)) {
      if (card.heroClass !== 'Neutral' && card.heroClass !== payload.heroClass) {
        errors.push(`Card ${card.name} is not available for ${payload.heroClass}.`);
      }
    }
    const maxCopies = card.rarity === 'Legendary' ? MAX_LEGENDARY_COPIES : MAX_CARD_COPIES;
    if (entry.count > maxCopies) {
      errors.push(`Card ${card.name} exceeds copy limit (${maxCopies}).`);
    }
  }
  if (total !== MAX_DECK_SIZE) {
    errors.push(`Deck must contain exactly ${MAX_DECK_SIZE} cards (currently ${total}).`);
  }
  return { errors, cards: normalized, total };
}

function serializeDeck(deck: Deck): Deck {
  return {
    ...deck,
    cards: deck.cards.map((entry) => ({ ...entry }))
  };
}

server.on('request', async (req, res) => {
  if (req.headers.upgrade?.toLowerCase() === 'websocket') {
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (!req.url) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  if (!url.pathname.startsWith('/api/')) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  try {
    if (url.pathname === '/api/cards' && req.method === 'GET') {
      sendJson(res, 200, catalogCards.map((card) => ({ ...card })));
      return;
    }

    if (url.pathname === '/api/decks') {
      if (req.method === 'GET') {
        const decks = Array.from(deckStore.values())
          .map((deck) => serializeDeck(deck))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        sendJson(res, 200, decks);
        return;
      }
      if (req.method === 'POST') {
        const payload = await readJsonBody<CreateDeckPayload>(req);
        if (!payload) {
          sendJson(res, 400, { message: 'Request body is required.' });
          return;
        }
        if (!payload.name || !payload.heroClass || !payload.cards) {
          sendJson(res, 400, { message: 'name, heroClass and cards are required.' });
          return;
        }
        const updatePayload: DeckUpdatePayload = {
          name: payload.name,
          heroClass: payload.heroClass,
          cards: payload.cards
        };
        const result = evaluateDeckPayload(updatePayload);
        if (result.errors.length > 0) {
          sendJson(res, 400, { message: 'Deck validation failed.', errors: result.errors });
          return;
        }
        const now = new Date().toISOString();
        const deck: Deck = {
          id: randomUUID(),
          name: updatePayload.name.trim(),
          heroClass: updatePayload.heroClass,
          cards: result.cards,
          createdAt: now,
          updatedAt: now
        };
        deckStore.set(deck.id, deck);
        sendJson(res, 201, serializeDeck(deck));
        return;
      }
      sendJson(res, 405, { message: 'Method not allowed' });
      return;
    }

    const deckMatch = url.pathname.match(/^\/api\/decks\/(.+)$/);
    if (deckMatch) {
      const deckId = deckMatch[1];
      const existing = deckStore.get(deckId);
      if (!existing) {
        sendJson(res, 404, { message: 'Deck not found.' });
        return;
      }
      if (deckId === DEFAULT_DECK_ID && req.method !== 'GET') {
        sendJson(res, 403, { message: 'The starter deck cannot be modified or deleted.' });
        return;
      }
      if (req.method === 'GET') {
        sendJson(res, 200, serializeDeck(existing));
        return;
      }
      if (req.method === 'PUT') {
        const payload = await readJsonBody<DeckUpdatePayload>(req);
        if (!payload) {
          sendJson(res, 400, { message: 'Request body is required.' });
          return;
        }
        if (!payload.name || !payload.heroClass || !payload.cards) {
          sendJson(res, 400, { message: 'name, heroClass and cards are required.' });
          return;
        }
        const updatePayload: DeckUpdatePayload = {
          name: payload.name,
          heroClass: payload.heroClass,
          cards: payload.cards
        };
        const result = evaluateDeckPayload(updatePayload);
        if (result.errors.length > 0) {
          sendJson(res, 400, { message: 'Deck validation failed.', errors: result.errors });
          return;
        }
        const updated: Deck = {
          ...existing,
          name: updatePayload.name.trim(),
          heroClass: updatePayload.heroClass,
          cards: result.cards,
          updatedAt: new Date().toISOString()
        };
        deckStore.set(deckId, updated);
        sendJson(res, 200, serializeDeck(updated));
        return;
      }
      if (req.method === 'DELETE') {
        deckStore.delete(deckId);
        res.statusCode = 204;
        res.end();
        return;
      }
      sendJson(res, 405, { message: 'Method not allowed' });
      return;
    }

    sendJson(res, 404, { message: 'Not Found' });
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(res, 400, { message: 'Invalid JSON payload.' });
      return;
    }
    console.error('REST handler error', error);
    sendJson(res, 500, { message: 'Internal server error' });
  }
});

function attachToMatch(context: ConnectionContext, match: Match, side: PlayerSide): void {
  ensureMatchTimer(match);
  context.match = match;
  context.side = side;
  if (!matchConnections.has(match.id)) {
    matchConnections.set(match.id, new Set());
  }
  matchConnections.get(match.id)!.add(context);
  if (!chatVisibilityByMatch.has(match.id)) {
    chatVisibilityByMatch.set(match.id, false);
  }
  const payload: MatchJoinInfo = {
    playerId: context.playerId!,
    matchId: match.id,
    side
  };
  sendMessage(context, { t: 'MatchJoined', payload });
  const collapsed = chatVisibilityByMatch.get(match.id) ?? false;
  sendMessage(context, { t: 'ChatVisibility', payload: { collapsed } });
  sendStateSync(match);
}

function sendMessage(context: ConnectionContext, message: unknown): void {
  if (context.alive) {
    context.ws.send(JSON.stringify(message));
  }
}

function broadcastToMatch(matchId: string, message: unknown): void {
  const connections = matchConnections.get(matchId);
  if (!connections) {
    return;
  }
  for (const conn of connections) {
    sendMessage(conn, message);
  }
}

function ensureMatchTimer(match: Match): MatchTimerEntry {
  let entry = matchTimers.get(match.id);
  if (!entry) {
    entry = {};
    matchTimers.set(match.id, entry);
  }
  return entry;
}

function clearTimer(entry: MatchTimerEntry, key: 'mulligan' | 'turn'): void {
  const handle = entry[key];
  if (handle) {
    clearTimeout(handle);
    delete entry[key];
  }
}

function updateMatchTimers(match: Match): void {
  const entry = ensureMatchTimer(match);
  const state = match.getState();
  const now = Date.now();

  if (state.winner) {
    clearTimer(entry, 'mulligan');
    clearTimer(entry, 'turn');
    entry.mulliganDeadline = null;
    entry.turnDeadline = null;
    return;
  }

  const mulliganDeadline = state.stage === 'Mulligan' ? state.timers.mulliganEndsAt : null;
  if (mulliganDeadline && entry.mulliganDeadline !== mulliganDeadline) {
    clearTimer(entry, 'mulligan');
    const delay = Math.max(0, mulliganDeadline - now);
    entry.mulligan = setTimeout(() => handleMulliganTimeout(match.id), delay);
    entry.mulliganDeadline = mulliganDeadline;
  } else if (!mulliganDeadline) {
    clearTimer(entry, 'mulligan');
    entry.mulliganDeadline = null;
  }

  const turnDeadline =
    state.stage === 'Play' && state.turn.phase === 'Main' ? state.timers.turnEndsAt : null;
  if (turnDeadline && entry.turnDeadline !== turnDeadline) {
    clearTimer(entry, 'turn');
    const delay = Math.max(0, turnDeadline - now);
    entry.turn = setTimeout(() => handleTurnTimeout(match.id), delay);
    entry.turnDeadline = turnDeadline;
  } else if (!turnDeadline) {
    clearTimer(entry, 'turn');
    entry.turnDeadline = null;
  }
}

function handleMulliganTimeout(matchId: string): void {
  const match = lobby.getMatch(matchId);
  if (!match) {
    return;
  }
  const changed = match.forceCompleteMulligan();
  if (changed) {
    sendStateSync(match);
  } else {
    updateMatchTimers(match);
  }
}

function handleTurnTimeout(matchId: string): void {
  const match = lobby.getMatch(matchId);
  if (!match) {
    return;
  }
  const changed = match.handleTurnTimeout();
  if (changed) {
    sendStateSync(match);
  } else {
    updateMatchTimers(match);
  }
}

function sendStateSync(match: Match): void {
  const state = match.getState();
  const connections = matchConnections.get(match.id);
  updateMatchTimers(match);
  if (!connections) {
    return;
  }
  const message = { t: 'StateSync', seq: state.seq, payload: { state } };
  for (const conn of connections) {
    if (conn.alive) {
      conn.ws.send(JSON.stringify(message));
    }
  }
  if (state.winner) {
    const gameOver = { t: 'GameOver', payload: { winner: state.winner } };
    for (const conn of connections) {
      if (conn.alive) {
        conn.ws.send(JSON.stringify(gameOver));
      }
    }
  }
}

function sendToast(context: ConnectionContext, message: string): void {
  sendMessage(context, { t: 'Toast', payload: { message } });
}

wss.on('connection', (ws) => {
  const context: ConnectionContext = {
    ws,
    rateLimiter: new RateLimiter(20),
    queue: Promise.resolve(),
    alive: true
  };


  ws.on('message', (data) => {
    if (!context.rateLimiter.allow()) {
      sendToast(context, 'Slow down!');
      return;
    }
    context.queue = context.queue
      .then(async () => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(data));
        } catch (error) {
          sendToast(context, 'Malformed JSON');
          return;
        }
        const result = clientMessageSchema.safeParse(parsed);
        if (!result.success) {
          sendToast(context, 'Invalid message');
          return;
        }
        await handleClientMessage(context, result.data);
      })
      .catch((error) => {
        console.error('Failed to handle message', error);
        sendToast(context, 'Internal server error');
      });
  });

  ws.on('close', () => {
    context.alive = false;
    if (context.playerId) {
      playerConnections.delete(context.playerId);
      lobby.leave(context.playerId);
    }
    if (context.match && context.side) {
      const peers = matchConnections.get(context.match.id);
      if (peers) {
        peers.delete(context);
        if (peers.size === 0) {
          matchConnections.delete(context.match.id);
          chatVisibilityByMatch.delete(context.match.id);
        }
      }
      for (const peer of peers ?? []) {
        sendMessage(peer, { t: 'OpponentLeft', payload: { playerId: context.playerId } });
      }
    }
  });

  ws.on('pong', () => {
    context.alive = true;
  });
});

async function handleClientMessage(
  context: ConnectionContext,
  message: ValidatedClientMessage
): Promise<void> {
  switch (message.t) {
    case 'JoinMatch': {
      const requestedPlayerId = message.payload.playerId;
      let playerId = requestedPlayerId ?? randomUUID();
      const existing = requestedPlayerId ? playerConnections.get(requestedPlayerId) : undefined;
      if (existing && existing !== context) {
        if (message.payload.matchId === 'auto') {
          playerId = randomUUID();
        } else {
          existing.alive = false;
          try {
            existing.ws.close();
          } catch (error) {
            console.error('Failed to close existing connection', error);
          }
        }
      }
      context.playerId = playerId;
      playerConnections.set(playerId, context);
      if (message.payload.matchId === 'auto') {
        const match = lobby.join(playerId, (m, side) => {
          const existing = playerConnections.get(playerId);
          if (existing) {
            attachToMatch(existing, m, side);
          }
        });
        if (!match) {
          sendToast(context, 'Waiting for an opponent...');
        }
      } else {
        const match = lobby.getMatch(message.payload.matchId);
        if (!match) {
          sendToast(context, 'Match not found');
          return;
        }
        const side = match.findSideByPlayerId(playerId);
        if (!side) {
          sendToast(context, 'You are not part of this match');
          return;
        }
        attachToMatch(context, match, side);
      }
      break;
    }
    case 'Ready': {
      if (!context.match || !context.playerId) {
        sendToast(context, 'Join a match first');
        return;
      }
      context.match.markReady(context.playerId);
      sendMessage(context, { t: 'ActionResult', payload: { ok: true } });
      sendStateSync(context.match);
      break;
    }
    case 'MulliganReplace': {
      if (!context.match || !context.playerId || !context.side) {
        sendToast(context, 'Join a match first');
        return;
      }
      const result = context.match.handleMulliganReplace(
        context.playerId,
        message.seq!,
        message.nonce!,
        message.payload.cardId
      );
      sendMessage(context, { t: 'ActionResult', seq: message.seq, payload: result });
      if (result.stateChanged) {
        sendStateSync(context.match);
      }
      if (!result.ok && result.error) {
        sendToast(context, result.error);
      }
      break;
    }
    case 'MulliganApply': {
      if (!context.match || !context.playerId || !context.side) {
        sendToast(context, 'Join a match first');
        return;
      }
      const result = context.match.handleMulliganApply(
        context.playerId,
        message.seq!,
        message.nonce!
      );
      sendMessage(context, { t: 'ActionResult', seq: message.seq, payload: result });
      if (result.stateChanged) {
        sendStateSync(context.match);
      }
      if (!result.ok && result.error) {
        sendToast(context, result.error);
      }
      break;
    }
    case 'PlayCard': {
      if (!context.match || !context.playerId || !context.side) {
        sendToast(context, 'Join a match first');
        return;
      }
      const result = context.match.handlePlayCard(
        context.playerId,
        message.seq!,
        message.nonce!,
        message.payload.cardId,
        message.payload.target,
        message.payload.placement
      );
      sendMessage(context, { t: 'ActionResult', seq: message.seq, payload: result });
      if (result.stateChanged) {
        sendStateSync(context.match);
      }
      if (!result.ok && result.error) {
        sendToast(context, result.error);
      }
      break;
    }
    case 'EndTurn': {
      if (!context.match || !context.playerId || !context.side) {
        sendToast(context, 'Join a match first');
        return;
      }
      const result = context.match.handleEndTurn(context.playerId, message.seq!, message.nonce!);
      sendMessage(context, { t: 'ActionResult', seq: message.seq, payload: result });
      if (result.stateChanged) {
        sendStateSync(context.match);
      }
      if (!result.ok && result.error) {
        sendToast(context, result.error);
      }
      break;
    }
    case 'Attack': {
      if (!context.match || !context.playerId || !context.side) {
        sendToast(context, 'Join a match first');
        return;
      }
      const result = context.match.handleAttack(
        context.playerId,
        message.seq!,
        message.nonce!,
        message.payload.attackerId,
        message.payload.target
      );
      sendMessage(context, { t: 'ActionResult', seq: message.seq, payload: result });
      if (result.stateChanged) {
        sendStateSync(context.match);
      }
      if (!result.ok && result.error) {
        sendToast(context, result.error);
      }
      break;
    }
    case 'Emote': {
      if (!context.match || !context.playerId || !context.side) {
        return;
      }
      const peers = matchConnections.get(context.match.id);
      for (const peer of peers ?? []) {
        if (peer !== context) {
          sendMessage(peer, {
            t: 'Toast',
            payload: { message: `Opponent emote: ${message.payload.type}` }
          });
        }
      }
      break;
    }
    case 'ChatMessage': {
      if (!context.match || !context.playerId) {
        return;
      }
      const trimmed = message.payload.text.trim();
      if (!trimmed) {
        return;
      }
      const payload = {
        from: context.playerId,
        side: context.side,
        text: trimmed.slice(0, 500),
        timestamp: Date.now()
      };
      broadcastToMatch(context.match.id, { t: 'ChatMessage', payload });
      break;
    }
    case 'SetChatCollapsed': {
      if (!context.match) {
        return;
      }
      const collapsed = Boolean(message.payload.collapsed);
      chatVisibilityByMatch.set(context.match.id, collapsed);
      const reason = context.playerId
        ? `${collapsed ? 'Collapsed' : 'Expanded'} by ${context.playerId}`
        : undefined;
      broadcastToMatch(context.match.id, {
        t: 'ChatVisibility',
        payload: { collapsed, reason }
      });
      break;
    }
    default:
      sendToast(context, 'Unknown command');
  }
}

setInterval(() => {
  for (const context of playerConnections.values()) {
    if (!context.alive) {
      continue;
    }
    try {
      context.ws.ping();
    } catch (error) {
      // ignore
    }
  }
  for (const match of matchConnections.keys()) {
    const instance = lobby.getMatch(match);
    if (instance) {
      sendStateSync(instance);
    }
  }
}, 5000);

const PORT = Number(process.env.PORT ?? 8787);
server.listen(PORT, () => {
  console.info(`Cardstone server listening on port ${PORT}`);
});
