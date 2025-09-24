import type { CardInHand } from '@cardstone/shared/types';
import type { FederatedPointerEvent } from 'pixi.js';
import { useMemo } from 'react';

const CARD_WIDTH = 120;
const CARD_HEIGHT = 160;

const CARD_COLORS = {
  base: 0x2f3542,
  highlight: 0x57606f,
  disabled: 0x3d3d3d
};

interface CardProps {
  card: CardInHand;
  x: number;
  y: number;
  onClick: (card: CardInHand) => void;
  onHover: (id?: string) => void;
  disabled?: boolean;
  selected?: boolean;
  onDragStart?: (card: CardInHand, event: FederatedPointerEvent) => void;
  onDragEnd?: (card: CardInHand, event: FederatedPointerEvent) => void;
  scale?: number;
}

export function Card({
  card,
  x,
  y,
  onClick,
  onHover,
  disabled,
  selected,
  onDragStart,
  onDragEnd,
  scale = 1
}: CardProps) {
  const costLabel = useMemo(() => `${card.card.cost}`, [card.card.cost]);
  const statsLabel =
    card.card.type === 'Minion' ? `${card.card.attack}/${card.card.health}` : card.card.effect;
  return (
    <pixiContainer
      x={x}
      y={y}
      scale={scale}
      interactive={!disabled}
      onPointerTap={() => {
        if (!disabled) {
          onClick(card);
        }
      }}
      onPointerOver={() => {
        onHover(card.instanceId);
      }}
      onPointerOut={() => {
        onHover(undefined);
      }}
      onPointerDown={(event) => {
        if (!disabled) {
          onDragStart?.(card, event);
        }
      }}
      onPointerUp={(event) => {
        if (!disabled) {
          onDragEnd?.(card, event);
        }
      }}
      onPointerUpOutside={(event) => {
        if (!disabled) {
          onDragEnd?.(card, event);
        }
      }}
    >
      <pixiGraphics
        draw={(g) => {
          g.clear();
          const color = disabled ? CARD_COLORS.disabled : selected ? 0xf1c40f : CARD_COLORS.base;
          g.beginFill(color, disabled ? 0.6 : 1);
          g.lineStyle(3, selected ? 0xfff200 : CARD_COLORS.highlight, disabled ? 0.5 : 1);
          g.drawRoundedRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 12);
          g.endFill();
        }}
      />
      <pixiText text={card.card.name} x={8} y={16} style={{ fill: 0xffffff, fontSize: 14, wordWrap: true, wordWrapWidth: CARD_WIDTH - 16 }} />
      <pixiText text={costLabel} x={8} y={CARD_HEIGHT - 32} style={{ fill: 0x74b9ff, fontSize: 20 }} />
      <pixiText text={statsLabel} x={CARD_WIDTH - 60} y={CARD_HEIGHT - 32} style={{ fill: 0xff6b81, fontSize: 18 }} />
    </pixiContainer>
  );
}

export const CARD_SIZE = { width: CARD_WIDTH, height: CARD_HEIGHT };
