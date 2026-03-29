import type { CardInHand } from '@cardstone/shared/types';
import { Assets, BlurFilter, Graphics, Rectangle, Texture, type FederatedPointerEvent } from 'pixi.js';
import { useEffect, useMemo, useState } from 'react';
import { getCardAssetPath } from '../lib/cardAssets';


const CARD_WIDTH_DEFAUL = 160;
const CARD_HEIGHT_DEFAULT = 220;


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
  onDisabledClick?: (card: CardInHand) => void;
  scale?: number;
  zIndex?: number;
  eventMode?: 'none' | 'auto' | 'static' | 'dynamic' | 'passive';
  cursor?: string;
  alpha?: number;
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
  onDisabledClick,
  scale = 1,
  zIndex = 0,
  eventMode = 'static',
  cursor,
  alpha = 1
}: CardProps) {
  const [texture, setTexture] = useState(Texture.EMPTY)
  const [innerTexture, setInnerTexture] = useState(Texture.EMPTY)
  const combinedScale = scale * (selected ? 1.05 : 1)
  const CARD_WIDTH = CARD_WIDTH_DEFAUL * combinedScale;
  const CARD_HEIGHT = CARD_HEIGHT_DEFAULT * combinedScale;
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
      .load(getCardAssetPath(card.card))
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
    // Контейнер одной карты: трансформы, хитбокс и pointer-события.
    <pixiContainer
      x={x}
      y={y}
      // scale={combinedScale}
      rotation={rotation}
      pivot={{ x: CARD_WIDTH / 2, y: CARD_HEIGHT }}
      eventMode={eventMode}
      cursor={cursor ?? (disabled ? 'not-allowed' : 'pointer')}
      zIndex={zIndex}
      alpha={alpha}
      // hitArea={hitArea}
      onPointerTap={() => {
        if (disabled) {
          onDisabledClick?.(card);
          return;
        }
        onClick?.(card);
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
        // pixiGraphics-подсветка играбельной карты (зелёный glow вокруг рамки).
        <pixiGraphics
          blendMode="add"
          anchor={0.5}
          alpha={0.7}
          draw={(g: Graphics) => {
            g.clear();
            g.beginFill(0x78ff5a, 0.85);
            g.drawEllipse(CARD_WIDTH / 2, CARD_HEIGHT / 2, CARD_WIDTH / 2 + 8, CARD_HEIGHT / 2 + 8);
            g.endFill();
          }}
        />
      ) : null}
      {/* Иллюстрация карты (внутренний арт). */}
      <pixiSprite
        texture={innerTexture}
        width={CARD_WIDTH * 0.65}
        height={CARD_HEIGHT * 0.5}
        x={CARD_WIDTH * 0.23}
        y={CARD_HEIGHT * 0.05}
      />
      {/* Внешняя рамка/шаблон карты (фон, декоративный бордер). */}
      <pixiSprite texture={texture} width={CARD_WIDTH} height={CARD_HEIGHT} />
      {/* Текстовые слои карты: имя, мана, описание, характеристики. */}
      <pixiText
        text={card.card.name}
        x={CARD_WIDTH * 0.14}
        y={CARD_HEIGHT * 0.5}
        style={{
          fill: 0xffffff,
          fontSize: 16 * combinedScale,
          fontWeight: 'bold',
          stroke: '#000000', // цвет обводки
          strokeThickness: 2 // толщина обводки
        }}
      />
      <pixiText
        text={card.card.cost}
        x={CARD_WIDTH * 0.107}
        y={CARD_HEIGHT * 0.052}
        style={{
          fill: 0xffffff,
          fontSize: 28 * combinedScale,
          fontWeight: 'bold',
          stroke: '#000000',
          strokeThickness: 2
        }}
      />
      {card.card.text ? (
        <pixiText
          text={card.card.text}
          x={CARD_WIDTH * 0.2}
          y={CARD_HEIGHT * 0.63}
          style={{
            fill: 0xffffff,
            fontSize: 12 * combinedScale,
            wordWrap: true,
            wordWrapWidth: CARD_WIDTH - 80,
            breakWords: true
          }}
        />
      ) : null}
      {'attack' in card.card ? (
        <pixiText
          text={card.card.attack}
          x={CARD_WIDTH * 0.11}
          y={CARD_HEIGHT * 0.795}
          style={{
            fill: 0xffffff,
            fontSize: 22 * combinedScale,
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 2
          }}
        />
      ) : null}
      {'health' in card.card ? (
        <pixiText
          text={card.card.health}
          x={CARD_WIDTH * 0.878}
          y={CARD_HEIGHT * 0.795}
          style={{
            stroke: '#000000',
            strokeThickness: 2,
            fill: 0xffffff,
            fontSize: 22 * combinedScale,
            fontWeight: 'bold'
          }}
        />
      ) : null}
    </pixiContainer>
  );
}

export const CARD_SIZE = { width: CARD_WIDTH_DEFAUL, height: CARD_HEIGHT_DEFAULT };
