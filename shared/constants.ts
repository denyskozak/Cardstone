import type { MatchConfig } from './types.js';

export const MATCH_CONFIG: MatchConfig = {
  startingHandSize: 4,
  startingMana: 1,
  maxMana: 10,
  heroHp: 30,
  handLimit: 10
};

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
  sergeant: 'card_sergeant',
  shieldGuard: 'card_shield_guard',
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

  // Classic minions
  abusiveSergeant: 'card_abusive_sergeant',
  ancientBrewmaster: 'card_ancient_brewmaster',
  ancientWatcher: 'card_ancient_watcher',
  amaniBerserker: 'card_amani_berserker',
  argentSquire: 'card_argent_squire',
  chillwindYeti: 'card_chillwind_yeti',
  crazedAlchemist: 'card_crazed_alchemist',
  darkIronDwarf: 'card_dark_iron_dwarf',
  defenderOfArgus: 'card_defender_of_argus',
  direWolfAlpha: 'card_dire_wolf_alpha',
  earthenRingFarseer: 'card_earthen_ring_farseer',
  faerieDragon: 'card_faerie_dragon',
  fenCreeper: 'card_fen_creeper',
  flesheatingGhoul: 'card_flesheating_ghoul',
  frostElemental: 'card_frost_elemental',
  gnomishInventor: 'card_gnomish_inventor',
  harvestGolem: 'card_harvest_golem',
  ironbeakOwl: 'card_ironbeak_owl',
  junglePanther: 'card_jungle_panther',
  leperGnome: 'card_leper_gnome',
  lootHoarder: 'card_loot_hoarder',
  knifeJuggler: 'card_knife_juggler',
  madBomber: 'card_mad_bomber',
  manaWraith: 'card_mana_wraith',
  pintSizedSummoner: 'card_pint_sized_summoner',
  priestessOfElune: 'card_priestess_of_elune',
  raidLeader: 'card_raid_leader',
  riverCrocolisk: 'card_river_crocolisk',
  scarletCrusader: 'card_scarlet_crusader',
  senjinShieldmasta: 'card_senjin_shieldmasta',
  shatteredSunCleric: 'card_shattered_sun_cleric',
  silverHandKnight: 'card_silver_hand_knight',
  silvermoonGuardian: 'card_silvermoon_guardian',
  shieldbearer: 'card_shieldbearer',
  southseaDeckhand: 'card_southsea_deckhand',
  spellbreaker: 'card_spellbreaker',
  spitefulSmith: 'card_spiteful_smith',
  stormwindChampion: 'card_stormwind_champion',
  stormwindKnight: 'card_stormwind_knight',
  stranglethornTiger: 'card_stranglethorn_tiger',
  sunfuryProtector: 'card_sunfury_protector',
  taurenWarrior: 'card_tauren_warrior',
  thrallmarFarseer: 'card_thrallmar_farseer',
  wildPyromancer: 'card_wild_pyromancer',
  windfuryHarpy: 'card_windfury_harpy',
  warGolem: 'card_war_golem',
  worgenInfiltrator: 'card_worgen_infiltrator',
  youngDragonhawk: 'card_young_dragonhawk',
  youthfulBrewmaster: 'card_youthful_brewmaster',

  // Tokens
  damagedGolem: 'token_damaged_golem',
  squireToken: 'token_squire_2_2',

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
  CARD_IDS.stormwindChampion,

  // Coin (не включаем — карта выдаётся второму игроку автоматически)
];
