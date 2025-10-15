// README: Hook up `window.startGame = ({ deckId }) => { ... }` in your host app to launch games from the deck screen.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import * as Toast from '@radix-ui/react-toast';
import type { CatalogCard, Deck, HeroClass } from '@cardstone/shared/decks';
import { HERO_CLASSES } from '@cardstone/shared/decks';
import { DeckCard } from '../components/DeckCard';
import { SoundButton as Button} from '../components/SoundButton';
import { fetchJson } from '../lib/api';
import { CARDS_QUERY_KEY, DECKS_QUERY_KEY } from '../lib/queryKeys';
import { useDeckSelectionStore } from '../state/deck-selection';

interface DeckRequestPayload {
  name: string;
  heroClass: HeroClass;
  cards: Deck['cards'];
}

type BuilderMode = 'create' | 'edit';

function notifyHostOfDeckSelection(deckId: string): void {
  const startGame = (window as unknown as { startGame?: (payload: { deckId: string }) => void }).startGame;
  if (typeof startGame === 'function') {
    startGame({ deckId });
  } else {
    console.info('startGame stub called with deck', deckId);
  }
}

export function DecksPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<'All' | HeroClass>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const selectDeck = useDeckSelectionStore((state) => state.selectDeck);
  const selectedDeckId = useDeckSelectionStore((state) => state.selectedDeckId);

  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    setToastMessage(message);
  };

  useEffect(() => {
    const navigationState = location.state as { reason?: string } | null;
    if (!navigationState?.reason) {
      return;
    }
    if (navigationState.reason === 'deck-required') {
      setToastMessage('Create and select a deck before entering the arena.');
    } else if (navigationState.reason === 'deck-missing') {
      setToastMessage('Selected deck could not be found. Please build a new one.');
    }
    navigate(location.pathname, { replace: true });
  }, [location, navigate]);

  const cardsQuery = useQuery({
    queryKey: CARDS_QUERY_KEY,
    queryFn: () => fetchJson<CatalogCard[]>('http://localhost:8787/api/cards')
  });

  const decksQuery = useQuery({
    queryKey: DECKS_QUERY_KEY,
    queryFn: () => fetchJson<Deck[]>('http://localhost:8787/api/decks')
  });

  const deleteDeckMutation = useMutation({
    mutationFn: async (deckId: string) => {
      const response = await fetch('http://localhost:8787/api/decks/' + deckId, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to delete deck');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
      setToastMessage('Deck deleted.');
    },
    onError: handleError
  });

  const duplicateDeckMutation = useMutation({
    mutationFn: async (deck: Deck) => {
      const payload: DeckRequestPayload = {
        name: `Copy of ${deck.name}`,
        heroClass: deck.heroClass,
        cards: deck.cards
      };
      return fetchJson<Deck>('http://localhost:8787/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
      setToastMessage('Deck duplicated.');
    },
    onError: handleError
  });

  const renameDeckMutation = useMutation({
    mutationFn: async ({ deck, name }: { deck: Deck; name: string }) => {
      const payload: DeckRequestPayload = {
        name,
        heroClass: deck.heroClass,
        cards: deck.cards
      };
      return fetchJson<Deck>(`http://localhost:8787/api/decks/${deck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
      setToastMessage('Deck renamed.');
    },
    onError: handleError
  });

  const cards = cardsQuery.data ?? [];
  const decks = decksQuery.data ?? [];
  const loadError = (cardsQuery.error ?? decksQuery.error) as Error | undefined;

  const filteredDecks = useMemo(() => {
    return decks.filter((deck) => {
      if (search.trim() && !deck.name.toLowerCase().includes(search.trim().toLowerCase())) {
        return false;
      }
      if (classFilter !== 'All' && deck.heroClass !== classFilter) {
        return false;
      }
      return true;
    });
  }, [decks, search, classFilter]);

  const handleDeleteDeck = async (deck: Deck) => {
    if (window.confirm(`Delete deck "${deck.name}"?`)) {
      await deleteDeckMutation.mutateAsync(deck.id);
    }
  };

  const handleDuplicateDeck = async (deck: Deck) => {
    await duplicateDeckMutation.mutateAsync(deck);
  };

  const handleRenameDeck = async (deck: Deck) => {
    const nextName = window.prompt('Rename deck', deck.name);
    if (!nextName || nextName.trim() === deck.name) {
      return;
    }
    await renameDeckMutation.mutateAsync({ deck, name: nextName.trim() });
  };

  const handleUseDeck = useCallback(
    (deck: Deck) => {
      selectDeck(deck);
      notifyHostOfDeckSelection(deck.id);
      navigate('/game');
    },
    [navigate, selectDeck]
  );

  const isLoading = cardsQuery.isLoading || decksQuery.isLoading;

  return (
    <Toast.Provider swipeDirection="down">
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', color: 'white' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>My Decks</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>Manage and build decks for battle.</p>
          </div>
          <Button
            onClick={() => navigate('/decks/build')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              borderRadius: '16px',
              border: 'none',
              background: 'linear-gradient(90deg,#f97316,#facc15)',
              color: '#0b1324',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <span aria-hidden style={{ fontSize: '1.1rem' }}>＋</span> Create Deck
          </Button>
        </header>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <span
              aria-hidden
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
            >
              🔍
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search decks"
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(12,18,27,0.75)',
                color: 'white'
              }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Class
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value as 'All' | HeroClass)}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(12,18,27,0.75)',
                color: 'white'
              }}
            >
              <option value="All">All</option>
              {HERO_CLASSES.map((hero) => (
                <option key={hero} value={hero}>
                  {hero}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading && <p>Loading decks...</p>}

        {loadError && (
          <p style={{ color: '#fca5a5' }}>Failed to load data: {loadError.message}</p>
        )}

        {!isLoading && filteredDecks.length === 0 && (
          <div
            style={{
              padding: '48px',
              borderRadius: '24px',
              background: 'rgba(13,18,28,0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center'
            }}
          >
            <h2 style={{ marginTop: 0 }}>No decks yet</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>Create your first deck to start playing.</p>
            <button
              onClick={() => navigate('/decks/build')}
              style={{
                marginTop: '16px',
                padding: '12px 18px',
                borderRadius: '16px',
                border: 'none',
                background: 'linear-gradient(90deg,#10b981,#3b82f6)',
                color: '#04121f',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Build a Deck
            </button>
          </div>
        )}

        {!isLoading && filteredDecks.length > 0 && (
          <div
            style={{
              display: 'grid',
              gap: '20px',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
            }}
          >
            {filteredDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                cards={cards}
                onEdit={() =>
                  navigate(`/decks/build?deckId=${deck.id}`, {
                    state: { deck, mode: 'edit' as BuilderMode }
                  })
                }
                onDuplicate={() => handleDuplicateDeck(deck)}
                onRename={() => handleRenameDeck(deck)}
                onDelete={() => handleDeleteDeck(deck)}
                onUse={() => handleUseDeck(deck)}
                isSelected={selectedDeckId === deck.id}
              />
            ))}
          </div>
        )}
      </div>

      <Toast.Root open={Boolean(toastMessage)} onOpenChange={(openState) => !openState && setToastMessage(null)} duration={3000}>
        <Toast.Title>{toastMessage}</Toast.Title>
      </Toast.Root>
      <Toast.Viewport
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      />
    </Toast.Provider>
  );
}
