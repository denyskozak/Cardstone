import { z } from 'zod';
import type {
  ClientToServer,
  PlayerSide,
  ServerToClient,
  TargetDescriptor
} from '@cardstone/shared/types.js';

const sideSchema = z.union([z.literal('A'), z.literal('B')]);

const targetSchema: z.ZodType<TargetDescriptor> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hero'),
    side: sideSchema
  }),
  z.object({
    type: z.literal('minion'),
    side: sideSchema,
    entityId: z.string()
  })
]);

const nonce = () => z.string().min(8).max(64);
const seq = () => z.number().int().nonnegative();

export const clientMessageSchema: z.ZodType<ClientToServer> = z.discriminatedUnion('t', [
  z.object({
    t: z.literal('JoinMatch'),
    payload: z.object({ matchId: z.string(), playerId: z.string().optional() })
  }),
  z.object({
    t: z.literal('Ready'),
    payload: z.object({ playerId: z.string().optional() })
  }),
  z.object({
    t: z.literal('PlayCard'),
    payload: z.object({ cardId: z.string(), target: targetSchema.optional() }),
    seq: seq(),
    nonce: nonce()
  }),
  z.object({
    t: z.literal('EndTurn'),
    payload: z.object({}).optional(),
    seq: seq(),
    nonce: nonce()
  }),
  z.object({
    t: z.literal('Attack'),
    payload: z.object({ attackerId: z.string(), defenderId: z.string() }),
    seq: seq(),
    nonce: nonce()
  }),
  z.object({
    t: z.literal('Emote'),
    payload: z.object({ type: z.enum(['Hello', 'WellPlayed', 'Oops']) }),
    seq: seq().optional(),
    nonce: nonce().optional()
  })
]);

const baseServerMessage = <T extends string, P>(t: T, payload: z.ZodType<P>) =>
  z.object({
    t: z.literal(t),
    payload,
    seq: seq().optional()
  });

export const serverMessageSchema: z.ZodType<ServerToClient> = z.discriminatedUnion('t', [
  baseServerMessage('MatchJoined',
    z.object({ playerId: z.string(), matchId: z.string(), side: sideSchema as z.ZodType<PlayerSide> })
  ),
  baseServerMessage('StateSync', z.object({ state: z.any() })),
  baseServerMessage('ActionResult',
    z.object({ ok: z.boolean(), error: z.string().optional(), patch: z.any().optional() })
  ),
  baseServerMessage('Toast', z.object({ message: z.string() })),
  baseServerMessage('OpponentLeft', z.object({ playerId: z.string() })),
  baseServerMessage('GameOver', z.object({ winner: sideSchema as z.ZodType<PlayerSide> }))
]);

export type ValidatedClientMessage = z.infer<typeof clientMessageSchema>;
export type ValidatedServerMessage = z.infer<typeof serverMessageSchema>;
