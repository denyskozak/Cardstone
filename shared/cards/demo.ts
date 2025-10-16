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
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'DivineShield' }
      }
    ]
  },
  [CARD_IDS.berserk]: {
    id: CARD_IDS.berserk,
    name: 'Berserk',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Berserk', data: { attack: 2 } }
      }
    ]
  },
  [CARD_IDS.bullguard]: {
    id: CARD_IDS.bullguard,
    name: 'Bullguard',
    type: 'Minion',
    cost: 1,
    attack: 0,
    health: 4,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
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
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Battlecry' }
      }
    ],
  },
  [CARD_IDS.draugr]: {
    id: CARD_IDS.draugr,
    name: 'Draugr',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2,
    effects: [
      {
        trigger: { type: 'Deathrattle' },
        action: { type: 'Custom', key: 'Deathrattle' }
      }
    ]
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
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Battlecry' }
      }
    ]
  },
  [CARD_IDS.fireBeard]: {
    id: CARD_IDS.fireBeard,
    name: 'Fire Beard',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Berserk' }
      }
    ]
  },
  [CARD_IDS.forestDweller]: {
    id: CARD_IDS.forestDweller,
    name: 'Forest Dweller',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 4,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
  },
  [CARD_IDS.frongProtector]: {
    id: CARD_IDS.frongProtector,
    name: 'Frong Protector',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 5,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
  },
  [CARD_IDS.gatplank]: {
    id: CARD_IDS.gatplank,
    name: 'Gatplank',
    type: 'Minion',
    cost: 4,
    attack: 5,
    health: 3,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Battlecry' }
      }
    ]
  },
  [CARD_IDS.germesProtector]: {
    id: CARD_IDS.germesProtector,
    name: 'Germes Protector',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 6,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
  },
  [CARD_IDS.hoarder]: {
    id: CARD_IDS.hoarder,
    name: 'Hoarder',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 1,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
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
    effects: [
      {
        trigger: { type: 'Deathrattle' },
        action: { type: 'Custom', key: 'Deathrattle' }
      }
    ]
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
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Battlecry' }
      }
    ]
  },
  [CARD_IDS.ninja]: {
    id: CARD_IDS.ninja,
    name: 'Ninja',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 2,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Steals' }
      }
    ]
  },
  [CARD_IDS.python]: {
    id: CARD_IDS.python,
    name: 'Python',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 4,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Steals' }
      }
    ]
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
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'DivineShield' }
      }
    ]
  },
  [CARD_IDS.sage]: {
    id: CARD_IDS.sage,
    name: 'Sage',
    type: 'Minion',
    cost: 4,
    attack: 2,
    health: 5,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
  },
  [CARD_IDS.skeleton]: {
    id: CARD_IDS.skeleton,
    name: 'Skeleton',
    type: 'Minion',
    cost: 1,
    attack: 2,
    health: 1,
    effects: [
      {
        trigger: { type: 'Deathrattle' },
        action: { type: 'Custom', key: 'Deathrattle' }
      }
    ]
  },
  [CARD_IDS.surtur]: {
    id: CARD_IDS.surtur,
    name: 'Surtur',
    type: 'Minion',
    cost: 7,
    attack: 7,
    health: 7,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Berserk' }
      }
    ]
  },
  [CARD_IDS.tiger]: {
    id: CARD_IDS.tiger,
    name: 'Tiger',
    type: 'Minion',
    cost: 6,
    attack: 6,
    health: 5,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Steals' }
      }
    ]
  },
  [CARD_IDS.vikingGirl]: {
    id: CARD_IDS.vikingGirl,
    name: 'Viking Girl',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 4,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Battlecry' }
      }
    ]
  },
  [CARD_IDS.warrior]: {
    id: CARD_IDS.warrior,
    name: 'Warrior',
    type: 'Minion',
    cost: 6,
    attack: 6,
    health: 7,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
  },
  [CARD_IDS.waterElemental]: {
    id: CARD_IDS.waterElemental,
    name: 'Water Elemental',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 6,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Battlecry' }
      }
    ]
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
  },

  [CARD_IDS.abomination]: {
    id: CARD_IDS.abomination,
    name: 'Abomination',
    type: 'Minion',
    cost: 6,
    attack: 4,
    health: 7,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      },
      {
        trigger: { type: 'Deathrattle' },
        action: { type: 'Custom', key: 'DamageAllMinions', data: { amount: 2 } }
      }
    ]
  },
  [CARD_IDS.alchimist]: {
    id: CARD_IDS.alchimist,
    name: 'Alchimist',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'SwapAtkHealth', data: { target: 'AnyMinion' } }
      }
    ]
  },
  [CARD_IDS.bartender]: {
    id: CARD_IDS.bartender,
    name: 'Bartender',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 4,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Heal', amount: 3, target: 'Hero' }
      }
    ]
  },
  [CARD_IDS.brainEaterZombi]: {
    id: CARD_IDS.brainEaterZombi,
    name: 'Brain Eater Zombi',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    effects: [
      {
        trigger: { type: 'Deathrattle' },
        action: { type: 'Heal', amount: 3, target: 'Hero' }
      }
    ]
  },
  [CARD_IDS.bubusDog]: {
    id: CARD_IDS.bubusDog,
    name: "Bubu's Dog",
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 2,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Charge' }
      }
    ]
  },
  [CARD_IDS.draeneiWarrior]: {
    id: CARD_IDS.draeneiWarrior,
    name: 'Draenei Warrior',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 5,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
  },
  [CARD_IDS.dwarfBlacksmith]: {
    id: CARD_IDS.dwarfBlacksmith,
    name: 'Dwarf Blacksmith',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 4,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Battlecry' }
      }
    ]
  },
  [CARD_IDS.elfFireMage]: {
    id: CARD_IDS.elfFireMage,
    name: 'Elf Fire Mage',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 3,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', amount: 2, target: 'AnyMinion' }
      }
    ]
  },
  [CARD_IDS.frostSpirit]: {
    id: CARD_IDS.frostSpirit,
    name: 'Frost Spirit',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 4,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Freeze', data: { target: 'AnyMinion' } }
      }
    ]
  },
  [CARD_IDS.gnomeMage]: {
    id: CARD_IDS.gnomeMage,
    name: 'Gnome Mage',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    effects: [
      {
        trigger: { type: 'SpellCast' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
  },
  [CARD_IDS.goblinAuctioneer]: {
    id: CARD_IDS.goblinAuctioneer,
    name: 'Goblin Auctioneer',
    type: 'Minion',
    cost: 6,
    attack: 4,
    health: 4,
    effects: [
      {
        trigger: { type: 'SpellCast' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
  },
  [CARD_IDS.hiddenMage]: {
    id: CARD_IDS.hiddenMage,
    name: 'Hidden Mage',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Stealth' }
      }
    ]
  },
  [CARD_IDS.holyElf]: {
    id: CARD_IDS.holyElf,
    name: 'Holy Elf',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 4,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Heal', amount: 3, target: 'Hero' }
      }
    ]
  },
  [CARD_IDS.inferno]: {
    id: CARD_IDS.inferno,
    name: 'Inferno',
    type: 'Minion',
    cost: 7,
    attack: 7,
    health: 5,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Damage', amount: 3, target: 'AllEnemies' }
      }
    ]
  },
  [CARD_IDS.joker]: {
    id: CARD_IDS.joker,
    name: 'Joker',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'DrawCard', amount: 2 }
      }
    ]
  },
  [CARD_IDS.kirintorMage]: {
    id: CARD_IDS.kirintorMage,
    name: 'Kirintor Mage',
    type: 'Minion',
    cost: 3,
    attack: 4,
    health: 3,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Battlecry' }
      }
    ]
  },
  [CARD_IDS.knifJungler]: {
    id: CARD_IDS.knifJungler,
    name: 'Knif Jungler',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    effects: [
      {
        trigger: { type: 'Custom', key: 'AfterYouSummon' },
        action: { type: 'Custom', key: 'RandomEnemyDamage', data: { amount: 1 } }
      }
    ]
  },
  [CARD_IDS.nightMorloc]: {
    id: CARD_IDS.nightMorloc,
    name: 'Night Morloc',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3
  },
  [CARD_IDS.pantera]: {
    id: CARD_IDS.pantera,
    name: 'Pantera',
    type: 'Minion',
    cost: 1,
    attack: 2,
    health: 1,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Stealth' }
      }
    ]
  },
  [CARD_IDS.pirateGirl]: {
    id: CARD_IDS.pirateGirl,
    name: 'Pirate Girl',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Charge' }
      }
    ]
  },
  [CARD_IDS.pirateMan]: {
    id: CARD_IDS.pirateMan,
    name: 'Pirate Man',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Battlecry' }
      }
    ]
  },
  [CARD_IDS.pyromancer]: {
    id: CARD_IDS.pyromancer,
    name: 'Pyromancer',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    effects: [
      {
        trigger: { type: 'SpellCast' },
        action: { type: 'Custom', key: 'DamageAllMinions', data: { amount: 1 } }
      }
    ]
  },
  [CARD_IDS.ravenholdtAssassin]: {
    id: CARD_IDS.ravenholdtAssassin,
    name: 'Ravenholdt Assassin',
    type: 'Minion',
    cost: 6,
    attack: 7,
    health: 5,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Stealth' }
      }
    ]
  },
  [CARD_IDS.sandDefender]: {
    id: CARD_IDS.sandDefender,
    name: 'Sand Defender',
    type: 'Minion',
    cost: 4,
    attack: 2,
    health: 6,
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
  },
  [CARD_IDS.scorpion]: {
    id: CARD_IDS.scorpion,
    name: 'Scorpion',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 4
  },
  [CARD_IDS.shadowDrake]: {
    id: CARD_IDS.shadowDrake,
    name: 'Shadow Drake',
    type: 'Minion',
    cost: 5,
    attack: 5,
    health: 4,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
  },
  [CARD_IDS.taurenPrist]: {
    id: CARD_IDS.taurenPrist,
    name: 'Tauren Prist',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 6,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Heal', amount: 4, target: 'FriendlyMinion' }
      }
    ]
  },
  [CARD_IDS.waterMorlockSmall]: {
    id: CARD_IDS.waterMorlockSmall,
    name: 'Water Morlock',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Summon', cardId: CARD_IDS.wisp, count: 1, target: 'Board' }
      }
    ]
  },

};
const spells: Record<string, SpellCard> = {
  [CARD_IDS.firebolt]: {
    id: CARD_IDS.firebolt,
    name: 'Firebolt',
    type: 'Spell',
    cost: 2,
    text: 'Deal 2 damage.',
    effects: [
      {
        trigger: { type: 'Play' },
        action: { type: 'Damage', amount: 2, target: 'AllEnemies' }
      }
    ]
  },
  [CARD_IDS.heal]: {
    id: CARD_IDS.heal,
    name: 'Mending Touch',
    type: 'Spell',
    cost: 2,
    text: 'Restore 2 Health.',
    effects: [
      {
        trigger: { type: 'Play' },
        action: { type: 'Heal', amount: 2, target: 'AllFriendlies' }
      }
    ]
  },
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
