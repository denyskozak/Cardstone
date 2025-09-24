import { Container } from '@pixi/react';
import type { CardInHand } from '@cardstone/shared/types.js';
import { Card, CARD_SIZE } from '../Card';
import { useUiStore } from '../../state/store';

interface HandProps {
  hand: CardInHand[];
  canPlay: (card: CardInHand) => boolean;
  onPlay: (card: CardInHand) => void;
  width: number;
  height: number;
}

export default function HandLayer({ hand, canPlay, onPlay, width, height }: HandProps) {
  const setHovered = useUiStore((s) => s.setHovered);
  const selected = useUiStore((s) => s.selectedCard);
  const setSelected = useUiStore((s) => s.setSelected);

  const spacing = Math.min(160, (width - 160) / Math.max(1, hand.length));
  const startX = (width - spacing * hand.length) / 2;
  const y = height - CARD_SIZE.height - 32;

  return (
    <Container>
      {hand.map((card, index) => {
        const x = startX + index * spacing;
        const disabled = !canPlay(card);
        return (
          <Card
            key={card.instanceId}
            card={card}
            x={x}
            y={y}
            disabled={disabled}
            selected={selected === card.instanceId}
            onHover={setHovered}
            onClick={(clicked) => {
              setSelected(clicked.instanceId);
              if (!disabled) {
                onPlay(clicked);
                setSelected(undefined);
              }
            }}
          />
        );
      })}
    </Container>
  );
}
