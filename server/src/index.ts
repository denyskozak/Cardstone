import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import type { MatchJoinInfo, PlayerSide } from '@cardstone/shared/types.js';
import { clientMessageSchema, type ValidatedClientMessage } from './net/protocol.js';
import { Lobby } from './lobby/Lobby.js';
import { RateLimiter } from './util/rateLimit.js';
import { Match } from './match/Match.js';

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

function attachToMatch(context: ConnectionContext, match: Match, side: PlayerSide): void {
  context.match = match;
  context.side = side;
  if (!matchConnections.has(match.id)) {
    matchConnections.set(match.id, new Set());
  }
  matchConnections.get(match.id)!.add(context);
  const payload: MatchJoinInfo = {
    playerId: context.playerId!,
    matchId: match.id,
    side
  };
  sendMessage(context, { t: 'MatchJoined', payload });
  sendStateSync(match);
}

function sendMessage(context: ConnectionContext, message: unknown): void {
  if (context.alive) {
    context.ws.send(JSON.stringify(message));
  }
}

function sendStateSync(match: Match): void {
  const state = match.getState();
  const connections = matchConnections.get(match.id);
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
      const playerId = message.payload.playerId ?? randomUUID();
      const existing = playerConnections.get(playerId);
      if (existing && existing !== context) {
        existing.alive = false;
        try {
          existing.ws.close();
        } catch (error) {
          console.error('Failed to close existing connection', error);
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
