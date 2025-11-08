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
    const instanceId = addCard(state, 'A', CARD_IDS.manifest);

    state.players.A.mana = { current: 5, max: 5 };
    applyPlayCard(state, 'A', instanceId);
    expect(state.players.A.hand).toHaveLength(0);
    expect(state.board.A).toHaveLength(1);
    expect(state.players.A.mana.current).toBe(2);
  });

  it('prevents newly summoned minions from attacking immediately', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.manifest);
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
    const fillerCard = getCardDefinition(CARD_IDS.manifest);
    state.players.A.hand = Array.from({ length: MATCH_CONFIG.handLimit }, (_, index) => ({
      instanceId: `hand_${index}`,
      card: fillerCard,
    }));
    state.players.A.deck = [CARD_IDS.ika, CARD_IDS.axol];

    drawCard(state, 'A');

    expect(state.players.A.hand).toHaveLength(MATCH_CONFIG.handLimit);
    expect(state.players.A.deck).toHaveLength(1);
    expect(state.players.A.graveyard).toContain(CARD_IDS.ika);
  });

  it('draws a card when summoning a take_card minion', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.ika);
    state.players.A.deck = [CARD_IDS.axol];
    state.players.A.mana = { current: 2, max: 2 };

    applyPlayCard(state, 'A', instanceId);

    expect(state.players.A.hand).toHaveLength(1);
    expect(state.players.A.hand[0]?.card.id).toBe(CARD_IDS.axol);
    expect(state.players.A.deck).toHaveLength(0);
  });

  it('rejects playing cards without enough mana', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.adeniyi);

    state.players.A.mana = { current: 1, max: 1 };
    expect(() => validatePlayCard(state, 'A', instanceId)).toThrow(ValidationError);
  });

  it('grants Berserk minions +2 attack after taking damage', () => {
    const state = createState();
    const berserkerId = summonMinion(state, 'A', CARD_IDS.hipo);
    const attackerId = summonMinion(state, 'B', CARD_IDS.manifest);

    expect(state.board.A[0]?.attack).toBe(1);

    applyAttack(state, 'B', attackerId, { type: 'minion', side: 'A', entityId: berserkerId });

    const berserker = state.board.A.find((minion) => minion.instanceId === berserkerId);
    expect(berserker?.health).toBe(3);
    expect(berserker?.attack).toBe(2);
    expect(berserker?.berserkActive).toBe(true);
  });

  it('applies targeted battlecry buffs to friendly minions', () => {
    const state = createState();
    state.players.A.mana = { current: 10, max: 10 };

    const manifestInstanceId = addCard(state, 'A', CARD_IDS.manifest);
    applyPlayCard(state, 'A', manifestInstanceId);

    const manifestCard = getCardDefinition(CARD_IDS.manifest) as MinionCard;
    const manifest = state.board.A.find((minion) => minion.card.id === CARD_IDS.manifest);
    expect(manifest).toBeDefined();
    if (!manifest) {
      return;
    }

    const cetusInstanceId = addCard(state, 'A', CARD_IDS.cetus);
    applyPlayCard(state, 'A', cetusInstanceId, {
      type: 'minion',
      side: 'A',
      entityId: manifest.instanceId,
    });

    const updatedManifest = state.board.A.find((minion) => minion.instanceId === manifest.instanceId);
    expect(updatedManifest?.attack).toBe(manifestCard.attack + 2);
    expect(updatedManifest?.maxHealth).toBe(manifestCard.health + 2);
    expect(updatedManifest?.health).toBe(updatedManifest?.maxHealth);
  });

  it('heals the hero when summoning Lofi Validator', () => {
    const state = createState();
    state.players.A.mana = { current: 5, max: 5 };
    state.players.A.hero.hp = 20;

    const lofiInstanceId = addCard(state, 'A', CARD_IDS.lofi);
    applyPlayCard(state, 'A', lofiInstanceId);

    expect(state.players.A.hero.hp).toBe(24);
  });

  it('executes deathrattle summon effects', () => {
    const state = createState();
    state.players.A.mana = { current: 10, max: 10 };

    const walrusInstanceId = addCard(state, 'A', CARD_IDS.walrus);
    applyPlayCard(state, 'A', walrusInstanceId);

    const walrus = state.board.A.find((minion) => minion.card.id === CARD_IDS.walrus);
    expect(walrus).toBeDefined();
    if (!walrus) {
      return;
    }

    walrus.health = 1;

    const attackerId = summonMinion(state, 'B', CARD_IDS.manifest);
    applyAttack(state, 'B', attackerId, { type: 'minion', side: 'A', entityId: walrus.instanceId });

    const miniWalrus = state.board.A.find((minion) => minion.card.id === CARD_IDS.miniWalrus);
    expect(miniWalrus).toBeDefined();
  });

  it('applies and removes aura buffs while the source is alive', () => {
    const state = createState();
    state.players.A.mana = { current: 10, max: 10 };

    const manifestCard = getCardDefinition(CARD_IDS.manifest) as MinionCard;
    const manifestInstanceId = addCard(state, 'A', CARD_IDS.manifest);
    applyPlayCard(state, 'A', manifestInstanceId);

    const samInstanceId = addCard(state, 'A', CARD_IDS.samBlackshear);
    applyPlayCard(state, 'A', samInstanceId);

    const manifest = state.board.A.find((minion) => minion.card.id === CARD_IDS.manifest);
    expect(manifest?.attack).toBe(manifestCard.attack + 2);
    expect(manifest?.maxHealth).toBe(manifestCard.health + 2);

    const matteoCard = getCardDefinition(CARD_IDS.matteo) as MinionCard;
    const matteoInstanceId = addCard(state, 'A', CARD_IDS.matteo);
    applyPlayCard(state, 'A', matteoInstanceId);

    const matteo = state.board.A.find((minion) => minion.card.id === CARD_IDS.matteo);
    expect(matteo?.attack).toBe(matteoCard.attack + 2);
    expect(matteo?.maxHealth).toBe(matteoCard.health + 2);

    const sam = state.board.A.find((minion) => minion.card.id === CARD_IDS.samBlackshear);
    expect(sam).toBeDefined();
    if (!sam) {
      return;
    }
    sam.health = 1;

    const enemyId = summonMinion(state, 'B', CARD_IDS.manifest);
    applyAttack(state, 'B', enemyId, { type: 'minion', side: 'A', entityId: sam.instanceId });

    const manifestAfter = state.board.A.find((minion) => minion.card.id === CARD_IDS.manifest);
    expect(manifestAfter?.attack).toBe(manifestCard.attack);
    expect(manifestAfter?.maxHealth).toBe(manifestCard.health);

    const matteoAfter = state.board.A.find((minion) => minion.card.id === CARD_IDS.matteo);
    expect(matteoAfter?.attack).toBe(matteoCard.attack);
    expect(matteoAfter?.maxHealth).toBe(matteoCard.health);
  });

  it('triggers spell cast effects on friendly minions', () => {
    const state = createState();
    state.players.A.mana = { current: 10, max: 10 };
    state.players.A.deck = [CARD_IDS.manifest];

    const miuInstanceId = addCard(state, 'A', CARD_IDS.miu);
    applyPlayCard(state, 'A', miuInstanceId);

    const coinInstanceId = addCard(state, 'A', CARD_IDS.coin);
    applyPlayCard(state, 'A', coinInstanceId);

    expect(state.players.A.deck).toHaveLength(0);
    const drawn = state.players.A.hand.find((card) => card.card.id === CARD_IDS.manifest);
    expect(drawn).toBeDefined();
  });

  it('buffs Suilend Protocol based on cards in hand', () => {
    const state = createState();
    state.players.A.mana = { current: 10, max: 10 };

    const fillerCard = getCardDefinition(CARD_IDS.manifest);
    state.players.A.hand.push({ instanceId: 'filler-1', card: fillerCard });
    state.players.A.hand.push({ instanceId: 'filler-2', card: fillerCard });
    state.players.A.hand.push({ instanceId: 'filler-3', card: fillerCard });

    const suilendInstanceId = addCard(state, 'A', CARD_IDS.suilend);
    applyPlayCard(state, 'A', suilendInstanceId);

    const suilend = state.board.A.find((minion) => minion.card.id === CARD_IDS.suilend);
    expect(suilend?.attack).toBe(7);
    expect(suilend?.maxHealth).toBe(8);
  });
});

describe('validatePlayCard', () => {
  it('allows battlecry buffs that affect all friendly minions without a target', () => {
    const state = createState();
    const instanceId = addCard(state, 'A', CARD_IDS.cetus);
    state.players.A.mana = { current: 5, max: 5 };

    expect(() => validatePlayCard(state, 'A', instanceId)).not.toThrow();
  });
});

describe('validateAttack', () => {
  it('prevents attacking hero when taunt minion is present', () => {
    const state = createState();
    const attackerId = summonMinion(state, 'A', CARD_IDS.manifest);
    summonMinion(state, 'B', CARD_IDS.walrus);

    expect(() => validateAttack(state, 'A', attackerId, { type: 'hero', side: 'B' })).toThrow(
      ValidationError
    );
  });

  it('forces attacks to target taunt minions first', () => {
    const state = createState();
    const attackerId = summonMinion(state, 'A', CARD_IDS.manifest);
    const tauntId = summonMinion(state, 'B', CARD_IDS.walrus);
    const nonTauntId = summonMinion(state, 'B', CARD_IDS.axol);

    expect(() =>
      validateAttack(state, 'A', attackerId, { type: 'minion', side: 'B', entityId: nonTauntId })
    ).toThrow(ValidationError);
    expect(() =>
      validateAttack(state, 'A', attackerId, { type: 'minion', side: 'B', entityId: tauntId })
    ).not.toThrow();
  });

  it('allows attacking hero when no taunt minions exist', () => {
    const state = createState();
    const attackerId = summonMinion(state, 'A', CARD_IDS.manifest);

    expect(() => validateAttack(state, 'A', attackerId, { type: 'hero', side: 'B' })).not.toThrow();
  });
});

