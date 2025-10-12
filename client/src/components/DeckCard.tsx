import { useMemo, type CSSProperties } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Badge } from '@radix-ui/themes';
import type { Deck } from '@cardstone/shared/decks';
import type { CatalogCard } from '@cardstone/shared/decks';
import { MAX_DECK_SIZE } from '@cardstone/shared/decks';
import { countDeckCards, getDeckManaCurve } from '../lib/deckRules';
import { SoundButton as Button} from './SoundButton';

export interface DeckCardProps {
  deck: Deck;
  cards: CatalogCard[];
  onEdit(): void;
  onDuplicate(): void;
  onRename(): void;
  onDelete(): void;
  onUse(): void;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '18px',
  borderRadius: '20px',
  background: 'rgba(18, 22, 32, 0.85)',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  minHeight: '220px'
};

export function DeckCard({ deck, cards, onEdit, onDuplicate, onRename, onDelete, onUse }: DeckCardProps) {
  const totalCards = countDeckCards(deck);
  const manaCurve = useMemo(() => getDeckManaCurve(deck, cards), [deck, cards]);
  const manaBins = ['0', '1', '2', '3', '4', '5', '6', '7+'];
  const formattedDate = new Date(deck.updatedAt).toLocaleString();
  const maxBin = Math.max(...manaCurve, 1);

  return (
    <Tooltip.Provider>
      <div style={containerStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8f9fb', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deck.name}
              </h3>
              <Badge color="amber" variant="solid">
                {deck.heroClass}
              </Badge>
            </div>
            <small style={{ color: 'rgba(255,255,255,0.6)' }}>Updated {formattedDate}</small>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                aria-label="Deck actions"
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
                <span aria-hidden style={{ fontSize: '18px' }}>⋮</span>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              sideOffset={6}
              style={{
                minWidth: '160px',
                background: 'rgba(20,25,38,0.95)',
                borderRadius: '12px',
                padding: '8px',
                boxShadow: '0 15px 30px rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <DropdownMenu.Item onSelect={onEdit} style={menuItemStyle}>
                <span aria-hidden style={menuIconStyle}>✎</span> Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={onRename} style={menuItemStyle}>
                <span aria-hidden style={menuIconStyle}>↵</span> Rename
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={onDuplicate} style={menuItemStyle}>
                <span aria-hidden style={menuIconStyle}>⧉</span> Duplicate
              </DropdownMenu.Item>
              <DropdownMenu.Separator style={separatorStyle} />
              <DropdownMenu.Item onSelect={onDelete} style={{ ...menuItemStyle, color: '#ff6b6b' }}>
                <span aria-hidden style={menuIconStyle}>🗑</span> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </header>

        <section style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
            <span>Cards</span>
            <span>
              {totalCards} / {MAX_DECK_SIZE}
            </span>
          </div>
          <div
            aria-hidden
            style={{
              position: 'relative',
              height: '8px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${Math.min(100, (totalCards / MAX_DECK_SIZE) * 100)}%`,
                background: 'linear-gradient(90deg, #ffd166, #f97316)',
                transition: 'width 0.2s ease'
              }}
            />
          </div>
        </section>

        <section style={{ display: 'grid', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>
            {manaBins.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', minHeight: '70px' }}>
              {manaCurve.map((value, index) => (
                <Tooltip.Root key={manaBins[index] ?? index}>
                  <Tooltip.Trigger asChild>
                    <div
                      aria-hidden
                      style={{
                        flex: 1,
                        borderRadius: '6px 6px 2px 2px',
                        background: 'linear-gradient(180deg, rgba(255,209,102,0.85), rgba(249,115,22,0.9))',
                        height: `${(value / maxBin) * 60 || 4}px`,
                        transition: 'height 0.2s ease'
                      }}
                    />
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    sideOffset={4}
                    style={{
                      background: 'rgba(17,21,30,0.95)',
                      color: 'white',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.4)'
                    }}
                  >
                    {value} card{value === 1 ? '' : 's'} costing {manaBins[index]}
                    <Tooltip.Arrow fill="rgba(17,21,30,0.95)" />
                  </Tooltip.Content>
                </Tooltip.Root>
              ))}
          </div>
        </section>

        <footer style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <Button
            onClick={onUse}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              border: 'none',
              padding: '10px 14px',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #10b981, #3b82f6)',
              color: '#0b1324',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span aria-hidden style={menuIconStyle}>▶</span> Use Deck
          </Button>
          <Button
            onClick={onEdit}
            style={{
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: 'white',
              borderRadius: '14px',
              padding: '10px 16px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Edit
          </Button>
        </footer>
      </div>
    </Tooltip.Provider>
  );
}

const menuItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '0.9rem',
  color: 'rgba(255,255,255,0.9)',
  cursor: 'pointer'
};

const menuIconStyle: CSSProperties = {
  fontSize: '1rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const separatorStyle: CSSProperties = {
  height: '1px',
  background: 'rgba(255,255,255,0.08)',
  margin: '6px 0'
};
