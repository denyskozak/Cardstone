import { useCallback, useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';
import * as Toast from '@radix-ui/react-toast';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Badge } from '@radix-ui/themes';
import {
  HERO_CLASSES,
  MAX_DECK_SIZE,
  type CatalogCard,
  type Deck,
  type DeckCardEntry,
  type HeroClass
} from '@cardstone/shared/decks';
import {
  addCard,
  countDeckCards,
  createCardCollection,
  getDeckManaCurve,
  isCardAllowed,
  removeCard,
  setCardCount,
  sortDeckEntries,
  validateDeck,
  type CardCollection
} from '../lib/deckRules';
import { SoundButton as Button } from './SoundButton';

const DRAFT_STORAGE_KEY = 'cardstone.deck-builder.draft';

export type DeckBuilderDialogProps = {
  open: boolean;
  onOpenChange(value: boolean): void;
  initialDeck?: Deck;
  cards: CatalogCard[];
  onSave(deck: Deck): Promise<void> | void;
};

type RarityFilter = Set<CatalogCard['rarity']>;

type CatalogTab = 'All' | 'Minions' | 'Spells' | 'Weapons';

type DeckDraft = Deck;

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

function loadDraft(): DeckDraft | undefined {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as DeckDraft;
    if (!parsed || !parsed.heroClass || !parsed.name || !Array.isArray(parsed.cards)) {
      return undefined;
    }
    return cloneDeck(parsed);
  } catch (error) {
    console.warn('Failed to load deck draft', error);
    return undefined;
  }
}

function saveDraft(deck: DeckDraft): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(deck));
  } catch (error) {
    console.warn('Failed to persist deck draft', error);
  }
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

function deckToDraft(deck?: Deck): Deck {
  return deck ? cloneDeck(deck) : createEmptyDeck();
}

export function DeckBuilderDialog({ open, onOpenChange, initialDeck, cards, onSave }: DeckBuilderDialogProps) {
  const [activeTab, setActiveTab] = useState<CatalogTab>('All');
  const [manaRange, setManaRange] = useState<[number, number]>([0, 7]);
  const [rarities, setRarities] = useState<RarityFilter>(new Set());
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<'All' | HeroClass>('All');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck>(() => deckToDraft(initialDeck));

  const collection = useMemo(() => createCardCollection(cards), [cards]);

  useEffect(() => {
    if (open) {
      if (initialDeck) {
        setDeck(deckToDraft(initialDeck));
      } else {
        const draft = loadDraft();
        if (draft && window.confirm('Restore your last deck draft?')) {
          setDeck(draft);
        } else {
          setDeck(deckToDraft(undefined));
        }
      }
    }
  }, [open, initialDeck]);

  useEffect(() => {
    if (!open) return;
    saveDraft(deck);
  }, [deck, open]);

  const totalCards = useMemo(() => countDeckCards(deck), [deck]);
  const validation = useMemo(() => validateDeck(deck, cards), [deck, cards]);

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
      setDeck((current) => addCard(current, card, collection));
    },
    [collection, deck.heroClass]
  );

  const onRemoveCard = useCallback(
    (card: CatalogCard) => {
      setDeck((current) => removeCard(current, card, collection));
    },
    [collection]
  );

  const handleHeroClassChange = useCallback(
    (nextClass: HeroClass) => {
      setDeck((current) => {
        if (current.heroClass === nextClass) {
          return current;
        }
        const nextCollection = createCardCollection(cards);
        const allowed = current.cards.filter((entry) => {
          const card = nextCollection.get(entry.cardId);
          if (!card) return false;
          return card.heroClass === 'Neutral' || card.heroClass === nextClass;
        });
        const removed = current.cards.length - allowed.length;
        if (removed > 0) {
          setToastMessage(`Removed ${removed} card${removed === 1 ? '' : 's'} not matching ${nextClass}.`);
        }
        return {
          ...current,
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

  const handleSave = useCallback(
    async (closeAfter: boolean) => {
      await Promise.resolve(onSave(deck));
      if (closeAfter) {
        onOpenChange(false);
      }
    },
    [deck, onOpenChange, onSave]
  );

  const analytics = useMemo(() => {
    const curve = getDeckManaCurve(deck, cards);
    const maxCurve = Math.max(...curve, 1);
    const typeCounts = deck.cards.reduce(
      (acc, entry) => {
        const card = collection.get(entry.cardId);
        if (!card) return acc;
        acc[card.type] = (acc[card.type] ?? 0) + entry.count;
        acc.total += entry.count;
        return acc;
      },
      { Minion: 0, Spell: 0, Weapon: 0, total: 0 } as Record<string, number>
    );
    const rarityCounts = deck.cards.reduce((acc, entry) => {
      const card = collection.get(entry.cardId);
      if (!card) return acc;
      acc[card.rarity] = (acc[card.rarity] ?? 0) + entry.count;
      return acc;
    }, {} as Record<CatalogCard['rarity'], number>);
    return { curve, typeCounts, rarityCounts, maxCurve };
  }, [deck, cards, collection]);

  const groupedEntries = useMemo(() => groupDeckByMana(deck.cards, collection), [deck.cards, collection]);

  const saveDisabled = validation.totalCards !== MAX_DECK_SIZE || !validation.ok;

  return (
    <Toast.Provider swipeDirection="down">
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(7, 10, 18, 0.65)',
              backdropFilter: 'blur(6px)'
            }}
          />
          <Dialog.Content
            onDragOver={(event) => event.preventDefault()}
            onDrop={onCardDrop}
            style={{
              position: 'fixed',
              inset: '4%',
              background: 'rgba(12, 16, 24, 0.96)',
              borderRadius: '28px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              color: 'white',
              overflow: 'hidden',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)'
            }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Dialog.Title style={{ fontSize: '1.4rem', fontWeight: 700 }}>Deck Builder</Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  aria-label="Close deck builder"
                  style={{
                    border: 'none',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'white',
                    borderRadius: '12px',
                    width: '36px',
                    height: '36px',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Icon symbol="×" size="1.1rem" />
                </Button>
              </Dialog.Close>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
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
                      {HERO_CLASSES.map((hero) => (
                        <option key={hero} value={hero}>
                          {hero}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <span style={{ fontSize: '0.75rem' }}>Mana Cost</span>
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
                        <Badge variant="soft" color="amber">
                          {rarities.size || 'Any'}
                        </Badge>
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
                        color: 'white'
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

                <ScrollArea.Root style={{ flex: 1, minHeight: 0, borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <ScrollArea.Viewport style={{ padding: '12px', maxHeight: '100%' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      {filteredCards.map((card) => {
                        const inDeck = deck.cards.find((entry) => entry.cardId === card.id);
                        const disabledReason = !isCardAllowed(card, deck.heroClass)
                          ? `Only ${deck.heroClass} & Neutral cards allowed.`
                          : totalCards >= MAX_DECK_SIZE && !inDeck
                          ? 'Deck is full.'
                          : undefined;
                        const limitReached = inDeck && inDeck.count >= (card.rarity === 'Legendary' ? 1 : 2);
                        return (
                          <Tooltip.Root key={card.id} delayDuration={100}>
                            <Tooltip.Trigger asChild>
                              <div
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.setData('card-id', card.id);
                                }}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  padding: '12px',
                                  borderRadius: '16px',
                                  background: 'rgba(17,24,39,0.85)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  boxShadow: '0 12px 24px rgba(0,0,0,0.25)',
                                  cursor: disabledReason ? 'not-allowed' : 'grab',
                                  opacity: disabledReason ? 0.6 : 1
                                }}
                              >
                                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Badge variant="surface" color="gray">
                                    {card.cost}
                                  </Badge>
                                  <Badge variant="surface" color="orange">
                                    {card.rarity}
                                  </Badge>
                                </header>
                                <h4 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>{card.name}</h4>
                                {card.text && (
                                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{card.text}</p>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', gap: '8px' }}>
                                  <Button
                                    onClick={() => onRemoveCard(card)}
                                    disabled={!inDeck}
                                    style={{
                                      flex: 1,
                                      padding: '6px',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                      background: 'rgba(255,255,255,0.05)',
                                      color: 'white',
                                      cursor: inDeck ? 'pointer' : 'not-allowed'
                                    }}
                                  >
                                    <Icon symbol="−" />
                                  </Button>
                                  <Button
                                    onClick={() => onAddCard(card)}
                                    disabled={Boolean(disabledReason) || limitReached}
                                    style={{
                                      flex: 1,
                                      padding: '6px',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                      background: 'linear-gradient(90deg,#f97316,#facc15)',
                                      color: '#111827',
                                      cursor: disabledReason || limitReached ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    <Icon symbol="+" />
                                  </Button>
                                </div>
                              </div>
                            </Tooltip.Trigger>
                            {disabledReason && (
                              <Tooltip.Content
                                sideOffset={8}
                                style={{
                                  background: 'rgba(15,19,28,0.95)',
                                  color: 'white',
                                  padding: '6px 10px',
                                  borderRadius: '10px',
                                  fontSize: '0.75rem',
                                  maxWidth: '200px'
                                }}
                              >
                                {disabledReason}
                                <Tooltip.Arrow fill="rgba(15,19,28,0.95)" />
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

              <section
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minHeight: 0,
                  padding: '16px',
                  borderRadius: '20px',
                  background: 'rgba(17,23,36,0.9)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    value={deck.name}
                    onChange={(event) => setDeck((current) => ({ ...current, name: event.target.value }))}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(10,14,23,0.7)',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                    placeholder="Deck name"
                  />
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <Button
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.18)',
                          background: 'rgba(12,18,27,0.85)',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        {deck.heroClass}
                        <Icon symbol="▾" />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                      sideOffset={6}
                      style={{
                        background: 'rgba(15,19,28,0.95)',
                        color: 'white',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '8px',
                        minWidth: '160px'
                      }}
                    >
                      {HERO_CLASSES.map((hero) => (
                        <DropdownMenu.Item key={hero} style={menuItemStyle} onSelect={() => handleHeroClassChange(hero)}>
                          {hero}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{totalCards} / {MAX_DECK_SIZE}</strong>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Cards</span>
                </div>

                <ScrollArea.Root style={{ flex: 1, minHeight: 0 }}>
                  <ScrollArea.Viewport style={{ paddingRight: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto',
                                    gap: '8px',
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    background: 'rgba(10,14,23,0.6)',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                  }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <strong>{card.name}</strong>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{card.type}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Button
                                      onClick={() => setDeck((current) => removeCard(current, card, collection))}
                                      style={stepperButtonStyle}
                                      disabled={entry.count <= 0}
                                    >
                                      <Icon symbol="−" />
                                    </Button>
                                    <input
                                      type="number"
                                      min={0}
                                      max={card.rarity === 'Legendary' ? 1 : 2}
                                      value={entry.count}
                                      onChange={(event) =>
                                        setDeck((current) =>
                                          setCardCount(current, card, Number(event.target.value), collection)
                                        )
                                      }
                                      style={{
                                        width: '48px',
                                        textAlign: 'center',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        background: 'rgba(255,255,255,0.08)',
                                        color: 'white',
                                        padding: '4px'
                                      }}
                                    />
                                    <Button
                                      onClick={() => setDeck((current) => addCard(current, card, collection))}
                                      style={stepperButtonStyle}
                                      disabled={entry.count >= (card.rarity === 'Legendary' ? 1 : 2)}
                                    >
                                      <Icon symbol="+" />
                                    </Button>
                                  </div>
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
                  {validation.errors.map((error) => (
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
              </section>

              <section
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  borderRadius: '20px',
                  padding: '16px',
                  background: 'rgba(9,13,20,0.8)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, marginBottom: '8px' }}>Mana Curve</h4>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '140px' }}>
                    {analytics.curve.map((value, index) => (
                      <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '100%',
                            borderRadius: '8px 8px 2px 2px',
                            background: 'linear-gradient(180deg,#93c5fd,#2563eb)',
                            height: `${(value / analytics.maxCurve) * 100 || 4}%`,
                            minHeight: '4px'
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{index === 7 ? '7+' : index}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: 0, marginBottom: '8px' }}>Type Breakdown</h4>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '6px' }}>
                    {['Minion', 'Spell', 'Weapon'].map((type) => (
                      <li key={type} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)' }}>
                        <span>{type}</span>
                        <span>{analytics.typeCounts[type] ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ margin: 0, marginBottom: '8px' }}>Rarity</h4>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(['Common', 'Rare', 'Epic', 'Legendary'] as CatalogCard['rarity'][]).map((rarity) => (
                      <Badge key={rarity} variant="surface" color="amber">
                        {rarity}: {analytics.rarityCounts[rarity] ?? 0}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => setDeck(deckToDraft(initialDeck))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <Icon symbol="⟳" /> Reset Changes
                </Button>
              </section>
            </div>

            <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.75)' }}>
                <Icon symbol="ℹ" /> Drag cards from the catalog or use the steppers to adjust counts.
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Dialog.Close asChild>
                  <Button
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
                </Dialog.Close>
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saveDisabled}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(16,185,129,0.5)',
                    background: saveDisabled ? 'rgba(16,185,129,0.25)' : 'linear-gradient(90deg,#10b981,#34d399)',
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
                    background: saveDisabled ? 'rgba(59,130,246,0.25)' : 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
                    color: 'white',
                    fontWeight: 700,
                    cursor: saveDisabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  Save & Close
                </Button>
              </div>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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

const stepperButtonStyle: CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'rgba(255,255,255,0.08)',
  color: 'white',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer'
};
