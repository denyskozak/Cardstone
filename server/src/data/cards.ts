import { DEMO_CARD_POOL } from '@cardstone/shared/cards/demo.js';
import type { CatalogCard } from '@cardstone/shared/decks.js';
import type { CardDefinition } from '@cardstone/shared/types.js';

const rarityCycle: NonNullable<CardDefinition['rarity']>[] = [
  'Common',
  'Rare',
  'Epic',
  'Legendary'
];

export const catalogCards: CatalogCard[] = DEMO_CARD_POOL.map((card, index) => ({
  ...card,
  rarity: (card.rarity ?? rarityCycle[index % rarityCycle.length]) as NonNullable<CardDefinition['rarity']>,
  heroClass: 'Neutral',
  collectible: true
}));

export const cardsById = new Map<string, CatalogCard>(
  catalogCards.map((card) => [card.id, card])
);
