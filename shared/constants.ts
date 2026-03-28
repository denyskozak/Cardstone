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
export const MAX_DECK_SIZE = 15;
export const STARTING_SEQ = 1;

export const CARD_IDS = {
  // shared
  coin: 'coin',

  // sui cards
  ika: 'ika',
  walrus: 'walrus',
  cetus: 'cetus',
  matteo: 'matteo',
  kostasKryptos: 'kostasKryptos',
  samBlackshear: 'samBlackshear',
  evan: 'evan',
  deepBook: 'deepBook',
  blub: 'blub',
  noodls: 'noodls',
  hipo: 'hipo',
  lofi: 'lofi',
  axol: 'axol',
  miu: 'miu',
  fud: 'fud',
  manifest: 'manifest',
  scallop: 'scallop',
  suilend: 'suilend',
  seal: 'seal',
  adeniyi: 'adeniyi',
  georgeDanezis: 'georgeDanezis',

  // helper tokens
  miniWalrus: 'miniWalrus',
  devIntern: 'devIntern',
  robot: 'robot',
  moveBurst: 'moveBurst',
  fix: 'fix',
  suiWave: 'suiWave',

  // greek cards
  hermes: 'hermes',
  hoplite: 'hoplite',
  oracle: 'oracle',
  satyr: 'satyr',
  nymph: 'nymph',
  aegisBearer: 'aegisBearer',
  fisherman: 'fisherman',
  triton: 'triton',
  lyrePlayer: 'lyrePlayer',
  oliveKeeper: 'oliveKeeper',
  medusa: 'medusa',
  minotaur: 'minotaur',
  artemis: 'artemis',
  hephaestus: 'hephaestus',
  odysseus: 'odysseus',
  zeus: 'zeus',
  hades: 'hades',
  poseidon: 'poseidon',
  athena: 'athena',
  achilles: 'achilles'
} as const;

export type DemoCardId = (typeof CARD_IDS)[keyof typeof CARD_IDS];

export const DEFAULT_DECK: DemoCardId[] = [
  CARD_IDS.hipo,
  CARD_IDS.samBlackshear,
  CARD_IDS.blub,
  CARD_IDS.ika,
  CARD_IDS.matteo,
  CARD_IDS.axol,
  CARD_IDS.manifest,
  CARD_IDS.walrus,
  CARD_IDS.evan,
  CARD_IDS.lofi,
  CARD_IDS.noodls,
  CARD_IDS.cetus,
  CARD_IDS.scallop,
  CARD_IDS.suilend,
  CARD_IDS.adeniyi
];
