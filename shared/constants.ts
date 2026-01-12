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

  // Вспомогательные токены
  miniWalrus: 'miniWalrus',
  devIntern: 'devIntern',
  robot: 'robot',
  moveBurst: 'moveBurst',
  fix: 'fix',
  suiWave: 'suiWave',
} as const;


export type DemoCardId = (typeof CARD_IDS)[keyof typeof CARD_IDS];

export const DEFAULT_DECK: DemoCardId[] = [
  // 🔹 1–2 маны — ранняя поддержка и контроль
  CARD_IDS.hipo,
  CARD_IDS.samBlackshear,
  CARD_IDS.blub,
  CARD_IDS.ika,
  CARD_IDS.matteo,

  // 🔹 2–3 маны — синергия и гибкость
  CARD_IDS.axol,
  CARD_IDS.manifest,
  CARD_IDS.walrus,
  CARD_IDS.evan,
  CARD_IDS.lofi,

  // 🔹 4–6 маны — силовые пики и финиш
  CARD_IDS.noodls,
  CARD_IDS.cetus,
  CARD_IDS.scallop,
  CARD_IDS.suilend,
  CARD_IDS.adeniyi,
];
