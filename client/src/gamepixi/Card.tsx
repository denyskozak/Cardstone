import type { CardInHand } from '@cardstone/shared/types';
import { Assets, Texture, type FederatedPointerEvent } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';


const CARD_WIDTH = 140;
const CARD_HEIGHT = 200;


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
  const [texture, setTexture] = useState(Texture.EMPTY)
  const [innerTexture, setInnerTexture] = useState(Texture.EMPTY)
  const [isHovered, setIsHovered] = useState(false)
  const [animatedScale, setAnimatedScale] = useState(1)
  const [animatedYOffset, setAnimatedYOffset] = useState(0)
  const animationFrameRef = useRef<number | null>(null)
  const baseScale = scale * (selected ? 1.05 : 1)
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
      .load(`/assets/cards/${card.card.id}.png`)
      .then((result) => {
        if (!cancelled) {
          setInnerTexture(result)
        }
      })
    return () => {
      cancelled = true
    }
  }, [card.card.id]);

  useEffect(() => {
    const targetScale = isHovered ? 2 : 1
    const targetYOffset = isHovered ? -CARD_HEIGHT * baseScale * 0.1 : 0

    const animate = () => {
      let shouldContinue = false

      setAnimatedScale((current) => {
        const diff = targetScale - current
        if (Math.abs(diff) <= 0.01) {
          return targetScale
        }
        shouldContinue = true
        return current + diff * 0.1
      })

      setAnimatedYOffset((current) => {
        const diff = targetYOffset - current
        if (Math.abs(diff) <= 0.5) {
          return targetYOffset
        }
        shouldContinue = true
        return current + diff * 0.1
      })

      if (shouldContinue) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        animationFrameRef.current = null
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isHovered, baseScale])

  const hoverScale = animatedScale
  const totalScale = baseScale * hoverScale
  const hoverOffsetX = CARD_WIDTH * baseScale * (hoverScale - 1) * 0.5
  const hoverOffsetY = CARD_HEIGHT * baseScale * (hoverScale - 1) * 0.5

  return (
    <pixiContainer
      x={x - hoverOffsetX}
      y={y - hoverOffsetY + animatedYOffset}
      scale={totalScale}
      eventMode="static"
      interactive
      zIndex={zIndex}
      onPointerTap={() => {
        if (!disabled) {
          onClick(card);
        }
      }}
      onPointerOver={() => {
        setIsHovered(true);
        onHover(card.instanceId);
      }}
      onPointerOut={() => {
        setIsHovered(false);
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
        texture={innerTexture}
        width={CARD_WIDTH * 0.6}
        height={CARD_HEIGHT * 0.5}
        x={CARD_WIDTH * 0.2}
        y={CARD_HEIGHT * 0.07}
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
        y={CARD_HEIGHT * 0.03}
        style={{ fill: 0xffffff, fontSize: 22, fontWeight: 'bold' }}
      />
      {card.card.effect && (<pixiText
        text={card.card.effect}
        x={CARD_WIDTH * 0.25}
        y={CARD_HEIGHT * 0.7}
        style={{ fill: 0x000000, fontSize: CARD_WIDTH * 0.1, fontWeight: 'bold' }}
      />)}
      {card.card.attack && (<pixiText
        text={card.card.attack}
        x={12}
        y={CARD_HEIGHT * 0.85}
        style={{ fill: 0xffffff, fontSize: 20, fontWeight: 'bold' }}
      />)}
      {card.card?.health && (<pixiText
        text={card.card?.health}
        x={CARD_WIDTH * 0.85}
        y={CARD_HEIGHT * 0.85}
        style={{ fill: 0xffffff, fontSize: 20, fontWeight: 'bold' }}
      />)}
    </pixiContainer>
  );
}

export const CARD_SIZE = { width: CARD_WIDTH, height: CARD_HEIGHT };
