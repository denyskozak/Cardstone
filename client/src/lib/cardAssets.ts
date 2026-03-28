import type { DomainId } from '@cardstone/shared/types';

export function getCardAssetPath(card: { id: string; domainId: DomainId }): string {
  return `/assets/cards/${card.domainId}/${card.id}.webp`;
}

export function getCardAssetPathFromId(cardId: string, domainId: DomainId): string {
  return `/assets/cards/${domainId}/${cardId}.webp`;
}
