export const CARDS_QUERY_KEY = ['cards'] as const;
export const DECKS_QUERY_KEY = ['decks'] as const;
export const deckByIdQueryKey = (deckId: string) => ['deck', deckId] as const;
