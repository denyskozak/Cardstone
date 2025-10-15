import { useEffect } from 'react';
import { Navigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { Deck } from '@cardstone/shared/decks';
import { Game } from '../components/Game';
import { fetchJson } from '../lib/api';
import { deckByIdQueryKey } from '../lib/queryKeys';
import { useDeckSelectionStore } from '../state/deck-selection';

export function GameRoute() {
  const selectedDeckId = useDeckSelectionStore((state) => state.selectedDeckId);
  const setSelectedDeckData = useDeckSelectionStore((state) => state.setSelectedDeckData);
  const clearSelection = useDeckSelectionStore((state) => state.clearSelection);

  const deckQuery = useQuery({
    queryKey: selectedDeckId ? deckByIdQueryKey(selectedDeckId) : ['selected-deck'],
    queryFn: () => fetchJson<Deck>(`http://localhost:8787/api/decks/${selectedDeckId}`),
    enabled: Boolean(selectedDeckId),
    staleTime: 60_000
  });

  useEffect(() => {
    if (deckQuery.data) {
      setSelectedDeckData(deckQuery.data);
    }
  }, [deckQuery.data, setSelectedDeckData]);

  if (!selectedDeckId) {
    return <Navigate to="/decks" replace state={{ reason: 'deck-required' }} />;
  }

  if (deckQuery.isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          color: 'white',
          fontSize: '1.25rem'
        }}
      >
        Loading your deck...
      </div>
    );
  }

  if (deckQuery.isError || !deckQuery.data) {
    clearSelection();
    return <Navigate to="/decks" replace state={{ reason: 'deck-missing' }} />;
  }

  return <Game />;
}
