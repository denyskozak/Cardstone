import type { MatchConfig } from './types.js';

export const MATCH_CONFIG: MatchConfig = {
  startingHandSize: 4,
  startingMana: 1,
  maxMana: 10,
  heroHp: 30
};

export const DRAW_PER_TURN = 1;
export const MAX_DECK_SIZE = 30;
export const STARTING_SEQ = 1;

export const CARD_IDS = {
  argentSquare: 'card_argent_square',
  berserk: 'card_berserk',
  bullguard: 'card_bullguard',
  cunningPeople: 'card_cunning_people',
  delivarer: 'card_delivarer',
  draugr: 'card_draugr',
  elunaPrist: 'card_eluna_prist',
  fairyLife: 'card_fairy_life',
  fireBeard: 'card_fire_beard',
  firebolt: 'card_firebolt',
  forestDweller: 'card_forest_dweller',
  frongProtector: 'card_frong_protector',
  gatplank: 'card_gatplank',
  germesProtector: 'card_germes_protector',
  hoarder: 'card_hoarder',
  knight: 'card_knight',
  lepraGnome: 'card_lepra_gnome',
  miniDragon: 'card_mini_dragon',
  nighOwl: 'card_nigh_owl',
  ninja: 'card_ninja',
  python: 'card_python',
  raider: 'card_raider',
  sacredGargoyle: 'card_sacred_gargoyle',
  sage: 'card_sage',
  sergeant: 'card_sergeant',
  shieldGuard: 'card_shield_guard',
  skeleton: 'card_skeleton',
  surtur: 'card_surtur',
  tiger: 'card_tiger',
  vikingGirl: 'card_viking_girl',
  warrior: 'card_warrior',
  waterElemental: 'card_water_elemental',
  wisp: 'card_wisp',
  wolf: 'card_wolf',
  worgen: 'card_worgen',
  heal: 'card_spell_heal',
  coin: 'card_mana_coin'
} as const;


export type DemoCardId = (typeof CARD_IDS)[keyof typeof CARD_IDS];
export const DEFAULT_DECK: DemoCardId[] = [
  // 🔹 1 мана
  CARD_IDS.argentSquare,  CARD_IDS.argentSquare,   // x2
  CARD_IDS.bullguard,     CARD_IDS.bullguard,      // x2
  CARD_IDS.lepraGnome,    CARD_IDS.lepraGnome,     // x2
  CARD_IDS.wisp,          CARD_IDS.wisp,           // x2

  // 🔹 2 маны
  CARD_IDS.berserk,       CARD_IDS.berserk,        // x2
  CARD_IDS.hoarder,       CARD_IDS.hoarder,        // x2
  CARD_IDS.raider,        CARD_IDS.raider,         // x2
  CARD_IDS.sergeant,      CARD_IDS.sergeant,       // x2
  CARD_IDS.firebolt,      CARD_IDS.firebolt,       // x2

  // 🔹 3 маны
  CARD_IDS.elunaPrist,    CARD_IDS.elunaPrist,     // x2
  CARD_IDS.fireBeard,     CARD_IDS.fireBeard,      // x2
  CARD_IDS.ninja,         CARD_IDS.ninja,          // x2
  CARD_IDS.wolf,          CARD_IDS.wolf,           // x2
  CARD_IDS.heal,          CARD_IDS.heal,           // x2

  // 🔹 4 маны
  CARD_IDS.knight,        CARD_IDS.shieldGuard,    // по 1 копии
  CARD_IDS.knight,        CARD_IDS.shieldGuard,    // по 2 копии итого

  // 🔹 5–6 маны
  CARD_IDS.miniDragon,
  CARD_IDS.worgen,
  CARD_IDS.tiger,

  // Coin (не включаем — карта выдаётся второму игроку автоматически)
];
