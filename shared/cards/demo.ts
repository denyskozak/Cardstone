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
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
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

  // Classic set minions
  [CARD_IDS.abusiveSergeant]: {
    id: CARD_IDS.abusiveSergeant,
    name: 'Abusive Sergeant',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1,
    text: 'Battlecry: Give a minion +2 Attack this turn.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: +2 }, target: 'FriendlyMinion' }
      },
      {
        trigger: { type: 'TurnEnd' },
        action: { type: 'Custom', key: 'ExpireTempBuff', data: { source: CARD_IDS.abusiveSergeant } }
      }
    ]
  },
  [CARD_IDS.argentSquire]: {
    id: CARD_IDS.argentSquire,
    name: 'Argent Squire',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1,
    text: 'Divine Shield.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'DivineShield' }
      }
    ]
  },
  [CARD_IDS.leperGnome]: {
    id: CARD_IDS.leperGnome,
    name: 'Leper Gnome',
    type: 'Minion',
    cost: 1,
    attack: 2,
    health: 1,
    text: 'Deathrattle: Deal 2 damage to the enemy hero.',
    effects: [
      {
        trigger: { type: 'Deathrattle' },
        action: { type: 'Damage', amount: 2, target: 'Hero' }
      }
    ]
  },
  [CARD_IDS.shieldbearer]: {
    id: CARD_IDS.shieldbearer,
    name: 'Shieldbearer',
    type: 'Minion',
    cost: 1,
    attack: 0,
    health: 4,
    text: 'Taunt.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
  },
  [CARD_IDS.southseaDeckhand]: {
    id: CARD_IDS.southseaDeckhand,
    name: 'Southsea Deckhand',
    type: 'Minion',
    cost: 1,
    attack: 2,
    health: 1,
    text: 'Has Charge while you have a weapon equipped.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Charge' },
        condition: { type: 'Custom', key: 'HasWeaponEquipped' }
      }
    ]
  },
  [CARD_IDS.worgenInfiltrator]: {
    id: CARD_IDS.worgenInfiltrator,
    name: 'Worgen Infiltrator',
    type: 'Minion',
    cost: 1,
    attack: 2,
    health: 1,
    text: 'Stealth.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Stealth' }
      }
    ]
  },
  [CARD_IDS.youngDragonhawk]: {
    id: CARD_IDS.youngDragonhawk,
    name: 'Young Dragonhawk',
    type: 'Minion',
    cost: 1,
    attack: 1,
    health: 1,
    text: 'Windfury.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Windfury' }
      }
    ]
  },
  [CARD_IDS.direWolfAlpha]: {
    id: CARD_IDS.direWolfAlpha,
    name: 'Dire Wolf Alpha',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'Adjacent minions have +1 Attack.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Buff', stats: { attack: +1 }, target: 'FriendlyMinion' },
        condition: { type: 'Custom', key: 'IsAdjacentToSelf' }
      }
    ]
  },
  [CARD_IDS.faerieDragon]: {
    id: CARD_IDS.faerieDragon,
    name: 'Faerie Dragon',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2,
    text: "Can't be targeted by spells or Hero Powers.",
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Elusive' }
      }
    ]
  },
  [CARD_IDS.lootHoarder]: {
    id: CARD_IDS.lootHoarder,
    name: 'Loot Hoarder',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 1,
    text: 'Deathrattle: Draw a card.',
    effects: [
      {
        trigger: { type: 'Deathrattle' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
  },
  [CARD_IDS.madBomber]: {
    id: CARD_IDS.madBomber,
    name: 'Mad Bomber',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2,
    text: 'Battlecry: Deal 3 damage randomly split among all other characters.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'RandomSplitDamage', data: { total: 3, pool: 'OtherCharacters' } }
      }
    ]
  },
  [CARD_IDS.youthfulBrewmaster]: {
    id: CARD_IDS.youthfulBrewmaster,
    name: 'Youthful Brewmaster',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2,
    text: 'Battlecry: Return a friendly minion to your hand.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'ReturnFriendlyToHand' }
      }
    ]
  },
  [CARD_IDS.knifeJuggler]: {
    id: CARD_IDS.knifeJuggler,
    name: 'Knife Juggler',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2,
    text: 'After you summon a minion, deal 1 damage to a random enemy.',
    effects: [
      {
        trigger: { type: 'Custom', key: 'AfterYouSummon' },
        action: { type: 'Custom', key: 'RandomEnemyDamage', data: { amount: 1 } }
      }
    ]
  },
  [CARD_IDS.manaWraith]: {
    id: CARD_IDS.manaWraith,
    name: 'Mana Wraith',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'ALL minions cost (1) more.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'ModifyCost', data: { who: 'AllMinions', delta: +1 } }
      }
    ]
  },
  [CARD_IDS.pintSizedSummoner]: {
    id: CARD_IDS.pintSizedSummoner,
    name: 'Pint-Sized Summoner',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'The first minion you play each turn costs (1) less.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'FirstMinionDiscount', data: { delta: -1 } }
      }
    ]
  },
  [CARD_IDS.sunfuryProtector]: {
    id: CARD_IDS.sunfuryProtector,
    name: 'Sunfury Protector',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3,
    text: 'Battlecry: Give adjacent minions Taunt.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'GiveAdjacentKeyword', data: { keyword: 'Taunt' } }
      }
    ]
  },
  [CARD_IDS.wildPyromancer]: {
    id: CARD_IDS.wildPyromancer,
    name: 'Wild Pyromancer',
    type: 'Minion',
    cost: 2,
    attack: 3,
    health: 2,
    text: 'After you cast a spell, deal 1 damage to ALL minions.',
    effects: [
      {
        trigger: { type: 'SpellCast' },
        action: { type: 'Custom', key: 'DamageAllMinions', data: { amount: 1 } }
      }
    ]
  },
  [CARD_IDS.ancientWatcher]: {
    id: CARD_IDS.ancientWatcher,
    name: 'Ancient Watcher',
    type: 'Minion',
    cost: 2,
    attack: 4,
    health: 5,
    text: "Can't attack.",
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'CantAttack' }
      }
    ]
  },
  [CARD_IDS.crazedAlchemist]: {
    id: CARD_IDS.crazedAlchemist,
    name: 'Crazed Alchemist',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 2,
    text: 'Battlecry: Swap the Attack and Health of a minion.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'SwapAtkHealth', data: { target: 'AnyMinion' } }
      }
    ]
  },
  [CARD_IDS.ironbeakOwl]: {
    id: CARD_IDS.ironbeakOwl,
    name: 'Ironbeak Owl',
    type: 'Minion',
    cost: 2,
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
  [CARD_IDS.riverCrocolisk]: {
    id: CARD_IDS.riverCrocolisk,
    name: 'River Crocolisk',
    type: 'Minion',
    cost: 2,
    attack: 2,
    health: 3
  },
  [CARD_IDS.amaniBerserker]: {
    id: CARD_IDS.amaniBerserker,
    name: 'Amani Berserker',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    text: 'Has +3 Attack while damaged.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Buff', stats: { attack: +3 }, target: 'Self' },
        condition: { type: 'IfDamaged', target: 'Self' }
      }
    ]
  },
  [CARD_IDS.earthenRingFarseer]: {
    id: CARD_IDS.earthenRingFarseer,
    name: 'Earthen Ring Farseer',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 3,
    text: 'Battlecry: Restore 3 Health.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Heal', amount: 3, target: 'AnyMinion' }
      }
    ]
  },
  [CARD_IDS.flesheatingGhoul]: {
    id: CARD_IDS.flesheatingGhoul,
    name: 'Flesheating Ghoul',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    text: 'Whenever a minion dies, gain +1 Attack.',
    effects: [
      {
        trigger: { type: 'Custom', key: 'AnyMinionDied' },
        action: { type: 'Buff', stats: { attack: +1 }, target: 'Self' }
      }
    ]
  },
  [CARD_IDS.harvestGolem]: {
    id: CARD_IDS.harvestGolem,
    name: 'Harvest Golem',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    text: 'Deathrattle: Summon a 2/1 Damaged Golem.',
    effects: [
      {
        trigger: { type: 'Deathrattle' },
        action: { type: 'Summon', cardId: CARD_IDS.damagedGolem, count: 1, target: 'Board' }
      }
    ]
  },
  [CARD_IDS.junglePanther]: {
    id: CARD_IDS.junglePanther,
    name: 'Jungle Panther',
    type: 'Minion',
    cost: 3,
    attack: 4,
    health: 2,
    text: 'Stealth.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Stealth' }
      }
    ]
  },
  [CARD_IDS.scarletCrusader]: {
    id: CARD_IDS.scarletCrusader,
    name: 'Scarlet Crusader',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 1,
    text: 'Divine Shield.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'DivineShield' }
      }
    ]
  },
  [CARD_IDS.shatteredSunCleric]: {
    id: CARD_IDS.shatteredSunCleric,
    name: 'Shattered Sun Cleric',
    type: 'Minion',
    cost: 3,
    attack: 3,
    health: 2,
    text: 'Battlecry: Give a friendly minion +1/+1.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: +1, health: +1 }, target: 'FriendlyMinion' }
      }
    ]
  },
  [CARD_IDS.raidLeader]: {
    id: CARD_IDS.raidLeader,
    name: 'Raid Leader',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 2,
    text: 'Your other minions have +1 Attack.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Buff', stats: { attack: +1 }, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.taurenWarrior]: {
    id: CARD_IDS.taurenWarrior,
    name: 'Tauren Warrior',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    text: 'Taunt. Has +3 Attack while damaged.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      },
      {
        trigger: { type: 'Aura' },
        action: { type: 'Buff', stats: { attack: +3 }, target: 'Self' },
        condition: { type: 'IfDamaged', target: 'Self' }
      }
    ]
  },
  [CARD_IDS.thrallmarFarseer]: {
    id: CARD_IDS.thrallmarFarseer,
    name: 'Thrallmar Farseer',
    type: 'Minion',
    cost: 3,
    attack: 2,
    health: 3,
    text: 'Windfury.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Windfury' }
      }
    ]
  },
  [CARD_IDS.ancientBrewmaster]: {
    id: CARD_IDS.ancientBrewmaster,
    name: 'Ancient Brewmaster',
    type: 'Minion',
    cost: 4,
    attack: 5,
    health: 4,
    text: 'Battlecry: Return a friendly minion to your hand.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'ReturnFriendlyToHand' }
      }
    ]
  },
  [CARD_IDS.chillwindYeti]: {
    id: CARD_IDS.chillwindYeti,
    name: 'Chillwind Yeti',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 5
  },
  [CARD_IDS.defenderOfArgus]: {
    id: CARD_IDS.defenderOfArgus,
    name: 'Defender of Argus',
    type: 'Minion',
    cost: 4,
    attack: 2,
    health: 3,
    text: 'Battlecry: Give adjacent minions +1/+1 and Taunt.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'BuffAdjacentAndTaunt', data: { atk: 1, hp: 1 } }
      }
    ]
  },
  [CARD_IDS.gnomishInventor]: {
    id: CARD_IDS.gnomishInventor,
    name: 'Gnomish Inventor',
    type: 'Minion',
    cost: 4,
    attack: 2,
    health: 4,
    text: 'Battlecry: Draw a card.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'DrawCard', amount: 1 }
      }
    ]
  },
  [CARD_IDS.senjinShieldmasta]: {
    id: CARD_IDS.senjinShieldmasta,
    name: "Sen'jin Shieldmasta",
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 5,
    text: 'Taunt.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
  },
  [CARD_IDS.spellbreaker]: {
    id: CARD_IDS.spellbreaker,
    name: 'Spellbreaker',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 3,
    text: 'Battlecry: Silence a minion.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Silence', data: { target: 'AnyMinion' } }
      }
    ]
  },
  [CARD_IDS.silvermoonGuardian]: {
    id: CARD_IDS.silvermoonGuardian,
    name: 'Silvermoon Guardian',
    type: 'Minion',
    cost: 4,
    attack: 3,
    health: 3,
    text: 'Divine Shield.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'DivineShield' }
      }
    ]
  },
  [CARD_IDS.darkIronDwarf]: {
    id: CARD_IDS.darkIronDwarf,
    name: 'Dark Iron Dwarf',
    type: 'Minion',
    cost: 4,
    attack: 4,
    health: 4,
    text: 'Battlecry: Give a minion +2 Attack this turn.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Buff', stats: { attack: +2 }, target: 'FriendlyMinion' }
      },
      {
        trigger: { type: 'TurnEnd' },
        action: { type: 'Custom', key: 'ExpireTempBuff', data: { source: CARD_IDS.darkIronDwarf } }
      }
    ]
  },
  [CARD_IDS.stormwindKnight]: {
    id: CARD_IDS.stormwindKnight,
    name: 'Stormwind Knight',
    type: 'Minion',
    cost: 4,
    attack: 2,
    health: 5,
    text: 'Charge.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Charge' }
      }
    ]
  },
  [CARD_IDS.silverHandKnight]: {
    id: CARD_IDS.silverHandKnight,
    name: 'Silver Hand Knight',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 4,
    text: 'Battlecry: Summon a 2/2 Squire.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Summon', cardId: CARD_IDS.squireToken, count: 1, target: 'Board' }
      }
    ]
  },
  [CARD_IDS.squireToken]: {
    id: CARD_IDS.squireToken,
    name: 'Squire',
    type: 'Minion',
    cost: 1,
    attack: 2,
    health: 2
  },
  [CARD_IDS.fenCreeper]: {
    id: CARD_IDS.fenCreeper,
    name: 'Fen Creeper',
    type: 'Minion',
    cost: 5,
    attack: 3,
    health: 6,
    text: 'Taunt.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Taunt' }
      }
    ]
  },
  [CARD_IDS.spitefulSmith]: {
    id: CARD_IDS.spitefulSmith,
    name: 'Spiteful Smith',
    type: 'Minion',
    cost: 5,
    attack: 4,
    health: 6,
    text: 'Your weapon has +2 Attack while this is damaged.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'BuffWeaponAttack', data: { amount: 2 } },
        condition: { type: 'IfDamaged', target: 'Self' }
      }
    ]
  },
  [CARD_IDS.stranglethornTiger]: {
    id: CARD_IDS.stranglethornTiger,
    name: 'Stranglethorn Tiger',
    type: 'Minion',
    cost: 5,
    attack: 5,
    health: 5,
    text: 'Stealth.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Stealth' }
      }
    ]
  },
  [CARD_IDS.frostElemental]: {
    id: CARD_IDS.frostElemental,
    name: 'Frost Elemental',
    type: 'Minion',
    cost: 6,
    attack: 5,
    health: 5,
    text: 'Battlecry: Freeze a character.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Custom', key: 'Freeze', data: { target: 'AnyMinion' } }
      }
    ]
  },
  [CARD_IDS.priestessOfElune]: {
    id: CARD_IDS.priestessOfElune,
    name: 'Priestess of Elune',
    type: 'Minion',
    cost: 6,
    attack: 5,
    health: 4,
    text: 'Battlecry: Restore 4 Health to your hero.',
    effects: [
      {
        trigger: { type: 'Battlecry' },
        action: { type: 'Heal', amount: 4, target: 'Hero' }
      }
    ]
  },
  [CARD_IDS.windfuryHarpy]: {
    id: CARD_IDS.windfuryHarpy,
    name: 'Windfury Harpy',
    type: 'Minion',
    cost: 6,
    attack: 4,
    health: 5,
    text: 'Windfury.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Custom', key: 'Windfury' }
      }
    ]
  },
  [CARD_IDS.stormwindChampion]: {
    id: CARD_IDS.stormwindChampion,
    name: 'Stormwind Champion',
    type: 'Minion',
    cost: 7,
    attack: 6,
    health: 6,
    text: 'Your other minions have +1/+1.',
    effects: [
      {
        trigger: { type: 'Aura' },
        action: { type: 'Buff', stats: { attack: +1, health: +1 }, target: 'AllFriendlies' }
      }
    ]
  },
  [CARD_IDS.warGolem]: {
    id: CARD_IDS.warGolem,
    name: 'War Golem',
    type: 'Minion',
    cost: 7,
    attack: 7,
    health: 7
  },
  [CARD_IDS.damagedGolem]: {
    id: CARD_IDS.damagedGolem,
    name: 'Damaged Golem',
    type: 'Minion',
    cost: 1,
    attack: 2,
    health: 1
  }
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
