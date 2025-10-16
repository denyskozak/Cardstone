import { create } from 'zustand';
import type { Deck } from '@cardstone/shared/decks';

const STORAGE_KEY = 'cardstone:selectedDeckId';

function readStoredDeckId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage.getItem(STORAGE_KEY) ?? undefined;
}

interface DeckSelectionState {
  selectedDeckId?: string;
  selectedDeck?: Deck;
  selectDeck: (deck: Deck) => void;
  setSelectedDeckData: (deck: Deck) => void;
  clearSelection: () => void;
}

export const useDeckSelectionStore = create<DeckSelectionState>((set) => ({
  selectedDeckId: readStoredDeckId(),
  selectedDeck: undefined,
  selectDeck: (deck) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, deck.id);
    }
    set({ selectedDeckId: deck.id, selectedDeck: deck });
  },
  setSelectedDeckData: (deck) =>
    set((state) => (state.selectedDeckId === deck.id ? { selectedDeck: deck } : state)),
  clearSelection: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    set({ selectedDeckId: undefined, selectedDeck: undefined });
  }
}));
