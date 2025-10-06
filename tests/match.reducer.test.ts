import { describe, expect, it } from 'vitest';
import { CARD_IDS, MATCH_CONFIG } from '@cardstone/shared/constants.js';
import type { GameState, MinionCard, PlayerSide } from '@cardstone/shared/types.js';
import { getCardDefinition } from '@cardstone/shared/cards/demo.js';
import { applyAttack, applyPlayCard, drawCard, gainMana, startTurn } from '@cardstone/server/match/reducer.js';
import {
  validateAttack,
  validatePlayCard,
  ValidationError
} from '@cardstone/server/match/validate.js';
import { hasDivineShield } from '@cardstone/shared/effects.js';


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

function summonMinion(state: GameState, side: PlayerSide, cardId: string): string {
  const card = getCardDefinition(cardId);
  if (card.type !== 'Minion') {
    throw new Error('Card must be a minion to summon');
  }
  const minionCard = card as MinionCard;
  const instanceId = `${cardId}_${Math.random()}`;
  state.board[side].push({
    instanceId,
    card: minionCard,
    attack: minionCard.attack,
    health: minionCard.health,
    maxHealth: minionCard.health,
    attacksRemaining: 1,
    divineShield: hasDivineShield(minionCard)
  });
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
    const instanceId = addCard(state, 'A', CARD_IDS.lepraGnome);

    state.players.A.mana = { current: 5, max: 5 };
    applyPlayCard(state, 'A', instanceId);
    expect(state.players.A.hand).toHaveLength(0);
    expect(state.board.A).toHaveLength(1);
    expect(state.players.A.mana.current).toBe(4);
  });

  it('prevents newly summoned minions from attacking immediately', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.lepraGnome);
    state.players.A.mana = { current: 5, max: 5 };

    applyPlayCard(state, 'A', instanceId);

    expect(state.board.A).toHaveLength(1);
    expect(state.board.A[0]?.attacksRemaining).toBe(0);

    startTurn(state, 'A');

    expect(state.board.A[0]?.attacksRemaining).toBe(1);
  });

  it('applies coin temporary mana boost', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.coin);
    state.players.A.mana = { current: 1, max: 1 };
    applyPlayCard(state, 'A', instanceId);
    expect(state.players.A.mana.current).toBe(2);
    expect(state.players.A.mana.temporary).toBe(1);
  });

  it('burns cards drawn beyond hand limit', () => {
    const state = createState();
    const fillerCard = getCardDefinition(CARD_IDS.lepraGnome);
    state.players.A.hand = Array.from({ length: MATCH_CONFIG.handLimit }, (_, index) => ({
      instanceId: `hand_${index}`,
      card: fillerCard,
    }));
    state.players.A.deck = [CARD_IDS.knight, CARD_IDS.knight];

    drawCard(state, 'A');

    expect(state.players.A.hand).toHaveLength(MATCH_CONFIG.handLimit);
    expect(state.players.A.deck).toHaveLength(1);
    expect(state.players.A.graveyard).toContain(CARD_IDS.knight);
  });

  it('draws a card when summoning a take_card minion', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.hoarder);
    state.players.A.deck = [CARD_IDS.knight];
    state.players.A.mana = { current: 2, max: 2 };

    applyPlayCard(state, 'A', instanceId);

    expect(state.players.A.hand).toHaveLength(1);
    expect(state.players.A.hand[0]?.card.id).toBe(CARD_IDS.knight);
    expect(state.players.A.deck).toHaveLength(0);
  });

  it('rejects playing cards without enough mana', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.miniDragon);

    state.players.A.mana = { current: 1, max: 1 };
    expect(() => validatePlayCard(state, 'A', instanceId)).toThrow(ValidationError);
  });

  it('grants Berserk minions +2 attack after taking damage', () => {
    const state = createState();
    const berserkerId = summonMinion(state, 'A', CARD_IDS.berserk);
    const attackerId = summonMinion(state, 'B', CARD_IDS.nighOwl);

    expect(state.board.A[0]?.attack).toBe(2);

    applyAttack(state, 'B', attackerId, { type: 'minion', side: 'A', entityId: berserkerId });

    const berserker = state.board.A.find((minion) => minion.instanceId === berserkerId);
    expect(berserker?.health).toBe(1);
    expect(berserker?.attack).toBe(4);
    expect(berserker?.berserkActive).toBe(true);
  });
});

describe('validateAttack', () => {
  it('prevents attacking hero when taunt minion is present', () => {
    const state = createState();
    const attackerId = summonMinion(state, 'A', CARD_IDS.knight);
    summonMinion(state, 'B', CARD_IDS.forestDweller);

    expect(() => validateAttack(state, 'A', attackerId, { type: 'hero', side: 'B' })).toThrow(
      ValidationError
    );
  });

  it('forces attacks to target taunt minions first', () => {
    const state = createState();
    const attackerId = summonMinion(state, 'A', CARD_IDS.knight);
    const tauntId = summonMinion(state, 'B', CARD_IDS.forestDweller);
    const nonTauntId = summonMinion(state, 'B', CARD_IDS.nighOwl);

    expect(() =>
      validateAttack(state, 'A', attackerId, { type: 'minion', side: 'B', entityId: nonTauntId })
    ).toThrow(ValidationError);
    expect(() =>
      validateAttack(state, 'A', attackerId, { type: 'minion', side: 'B', entityId: tauntId })
    ).not.toThrow();
  });

  it('allows attacking hero when no taunt minions exist', () => {
    const state = createState();
    const attackerId = summonMinion(state, 'A', CARD_IDS.knight);

    expect(() => validateAttack(state, 'A', attackerId, { type: 'hero', side: 'B' })).not.toThrow();
  });
});

describe('divide shield effect', () => {
  it('absorbs the first instance of damage from attacks', () => {
    const state = createState();
    const defenderId = summonMinion(state, 'A', CARD_IDS.argentSquare);
    const attackerId = summonMinion(state, 'B', CARD_IDS.knight);

    applyAttack(state, 'B', attackerId, { type: 'minion', side: 'A', entityId: defenderId });

    const defender = state.board.A.find((entity) => entity.instanceId === defenderId);
    expect(defender?.health).toBe(getCardDefinition(CARD_IDS.argentSquare).health);
    expect(defender?.divineShield).toBe(false);

    const attacker = state.board.B.find((entity) => entity.instanceId === attackerId);
    expect(attacker?.health).toBe(
      getCardDefinition(CARD_IDS.knight).health - getCardDefinition(CARD_IDS.argentSquare).attack
    );

    if (attacker) {
      attacker.attacksRemaining = 1;
    }

    applyAttack(state, 'B', attackerId, { type: 'minion', side: 'A', entityId: defenderId });

    const defenderAfter = state.board.A.find((entity) => entity.instanceId === defenderId);
    expect(defenderAfter).toBeUndefined();
  });

  it('absorbs the first instance of spell damage', () => {
    const state = createState();
    const defenderId = summonMinion(state, 'B', CARD_IDS.argentSquare);
    const firstFireboltId = addCard(state, 'A', CARD_IDS.firebolt);
    state.players.A.mana = { current: 10, max: 10 };

    applyPlayCard(state, 'A', firstFireboltId, { type: 'minion', side: 'B', entityId: defenderId });

    let defender = state.board.B.find((entity) => entity.instanceId === defenderId);
    expect(defender?.health).toBe(getCardDefinition(CARD_IDS.argentSquare).health);
    expect(defender?.divineShield).toBe(false);

    const secondFireboltId = addCard(state, 'A', CARD_IDS.firebolt);
    state.players.A.mana = { current: 10, max: 10 };

    applyPlayCard(state, 'A', secondFireboltId, { type: 'minion', side: 'B', entityId: defenderId });

    defender = state.board.B.find((entity) => entity.instanceId === defenderId);
    expect(defender).toBeUndefined();
  });
});
