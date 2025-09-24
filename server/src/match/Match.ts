import { randomUUID } from 'node:crypto';
import type { GameState, PlayerSide, TargetDescriptor } from '@cardstone/shared/types.js';
import { CARD_IDS, DEFAULT_DECK, MATCH_CONFIG, STARTING_SEQ } from '@cardstone/shared/constants.js';
import { getCardDefinition } from '@cardstone/shared/cards/demo.js';
import { createRng, createSeed, shuffleInPlace, type RNG } from '../util/rng.js';
import { applyPlayCard, drawCard, endTurn, startTurn } from './reducer.js';
import { ValidationError, validateEndTurn, validatePlayCard } from './validate.js';

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
        phase: 'Start',
        turnNumber: 1
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
      startTurn(this.state, 'A');
      this.bumpSeq();
    }
  }

  handlePlayCard(
    playerId: string,
    seq: number,
    nonce: string,
    cardInstanceId: string,
    target?: TargetDescriptor
  ): CommandResult {
    const side = this.requireSide(playerId);
    const meta = this.players[side];
    try {
      const { duplicate } = this.ensureSequence(meta, seq, nonce);
      if (duplicate) {
        return { ok: true, stateChanged: false, duplicate: true };
      }
      validatePlayCard(this.state, side, cardInstanceId, target);
      applyPlayCard(this.state, side, cardInstanceId, target);
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
      this.bumpSeq();
      return { ok: true, stateChanged: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { ok: false, error: error.message, stateChanged: false };
      }
      throw error;
    }
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
