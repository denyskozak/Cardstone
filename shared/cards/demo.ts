import type { CardDefinition, MinionCard, SpellCard } from '../types.js';
import { CARD_IDS } from '../constants.js';

const SUI_MINIONS: Record<string, MinionCard> = {
  [CARD_IDS.suilend]: {
    id: CARD_IDS.suilend,
    domainId: 'sui',
    name: 'Suilend',
    type: 'Minion',
    cost: 4,
    attack: 1,
    health: 4,
    text: 'At the end of your turn, draw a card.',
    effects: [{ trigger: { type: 'TurnEnd' }, action: { type: 'DrawCard', amount: 1 } }]
  },
  [CARD_IDS.blub]: {
    id: CARD_IDS.blub,
    domainId: 'sui',
    name: 'Blub',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2
  },
  [CARD_IDS.hipo]: {
    id: CARD_IDS.hipo,
    domainId: 'sui',
    name: 'Hipo',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2,
    text: 'On end of turn, restore 1 Health to your hero.',
    effects: [{ trigger: { type: 'TurnEnd' }, action: { type: 'Heal', amount: 1, target: 'Hero' } }]
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
  [CARD_IDS.cetus]: {
    id: CARD_IDS.cetus,
    domainId: 'sui',
    name: 'Cetus',
    type: 'Minion',
    cost: 6,
    attack: 3,
    health: 4,
    text: 'Deal 2 damage to all enemies.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', amount: 2, target: 'AllEnemies' }
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
    text: 'Deal 1 damage to all enemies.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', amount: 1, target: 'AllEnemies' }
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
      { trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Berserk', data: { attack: 1 } } }
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
    attack: 4,
    health: 4,
    text: 'Summon 2 Dev Interns.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Summon', cardId: CARD_IDS.devIntern, count: 2, target: 'Board' }
      }
    ]
  },
  [CARD_IDS.deepBook]: {
    id: CARD_IDS.deepBook,
    domainId: 'sui',
    name: 'DeepBook',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    text: 'Restore 2 Health to your hero.',
    effects: [
      { trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 2, target: 'Hero' } }
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
    text: 'Taunt. Has +2 Attack while damaged.',
    effects: [
      { trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } },
      { trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Berserk', data: { attack: 2 } } }
    ]
  },
  [CARD_IDS.fud]: {
    id: CARD_IDS.fud,
    domainId: 'sui',
    name: 'Fud',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2
  },
  [CARD_IDS.miu]: {
    id: CARD_IDS.miu,
    domainId: 'sui',
    name: 'Miu',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 2,
    text: 'Deal 2 damage to a random enemy.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', amount: 2, target: 'RandomEnemy' }
      }
    ]
  },
  [CARD_IDS.matteo]: {
    id: CARD_IDS.matteo,
    domainId: 'sui',
    name: 'Matteo',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 1,
    text: 'Draw one card.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'DrawCard', amount: 1 } }]
  },
  [CARD_IDS.kostasKryptos]: {
    id: CARD_IDS.kostasKryptos,
    domainId: 'sui',
    name: 'Kostas',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 4,
    text: 'Summon one 2/2 Seal.',
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
    name: 'Lofi',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    text: 'Restore 3 Health to your hero.',
    effects: [
      { trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 3, target: 'Hero' } }
    ]
  },
  [CARD_IDS.noodls]: {
    id: CARD_IDS.noodls,
    domainId: 'sui',
    name: 'Noodls',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 5,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.evan]: {
    id: CARD_IDS.evan,
    domainId: 'sui',
    name: 'Evan',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 2,
    text: 'Deal 1 damage to a random enemy.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', amount: 1, target: 'RandomEnemy' }
      }
    ]
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
  [CARD_IDS.samBlackshear]: {
    id: CARD_IDS.samBlackshear,
    domainId: 'sui',
    name: 'Sam',
    type: 'Minion',
    cost: 6,
    attack: 5,
    health: 5,
    text: 'Deal 3 damage to a random enemy.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', target: 'RandomEnemy', amount: 3 }
      }
    ]
  },
  [CARD_IDS.ika]: {
    id: CARD_IDS.ika,
    domainId: 'sui',
    name: 'Ika',
    type: 'Minion',
    cost: 4,
    attack: 2,
    health: 5,
    text: 'Draw 1 card.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'DrawCard', amount: 1 } }]
  },
  [CARD_IDS.adeniyi]: {
    id: CARD_IDS.adeniyi,
    domainId: 'sui',
    name: 'Adeniyi',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 4,
    text: 'Give all friendlies +1 Attack.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: 1, health: 0 }, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.hermes]: {
    id: CARD_IDS.hermes,
    domainId: 'greek',
    name: 'Hermes',
    type: 'Minion',
    cost: 2,
    attack: 1,
    health: 1,
    text: 'Battlecry: Draw a card.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'DrawCard', amount: 1 } }]
  },
  [CARD_IDS.hoplite]: {
    id: CARD_IDS.hoplite,
    domainId: 'greek',
    name: 'Hoplite',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.oliveKeeper]: {
    id: CARD_IDS.oliveKeeper,
    domainId: 'greek',
    name: 'Olive Keeper',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2,
    text: 'Battlecry: Restore 2 Health to your hero.',
    effects: [
      { trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 2, target: 'Hero' } }
    ]
  },
  [CARD_IDS.oracle]: {
    id: CARD_IDS.oracle,
    domainId: 'greek',
    name: 'Oracle',
    type: 'Minion',
    cost: 2,
    attack: 1,
    health: 3,
    text: 'Battlecry: Draw a card.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'DrawCard', amount: 1 } }]
  },
  [CARD_IDS.satyr]: {
    id: CARD_IDS.satyr,
    domainId: 'greek',
    name: 'Satyr',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 1,
    text: '',
    effects: []
  },
  [CARD_IDS.nymph]: {
    id: CARD_IDS.nymph,
    domainId: 'greek',
    name: 'Nymph',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'Battlecry: Restore 2 Health to your hero.',
    effects: [
      { trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 2, target: 'Hero' } }
    ]
  },
  [CARD_IDS.aegisBearer]: {
    id: CARD_IDS.aegisBearer,
    domainId: 'greek',
    name: 'Aegis',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.fisherman]: {
    id: CARD_IDS.fisherman,
    domainId: 'greek',
    name: 'Fisherman',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'Battlecry: Restore 1 Health to all friendly characters.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Heal', amount: 1, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.lyrePlayer]: {
    id: CARD_IDS.lyrePlayer,
    domainId: 'greek',
    name: 'Bard',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    text: 'Battlecry: Give all friendly minions +1 Attack.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: 1, health: 0 }, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.triton]: {
    id: CARD_IDS.triton,
    domainId: 'greek',
    name: 'Triton',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 4,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.medusa]: {
    id: CARD_IDS.medusa,
    domainId: 'greek',
    name: 'Medusa',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    text: 'Battlecry: Give all friendly minions +0/+1.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: 0, health: 1 }, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.hephaestus]: {
    id: CARD_IDS.hephaestus,
    domainId: 'greek',
    name: 'Hephaestus',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 4,
    text: 'Battlecry: Give all friendly minions +0/+1.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: 0, health: 1 }, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.artemis]: {
    id: CARD_IDS.artemis,
    domainId: 'greek',
    name: 'Artemis',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 2,
    text: 'Battlecry: Deal 2 damage to a random enemy.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', amount: 2, target: 'RandomEnemy' }
      }
    ]
  },
  [CARD_IDS.odysseus]: {
    id: CARD_IDS.odysseus,
    domainId: 'greek',
    name: 'Odysseus',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 4,
    text: 'Battlecry: Draw a card and restore 2 Health to your hero.',
    effects: [
      { trigger: { type: 'Battlecry' }, action: { type: 'DrawCard', amount: 1 } },
      { trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 2, target: 'Hero' } }
    ]
  },
  [CARD_IDS.minotaur]: {
    id: CARD_IDS.minotaur,
    domainId: 'greek',
    name: 'Minotaur',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 5,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.athena]: {
    id: CARD_IDS.athena,
    domainId: 'greek',
    name: 'Athena',
    type: 'Minion',
    cost: 4,
    attack: 2,
    health: 4,
    text: 'Battlecry: Give all friendly minions +1/+1.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: 1, health: 1 }, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.achilles]: {
    id: CARD_IDS.achilles,
    domainId: 'greek',
    name: 'Achilles',
    type: 'Minion',
    cost: 5,
    attack: 5,
    health: 5,
    text: 'Has +2 Attack while damaged.',
    effects: [
      { trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Berserk', data: { attack: 2 } } }
    ]
  },
  [CARD_IDS.poseidon]: {
    id: CARD_IDS.poseidon,
    domainId: 'greek',
    name: 'Poseidon',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 6,
    text: 'Battlecry: Restore 2 Health to all friendly characters.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Heal', amount: 2, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.hades]: {
    id: CARD_IDS.hades,
    domainId: 'greek',
    name: 'Hades',
    type: 'Minion',
    cost: 6,
    attack: 5,
    health: 6,
    text: 'Battlecry: Give all friendly minions +0/+2.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: 0, health: 2 }, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.zeus]: {
    id: CARD_IDS.zeus,
    domainId: 'greek',
    name: 'Zeus',
    type: 'Minion',
    cost: 6,
    attack: 4,
    health: 6,
    text: 'Battlecry: Give all friendly minions +1/+1.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: 1, health: 1 }, target: 'AllFriendlies' }
      }
    ]
  }
};



const GREEK_MINIONS: Record<string, MinionCard> = {
  [CARD_IDS.hermes]: {
    id: CARD_IDS.hermes,
    domainId: 'greek',
    name: 'Hermes',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1,
    text: 'Battlecry: Draw a card.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'DrawCard', amount: 1 } }]
  },
  [CARD_IDS.hoplite]: {
    id: CARD_IDS.hoplite,
    domainId: 'greek',
    name: 'Hoplite',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.oliveKeeper]: {
    id: CARD_IDS.oliveKeeper,
    domainId: 'greek',
    name: 'Olive Keeper',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2,
    text: 'Battlecry: Restore 2 Health to your hero.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 2, target: 'Hero' } }]
  },
  [CARD_IDS.oracle]: {
    id: CARD_IDS.oracle,
    domainId: 'greek',
    name: 'Oracle',
    type: 'Minion',
    cost: 2,
    attack: 1,
    health: 3,
    text: 'Battlecry: Draw a card.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'DrawCard', amount: 1 } }]
  },
  [CARD_IDS.satyr]: {
    id: CARD_IDS.satyr,
    domainId: 'greek',
    name: 'Satyr',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 1,
    text: '',
    effects: []
  },
  [CARD_IDS.nymph]: {
    id: CARD_IDS.nymph,
    domainId: 'greek',
    name: 'Nymph',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'Battlecry: Restore 2 Health to your hero.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 2, target: 'Hero' } }]
  },
  [CARD_IDS.aegisBearer]: {
    id: CARD_IDS.aegisBearer,
    domainId: 'greek',
    name: 'Aegis',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.fisherman]: {
    id: CARD_IDS.fisherman,
    domainId: 'greek',
    name: 'Fisherman',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'Battlecry: Restore 1 Health to all friendly characters.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 1, target: 'AllFriendlies' } }]
  },
  [CARD_IDS.lyrePlayer]: {
    id: CARD_IDS.lyrePlayer,
    domainId: 'greek',
    name: 'Bard',
    type: 'Minion',
    cost: 2,
    attack: 1,
    health: 3,
    text: 'Battlecry: Give all friendly minions +1 Attack.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Buff', stats: { attack: 1, health: 0 }, target: 'AllFriendlies' } }]
  },
  [CARD_IDS.triton]: {
    id: CARD_IDS.triton,
    domainId: 'greek',
    name: 'Triton',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 4,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.medusa]: {
    id: CARD_IDS.medusa,
    domainId: 'greek',
    name: 'Medusa',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    text: 'Battlecry: Deal 2 damage to a random minion.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Damage', amount: 2, target: 'RandomMinion' } }]
  },
  [CARD_IDS.hephaestus]: {
    id: CARD_IDS.hephaestus,
    domainId: 'greek',
    name: 'Hephaestus',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 4,
    text: 'Battlecry: Give all friendly minions +0/+1.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Buff', stats: { attack: 0, health: 1 }, target: 'AllFriendlies' } }]
  },
  [CARD_IDS.artemis]: {
    id: CARD_IDS.artemis,
    domainId: 'greek',
    name: 'Artemis',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 2,
    text: 'Battlecry: Deal 2 damage to a random enemy.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Damage', amount: 2, target: 'RandomEnemy' } }]
  },
  [CARD_IDS.odysseus]: {
    id: CARD_IDS.odysseus,
    domainId: 'greek',
    name: 'Odysseus',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 4,
    text: 'Battlecry: Draw a card and restore 2 Health to your hero.',
    effects: [
      { trigger: { type: 'Battlecry' }, action: { type: 'DrawCard', amount: 1 } },
      { trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 2, target: 'Hero' } }
    ]
  },
  [CARD_IDS.minotaur]: {
    id: CARD_IDS.minotaur,
    domainId: 'greek',
    name: 'Minotaur',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 5,
    text: 'Taunt.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Taunt' } }]
  },
  [CARD_IDS.athena]: {
    id: CARD_IDS.athena,
    domainId: 'greek',
    name: 'Athena',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 5,
    text: 'Battlecry: Give all friendly minions +1/+1.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Buff', stats: { attack: 1, health: 1 }, target: 'AllFriendlies' } }]
  },
  [CARD_IDS.achilles]: {
    id: CARD_IDS.achilles,
    domainId: 'greek',
    name: 'Achilles',
    type: 'Minion',
    cost: 5,
    attack: 5,
    health: 5,
    text: 'Has +2 Attack while damaged.',
    effects: [{ trigger: { type: 'Aura' }, action: { type: 'Custom', key: 'Berserk', data: { attack: 2 } } }]
  },
  [CARD_IDS.poseidon]: {
    id: CARD_IDS.poseidon,
    domainId: 'greek',
    name: 'Poseidon',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 6,
    text: 'Battlecry: Restore 2 Health to all friendly characters.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Heal', amount: 2, target: 'AllFriendlies' } }]
  },
  [CARD_IDS.hades]: {
    id: CARD_IDS.hades,
    domainId: 'greek',
    name: 'Hades',
    type: 'Minion',
    cost: 6,
    attack: 5,
    health: 6,
    text: 'Battlecry: Deal 2 damage to all enemies.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Damage', amount: 2, target: 'AllEnemies' } }]
  },
  [CARD_IDS.zeus]: {
    id: CARD_IDS.zeus,
    domainId: 'greek',
    name: 'Zeus',
    type: 'Minion',
    cost: 6,
    attack: 4,
    health: 7,
    text: 'Battlecry: Give all friendly minions +1/+1.',
    effects: [{ trigger: { type: 'Battlecry' }, action: { type: 'Buff', stats: { attack: 1, health: 1 }, target: 'AllFriendlies' } }]
  }
};

const spells: Record<string, SpellCard> = {
  [CARD_IDS.coin]: {
    id: CARD_IDS.coin,
    domainId: 'sui',
    name: 'The Coin',
    type: 'Spell',
    cost: 0,
    text: 'Gain 1 temporary mana crystal',
    effects: [{ trigger: { type: 'Play' }, action: { type: 'ManaCrystal', amount: 1 } }]
  },
  // [CARD_IDS.moveBurst]: {
  //   id: CARD_IDS.moveBurst,
  //   domainId: 'sui',
  //   name: 'Move Burst',
  //   type: 'Spell',
  //   cost: 1,
  //   text: 'Deal 3 damage to a minion.',
  //   effects: [{ trigger: { type: 'Play' }, action: { type: 'Damage', amount: 3, target: 'AnyMinion' } }]
  // },
  // [CARD_IDS.suiWave]: {
  //   id: CARD_IDS.suiWave,
  //   domainId: 'sui',
  //   name: 'Wave',
  //   type: 'Spell',
  //   cost: 2,
  //   text: 'Heal 5 to your hero.',
  //   effects: [{ trigger: { type: 'Play' }, action: { type: 'Heal', amount: 5, target: 'Hero' } }]
  // }
};

export const DEMO_CARDS: Record<string, CardDefinition> = {
  ...SUI_MINIONS,
  ...GREEK_MINIONS,
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
