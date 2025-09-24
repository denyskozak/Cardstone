import type { CardInHand } from '@cardstone/shared/types';
import type { FederatedPointerEvent } from 'pixi.js';
import { useMemo } from 'react';

import cardTemplateUrl from './cart-template.webp';

const CARD_WIDTH = 120;
const CARD_HEIGHT = 160;

const CARD_BORDER_COLOR = 0xffffff;
const CARD_HIGHLIGHT_COLOR = 0xfff200;
const CARD_DISABLED_TINT = 0xb0b0b0;

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
  onDragMove?: (card: CardInHand, event: FederatedPointerEvent) => void;
  scale?: number;
  zIndex?: number;
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
  onDragMove,
  scale = 1,
  zIndex = 0
}: CardProps) {
  const costLabel = useMemo(() => `${card.card.cost}`, [card.card.cost]);
  const statsLabel =
    card.card.type === 'Minion' ? `${card.card.attack}/${card.card.health}` : card.card.effect;
  return (
    <pixiContainer
      x={x}
      y={y}
      scale={scale}
      eventMode={disabled ? 'none' : 'static'}
      interactive={!disabled}
      zIndex={zIndex}
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
      onPointerMove={(event) => {
        if (!disabled) {
          onDragMove?.(card, event);
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
      <pixiSprite
        image={cardTemplateUrl}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        tint={disabled ? CARD_DISABLED_TINT : 0xffffff}
        alpha={disabled ? 0.75 : 1}
      />
      <pixiGraphics
        draw={(g) => {
          g.clear();
          const borderColor = selected ? CARD_HIGHLIGHT_COLOR : CARD_BORDER_COLOR;
          const borderAlpha = disabled ? 0.5 : selected ? 1 : 0.9;
          g.lineStyle(selected ? 4 : 2, borderColor, borderAlpha);
          g.drawRoundedRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 12);

          if (disabled) {
            g.lineStyle(0);
            g.beginFill(0x000000, 0.35);
            g.drawRoundedRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 12);
            g.endFill();
          }
        }}
      />
      <pixiText
        text={card.card.name}
        x={8}
        y={18}
        style={{
          fill: 0xffffff,
          fontSize: 16,
          fontWeight: 'bold',
          wordWrap: true,
          wordWrapWidth: CARD_WIDTH - 16
        }}
      />
      <pixiText
        text={costLabel}
        x={12}
        y={CARD_HEIGHT - 44}
        style={{ fill: 0x74b9ff, fontSize: 22, fontWeight: 'bold' }}
      />
      <pixiText
        text={statsLabel}
        x={CARD_WIDTH - 64}
        y={CARD_HEIGHT - 40}
        style={{ fill: 0xff6b81, fontSize: 20, fontWeight: 'bold' }}
      />
    </pixiContainer>
  );
}

export const CARD_SIZE = { width: CARD_WIDTH, height: CARD_HEIGHT };
