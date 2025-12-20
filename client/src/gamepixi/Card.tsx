import type { CardInHand } from '@cardstone/shared/types';
import { Assets, BlurFilter, Graphics, Rectangle, Texture, type FederatedPointerEvent } from 'pixi.js';
import { useEffect, useMemo, useState } from 'react';


const CARD_WIDTH = 160;
const CARD_HEIGHT = 220;
const PLAYABLE_GLOW_FILTER = new BlurFilter(6);


interface CardProps {
  card: CardInHand;
  x: number;
  y: number;
  rotation?: number;
  onClick?: (card: CardInHand) => void;
  onHover?: (id?: string) => void;
  disabled?: boolean;
  selected?: boolean;
  onDragStart?: (card: CardInHand, event: FederatedPointerEvent) => void;
  onDragEnd?: (card: CardInHand, event: FederatedPointerEvent) => void;
  onDragMove?: (card: CardInHand, event: FederatedPointerEvent) => void;
  scale?: number;
  zIndex?: number;
  eventMode?: 'none' | 'auto' | 'static' | 'dynamic' | 'passive';
  cursor?: string;
}

export function Card({
  card,
  x,
  y,
  rotation = 0,
  onClick,
  onHover,
  disabled,
  selected,
  onDragStart,
  onDragEnd,
  onDragMove,
  scale = 1,
  zIndex = 0,
  eventMode = 'static',
  cursor
}: CardProps) {
  const [texture, setTexture] = useState(Texture.EMPTY)
  const [innerTexture, setInnerTexture] = useState(Texture.EMPTY)
  const combinedScale = scale * (selected ? 1.05 : 1)
  const hitArea = useMemo(
    () =>
      new Rectangle(
        -CARD_WIDTH / 2 / combinedScale,
        -CARD_HEIGHT / combinedScale,
        CARD_WIDTH / combinedScale,
        CARD_HEIGHT / combinedScale
      ),
    [combinedScale]
  )
  // Preload the sprite if it hasn't been loaded yet
  useEffect(() => {
    if (texture === Texture.EMPTY) {
      Assets
        .load('/cart-template.webp')
        .then((result) => {
          setTexture(result)
        });
    }
  }, [texture]);

  useEffect(() => {
    let cancelled = false
    setInnerTexture(Texture.EMPTY)
    Assets
      .load(`/assets/cards/${card.card.id}.webp`)
      .then((result) => {
        if (!cancelled) {
          setInnerTexture(result)
        }
      })
    return () => {
      cancelled = true
    }
  }, [card.card.id]);

  return (
    <pixiContainer
      x={x}
      y={y}
      scale={combinedScale}
      rotation={rotation}
      pivot={{ x: CARD_WIDTH / 2, y: CARD_HEIGHT }}
      eventMode={eventMode}
      cursor={cursor ?? (disabled ? 'not-allowed' : 'pointer')}
      zIndex={zIndex}
      hitArea={hitArea}
      onPointerTap={() => {
        if (!disabled) {
          onClick?.(card);
        }
      }}
      onPointerOver={() => {
        onHover?.(card.instanceId);
      }}
      onPointerOut={() => {
        onHover?.(undefined);
      }}
      onPointerDown={(event: FederatedPointerEvent) => {
        if (!disabled) {
          onDragStart?.(card, event);
        }
      }}
      onPointerMove={(event: FederatedPointerEvent) => {
        if (!disabled) {
          onDragMove?.(card, event);
        }
      }}
      onPointerUp={(event: FederatedPointerEvent) => {
        if (!disabled) {
          onDragEnd?.(card, event);
        }
      }}
      onPointerUpOutside={(event: FederatedPointerEvent) => {
        if (!disabled) {
          onDragEnd?.(card, event);
        }
      }}
    >
      {!disabled ? (
        <pixiGraphics
          blendMode="add"
          anchor={0.5}
          alpha={0.7}
          filters={[PLAYABLE_GLOW_FILTER]}
          draw={(g: Graphics) => {
            g.clear();
            g.beginFill(0x78ff5a, 0.85);
            g.drawEllipse(
              CARD_WIDTH / 2,
              CARD_HEIGHT / 2,
              CARD_WIDTH / 2 + 8,
              CARD_HEIGHT / 2 + 8
            );
            g.endFill();
          }}
        />
      ) : null}
      <pixiSprite
        texture={innerTexture}
        width={CARD_WIDTH * 0.6}
        height={CARD_HEIGHT * 0.5}
        x={CARD_WIDTH * 0.2}
        y={CARD_HEIGHT * 0.05}
      />
      <pixiSprite
        texture={texture}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
      />
      <pixiText
        text={card.card.name}
        x={CARD_WIDTH * 0.2}
        y={CARD_HEIGHT * 0.50}
        style={{
          fill: 0xffffff,
          fontSize: CARD_WIDTH * 0.1,
          fontWeight: 'bold',
          transform: 'translateX(-50%)',
        }}
      />
      <pixiText
        text={card.card.cost}
        x={CARD_WIDTH * 0.1}
        y={CARD_HEIGHT * 0.04}
        style={{ fill: 0xffffff, fontSize: 28, fontWeight: 'bold' }}
      />
      {card.card.text ? (<pixiText
        text={card.card.text}
        x={CARD_WIDTH * 0.25}
        y={CARD_HEIGHT * 0.7}
        style={{ fill: 0x000000, fontSize: CARD_WIDTH * 0.1, fontWeight: 'bold' }}
      />) : null}
      {"attack" in card.card ? (
        <pixiText
          text={card.card.attack}
          x={CARD_WIDTH * 0.11}
          y={CARD_HEIGHT * 0.85}
          style={{ fill: 0xffffff, fontSize: 22, fontWeight: 'bold' }}
        />
      ) : null}
      {"health" in card.card ? (
        <pixiText
          text={card.card.health}
          x={CARD_WIDTH * 0.87}
          y={CARD_HEIGHT * 0.85}
          style={{ fill: 0xffffff, fontSize: 22, fontWeight: 'bold' }}
        />
      ) : null}
    </pixiContainer>
  );
}

export const CARD_SIZE = { width: CARD_WIDTH, height: CARD_HEIGHT };
