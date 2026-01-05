import type { CardDefinition, MinionCard, SpellCard } from '../types.js';
import { CARD_IDS } from '../constants.js';
const minions: Record<string, MinionCard> = {
  [CARD_IDS.ika]: {
    id: CARD_IDS.ika,
    name: 'Ika the Ink Trader',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 1,
    text: 'Deathrattle: Draw a card.',
    effects: [
      { trigger: { type: 'Deathrattle' }, action: { type: 'DrawCard', amount: 1 } }
    ]
  },
  [CARD_IDS.walrus]: {
    id: CARD_IDS.walrus,
    name: 'Walrus',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    text: 'Taunt. Deathrattle: Summon a 1/1 Mini Walrus',
    effects: [
      {
        trigger: { type: 'Deathrattle' },
        action: { type: 'Summon', cardId: CARD_IDS.miniWalrus, count: 1, target: 'Board' }
      },
      { trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } },
    ]
  },
  [CARD_IDS.miniWalrus]: {
    id: CARD_IDS.miniWalrus,
    name: 'Mini Walrus',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1,
    text: 'Cute',
  },
  [CARD_IDS.cetus]: {
    id: CARD_IDS.cetus,
    name: 'Cetus',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 4,
    text: 'Battlecry: Give a minion +2 Attack this turn.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: {
          type: 'Custom',
          key: 'BuffTargetThisTurn',
          data: { stats: { attack: 2 }, target: 'AnyMinion' }
        }
      }
    ]
  },
  [CARD_IDS.blub]: {
    id: CARD_IDS.blub,
    name: 'Blub the Bubble',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'Adjacent minions have +1 Attack.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'AdjacentBuff', data: { stats: { attack: 1 } } }
      }
    ]
  },
  [CARD_IDS.hipo]: {
    id: CARD_IDS.hipo,
    name: 'Hipo',
    type: 'Minion',
    cost: 1,
    attack: 0,
    health: 4,
    text: 'Taunt',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.lofi]: {
    id: CARD_IDS.lofi,
    name: 'Lofi',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    text: 'Battlecry: Restore Hero 3 Health.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Heal', amount: 3, target: 'Hero' }
      }
    ]
  },
  [CARD_IDS.axol]: {
    id: CARD_IDS.axol,
    name: 'Axol',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2,
    text: 'Battlecry: Deal 3 damage randomly split between all other characters.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: {
          type: 'Custom',
          key: 'RandomSplitDamage',
          data: { amount: 3, pool: 'AllOtherCharacters' }
        }
      }
    ]
  },
  [CARD_IDS.miu]: {
    id: CARD_IDS.miu,
    name: 'Miu',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 1,
    text: 'Battlecry: Silence a minion.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Silence', data: { target: 'AnyMinion' } }
      }
    ]
  },
  [CARD_IDS.fud]: {
    id: CARD_IDS.fud,
    name: 'FUD the Pug',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 2,
    text: 'After a friendly minion dies, draw a card.',
    effects: [
      {
        trigger: { type: 'Custom', key: 'FriendlyMinionDied' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
  },
  [CARD_IDS.manifest]: {
    id: CARD_IDS.manifest,
    name: 'Manifest',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    text: 'Has +3 Attack while damaged.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'AttackWhileDamaged', data: { amount: 3 } }
      }
    ]
  },
  [CARD_IDS.scallop]: {
    id: CARD_IDS.scallop,
    name: 'Scallop',
    type: 'Minion',
    cost: 5,
    attack: 3,
    health: 6,
    text: 'Taunt',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.suilend]: {
    id: CARD_IDS.suilend,
    name: 'Suilend',
    type: 'Minion',
    cost: 5,
    attack: 7,
    health: 6,
    text: 'Your minions cost (3) more.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'IncreaseFriendlyMinionCosts', data: { amount: 3 } }
      }
    ]
  },
  [CARD_IDS.deepBook]: {
    id: CARD_IDS.deepBook,
    name: 'DeepBook ',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    text: 'Whenever a minion dies, gain +1 Attack.',
    effects: [
      {
        trigger: { type: 'Custom', key: 'AnyMinionDied' },
        action: { type: 'Buff', stats: { attack: 1 }, target: 'Self' }
      }
    ]
  },
  [CARD_IDS.matteo]: {
    id: CARD_IDS.matteo,
    name: 'Matteo the Builder',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2,
    text: 'Battlecry: Return a friendly minion from the battlefield to your hand.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'ReturnFriendlyMinionToHand', data: { target: 'FriendlyMinion' } }
      }
    ]
  },
  [CARD_IDS.kostasKryptos]: {
    id: CARD_IDS.kostasKryptos,
    name: 'Kostas',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 4,
    text: 'Battlecry: Summon a 2/2 Squire.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Summon', cardId: CARD_IDS.seal, count: 1, target: 'Board' }
      }
    ]
  },
  [CARD_IDS.samBlackshear]: {
    id: CARD_IDS.samBlackshear,
    name: 'Sam',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1,
    text: 'Battlecry: Give a minion +2 Attack this turn.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: {
          type: 'Custom',
          key: 'BuffTargetThisTurn',
          data: { stats: { attack: 2 }, target: 'AnyMinion' }
        }
      }
    ]
  },
  [CARD_IDS.evan]: {
    id: CARD_IDS.evan,
    name: 'Evan the Architect',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 1,
    text: 'Divine Shield',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'DivineShield' } }]

  },
  [CARD_IDS.noodls]: {
    id: CARD_IDS.noodls,
    name: 'Noodls protocl',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 3,
    text: 'Taunt. Costs (1) less per Attack of your weapon.',
    effects: [
      { trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } },
      { trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'CostLessPerWeaponAttack', data: { amount: 1 } } }
    ]
  },
  [CARD_IDS.georgeDanezis]: {
    id: CARD_IDS.georgeDanezis,
    name: 'George Danezis',
    type: 'Minion',
    cost: 6,
    attack: 4,
    health: 5,
    text: 'Windfury',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Windfury' } }]

  },
  [CARD_IDS.adeniyi]: {
    id: CARD_IDS.adeniyi,
    name: 'Adeniyi',
    type: 'Minion',
    cost: 6,
    attack: 5,
    health: 5,
    text: 'Battlecry: Freeze a character.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'FreezeCharacter', data: { target: 'AnyCharacter' } }
      }
    ]
  },
  [CARD_IDS.robot]: {
    id: CARD_IDS.robot,
    name: 'Sui Robot',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    text: 'Taunt. Has +3 Attack while damaged.',
    effects: [
      { trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } },
      { trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'AttackWhileDamaged', data: { amount: 3 } } }
    ]
  },
  [CARD_IDS.devIntern]: {
    id: CARD_IDS.devIntern,
    name: 'Dev Intern',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1,
    text: 'Divine Shield',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'DivineShield' } }]

  },
  [CARD_IDS.seal]: {
    id: CARD_IDS.seal,
    name: 'Seal',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: ''
  },

};

const spells: Record<string, SpellCard> = {
  [CARD_IDS.coin]: {
    id: CARD_IDS.coin,
    name: 'The Coin',
    type: 'Spell',
    cost: 0,
    text: 'Gain 1 temporary mana crystal.',
    effects: [
      {
        trigger: { type: 'Play' },
        action: { type: 'ManaCrystal', amount: 1 }
      }
    ]
  }
};

export const DEMO_CARDS: Record<string, CardDefinition> = {
  ...minions,
  ...spells,
};
export const DEMO_CARD_POOL = Object.values(DEMO_CARDS);
export function getCardDefinition(cardId: string): CardDefinition {
  const card = DEMO_CARDS[cardId];
  if (!card) {
    throw new Error(`Unknown card id: ${cardId}`);
  }
  return card;
}
