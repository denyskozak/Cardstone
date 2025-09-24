import { describe, expect, it } from 'vitest';
import { CARD_IDS, MATCH_CONFIG } from '@cardstone/shared/constants.js';
import type { GameState, PlayerSide } from '@cardstone/shared/types.js';
import { getCardDefinition } from '@cardstone/shared/cards/demo.js';
import { applyPlayCard, gainMana } from '@cardstone/server/match/reducer.js';
import { validatePlayCard, ValidationError } from '@cardstone/server/match/validate.js';

function createState(): GameState {
  return {
    id: 'test',
    seed: 'seed',
    seq: 1,
    players: {
      A: {
        id: 'playerA',
        hero: { hp: MATCH_CONFIG.heroHp, maxHp: MATCH_CONFIG.heroHp },
        deck: [],
        hand: [],
        graveyard: [],
        mana: { current: 0, max: 0 },
        ownsCoin: false,
        ready: true
      },
      B: {
        id: 'playerB',
        hero: { hp: MATCH_CONFIG.heroHp, maxHp: MATCH_CONFIG.heroHp },
        deck: [],
        hand: [],
        graveyard: [],
        mana: { current: 0, max: 0 },
        ownsCoin: false,
        ready: true
      }
    },
    board: { A: [], B: [] },
    turn: { current: 'A', phase: 'Main', turnNumber: 1 }
  };
}

function addCard(state: GameState, side: PlayerSide, cardId: string): string {
  const card = getCardDefinition(cardId);
  const instanceId = `${cardId}_${Math.random()}`;
  state.players[side].hand.push({ instanceId, card });
  return instanceId;
}

describe('match reducer', () => {
  it('increases mana until the cap', () => {
    const state = createState();
    for (let i = 0; i < 12; i += 1) {
      gainMana(state, 'A');
    }
    expect(state.players.A.mana.max).toBe(MATCH_CONFIG.maxMana);
    expect(state.players.A.mana.current).toBe(MATCH_CONFIG.maxMana);
  });

  it('plays a minion and reduces mana', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.noviceMage);
    state.players.A.mana = { current: 5, max: 5 };
    applyPlayCard(state, 'A', instanceId);
    expect(state.players.A.hand).toHaveLength(0);
    expect(state.board.A).toHaveLength(1);
    expect(state.players.A.mana.current).toBe(3);
  });

  it('applies coin temporary mana boost', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.coin);
    state.players.A.mana = { current: 1, max: 1 };
    applyPlayCard(state, 'A', instanceId);
    expect(state.players.A.mana.current).toBe(2);
    expect(state.players.A.mana.temporary).toBe(1);
  });

  it('rejects playing cards without enough mana', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.riverCrocolisk);
    state.players.A.mana = { current: 1, max: 1 };
    expect(() => validatePlayCard(state, 'A', instanceId)).toThrow(ValidationError);
  });
});
