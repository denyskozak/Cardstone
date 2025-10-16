import type { MatchConfig } from './types.js';

export const MATCH_CONFIG: MatchConfig = {
  startingHandSize: 4,
  startingMana: 1,
  maxMana: 10,
  heroHp: 30,
  handLimit: 10,
  mulliganDurationMs: 45_000,
  turnDurationMs: 75_000
};

export const MULLIGAN_DURATION_MS = MATCH_CONFIG.mulliganDurationMs;
export const TURN_DURATION_MS = MATCH_CONFIG.turnDurationMs;

export const DRAW_PER_TURN = 1;
export const MAX_DECK_SIZE = 30;
export const STARTING_SEQ = 1;

export const CARD_IDS = {
  // Demo originals
  argentSquare: 'card_argent_square',
  abomination: 'card_abomination',
  alchimist: 'card_alchimist',
  bartender: 'card_bartender',
  berserk: 'card_berserk',
  brainEaterZombi: 'card_brain_eater_zombi',
  bubusDog: 'card_bubus_dog',
  bullguard: 'card_bullguard',
  cunningPeople: 'card_cunning_people',
  delivarer: 'card_delivarer',
  draeneiWarrior: 'card_draenei_warrior',
  draugr: 'card_draugr',
  dwarfBlacksmith: 'card_dwarf_blacksmith',
  elfFireMage: 'card_elf_fire_mage',
  elunaPrist: 'card_eluna_prist',
  fairyLife: 'card_fairy_life',
  fireBeard: 'card_fire_beard',
  forestDweller: 'card_forest_dweller',
  frongProtector: 'card_frong_protector',
  frostSpirit: 'card_frost_spirit',
  gatplank: 'card_gatplank',
  germesProtector: 'card_germes_protector',
  gnomeMage: 'card_gnome_mage',
  goblinAuctioneer: 'goblin_auctioneer',
  hiddenMage: 'card_hidden_mage',
  hoarder: 'card_hoarder',
  holyElf: 'card_holy_elf',
  inferno: 'card_inferno',
  joker: 'card_joker',
  kirintorMage: 'card_kirintor_mage',
  knight: 'card_knight',
  knifJungler: 'card_knif_jungler',
  lepraGnome: 'card_lepra_gnome',
  miniDragon: 'card_mini_dragon',
  nighOwl: 'card_nigh_owl',
  nightMorloc: 'card_night_morloc',
  ninja: 'card_ninja',
  pantera: 'card_pantera',
  pirateGirl: 'card_pirate_girl',
  pirateMan: 'card_pirate_man',
  pyromancer: 'card_pyromancer',
  python: 'card_python',
  ravenholdtAssassin: 'card_ravenholdt_assisn',
  raider: 'card_raider',
  sacredGargoyle: 'card_sacred_gargoyle',
  sage: 'card_sage',
  sandDefender: 'card_sand_defender',
  scorpion: 'card_scorpion',
  shadowDrake: 'card_shadow_drake',
  skeleton: 'card_skeleton',
  surtur: 'card_surtur',
  taurenPrist: 'card_tauren_prist',
  tiger: 'card_tiger',
  vikingGirl: 'card_viking_girl',
  warrior: 'card_warrior',
  waterElemental: 'card_water_elemental',
  waterMorlockSmall: 'card_water_morlock_small',
  wisp: 'card_wisp',
  wolf: 'card_wolf',
  worgen: 'card_worgen',

  // Spells
  firebolt: 'card_firebolt',
  heal: 'card_spell_heal',
  coin: 'card_mana_coin'
} as const;


export type DemoCardId = (typeof CARD_IDS)[keyof typeof CARD_IDS];
export const DEFAULT_DECK: DemoCardId[] = [
  // 🔹 1 мана
  CARD_IDS.argentSquare,
  CARD_IDS.bubusDog,
  CARD_IDS.bullguard,
  CARD_IDS.cunningPeople,
  CARD_IDS.pantera,

  // 🔹 2 маны
  CARD_IDS.alchimist,
  CARD_IDS.berserk,
  CARD_IDS.firebolt,
  CARD_IDS.gnomeMage,
  CARD_IDS.heal,
  CARD_IDS.waterMorlockSmall,

  // 🔹 3 маны
  CARD_IDS.bartender,
  CARD_IDS.fireBeard,
  CARD_IDS.frostSpirit,
  CARD_IDS.joker,
  CARD_IDS.pyromancer,

  // 🔹 4 маны
  CARD_IDS.draeneiWarrior,
  CARD_IDS.dwarfBlacksmith,
  CARD_IDS.elfFireMage,
  CARD_IDS.knight,
  CARD_IDS.sandDefender,

  // 🔹 5 маны
  CARD_IDS.miniDragon,
  CARD_IDS.shadowDrake,
  CARD_IDS.taurenPrist,

  // 🔹 6 маны
  CARD_IDS.abomination,
  CARD_IDS.goblinAuctioneer,
  CARD_IDS.ravenholdtAssassin,
  CARD_IDS.tiger,

  // 🔹 7 маны
  CARD_IDS.inferno,
  CARD_IDS.surtur,

  // Coin (не включаем — карта выдаётся второму игроку автоматически)
];
