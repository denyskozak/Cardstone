import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent as ReactMouseEvent
} from 'react';
import { useLocation, useNavigate, type Location } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';
import * as Toast from '@radix-ui/react-toast';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Checkbox from '@radix-ui/react-checkbox';
import {
  HERO_CLASSES,
  MAX_DECK_SIZE,
  type CatalogCard,
  type Deck,
  type DeckCardEntry,
  type DeckValidationIssue,
  type HeroClass
} from '@cardstone/shared/decks';
import {
  addCard,
  countDeckCards,
  createCardCollection,
  getDeckManaCurve,
  isCardAllowed,
  sortDeckEntries,
  validateDeck,
  removeCard,
  type CardCollection
} from '../lib/deckRules';
import { SoundButton as Button } from '../components/SoundButton';
import { Badge } from '../components/Badge';
import { apiPath } from '../config';
import { fetchJson } from '../lib/api';
import { CARDS_QUERY_KEY, DECKS_QUERY_KEY, deckByIdQueryKey } from '../lib/queryKeys';

export type BuilderMode = 'create' | 'edit';

export type DeckBuilderLocationState = {
  deck?: Deck;
  mode?: BuilderMode;
};

type RarityFilter = Set<CatalogCard['rarity']>;

type CatalogTab = 'All' | 'Minions' | 'Spells' | 'Weapons';

type DeckRequestPayload = {
  name: string;
  heroClass: HeroClass;
  cards: Deck['cards'];
};

const iconBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1
};

function Icon({ symbol, size = '1rem' }: { symbol: string; size?: string }) {
  return <span aria-hidden style={{ ...iconBaseStyle, fontSize: size }}>{symbol}</span>;
}

function cloneDeck(deck: Deck): Deck {
  return {
    ...deck,
    cards: deck.cards.map((entry) => ({ ...entry }))
  };
}

function createEmptyDeck(): Deck {
  const timestamp = new Date().toISOString();
  return {
    id: `draft-${timestamp}`,
    name: 'New Deck',
    heroClass: HERO_CLASSES[0],
    cards: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function deckToDraft(deck?: Deck): Deck {
  return deck ? cloneDeck(deck) : createEmptyDeck();
}

function groupDeckByMana(entries: DeckCardEntry[], collection: CardCollection) {
  const grouped = new Map<number, DeckCardEntry[]>();
  for (const entry of entries) {
    const card = collection.get(entry.cardId);
    const cost = card?.cost ?? 0;
    if (!grouped.has(cost)) {
      grouped.set(cost, []);
    }
    grouped.get(cost)!.push(entry);
  }
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => a - b);
  return sortedKeys.map((key) => ({ mana: key, entries: sortDeckEntries(grouped.get(key)!, collection) }));
}

function cardMatchesTab(card: CatalogCard, tab: CatalogTab): boolean {
  if (tab === 'All') return true;
  switch (tab) {
    case 'Minions':
      return card.type === 'Minion';
    case 'Spells':
      return card.type === 'Spell';
    case 'Weapons':
      return card.type === 'Weapon';
    default:
      return true;
  }
}

function matchesManaRange(card: CatalogCard, [min, max]: [number, number]): boolean {
  const cappedMax = max === 7 ? Infinity : max;
  return card.cost >= min && card.cost <= cappedMax;
}

function getCardImageUrl(card: CatalogCard): string {
  return `/assets/cards/${card.id}.webp`;
}

export function DeckBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation() as Location & { state?: DeckBuilderLocationState };
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const updateHoverTooltip = useCallback(
    (event: ReactMouseEvent<HTMLElement>, text?: string | null) => {
      const trimmed = text?.trim();
      if (!trimmed) {
        setHoverTooltip(null);
        return;
      }
      setHoverTooltip({ text: trimmed, x: event.clientX + 16, y: event.clientY + 16 });
    },
    [setHoverTooltip]
  );

  const clearHoverTooltip = useCallback(() => {
    setHoverTooltip(null);
  }, []);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const deckId = searchParams.get('deckId');
  const locationState = (location.state ?? null) as DeckBuilderLocationState | null;

  const [mode, setMode] = useState<BuilderMode>(() => {
    if (locationState?.mode) {
      return locationState.mode;
    }
    return deckId ? 'edit' : 'create';
  });

  const handleError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    setToastMessage(message);
  }, []);

  const cardsQuery = useQuery({
    queryKey: CARDS_QUERY_KEY,
    queryFn: () => fetchJson<CatalogCard[]>(apiPath('/api/cards'))
  });

  const deckQuery = useQuery({
    queryKey: deckId ? deckByIdQueryKey(deckId) : ['deck', 'new'],
    queryFn: () => fetchJson<Deck>(apiPath(`/api/decks/${deckId}`)),
    enabled: Boolean(deckId),
    initialData: deckId ? locationState?.deck : undefined
  });

  const cards = cardsQuery.data ?? [];
  const deckData = deckQuery.data ?? locationState?.deck;

  const [activeTab, setActiveTab] = useState<CatalogTab>('All');
  const [manaRange, setManaRange] = useState<[number, number]>([0, 7]);
  const [rarities, setRarities] = useState<RarityFilter>(new Set());
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<'All' | HeroClass>('All');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [deck, setDeck] = useState<Deck>(() => deckToDraft(deckData));

  useEffect(() => {
    if (deckData) {
      setDeck(deckToDraft(deckData));
      setMode('edit');
    } else if (!deckId && !deckQuery.isLoading) {
      setDeck(deckToDraft(undefined));
      setMode('create');
    }
  }, [deckData, deckId, deckQuery.isLoading]);

  const collection = useMemo(() => createCardCollection(cards), [cards]);

  const totalCards = useMemo(() => countDeckCards(deck), [deck.cards]);
  const validation = useMemo(() => validateDeck(deck, cards), [deck.cards, deck.heroClass, cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (!cardMatchesTab(card, activeTab)) return false;
      if (!matchesManaRange(card, manaRange)) return false;
      if (rarities.size > 0 && !rarities.has(card.rarity)) return false;
      if (filterClass !== 'All') {
        if (!(card.heroClass === 'Neutral' || card.heroClass === filterClass)) {
          return false;
        }
      }
      if (ownedOnly && !card.owned) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        if (!card.name.toLowerCase().includes(term) && !(card.text ?? '').toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [cards, activeTab, manaRange, rarities, filterClass, ownedOnly, search]);

  const onAddCard = useCallback(
    (card: CatalogCard) => {
      if (!isCardAllowed(card, deck.heroClass)) {
        setToastMessage(`${card.name} cannot be added to a ${deck.heroClass} deck.`);
        return;
      }
      setDeck((currentDeck) => {
        if (countDeckCards(currentDeck) >= MAX_DECK_SIZE) {
          setToastMessage(`Deck is already at the ${MAX_DECK_SIZE}-card limit.`);
          return currentDeck;
        }
        return addCard(currentDeck, card, collection);
      });
    },
    [collection, deck.heroClass]
  );

  const handleHeroClassChange = useCallback(
    (nextClass: HeroClass) => {
      setDeck((currentDeck) => {
        if (currentDeck.heroClass === nextClass) {
          return currentDeck;
        }
        const nextCollection = createCardCollection(cards);
        const allowed = currentDeck.cards.filter((entry) => {
          const card = nextCollection.get(entry.cardId);
          if (!card) return false;
          return card.heroClass === 'Neutral' || card.heroClass === nextClass;
        });
        const removed = currentDeck.cards.length - allowed.length;
        if (removed > 0) {
          setToastMessage(`Removed ${removed} card${removed === 1 ? '' : 's'} not matching ${nextClass}.`);
        }
        return {
          ...currentDeck,
          heroClass: nextClass,
          cards: sortDeckEntries(allowed, nextCollection)
        };
      });
    },
    [cards]
  );

  const onCardDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const cardId = event.dataTransfer.getData('card-id');
      const card = collection.get(cardId);
      if (card) {
        onAddCard(card);
      }
    },
    [collection, onAddCard]
  );

  const saveDeckMutation = useMutation({
    mutationFn: async (input: { mode: BuilderMode; deck: Deck }) => {
      const payload: DeckRequestPayload = {
        name: input.deck.name,
        heroClass: input.deck.heroClass,
        cards: input.deck.cards
      };
      if (input.mode === 'create') {
        return fetchJson<Deck>(apiPath('/api/decks'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      return fetchJson<Deck>(apiPath(`/api/decks/${input.deck.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async (savedDeck) => {
      await queryClient.invalidateQueries({ queryKey: DECKS_QUERY_KEY });
      queryClient.setQueryData(deckByIdQueryKey(savedDeck.id), savedDeck);
      setDeck(deckToDraft(savedDeck));
      setMode('edit');
      navigate(`/decks/build?deckId=${savedDeck.id}`, {
        replace: true,
        state: { deck: savedDeck, mode: 'edit' }
      });
      setToastMessage('Deck saved.');
    },
    onError: handleError
  });

  const handleSave = useCallback(
    async (closeAfter: boolean) => {
      await saveDeckMutation.mutateAsync({ mode, deck });
      if (closeAfter) {
        navigate('/decks');
      }
    },
    [deck, mode, navigate, saveDeckMutation]
  );

  const manaCurve = useMemo(() => getDeckManaCurve(deck, collection), [deck.cards, collection]);
  const maxManaCurve = useMemo(() => Math.max(...manaCurve, 1), [manaCurve]);

  type TypeCounts = { Minion: number; Spell: number; Weapon: number; total: number };
  type RarityCounts = Partial<Record<CatalogCard['rarity'], number>>;

  const analytics = useMemo(() => {
    const typeCounts = deck.cards.reduce<TypeCounts>((acc, entry) => {
      const card = collection.get(entry.cardId);
      if (!card) {
        return acc;
      }
      if (card.type === 'Minion' || card.type === 'Spell' || card.type === 'Weapon') {
        acc[card.type] += entry.count;
      }
      acc.total += entry.count;
      return acc;
    }, { Minion: 0, Spell: 0, Weapon: 0, total: 0 });

    const rarityCounts = deck.cards.reduce<RarityCounts>((acc, entry) => {
      const card = collection.get(entry.cardId);
      if (!card) {
        return acc;
      }
      acc[card.rarity] = (acc[card.rarity] ?? 0) + entry.count;
      return acc;
    }, {});

    return { typeCounts, rarityCounts };
  }, [deck.cards, collection]);

  const groupedEntries = useMemo(() => groupDeckByMana(deck.cards, collection), [deck.cards, collection]);

  const saveDisabled = validation.totalCards !== MAX_DECK_SIZE || !validation.ok || saveDeckMutation.isPending;

  const isLoading = cardsQuery.isLoading || (deckId ? deckQuery.isLoading : false);
  const loadError = (cardsQuery.error ?? deckQuery.error) as Error | undefined;

  return (
    <Toast.Provider swipeDirection="down">
      <div
        style={{
          minHeight: '100vh',
          padding: '32px',
          background: 'radial-gradient(circle at top,#0b1b2e 0%,#050c16 55%,#05090f 100%)',
          color: 'white'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem' }}>Deck Builder</h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>
                Craft the perfect deck by dragging cards from the catalog into your list.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                onClick={() => navigate('/decks')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <Icon symbol="←" /> Back to Decks
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saveDisabled}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(16,185,129,0.5)',
                  background: saveDisabled
                    ? 'rgba(16,185,129,0.25)'
                    : 'linear-gradient(90deg,#10b981,#34d399)',
                  color: '#042f2e',
                  fontWeight: 600,
                  cursor: saveDisabled ? 'not-allowed' : 'pointer'
                }}
              >
                Save & Exit
              </Button>
            </div>
          </header>

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={onCardDrop}
            style={{
              background: 'rgba(12, 16, 24, 0.92)',
              borderRadius: '28px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 40px 80px rgba(0,0,0,0.35)',
              minHeight: '70vh'
            }}
          >
            {(isLoading || loadError) && (
              <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(15,23,42,0.6)' }}>
                {isLoading && <p style={{ margin: 0 }}>Loading deck builder...</p>}
                {loadError && (
                  <p style={{ margin: 0, color: '#fca5a5' }}>Failed to load data: {loadError.message}</p>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <Tabs.Root value={activeTab} onValueChange={(value) => setActiveTab(value as CatalogTab)}>
                    <Tabs.List style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '999px' }}>
                      {(['All', 'Minions', 'Spells', 'Weapons'] as CatalogTab[]).map((tab) => (
                        <Tabs.Trigger
                          key={tab}
                          value={tab}
                          style={{
                            borderRadius: '999px',
                            padding: '6px 14px',
                            fontSize: '0.85rem',
                            background: activeTab === tab ? 'rgba(249,115,22,0.85)' : 'transparent',
                            border: 'none',
                            color: activeTab === tab ? '#111827' : 'rgba(255,255,255,0.8)',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {tab}
                        </Tabs.Trigger>
                      ))}
                    </Tabs.List>
                  </Tabs.Root>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span
                        aria-hidden
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
                      >
                        🔍
                      </span>
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search cards"
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 32px',
                          borderRadius: '999px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(17,24,39,0.65)',
                          color: 'white'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                    Catalog Class
                    <select
                      value={filterClass}
                      onChange={(event) => setFilterClass(event.target.value as HeroClass | 'All')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(17,24,39,0.65)',
                        color: 'white'
                      }}
                    >
                      <option value="All">All</option>
                      {HERO_CLASSES.map((hero: HeroClass) => (
                        <option key={hero} value={hero}>
                          {hero}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <span style={{ fontSize: '0.75rem' }}>Mana Cost: {manaRange[0]} - {manaRange[1]}</span>
                    <Slider.Root
                      value={manaRange}
                      max={7}
                      step={1}
                      minStepsBetweenThumbs={1}
                      onValueChange={(value) => setManaRange(value as [number, number])}
                      style={{ display: 'flex', alignItems: 'center', height: '24px' }}
                    >
                      <Slider.Track
                        style={{
                          position: 'relative',
                          flex: 1,
                          height: '4px',
                          background: 'rgba(255,255,255,0.15)',
                          borderRadius: '999px'
                        }}
                      >
                        <Slider.Range
                          style={{
                            position: 'absolute',
                            height: '100%',
                            background: 'linear-gradient(90deg,#2563eb,#f97316)',
                            borderRadius: '999px'
                          }}
                        />
                      </Slider.Track>
                      <Slider.Thumb aria-label="Minimum mana" style={sliderThumbStyle} />
                      <Slider.Thumb aria-label="Maximum mana" style={sliderThumbStyle} />
                    </Slider.Root>
                  </div>

                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <Button
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.18)',
                          background: 'rgba(17,24,39,0.65)',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <Icon symbol="⚙" /> Rarity
                        {/*<Badge color="orange" radius="full">*/}
                        {/*  {rarities.size || 'Any'}*/}
                        {/*</Badge>*/}
                      </Button>
                    </Popover.Trigger>
                    <Popover.Content
                      sideOffset={6}
                      style={{
                        background: 'rgba(14,18,27,0.95)',
                        borderRadius: '14px',
                        padding: '12px',
                        display: 'grid',
                        gap: '8px',
                        minWidth: '200px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        zIndex: '2'
                      }}
                    >
                      {(['Common', 'Rare', 'Epic', 'Legendary'] as CatalogCard['rarity'][]).map((rarity) => {
                        const checked = rarities.has(rarity);
                        return (
                          <label key={rarity} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <Checkbox.Root
                              checked={checked}
                              onCheckedChange={(value) => {
                                setRarities((current) => {
                                  const next = new Set(current);
                                  if (value === true) {
                                    next.add(rarity);
                                  } else {
                                    next.delete(rarity);
                                  }
                                  return next;
                                });
                              }}
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.3)',
                                display: 'grid',
                                placeItems: 'center'
                              }}
                            >
                              <Checkbox.Indicator>
                                <Icon symbol="✓" size="0.85rem" />
                              </Checkbox.Indicator>
                            </Checkbox.Root>
                            <span>{rarity}</span>
                          </label>
                        );
                      })}
                    </Popover.Content>
                  </Popover.Root>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    <Checkbox.Root
                      checked={ownedOnly}
                      onCheckedChange={(value) => setOwnedOnly(value === true)}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.3)',
                        display: 'grid',
                        placeItems: 'center'
                      }}
                    >
                      <Checkbox.Indicator>
                        <Icon symbol="✓" size="0.85rem" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    Show craftable only
                  </label>
                </div>

                <ScrollArea.Root style={catalogScrollAreaStyle}>
                  <ScrollArea.Viewport style={{ padding: '12px', height: '100%' }}>
                    <div style={catalogGridStyle}>
                      {filteredCards.map((card) => {
                        const inDeck = deck.cards.find((entry) => entry.cardId === card.id);
                        const deckIsFull = totalCards >= MAX_DECK_SIZE;
                        const disabledReason = !isCardAllowed(card, deck.heroClass)
                          ? `Only ${deck.heroClass} & Neutral cards allowed.`
                          : deckIsFull
                          ? 'Deck is full.'
                          : undefined;
                        const limitReached = inDeck && inDeck.count >= (card.rarity === 'Legendary' ? 1 : 2);
                        const cardHasStats = 'attack' in card && 'health' in card;
                        return (
                          <Tooltip.Root key={card.id} delayDuration={100}>
                            <Tooltip.Trigger asChild>
                              <div
                                draggable={!disabledReason}
                                onDragStart={(event) => {
                                  event.dataTransfer.setData('card-id', card.id);
                                  event.dataTransfer.effectAllowed = 'copy';
                                }}
                                onClick={() => onAddCard(card)}
                                onMouseEnter={(event) => updateHoverTooltip(event, card.text)}
                                onMouseMove={(event) => updateHoverTooltip(event, card.text)}
                                onMouseLeave={clearHoverTooltip}
                                style={{
                                  ...catalogCardStyle,
                                  opacity: disabledReason ? 0.6 : 1,
                                  cursor: disabledReason ? 'not-allowed' : 'grab'
                                }}
                              >
                                <div style={cardImageWrapperStyle}>
                                  <img src={getCardImageUrl(card)} alt="" style={cardImageStyle} />
                                  {cardHasStats && (
                                    <>
                                      <span style={cardStatBadgeStyle.rarity}>Mana: {card.cost}</span>
                                      <span style={cardStatBadgeStyle.attack}>Attack: {card.attack}</span>
                                      <span style={cardStatBadgeStyle.health}>HP: {card.health}</span>
                                    </>
                                  )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>{card.name}</strong>
                                    <span>{card.rarity}</span>
                                  </div>
                                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>{card.type}</span>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                    <span>{card.heroClass}</span>
                                    <span>{card.text}</span>
                                  </div>
                                  {inDeck && (
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(16,185,129,0.85)' }}>In deck: {inDeck.count}</span>
                                  )}
                                  {limitReached && (
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(250,204,21,0.9)' }}>Limit reached</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onAddCard(card);
                                    }}
                                    disabled={Boolean(disabledReason) || Boolean(limitReached)}
                                    style={{
                                      marginTop: '8px',
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(255,255,255,0.3)',
                                      backgroundColor: 'rgba(59,130,246,0.15)',
                                      color: 'white',
                                      fontSize: '0.8rem',
                                      cursor:
                                        Boolean(disabledReason) || Boolean(limitReached)
                                          ? 'not-allowed'
                                          : 'pointer',
                                      opacity: Boolean(disabledReason) || Boolean(limitReached) ? 0.6 : 1
                                    }}
                                  >
                                    Добавить в колоду
                                  </button>
                                </div>
                              </div>
                            </Tooltip.Trigger>
                            {disabledReason && (
                              <Tooltip.Content sideOffset={6} style={tooltipContentStyle}>
                                {disabledReason}
                              </Tooltip.Content>
                            )}
                          </Tooltip.Root>
                        );
                      })}
                    </div>
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar orientation="vertical" style={scrollbarStyle}>
                    <ScrollArea.Thumb style={scrollbarThumbStyle} />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Root>
              </section>

              <div style={{ display: 'flex',  flexDirection: 'column', gap: '16px', minHeight: 0 }}>
                <section
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    borderRadius: '20px',
                    padding: '16px',
                    background: 'rgba(9,13,20,0.8)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden'
                  }}
                >
                  <div style={deckDetailsScrollableStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong>Deck Name</strong>
                      <input
                        value={deck.name}
                        onChange={(event) =>
                          setDeck((currentDeck) => ({ ...currentDeck, name: event.target.value }))
                        }
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(17,24,39,0.8)',
                          color: 'white'
                        }}
                      />
                    </div>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <Button style={{ padding: '4px 6px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer' }}>
                          <Icon symbol="☰" /> Options
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content
                        align="end"
                        sideOffset={6}
                        style={{
                          background: 'rgba(8,12,20,0.95)',
                          borderRadius: '12px',
                          padding: '8px',
                          display: 'grid',
                          gap: '4px',
                          minWidth: '180px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'white'
                        }}
                      >
                        <DropdownMenu.Item onSelect={() => setDeck(deckToDraft(deckData))} style={menuItemStyle}>
                          <Icon symbol="⟳" /> Reset to saved
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={() => setDeck(deckToDraft(undefined))} style={menuItemStyle}>
                          <Icon symbol="🆕" /> New deck
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                      Hero Class
                      <select
                        value={deck.heroClass}
                        onChange={(event) => handleHeroClassChange(event.target.value as HeroClass)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(17,24,39,0.8)',
                          color: 'white'
                        }}
                      >
                        {HERO_CLASSES.map((hero: HeroClass) => (
                          <option key={hero} value={hero}>
                            {hero}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      onClick={() => setDeck(deckToDraft(deckData))}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <Icon symbol="↺" /> Revert changes
                    </Button>
                  </div>
                    <div>
                      <h4 style={{ margin: 0, marginBottom: '8px' }}>Mana Curve</h4>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '140px' }}>
                        {manaCurve.map((value, index) => (
                          <div key={`${index}-${value}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                width: '100%',
                                borderRadius: '8px 8px 2px 2px',
                                background: 'linear-gradient(180deg,#93c5fd,#2563eb)',
                                height: `${(value / maxManaCurve) * 100 || 4}px`,
                                textAlign: 'center',
                                minHeight: '4px'
                              }}
                            > <span style={{ fontSize: '0.75rem', color: 'black' }}>{value > 0 ? value : ''}</span></div>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{index === 7 ? '7+' : index}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{totalCards} / {MAX_DECK_SIZE}</strong>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Cards</span>
                  </div>

                  <ScrollArea.Root style={{ flex: 1, minHeight: 0 }}>
                    <ScrollArea.Viewport style={{ paddingRight: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 300, gap: '10px' }}>
                        {groupedEntries.map(({ mana, entries }) => (
                          <div key={mana} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Badge variant="surface" color="amber">{mana}</Badge>
                              <span style={{ color: 'rgba(255,255,255,0.65)' }}>Mana</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {entries.map((entry) => {
                                const card = collection.get(entry.cardId);
                                if (!card) return null;
                                return (
                                  <div
                                    key={entry.cardId}
                                    onMouseEnter={(event) => updateHoverTooltip(event, card.text)}
                                    onMouseMove={(event) => updateHoverTooltip(event, card.text)}
                                    onMouseLeave={clearHoverTooltip}
                                    style={{
                                      padding: '10px 12px',
                                      borderRadius: '12px',
                                      background: 'rgba(10,14,23,0.6)',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <strong>{card.name}</strong>
                                    <Button
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '4px 4px',
                                        borderRadius: '16px',
                                        border: 'none',
                                        background: 'linear-gradient(90deg,#f97316,#facc15)',
                                        color: '#0b1324',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                      onClick={() =>
                                        setDeck((currentDeck) => removeCard(currentDeck, card, collection))
                                      }
                                      disabled={entry.count <= 0}
                                    >
                                      <Icon symbol="x" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea.Viewport>
                    <ScrollArea.Scrollbar orientation="vertical" style={scrollbarStyle}>
                      <ScrollArea.Thumb style={scrollbarThumbStyle} />
                    </ScrollArea.Scrollbar>
                  </ScrollArea.Root>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {validation.errors.map((error: DeckValidationIssue) => (
                      <div
                        key={`${error.code}-${error.cardId ?? ''}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          background: 'rgba(220, 38, 38, 0.1)',
                          border: '1px solid rgba(248, 113, 113, 0.35)'
                        }}
                      >
                        <Icon symbol="ℹ" />
                        <span style={{ fontSize: '0.85rem' }}>{error.message}</span>
                      </div>
                    ))}
                    {validation.errors.length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                        Deck is valid. Add cards until you reach exactly {MAX_DECK_SIZE}.
                      </span>
                    )}
                  </div>
                  </div>
                </section>
              </div>
            </div>

            <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.75)' }}>
                <Icon symbol="ℹ" /> Drag cards from the catalog or use the steppers to adjust counts.
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Button
                  onClick={() => navigate('/decks')}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saveDisabled}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(16,185,129,0.5)',
                    background: saveDisabled
                      ? 'rgba(16,185,129,0.25)'
                      : 'linear-gradient(90deg,#10b981,#34d399)',
                    color: '#042f2e',
                    fontWeight: 600,
                    cursor: saveDisabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  Save
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saveDisabled}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(59,130,246,0.5)',
                    background: saveDisabled
                      ? 'rgba(59,130,246,0.25)'
                      : 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
                    color: 'white',
                    fontWeight: 700,
                    cursor: saveDisabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  Save & Exit
                </Button>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {hoverTooltip && (
        <div style={{ ...hoverTooltipStyle, top: hoverTooltip.y, left: hoverTooltip.x }}>
          {hoverTooltip.text}
        </div>
      )}

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

const menuItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 10px',
  borderRadius: '8px',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.9)'
};

const tooltipContentStyle: CSSProperties = {
  background: 'rgba(15,23,42,0.95)',
  color: 'white',
  padding: '8px 10px',
  borderRadius: '8px',
  maxWidth: '220px',
  fontSize: '0.8rem'
};

const scrollbarStyle: CSSProperties = {
  width: '8px',
  background: 'rgba(255,255,255,0.05)'
};

const scrollbarThumbStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.25)',
  borderRadius: '999px'
};

const sliderThumbStyle: CSSProperties = {
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  background: 'white',
  border: '2px solid #1f2937'
};

const deckDetailsScrollableStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  overflowY: 'auto',
  paddingRight: '8px',
  flex: 1,
  minHeight: 0
};

const catalogScrollAreaStyle: CSSProperties = {
  flex: '0 1 auto',
  width: '100%',
  height: '650px',
  minHeight: '320px',
  borderRadius: '18px',
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.1)'
};

const catalogGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '10px'
};

const catalogCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '10px',
  borderRadius: '14px',
  background: 'rgba(17,24,39,0.85)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 10px 20px rgba(0,0,0,0.25)'
};

const cardImageWrapperStyle: CSSProperties = {
  position: 'relative'
};

const cardImageStyle: CSSProperties = {
  width: '100%',
  borderRadius: '10px',
  objectFit: 'cover',
  aspectRatio: '3 / 4',
  background: 'rgba(0,0,0,0.35)',
  display: 'block'
};

const cardStatBadgeBaseStyle: CSSProperties = {
  position: 'absolute',
  padding: '4px 10px',
  borderRadius: '999px',
  fontWeight: 700,
  fontSize: '1rem',
  color: '#0f172a',
  boxShadow: '0 10px 20px rgba(15, 23, 42, 0.35)'
};

const cardStatBadgeStyle: Record<'attack' | 'health' | 'rarity', CSSProperties> = {
  attack: {
    ...cardStatBadgeBaseStyle,
    left: '8px',
    bottom: '8px',

    background: 'linear-gradient(135deg,#fb923c,#f97316)'
  },
  rarity: {
    ...cardStatBadgeBaseStyle,
    top: '8px',
    left: '8px',
    background: 'linear-gradient(135deg,#fb923c,#f97316)'
  },
  health: {
    ...cardStatBadgeBaseStyle,
    right: '8px',
    bottom: '8px',

    background: 'linear-gradient(135deg,#34d399,#22d3ee)'
  }
};

const hoverTooltipStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 1000,
  maxWidth: '320px',
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(8,12,20,0.95)',
  color: 'white',
  fontSize: '0.85rem',
  lineHeight: 1.4,
  pointerEvents: 'none',
  boxShadow: '0 20px 35px rgba(0,0,0,0.45)',
  whiteSpace: 'pre-wrap'
};
