import type { CardDefinition, DomainId, MinionCard, SpellCard } from '../types.js';
import { CARD_IDS } from '../constants.js';
const defaultDomainId: DomainId = 'sui';
// id: CARD_IDS.ika
//   name: 'Ika Tide Totem'
const minions: Record<string, MinionCard> = {
  // === TOTEMS (Classic Shaman feel) ===

  [CARD_IDS.suilend]: {
    id: CARD_IDS.suilend,
    domainId: 'sui',
    name: 'Suilend',
    type: 'Minion',
    cost: 3,
    attack: 0,
    health: 3,
    text: 'At the end of your turn, draw a card.',
    effects: [{ trigger: { type: 'TurnEnd' }, action: { type: 'DrawCard', amount: 1 } }]
  },

  [CARD_IDS.blub]: {
    id: CARD_IDS.blub,
    domainId: 'sui',
    name: 'Blub',
    type: 'Minion',
    cost: 2,
    attack: 0,
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
    domainId: 'sui',
    name: 'Hipo',
    type: 'Minion',
    cost: 1,
    attack: 0,
    health: 2,
    text: 'On end of turn, restore 1 Health to all friendly characters.',
    // В вашем DSL есть только AllFriendlies; считаю, что это включает героя и миньонов.
    effects: [
      { trigger: { type: 'TurnEnd' }, action: { type: 'Heal', amount: 1, target: 'AllFriendlies' } }
    ]
  },

  [CARD_IDS.walrus]: {
    id: CARD_IDS.walrus,
    domainId: 'sui',
    name: 'Walrus',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },

  [CARD_IDS.miniWalrus]: {
    id: CARD_IDS.miniWalrus,
    domainId: 'sui',
    name: 'Mini Walrus',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1,
    text: ''
  },

  // === ELEMENTALS / SHAMAN-LIKE MINIONS ===

  [CARD_IDS.cetus]: {
    id: CARD_IDS.cetus,
    domainId: 'sui',
    name: 'Cetus',
    type: 'Minion',
    cost: 6,
    attack: 6,
    health: 5,
    text: 'Battlecry: Deal 3 damage to a random enemy.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', amount: 3, target: 'RandomEnemy' }
      }
    ]
  },

  [CARD_IDS.axol]: {
    id: CARD_IDS.axol,
    domainId: 'sui',
    name: 'Axol',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 4,
    text: 'Battlecry: Deal 2 damage to all enemy minions.',
    // У вас AllEnemies — если это включает героя, поменяйте на кастом-таргет "AllEnemyMinions".
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', amount: 2, target: 'AllEnemies' }
      }
    ]
  },

  [CARD_IDS.manifest]: {
    id: CARD_IDS.manifest,
    domainId: 'sui',
    name: 'Manifest',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    text: 'Has +1 Attack while damaged.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'AttackWhileDamaged', data: { amount: 1 } }
      }
    ]
  },

  [CARD_IDS.scallop]: {
    id: CARD_IDS.scallop,
    domainId: 'sui',
    name: 'Scallop',
    type: 'Minion',
    cost: 6,
    attack: 6,
    health: 7,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },

  [CARD_IDS.georgeDanezis]: {
    id: CARD_IDS.georgeDanezis,
    domainId: 'sui',
    name: 'George',
    type: 'Minion',
    cost: 5,
    attack: 5,
    health: 5,
    text: 'Summon 2 Dev Interns.',
    effects: [ {
      trigger: { type: 'Battlecry' },
      action: { type: 'Summon', cardId: CARD_IDS.devIntern, count: 2, target: 'Board' }
    }]
  },

  [CARD_IDS.deepBook]: {
    id: CARD_IDS.deepBook,
    domainId: 'sui',
    name: 'DeepBook',
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

  [CARD_IDS.robot]: {
    id: CARD_IDS.robot,
    domainId: 'sui',
    name: 'Robot',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 4,
    text: 'Taunt. Has +3 Attack while damaged.',
    effects: [
      { trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } },
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'AttackWhileDamaged', data: { amount: 3 } }
      }
    ]
  },

  // === CLASSIC SHAMAN-STYLE UTILITY ===

  [CARD_IDS.fud]: {
    id: CARD_IDS.fud,
    domainId: 'sui',
    name: 'Fud',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2,
  },

  [CARD_IDS.miu]: {
    id: CARD_IDS.miu,
    domainId: 'sui',
    name: 'Miu',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    text: 'Battlecry: Deal 1 damage to a minion',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', amount: 1, target: 'AnyMinion' }
      },
    ]
  },

  [CARD_IDS.matteo]: {
    id: CARD_IDS.matteo,
    domainId: 'sui',
    name: 'Matteo',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2,
    text: 'Battlecry: Return a friendly minion to your hand.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: {
          type: 'Custom',
          key: 'ReturnFriendlyMinionToHand',
          data: { target: 'FriendlyMinion' }
        }
      }
    ]
  },

  [CARD_IDS.kostasKryptos]: {
    id: CARD_IDS.kostasKryptos,
    domainId: 'sui',
    name: 'Kostas',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 4,
    text: 'Battlecry: Summon one 2/2 Seals.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Summon', cardId: CARD_IDS.seal, count: 1, target: 'Board' }
      }
    ]
  },

  [CARD_IDS.seal]: {
    id: CARD_IDS.seal,
    domainId: 'sui',
    name: 'Seal',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: ''
  },

  [CARD_IDS.lofi]: {
    id: CARD_IDS.lofi,
    domainId: 'sui',
    name: 'Lofi Healer',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    text: 'Battlecry: Restore 3 Health to your hero.',
    effects: [
      { trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 3, target: 'Hero' } }
    ]
  },

  // Оставил как “шаманская” синергия с оружием (в HS у шамана есть Doomhammer/Stormforged Axe)
  [CARD_IDS.noodls]: {
    id: CARD_IDS.noodls,
    domainId: 'sui',
    name: 'Noodls Protector',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 3,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },

  // === ЯВНО НЕШАМАНСКИЕ МЕХАНИКИ: Divine Shield/Freeze — убираю или переименовываю ===

  [CARD_IDS.evan]: {
    id: CARD_IDS.evan,
    domainId: 'sui',
    name: 'Evan Raider',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    text: 'Give 1 mana cristal',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'ManaCrystal', amount: 1 } }]
  },

  [CARD_IDS.devIntern]: {
    id: CARD_IDS.devIntern,
    domainId: 'sui',
    name: 'Intern',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2
  },

  // Если хотите оставить “Freeze all enemies” как около-шаманский (Frost Shock-style),
  // можно, но это ближе к спеллу, чем к миньону. Я предлагаю сделать из него "Frost Elemental".
  [CARD_IDS.samBlackshear]: {
    id: CARD_IDS.samBlackshear,
    domainId: 'sui',
    name: 'Sam',
    type: 'Minion',
    cost: 6,
    attack: 5,
    health: 5,
    text: 'Battlecry: Freeze all enemies.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Freeze', data: { target: 'AllEnemies' } }
      }
    ]
  },

  // Опционально: если вам нужна “карта, которая наказывает за смерть своих” — оставляем как шаманский спирит
  [CARD_IDS.ika]: {
    id: CARD_IDS.ika,
    domainId: 'sui',
    name: 'Ancestral Watcher',
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

  // Я намеренно УБРАЛ "Your minions cost (3) more" (Adeniyi) как явно анти-темповую, нешаманскую “порчу”.
  // Если вы всё же хотите оставить — скажите, и я подберу классический аналог (например, Doom/Overload-стиль) или переделаю в бафф.
  [CARD_IDS.adeniyi]: {
    id: CARD_IDS.adeniyi,
    domainId: 'sui',
    name: 'Adeniyi Warden',
    type: 'Minion',
    cost: 5,
    attack: 5,
    health: 5,
    text: 'Battlecry: Give a friendly minion +2/+2.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: 2, health: 2 }, target: 'FriendlyMinion' }
      }
    ]
  }
};

const spells: Record<string, Omit<SpellCard, 'domainId'> & Partial<Pick<SpellCard, 'domainId'>>> = {
  [CARD_IDS.coin]: {
    id: CARD_IDS.coin,
    domainId: 'sui',
    name: 'The Coin',
    type: 'Spell',
    cost: 0,
    text: 'Gain 1 temporary mana crystal',
    effects: [
      {
        trigger: { type: 'Play' },
        action: { type: 'ManaCrystal', amount: 1 }
      }
    ]
  }
};

export const DEMO_CARDS: Record<string, CardDefinition> = Object.fromEntries(
  Object.entries({ ...minions, ...spells }).map(([id, card]) => [
    id,
    { ...card, domainId: defaultDomainId }
  ])
);
export const DEMO_CARD_POOL = Object.values(DEMO_CARDS);
export function getCardDefinition(cardId: string): CardDefinition {
  const card = DEMO_CARDS[cardId];
  if (!card) {
    throw new Error(`Unknown card id: ${cardId}`);
  }
  return card;
}
