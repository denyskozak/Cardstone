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
  noviceMage: 'card_novice_mage',
  stoutGuardian: 'card_stout_guardian',
  riverCrocolisk: 'card_river_crocolisk',
  arcaneApprentice: 'card_arcane_apprentice',
  firebolt: 'card_firebolt',
  heal: 'card_heal',
  coin: 'card_coin'
} as const;

export type DemoCardId = (typeof CARD_IDS)[keyof typeof CARD_IDS];

export const DEFAULT_DECK: DemoCardId[] = [
  CARD_IDS.noviceMage,
  CARD_IDS.noviceMage,
  CARD_IDS.noviceMage,
  CARD_IDS.noviceMage,
  CARD_IDS.noviceMage,
  CARD_IDS.noviceMage,
  CARD_IDS.stoutGuardian,
  CARD_IDS.stoutGuardian,
  CARD_IDS.stoutGuardian,
  CARD_IDS.stoutGuardian,
  CARD_IDS.stoutGuardian,
  CARD_IDS.stoutGuardian,
  CARD_IDS.arcaneApprentice,
  CARD_IDS.arcaneApprentice,
  CARD_IDS.arcaneApprentice,
  CARD_IDS.arcaneApprentice,
  CARD_IDS.arcaneApprentice,
  CARD_IDS.arcaneApprentice,
  CARD_IDS.riverCrocolisk,
  CARD_IDS.riverCrocolisk,
  CARD_IDS.riverCrocolisk,
  CARD_IDS.riverCrocolisk,
  CARD_IDS.riverCrocolisk,
  CARD_IDS.riverCrocolisk,
  CARD_IDS.firebolt,
  CARD_IDS.firebolt,
  CARD_IDS.firebolt,
  CARD_IDS.firebolt,
  CARD_IDS.heal,
  CARD_IDS.heal
];
