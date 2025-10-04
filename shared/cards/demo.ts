import type { CardDefinition, MinionCard, SpellCard } from '../types.js';
import { CARD_IDS } from '../constants.js';

const minions: Record<string, MinionCard> = {
  [CARD_IDS.argentSquare]: {
    id: CARD_IDS.argentSquare,
    name: 'Argent Square',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1,
    effect: 'divide_shield'
  },
  [CARD_IDS.berserk]: {
    id: CARD_IDS.berserk,
    name: 'Berserk',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    effect: 'berserk',
    effectProperty: {
      attack: 2
    }
  },
  [CARD_IDS.bullguard]: {
    id: CARD_IDS.bullguard,
    name: 'Bullguard',
    type: 'Minion',
    cost: 1,
    attack: 0,
    health: 4,
    effect: 'taunt'
  },
  [CARD_IDS.cunningPeople]: {
    id: CARD_IDS.cunningPeople,
    name: 'Cunning People',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2,
  },
  [CARD_IDS.delivarer]: {
    id: CARD_IDS.delivarer,
    name: 'Delivarer',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    effect: 'battlecry',
  },
  [CARD_IDS.draugr]: {
    id: CARD_IDS.draugr,
    name: 'Draugr',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2,
    effect: 'deathrattle'
  },
  [CARD_IDS.elunaPrist]: {
    id: CARD_IDS.elunaPrist,
    name: 'Eluna Prist',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 4
  },
  [CARD_IDS.fairyLife]: {
    id: CARD_IDS.fairyLife,
    name: 'Fairy Life',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 3,
    effect: 'battlecry'
  },
  [CARD_IDS.fireBeard]: {
    id: CARD_IDS.fireBeard,
    name: 'Fire Beard',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    effect: 'berserk'
  },
  [CARD_IDS.forestDweller]: {
    id: CARD_IDS.forestDweller,
    name: 'Forest Dweller',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 4,
    effect: 'taunt'
  },
  [CARD_IDS.frongProtector]: {
    id: CARD_IDS.frongProtector,
    name: 'Frong Protector',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 5,
    effect: 'taunt'
  },
  [CARD_IDS.gatplank]: {
    id: CARD_IDS.gatplank,
    name: 'Gatplank',
    type: 'Minion',
    cost: 4,
    attack: 5,
    health: 3,
    effect: 'battlecry'
  },
  [CARD_IDS.germesProtector]: {
    id: CARD_IDS.germesProtector,
    name: 'Germes Protector',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 6,
    effect: 'taunt'
  },
  [CARD_IDS.hoarder]: {
    id: CARD_IDS.hoarder,
    name: 'Hoarder',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 1,
    effect: 'take_card'
  },
  [CARD_IDS.knight]: {
    id: CARD_IDS.knight,
    name: 'Knight',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 5
  },
  [CARD_IDS.lepraGnome]: {
    id: CARD_IDS.lepraGnome,
    name: 'Lepra Gnome',
    type: 'Minion',
    cost: 1,
    attack: 2,
    health: 1,
    effect: 'deathrattle'
  },
  [CARD_IDS.miniDragon]: {
    id: CARD_IDS.miniDragon,
    name: 'Mini Dragon',
    type: 'Minion',
    cost: 5,
    attack: 5,
    health: 4
  },
  [CARD_IDS.nighOwl]: {
    id: CARD_IDS.nighOwl,
    name: 'Nigh Owl',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    effect: 'battlecry'
  },
  [CARD_IDS.ninja]: {
    id: CARD_IDS.ninja,
    name: 'Ninja',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 2,
    effect: 'steals'
  },
  [CARD_IDS.python]: {
    id: CARD_IDS.python,
    name: 'Python',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 4,
    effect: 'steals'
  },
  [CARD_IDS.raider]: {
    id: CARD_IDS.raider,
    name: 'Raider',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2
  },
  [CARD_IDS.sacredGargoyle]: {
    id: CARD_IDS.sacredGargoyle,
    name: 'Sacred Gargoyle',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 4,
    effect: 'divide_shield'
  },
  [CARD_IDS.sage]: {
    id: CARD_IDS.sage,
    name: 'Sage',
    type: 'Minion',
    cost: 4,
    attack: 2,
    health: 5,
    effect: 'take_card'
  },
  [CARD_IDS.sergeant]: {
    id: CARD_IDS.sergeant,
    name: 'Sergeant',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2
  },
  [CARD_IDS.shieldGuard]: {
    id: CARD_IDS.shieldGuard,
    name: 'Shield Guard',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 6,
    effect: 'taunt'
  },
  [CARD_IDS.skeleton]: {
    id: CARD_IDS.skeleton,
    name: 'Skeleton',
    type: 'Minion',
    cost: 1,
    attack: 2,
    health: 1,
    effect: 'deathrattle'
  },
  [CARD_IDS.surtur]: {
    id: CARD_IDS.surtur,
    name: 'Surtur',
    type: 'Minion',
    cost: 7,
    attack: 7,
    health: 7,
    effect: 'berserk'
  },
  [CARD_IDS.tiger]: {
    id: CARD_IDS.tiger,
    name: 'Tiger',
    type: 'Minion',
    cost: 6,
    attack: 6,
    health: 5,
    effect: 'steals'
  },
  [CARD_IDS.vikingGirl]: {
    id: CARD_IDS.vikingGirl,
    name: 'Viking Girl',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 4,
    effect: 'battlecry'
  },
  [CARD_IDS.warrior]: {
    id: CARD_IDS.warrior,
    name: 'Warrior',
    type: 'Minion',
    cost: 6,
    attack: 6,
    health: 7,
    effect: 'taunt'
  },
  [CARD_IDS.waterElemental]: {
    id: CARD_IDS.waterElemental,
    name: 'Water Elemental',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 6,
    effect: 'battlecry'
  },
  [CARD_IDS.wisp]: {
    id: CARD_IDS.wisp,
    name: 'Wisp',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1
  },
  [CARD_IDS.wolf]: {
    id: CARD_IDS.wolf,
    name: 'Wolf',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3
  },
  [CARD_IDS.worgen]: {
    id: CARD_IDS.worgen,
    name: 'Worgen',
    type: 'Minion',
    cost: 5,
    attack: 5,
    health: 5
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
