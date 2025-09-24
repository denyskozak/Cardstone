import type { CardInHand } from '@cardstone/shared/types';
import type { FederatedPointerEvent } from 'pixi.js';
import { DisplayObject } from 'pixi.js';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Card, CARD_SIZE } from '../Card';
import { useUiStore } from '../../state/store';

function isTargetedSpell(card: CardInHand): boolean {
  return card.card.type === 'Spell' && (card.card.effect === 'Firebolt' || card.card.effect === 'Heal');
}

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
  const setTargeting = useUiStore((s) => s.setTargeting);
  const setCurrentTarget = useUiStore((s) => s.setCurrentTarget);
  const targeting = useUiStore((s) => s.targeting);
  const playedFromDragRef = useRef<string | undefined>(undefined);

  interface DragState {
    card: CardInHand;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    hasMoved: boolean;
  }

  const [dragging, setDragging] = useState<DragState | undefined>(undefined);
  const isDraggingCard = useCallback(
    (card: CardInHand) => dragging?.card.instanceId === card.instanceId,
    [dragging]
  );

  const spacing = Math.min(160, (width - 160) / Math.max(1, hand.length));
  const startX = (width - spacing * hand.length) / 2;
  const y = height - CARD_SIZE.height - 32;

  const dropZone = useMemo(() => {
    const boardBottomY = height * 0.55;
    return {
      top: boardBottomY - 80,
      bottom: boardBottomY + 120
    };
  }, [height]);

  const updateTargeting = useUiStore((s) => s.updateTargeting);

  const handleDragMove = useCallback(
    (card: CardInHand, event: FederatedPointerEvent) => {
      setDragging((prev) => {
        if (!prev || prev.card.instanceId !== card.instanceId || prev.pointerId !== event.pointerId) {
          return prev;
        }
        const nextX = event.global.x - prev.offsetX;
        const nextY = event.global.y - prev.offsetY;
        return {
          ...prev,
          x: nextX,
          y: nextY,
          hasMoved: prev.hasMoved || Math.hypot(nextX - prev.startX, nextY - prev.startY) > 4
        };
      });

      if (targeting?.pointerId === event.pointerId) {
        updateTargeting({ x: event.global.x, y: event.global.y });
      }
    },
    [targeting?.pointerId, updateTargeting]
  );

  const handleDragEnd = useCallback(
    (card: CardInHand, event: FederatedPointerEvent) => {
      if (targeting?.pointerId === event.pointerId) {
        updateTargeting({ x: event.global.x, y: event.global.y });
      }

      setDragging((current) => {
        if (!current || current.card.instanceId !== card.instanceId || current.pointerId !== event.pointerId) {
          return current;
        }

        const { hasMoved, y: cardY } = current;
        const cardTop = cardY;
        const cardBottom = cardY + CARD_SIZE.height;
        const intersectsDropZone = cardBottom >= dropZone.top && cardTop <= dropZone.bottom;

        if (hasMoved && intersectsDropZone && canPlay(card)) {
          onPlay(card);
          setSelected(undefined);
          playedFromDragRef.current = card.instanceId;
        } else {
          playedFromDragRef.current = undefined;
        }

        return undefined;
      });
    },
    [canPlay, dropZone.bottom, dropZone.top, onPlay, setSelected, targeting?.pointerId, updateTargeting]
  );

  const handleCardClick = useCallback(
    (card: CardInHand) => {
      if (isDraggingCard(card)) {
        return;
      }
      if (playedFromDragRef.current === card.instanceId) {
        playedFromDragRef.current = undefined;
        return;
      }
      setSelected(card.instanceId);
    },
    [isDraggingCard, setSelected]
  );

  const handleDragStart = useCallback(
    (
      card: CardInHand,
      event: FederatedPointerEvent,
      startPosition: { x: number; y: number }
    ) => {
      if (dragging) {
        return;
      }
      playedFromDragRef.current = undefined;
      if (isTargetedSpell(card)) {
        if (targeting) {
          return;
        }
        const display = event.currentTarget as DisplayObject | null;
        let originX = event.global.x;
        let originY = event.global.y;
        if (display) {
          const bounds = display.getBounds();
          originX = bounds.x + bounds.width / 2;
          originY = bounds.y + bounds.height / 2;
        }
        setSelected(card.instanceId);
        setCurrentTarget(null);
        setTargeting({
          source: { kind: 'spell', card },
          pointerId: event.pointerId,
          origin: { x: originX, y: originY },
          current: { x: event.global.x, y: event.global.y }
        });
        event.stopPropagation();
        return;
      }

      setSelected(card.instanceId);
      setDragging({
        card,
        pointerId: event.pointerId,
        offsetX: event.global.x - startPosition.x,
        offsetY: event.global.y - startPosition.y,
        startX: startPosition.x,
        startY: startPosition.y,
        x: startPosition.x,
        y: startPosition.y,
        hasMoved: false
      });
    },
    [dragging, setCurrentTarget, setSelected, setTargeting, targeting]
  );

  const cardsInHand = hand.map((card, index) => {
    const x = startX + index * spacing;
    const disabled = !canPlay(card);
    const isDraggingThisCard = dragging?.card.instanceId === card.instanceId;
    const dragPositionX = isDraggingThisCard ? dragging.x : x;
    const dragPositionY = isDraggingThisCard ? dragging.y : y;
    const isDraggingOverDropZone =
      isDraggingThisCard && dragging
        ? dragging.y + CARD_SIZE.height >= dropZone.top && dragging.y <= dropZone.bottom
        : false;

    return (
      <Card
        key={card.instanceId}
        card={card}
        x={dragPositionX}
        y={dragPositionY}
        disabled={disabled}
        selected={selected === card.instanceId}
        onHover={setHovered}
        onClick={handleCardClick}
        onDragStart={(c, e) => handleDragStart(c, e, { x, y })}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        scale={isDraggingThisCard ? (isDraggingOverDropZone ? 0.94 : 1) : 1}
        zIndex={isDraggingThisCard ? 100 : index}
      />
    );
  });

  return <pixiContainer sortableChildren>{cardsInHand}</pixiContainer>;
}
