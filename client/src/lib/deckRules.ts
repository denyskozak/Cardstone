import {
  type CatalogCard,
  type Deck,
  type DeckCardEntry,
  type DeckValidationIssue,
  type DeckValidationResult,
  type HeroClass,
  MAX_CARD_COPIES,
  MAX_DECK_SIZE,
  MAX_LEGENDARY_COPIES
} from '@cardstone/shared/decks';
import type { SerializedDeckPayload } from '@cardstone/shared/decks';

export type CardCollection = Map<string, CatalogCard>;

export function createCardCollection(cards: CatalogCard[]): CardCollection {
  return new Map(cards.map((card) => [card.id, card]));
}

export function getCardLimit(card: CatalogCard): number {
  return card.rarity === 'Legendary' ? MAX_LEGENDARY_COPIES : MAX_CARD_COPIES;
}

export function isCardAllowed(card: CatalogCard, heroClass: HeroClass): boolean {
  return card.heroClass === 'Neutral' || card.heroClass === heroClass;
}

export function countDeckCards(deck: Deck): number {
  return deck.cards.reduce((sum, entry) => sum + entry.count, 0);
}

export function byManaThenName(
  collection: CardCollection,
  a: DeckCardEntry,
  b: DeckCardEntry
): number {
  const cardA = collection.get(a.cardId);
  const cardB = collection.get(b.cardId);
  if (!cardA || !cardB) {
    return a.cardId.localeCompare(b.cardId);
  }
  if (cardA.cost !== cardB.cost) {
    return cardA.cost - cardB.cost;
  }
  if (cardA.type !== cardB.type) {
    return cardA.type.localeCompare(cardB.type);
  }
  return cardA.name.localeCompare(cardB.name);
}

export function sortDeckEntries(entries: DeckCardEntry[], collection: CardCollection): DeckCardEntry[] {
  return [...entries].sort((a, b) => byManaThenName(collection, a, b));
}

function clampCardCount(card: CatalogCard, requested: number): number {
  const limit = getCardLimit(card);
  return Math.max(0, Math.min(limit, Math.floor(requested)));
}

function upsertEntry(
  entries: DeckCardEntry[],
  card: CatalogCard,
  nextCount: number
): DeckCardEntry[] {
  const existing = entries.find((entry) => entry.cardId === card.id);
  if (!existing && nextCount <= 0) {
    return entries;
  }
  const updated = entries.filter((entry) => entry.cardId !== card.id);
  if (nextCount > 0) {
    updated.push({ cardId: card.id, count: nextCount });
  }
  return updated;
}

export function setCardCount(
  deck: Deck,
  card: CatalogCard,
  count: number,
  collection: CardCollection
): Deck {
  const clamped = clampCardCount(card, count);
  const entries = upsertEntry(deck.cards, card, clamped);
  return {
    ...deck,
    cards: sortDeckEntries(entries, collection)
  };
}

export function addCard(deck: Deck, card: CatalogCard, collection: CardCollection): Deck {
  const existing = deck.cards.find((entry) => entry.cardId === card.id);
  const nextCount = clampCardCount(card, (existing?.count ?? 0) + 1);
  return setCardCount(deck, card, nextCount, collection);
}

export function removeCard(deck: Deck, card: CatalogCard, collection: CardCollection): Deck {
  const existing = deck.cards.find((entry) => entry.cardId === card.id);
  const nextCount = Math.max(0, (existing?.count ?? 0) - 1);
  return setCardCount(deck, card, nextCount, collection);
}

export function validateDeck(deck: Deck, cards: CatalogCard[]): DeckValidationResult {
  const collection = createCardCollection(cards);
  const issues: DeckValidationIssue[] = [];
  let total = 0;

  for (const entry of deck.cards) {
    const card = collection.get(entry.cardId);
    if (!card) {
      issues.push({ code: 'CLASS_RESTRICTION', message: `Unknown card: ${entry.cardId}`, cardId: entry.cardId });
      continue;
    }
    if (!isCardAllowed(card, deck.heroClass)) {
      issues.push({
        code: 'CLASS_RESTRICTION',
        message: `${card.name} cannot be added to a ${deck.heroClass} deck.`,
        cardId: card.id
      });
    }
    const limit = getCardLimit(card);
    if (entry.count > limit) {
      issues.push({
        code: card.rarity === 'Legendary' ? 'LEGENDARY_LIMIT' : 'COPIES_LIMIT',
        message: `${card.name} can only be included ${limit} time${limit > 1 ? 's' : ''}.`,
        cardId: card.id
      });
    }
    total += entry.count;
  }

  if (total > MAX_DECK_SIZE) {
    issues.push({
      code: 'MAX_CARDS',
      message: `Deck has ${total} cards, exceeding the ${MAX_DECK_SIZE} card limit.`
    });
  }

  return {
    ok: issues.length === 0,
    errors: issues,
    totalCards: total
  };
}

export function curveFromDeck(deck: Deck, cards: CatalogCard[]): number[] {
  return getDeckManaCurve(deck, cards);
}

export function getDeckManaCurve(deck: Deck, cards: CatalogCard[] | CardCollection): number[] {
  const collection: CardCollection = Array.isArray(cards) ? createCardCollection(cards) : cards;
  const bins = new Array(8).fill(0);
  for (const entry of deck.cards) {
    const card = collection.get(entry.cardId);
    if (!card) {
      continue;
    }
    const cost = Number.isFinite(card.cost) ? card.cost : 0;
    const bin = Math.min(cost, 7);
    bins[bin] += entry.count;
  }
  return bins;
}

function toBase64(value: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64');
  }
  return window.btoa(value);
}

function fromBase64(value: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'base64').toString('utf-8');
  }
  return window.atob(value);
}

export function serializeDeckCode(deck: Deck): string {
  const payload: SerializedDeckPayload = {
    meta: {
      name: deck.name,
      heroClass: deck.heroClass
    },
    cards: deck.cards.map((entry) => ({ ...entry }))
  };
  return toBase64(JSON.stringify(payload));
}

export function parseDeckCode(code: string): Deck {
  const payload = JSON.parse(fromBase64(code)) as SerializedDeckPayload;
  const timestamp = new Date().toISOString();
  return {
    id: `imported-${Date.now()}`,
    name: payload.meta.name,
    heroClass: payload.meta.heroClass,
    cards: payload.cards.map((entry) => ({ ...entry })),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
