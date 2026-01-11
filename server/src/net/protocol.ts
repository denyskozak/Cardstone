import { z } from 'zod';
import type {
  ActionResultPayload,
  ChatMessagePayload,
  ChatVisibilityPayload,
  ClientToServer,
  MatchJoinInfo,
  PlayerSide,
  ServerToClient,
  StateSyncPayload,
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
const placementSchema = z.enum(['left', 'right']);

export const clientMessageSchema = z.discriminatedUnion('t', [
  z.object({
    t: z.literal('JoinMatch'),
    payload: z.object({
      matchId: z.string(),
      playerId: z.string().optional(),
      deckId: z.string().optional()
    })
  }),
  z.object({
    t: z.literal('Ready'),
    payload: z.object({ playerId: z.string().optional() })
  }),
  z.object({
    t: z.literal('MulliganReplace'),
    payload: z.object({ cardId: z.string() }),
    seq: seq(),
    nonce: nonce()
  }),
  z.object({
    t: z.literal('MulliganApply'),
    payload: z.object({}).default({}),
    seq: seq(),
    nonce: nonce()
  }),
  z.object({
    t: z.literal('PlayCard'),
    payload: z.object({
      cardId: z.string(),
      target: targetSchema.optional(),
      placement: placementSchema.optional()
    }),
    seq: seq(),
    nonce: nonce()
  }),
  z.object({
    t: z.literal('EndTurn'),
    payload: z.object({}).default({}),
    seq: seq(),
    nonce: nonce()
  }),
  z.object({
    t: z.literal('Attack'),
    payload: z.object({ attackerId: z.string(), target: targetSchema }),
    seq: seq(),
    nonce: nonce()
  }),
  z.object({
    t: z.literal('Emote'),
    payload: z.object({ type: z.enum(['Hello', 'WellPlayed', 'Oops']) }),
    seq: seq().optional(),
    nonce: nonce().optional()
  }),
  z.object({
    t: z.literal('ChatMessage'),
    payload: z.object({ text: z.string().min(1).max(500) })
  }),
  z.object({
    t: z.literal('SetChatCollapsed'),
    payload: z.object({ collapsed: z.boolean() })
  })
]) as unknown as z.ZodType<ClientToServer>;

const baseServerMessage = <T extends string, P>(t: T, payload: z.ZodType<P>) =>
  z.object({
    t: z.literal(t),
    payload,
    seq: seq().optional()
  });

export const serverMessageSchema = z.discriminatedUnion('t', [
  baseServerMessage(
    'MatchJoined',
    z.object({
      playerId: z.string(),
      matchId: z.string(),
      side: sideSchema as z.ZodType<PlayerSide>
    }) as z.ZodType<MatchJoinInfo>
  ),
  baseServerMessage(
    'StateSync',
    z.object({ state: z.any() }) as z.ZodType<StateSyncPayload>
  ),
  baseServerMessage(
    'ActionResult',
    z.object({
      ok: z.boolean(),
      error: z.string().optional(),
      patch: z.any().optional(),
      stateChanged: z.boolean().optional(),
      duplicate: z.boolean().optional()
    }) as z.ZodType<ActionResultPayload>
  ),
  baseServerMessage('Toast', z.object({ message: z.string() })),
  baseServerMessage('OpponentLeft', z.object({ playerId: z.string() })),
  baseServerMessage('GameOver', z.object({ winner: sideSchema as z.ZodType<PlayerSide> })),
  baseServerMessage('ChatMessage', z.object({
    from: z.string(),
    side: sideSchema.optional(),
    text: z.string(),
    timestamp: z.number().int().nonnegative()
  }) as z.ZodType<ChatMessagePayload>),
  baseServerMessage(
    'ChatVisibility',
    z.object({
      collapsed: z.boolean(),
      reason: z.string().optional()
    }) as z.ZodType<ChatVisibilityPayload>
  )
]) as unknown as z.ZodType<ServerToClient>;

export type ValidatedClientMessage = z.infer<typeof clientMessageSchema>;
export type ValidatedServerMessage = z.infer<typeof serverMessageSchema>;
