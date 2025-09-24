import { CARD_IDS } from '../constants.js';
import type { CardDefinition, MinionCard, SpellCard } from '../types.js';

const minions: Record<string, MinionCard> = {
  [CARD_IDS.noviceMage]: {
    id: CARD_IDS.noviceMage,
    name: 'Novice Mage',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2
  },
  [CARD_IDS.arcaneApprentice]: {
    id: CARD_IDS.arcaneApprentice,
    name: 'Arcane Apprentice',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3
  },
  [CARD_IDS.riverCrocolisk]: {
    id: CARD_IDS.riverCrocolisk,
    name: 'River Crocolisk',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 5
  },
  [CARD_IDS.stoutGuardian]: {
    id: CARD_IDS.stoutGuardian,
    name: 'Stout Guardian',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1
  }
};

const spells: Record<string, SpellCard> = {
  [CARD_IDS.firebolt]: {
    id: CARD_IDS.firebolt,
    name: 'Firebolt',
    type: 'Spell',
    cost: 2,
    effect: 'Firebolt',
    amount: 2
  },
  [CARD_IDS.heal]: {
    id: CARD_IDS.heal,
    name: 'Mending Touch',
    type: 'Spell',
    cost: 2,
    effect: 'Heal',
    amount: 2
  },
  [CARD_IDS.coin]: {
    id: CARD_IDS.coin,
    name: 'The Coin',
    type: 'Spell',
    cost: 0,
    effect: 'Coin',
    amount: 1
  }
};

export const DEMO_CARDS: Record<string, CardDefinition> = {
  ...minions,
  ...spells
};

export const DEMO_CARD_POOL = Object.values(DEMO_CARDS);

export function getCardDefinition(cardId: string): CardDefinition {
  const card = DEMO_CARDS[cardId];
  if (!card) {
    throw new Error(`Unknown card id: ${cardId}`);
  }
  return card;
}
