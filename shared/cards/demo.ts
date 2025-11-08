import type { CardDefinition, MinionCard, SpellCard } from '../types.js';
import { CARD_IDS } from '../constants.js';
const minions: Record<string, MinionCard> = {
  [CARD_IDS.ika]: {
    id: CARD_IDS.ika,
    name: 'Ika the Ink Trader',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2,
    text: 'Battlecry: Draw 1 card',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
  },
  [CARD_IDS.walrus]: {
    id: CARD_IDS.walrus,
    name: 'Walrus of the Deep',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 5,
    text: 'Taunt. Deathrattle: Summon a 2/2 Mini Walrus.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      },
      {
        trigger: { type: 'Deathrattle' },
        action: { type: 'Summon', cardId: CARD_IDS.miniWalrus, count: 1, target: "Board"  }
      }
    ]
  },
  [CARD_IDS.miniWalrus]: {
    id: CARD_IDS.miniWalrus,
    name: 'Mini Walrus',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'Cute',
  },
  [CARD_IDS.cetus]: {
    id: CARD_IDS.cetus,
    name: 'Cetus Protocol',
    type: 'Minion',
    cost: 5,
    attack: 3,
    health: 6,
    text: 'Battlecry: Add 2/2 to friendly minions',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: 2, health: 2}, target: 'FriendlyMinion' }
      }
    ]
  },
  [CARD_IDS.blub]: {
    id: CARD_IDS.blub,
    name: 'Blub the Bubble King',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    text: 'Aura: Friendly minions gain +1 Attack while this is alive.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Buff', stats: { attack: 1 }, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.hipo]: {
    id: CARD_IDS.hipo,
    name: 'Hipo the Hodler',
    type: 'Minion',
    cost: 2,
    attack: 1,
    health: 5,
    text: 'Taunt. When attacked, gain +1 Attack.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      },
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Berserk', data: { attack: 1 } }
      }
    ]
  },
  [CARD_IDS.lofi]: {
    id: CARD_IDS.lofi,
    name: 'Lofi Validator',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 3,
    text: 'Battlecry: Heal your hero for 4.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Heal', amount: 4, target: 'Hero' }
      }
    ]
  },
  [CARD_IDS.axol]: {
    id: CARD_IDS.axol,
    name: 'Axol of Aqua',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 4,
    text: 'Battlecry: Give a friendly minion +2 Health.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: {health: 2 }, target: 'FriendlyMinion' }
      }
    ]
  },
  [CARD_IDS.miu]: {
    id: CARD_IDS.miu,
    name: 'Miu the Coder Cat',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'Spellcast: Draw a random card.',
    effects: [
      {
        trigger: { type: 'SpellCast' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
  },
  [CARD_IDS.fud]: {
    id: CARD_IDS.fud,
    name: 'FUD the Pug',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 2,
    text: 'Battlecry: Give your minions on board + 1 health.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Buff', stats: { health: 1 }, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.manifest]: {
    id: CARD_IDS.manifest,
    name: 'Manifest Node',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 5,
  },
  [CARD_IDS.scallop]: {
    id: CARD_IDS.scallop,
    name: 'Scallop Stone',
    type: 'Minion',
    cost: 2,
    attack: 1,
    health: 4,
    text: 'Taunt',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
  },
  [CARD_IDS.suilend]: {
    id: CARD_IDS.suilend,
    name: 'Suilend Protocol',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 5,
    text: 'Battlecry: Gain +1/+1 for each card in your hand.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'BuffPerCardInHand' }
      }
    ]
  },
  [CARD_IDS.deepBook]: {
    id: CARD_IDS.deepBook,
    name: 'DeepBook AI',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 4,
    text: 'Whenever you cast a spell, draw a card.',
    effects: [
      {
        trigger: { type: 'SpellCast' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
  },
  [CARD_IDS.matteo]: {
    id: CARD_IDS.matteo,
    name: 'Matteo the Builder',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    text: 'Battlecry: Summon a 1/1 “Dev Intern”.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Summon', cardId: CARD_IDS.devIntern, count: 1, target: "Board" }
      }
    ]
  },
  [CARD_IDS.kostasKryptos]: {
    id: CARD_IDS.kostasKryptos,
    name: 'Kostas Kryptos',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 4,
    text: 'Battlecry: Summon to 2 Seals',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Summon', cardId: CARD_IDS.seal, count: 2, target: 'Board' }
      }
    ]
  },
  [CARD_IDS.samBlackshear]: {
    id: CARD_IDS.samBlackshear,
    name: 'Sam',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 6,
    text: 'Buff: Add 2 attacks, 2 hp all minions on board',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: {
          type: 'Buff',
          stats: {
            attack: 2,
            health: 2
          },
          target: 'AllFriendlies'
        }
      }
    ]
  },
  [CARD_IDS.evan]: {
    id: CARD_IDS.evan,
    name: 'Evan the Architect',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 5,
    text: 'Battlecry: DrawCard 2 cards.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'DrawCard', amount: 2 }
      }
    ]
  },
  [CARD_IDS.noodls]: {
    id: CARD_IDS.noodls,
    name: 'Noodls protocl',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 5
  },
  [CARD_IDS.georgeDanezis]: {
    id: CARD_IDS.georgeDanezis,
    name: 'George Danezis',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 6,
    text: 'Aura: Friendly Minions Get 3 Healths.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Buff', stats: { health: 3}, target: "FriendlyMinion" }
      }
    ]
  },
  [CARD_IDS.adeniyi]: {
    id: CARD_IDS.adeniyi,
    name: 'Adeniyi the Researcher',
    type: 'Minion',
    cost: 6,
    attack: 5,
    health: 6,
    text: 'Battlecry: Summon a Robot.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Summon', cardId: CARD_IDS.robot, count: 1, target: 'Board' }
      }
    ]
  },
  [CARD_IDS.robot]: {
    id: CARD_IDS.robot,
    name: 'Sui Robot',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
  },
  [CARD_IDS.devIntern]: {
    id: CARD_IDS.devIntern,
    name: 'Dev Intern',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1,
  },
  [CARD_IDS.seal]: {
    id: CARD_IDS.seal,
    name: 'Seal',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2,
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
