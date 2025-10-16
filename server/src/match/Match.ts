import { randomUUID } from 'node:crypto';
import type {
  CardInHand,
  CardPlacement,
  GameState,
  PlayerSide,
  TargetDescriptor
} from '@cardstone/shared/types';
import { CARD_IDS, DEFAULT_DECK, MATCH_CONFIG, STARTING_SEQ } from '@cardstone/shared/constants';
import { getCardDefinition } from '@cardstone/shared/cards/demo';
import { createRng, createSeed, shuffleInPlace, type RNG } from '../util/rng.js';
import { applyAttack, applyPlayCard, drawCard, endTurn, startTurn, isCoin } from './reducer.js';
import { ValidationError, validateAttack, validateEndTurn, validatePlayCard } from './validate.js';

interface MatchPlayerMeta {
  id: string;
  side: PlayerSide;
  ready: boolean;
  lastSeq: number;
  recentNonces: string[];
}

export interface CommandResult {
  ok: boolean;
  error?: string;
  stateChanged: boolean;
  duplicate?: boolean;
}

export class Match {
  public readonly id: string;
  public readonly seed: string;
  private readonly players: Record<PlayerSide, MatchPlayerMeta>;
  private readonly rng: RNG;
  private state: GameState;
  private started = false;
  private mulliganCountdownStarted = false;

  private constructor(id: string, playerA: string, playerB: string) {
    this.id = id;
    this.seed = createSeed();
    this.rng = createRng(this.seed);
    this.players = {
      A: { id: playerA, side: 'A', ready: false, lastSeq: 0, recentNonces: [] },
      B: { id: playerB, side: 'B', ready: false, lastSeq: 0, recentNonces: [] }
    };
    this.state = this.createInitialState();
    this.dealOpeningHands();
  }

  static create(id: string, playerA: string, playerB: string): Match {
    return new Match(id, playerA, playerB);
  }

  private createInitialState(): GameState {
    const deckA = [...DEFAULT_DECK];
    const deckB = [...DEFAULT_DECK];
    shuffleInPlace(deckA, this.rng);
    shuffleInPlace(deckB, this.rng);

    return {
      id: this.id,
      seed: this.seed,
      seq: STARTING_SEQ,
      stage: 'Mulligan',
      players: {
        A: {
          id: this.players.A.id,
          hero: { hp: MATCH_CONFIG.heroHp, maxHp: MATCH_CONFIG.heroHp },
          deck: deckA,
          hand: [],
          graveyard: [],
          mana: { current: MATCH_CONFIG.startingMana - 1, max: MATCH_CONFIG.startingMana - 1 },
          ownsCoin: false,
          ready: false
        },
        B: {
          id: this.players.B.id,
          hero: { hp: MATCH_CONFIG.heroHp, maxHp: MATCH_CONFIG.heroHp },
          deck: deckB,
          hand: [],
          graveyard: [],
          mana: { current: MATCH_CONFIG.startingMana - 1, max: MATCH_CONFIG.startingMana - 1 },
          ownsCoin: true,
          ready: false
        }
      },
      board: {
        A: [],
        B: []
      },
      turn: {
        current: 'A',
        phase: 'Mulligan',
        turnNumber: 1
      },
      mulligan: {
        applied: { A: false, B: false },
        deadline: null,
        replacements: { A: [], B: [] }
      },
      timers: {
        mulliganEndsAt: null,
        turnEndsAt: null
      }
    };
  }

  private dealOpeningHands(): void {
    for (let i = 0; i < MATCH_CONFIG.startingHandSize; i += 1) {
      drawCard(this.state, 'A');
      drawCard(this.state, 'B');
    }
    const coinCard = getCardDefinition(CARD_IDS.coin);
    this.state.players.B.hand.push({ instanceId: randomUUID(), card: coinCard });
  }

  private startMulliganCountdown(): void {
    if (this.mulliganCountdownStarted) {
      return;
    }
    this.mulliganCountdownStarted = true;
    const deadline = Date.now() + MATCH_CONFIG.mulliganDurationMs;
    this.state.mulligan.deadline = deadline;
    this.state.timers.mulliganEndsAt = deadline;
  }

  getState(): GameState {
    return this.state;
  }

  findSideByPlayerId(playerId: string): PlayerSide | null {
    const match = Object.values(this.players).find((p) => p.id === playerId);
    return match?.side ?? null;
  }

  markReady(playerId: string): void {
    const side = this.findSideByPlayerId(playerId);
    if (!side) {
      throw new Error('Unknown player');
    }
    const meta = this.players[side];
    meta.ready = true;
    this.state.players[side].ready = true;
    if (!this.started && this.players.A.ready && this.players.B.ready) {
      this.started = true;
      this.startMulliganCountdown();
    }
  }

  handlePlayCard(
    playerId: string,
    seq: number,
    nonce: string,
    cardInstanceId: string,
    target?: TargetDescriptor,
    placement?: CardPlacement
  ): CommandResult {
    const side = this.requireSide(playerId);
    const meta = this.players[side];
    try {
      const { duplicate } = this.ensureSequence(meta, seq, nonce);
      if (duplicate) {
        return { ok: true, stateChanged: false, duplicate: true };
      }
      validatePlayCard(this.state, side, cardInstanceId, target, placement);
      applyPlayCard(this.state, side, cardInstanceId, target, placement);
      this.bumpSeq();
      return { ok: true, stateChanged: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { ok: false, error: error.message, stateChanged: false };
      }
      throw error;
    }
  }

  handleEndTurn(playerId: string, seq: number, nonce: string): CommandResult {
    const side = this.requireSide(playerId);
    const meta = this.players[side];
    try {
      const { duplicate } = this.ensureSequence(meta, seq, nonce);
      if (duplicate) {
        return { ok: true, stateChanged: false, duplicate: true };
      }
      validateEndTurn(this.state, side);
      endTurn(this.state, side);
      startTurn(this.state, this.state.turn.current);
      this.setTurnDeadline();
      this.bumpSeq();
      return { ok: true, stateChanged: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { ok: false, error: error.message, stateChanged: false };
      }
      throw error;
    }
  }

  handleAttack(
    playerId: string,
    seq: number,
    nonce: string,
    attackerId: string,
    target: TargetDescriptor
  ): CommandResult {
    const side = this.requireSide(playerId);
    const meta = this.players[side];
    try {
      const { duplicate } = this.ensureSequence(meta, seq, nonce);
      if (duplicate) {
        return { ok: true, stateChanged: false, duplicate: true };
      }
      validateAttack(this.state, side, attackerId, target);
      applyAttack(this.state, side, attackerId, target);
      this.bumpSeq();
      return { ok: true, stateChanged: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { ok: false, error: error.message, stateChanged: false };
      }
      throw error;
    }
  }

  handleMulliganReplace(
    playerId: string,
    seq: number,
    nonce: string,
    cardInstanceId: string
  ): CommandResult {
    const side = this.requireSide(playerId);
    const meta = this.players[side];
    try {
      const { duplicate } = this.ensureSequence(meta, seq, nonce);
      if (duplicate) {
        return { ok: true, stateChanged: false, duplicate: true };
      }
      if (this.state.stage !== 'Mulligan') {
        throw new ValidationError('Mulligan stage is over');
      }
      if (this.state.mulligan.applied[side]) {
        throw new ValidationError('Mulligan already applied');
      }
      const player = this.state.players[side];
      const index = player.hand.findIndex((card) => card.instanceId === cardInstanceId);
      if (index === -1) {
        throw new ValidationError('Card not found in hand');
      }
      const current = player.hand[index];
      if (current.mulliganReplaced) {
        throw new ValidationError('Card already replaced');
      }
      if (isCoin(current.card.id)) {
        throw new ValidationError('The Coin cannot be replaced');
      }
      player.deck.push(current.card.id);
      shuffleInPlace(player.deck, this.rng);
      const nextCardId = player.deck.shift();
      if (!nextCardId) {
        throw new ValidationError('No cards available for mulligan');
      }
      const definition = getCardDefinition(nextCardId);
      const replacement: CardInHand = {
        instanceId: randomUUID(),
        card: definition,
        mulliganReplaced: true
      };
      player.hand.splice(index, 1, replacement);
      this.state.mulligan.replacements[side].push(replacement.instanceId);
      this.bumpSeq();
      return { ok: true, stateChanged: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { ok: false, error: error.message, stateChanged: false };
      }
      throw error;
    }
  }

  handleMulliganApply(playerId: string, seq: number, nonce: string): CommandResult {
    const side = this.requireSide(playerId);
    const meta = this.players[side];
    try {
      const { duplicate } = this.ensureSequence(meta, seq, nonce);
      if (duplicate) {
        return { ok: true, stateChanged: false, duplicate: true };
      }
      if (this.state.stage !== 'Mulligan') {
        throw new ValidationError('Mulligan stage is over');
      }
      if (this.state.mulligan.applied[side]) {
        throw new ValidationError('Mulligan already applied');
      }
      this.state.mulligan.applied[side] = true;
      if (this.state.mulligan.applied.A && this.state.mulligan.applied.B) {
        this.finalizeMulligan();
      }
      this.bumpSeq();
      return { ok: true, stateChanged: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { ok: false, error: error.message, stateChanged: false };
      }
      throw error;
    }
  }

  forceCompleteMulligan(): boolean {
    if (this.state.stage !== 'Mulligan') {
      return false;
    }
    this.state.mulligan.applied.A = true;
    this.state.mulligan.applied.B = true;
    this.finalizeMulligan();
    this.bumpSeq();
    return true;
  }

  handleTurnTimeout(): boolean {
    if (this.state.stage !== 'Play' || this.state.winner) {
      return false;
    }
    if (this.state.turn.phase !== 'Main') {
      return false;
    }
    const side = this.state.turn.current;
    endTurn(this.state, side);
    startTurn(this.state, this.state.turn.current);
    this.setTurnDeadline();
    this.bumpSeq();
    return true;
  }

  private finalizeMulligan(): void {
    if (this.state.stage !== 'Mulligan') {
      return;
    }
    this.state.stage = 'Play';
    this.state.mulligan.deadline = null;
    this.state.timers.mulliganEndsAt = null;
    this.state.timers.turnEndsAt = null;
    const sides: PlayerSide[] = ['A', 'B'];
    for (const side of sides) {
      this.state.mulligan.replacements[side] = [];
      const hand = this.state.players[side].hand;
      for (const card of hand) {
        if (card.mulliganReplaced) {
          delete card.mulliganReplaced;
        }
      }
    }
    this.state.turn.phase = 'Start';
    startTurn(this.state, 'A');
    this.setTurnDeadline();
  }

  private setTurnDeadline(): void {
    if (this.state.stage !== 'Play' || this.state.winner) {
      this.state.timers.turnEndsAt = null;
      return;
    }
    const deadline = Date.now() + MATCH_CONFIG.turnDurationMs;
    this.state.timers.turnEndsAt = deadline;
  }

  private bumpSeq(): void {
    this.state.seq += 1;
  }

  private requireSide(playerId: string): PlayerSide {
    const side = this.findSideByPlayerId(playerId);
    if (!side) {
      throw new Error('Player not in match');
    }
    return side;
  }

  private ensureSequence(
    meta: MatchPlayerMeta,
    seq: number,
    nonce: string
  ): { duplicate: boolean } {
    if (seq <= meta.lastSeq) {
      if (!meta.recentNonces.includes(nonce)) {
        meta.recentNonces.push(nonce);
        if (meta.recentNonces.length > 32) {
          meta.recentNonces.shift();
        }
      }
      return { duplicate: true };
    }
    if (seq !== meta.lastSeq + 1) {
      throw new ValidationError('Out-of-order command sequence');
    }
    if (meta.recentNonces.includes(nonce)) {
      return { duplicate: true };
    }
    meta.recentNonces.push(nonce);
    if (meta.recentNonces.length > 32) {
      meta.recentNonces.shift();
    }
    meta.lastSeq = seq;
    return { duplicate: false };
  }
}
