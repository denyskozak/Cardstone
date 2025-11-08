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
  coin: 'coin',
} as const;


export type DemoCardId = (typeof CARD_IDS)[keyof typeof CARD_IDS];

export const DEFAULT_DECK: DemoCardId[] = [
  // 🔹 1 мана — ранняя поддержка и хил
  CARD_IDS.lofi,
  CARD_IDS.miu,
  CARD_IDS.blub,
  CARD_IDS.hipo,
  CARD_IDS.axol,

  // 🔹 2 маны — контроль и добор
  CARD_IDS.ika,
  CARD_IDS.fud,
  CARD_IDS.noodls,
  CARD_IDS.matteo,
  CARD_IDS.kostasKryptos,

  // 🔹 3 маны — синергия и мелкие комбо
  CARD_IDS.walrus,
  CARD_IDS.scallop,
  CARD_IDS.manifest,
  CARD_IDS.axol,
  CARD_IDS.fud,

  // 🔹 4 маны — сильные протоколы и персонажи
  CARD_IDS.cetus,
  CARD_IDS.evan,
  CARD_IDS.kostasKryptos,
  CARD_IDS.deepBook,

  // 🔹 5 маны — масштабные протоколы
  CARD_IDS.suilend,
  CARD_IDS.manifest,
  CARD_IDS.deepBook,
  CARD_IDS.samBlackshear,
  CARD_IDS.cetus,

  // 🔹 6–7 маны — лейт-гейм, ядро протокольной силы
  CARD_IDS.suilend,
  CARD_IDS.samBlackshear,
  CARD_IDS.seal, // можно представить как мощную финальную карту
];