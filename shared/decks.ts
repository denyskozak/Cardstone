import type { CardDefinition, DomainId } from './types.js';
import { MAX_DECK_SIZE } from './constants.js';

export type HeroClass =
  | 'Mage'
  | 'Warrior'
  | 'Hunter'
  | 'Priest'
  | 'Rogue'
  | 'Paladin'
  | 'Shaman'
  | 'Warlock'
  | 'Druid'
  | 'Demon Hunter';

export interface DeckCardEntry {
  cardId: string;
  count: number;
}

export interface DeckMeta {
  name: string;
  heroClass: HeroClass;
  domainId: DomainId;
}

export interface Deck extends DeckMeta {
  id: string;
  cards: DeckCardEntry[];
  createdAt: string;
  updatedAt: string;
}

export type CatalogCard = CardDefinition & {
  heroClass: HeroClass | 'Neutral';
  rarity: NonNullable<CardDefinition['rarity']>;
  collectible: boolean;
  owned?: boolean;
};

export const MAX_CARD_COPIES = 2;
export const MAX_LEGENDARY_COPIES = 1;
export { MAX_DECK_SIZE };

export const HERO_CLASSES: HeroClass[] = [
  'Mage',
  'Warrior',
  'Hunter',
  'Priest',
  'Rogue',
  'Paladin',
  'Shaman',
  'Warlock',
  'Druid',
  'Demon Hunter'
];

export type DeckValidationErrorCode =
  | 'MAX_CARDS'
  | 'CLASS_RESTRICTION'
  | 'COPIES_LIMIT'
  | 'LEGENDARY_LIMIT'
  | 'DOMAIN_RESTRICTION';

export interface DeckValidationIssue {
  code: DeckValidationErrorCode;
  message: string;
  cardId?: string;
}

export interface DeckValidationResult {
  ok: boolean;
  errors: DeckValidationIssue[];
  totalCards: number;
}

export interface SerializedDeckPayload {
  meta: DeckMeta;
  cards: DeckCardEntry[];
}

export type DeckUpdatePayload = {
  name: string;
  heroClass: HeroClass;
  domainId: DomainId;
  cards: DeckCardEntry[];
};

export type CreateDeckPayload = Partial<DeckUpdatePayload>;
