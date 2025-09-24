import type { CardInHand } from '@cardstone/shared/types';
import { useApplication } from '@pixi/react';
import type { FederatedPointerEvent } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const { app } = useApplication();
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

  useEffect(() => {
    if (!dragging) {
      return undefined;
    }

    const handlePointerMove = (event: FederatedPointerEvent) => {
      if (event.pointerId !== dragging.pointerId) {
        return;
      }
      const { offsetX, offsetY } = dragging;
      const nextX = event.global.x - offsetX;
      const nextY = event.global.y - offsetY;

      setDragging((prev) =>
        prev
          ? {
              ...prev,
              x: nextX,
              y: nextY,
              hasMoved: prev.hasMoved || Math.hypot(nextX - prev.startX, nextY - prev.startY) > 4
            }
          : prev
      );
    };

    const finishDrag = (event: FederatedPointerEvent) => {
      if (event.pointerId !== dragging.pointerId) {
        return;
      }

      setDragging((current) => {
        if (!current) {
          return undefined;
        }

        const { card, hasMoved } = current;
        const dropY = event.global.y;
        const withinDropZone = dropY >= dropZone.top && dropY <= dropZone.bottom;

        if (hasMoved && withinDropZone && canPlay(card)) {
          onPlay(card);
          setSelected(undefined);
          playedFromDragRef.current = card.instanceId;
        } else {
          playedFromDragRef.current = undefined;
        }

        return undefined;
      });
    };

    app.stage.on('globalpointermove', handlePointerMove);
    app.stage.on('pointerup', finishDrag);
    app.stage.on('pointerupoutside', finishDrag);
    app.stage.on('pointercancel', finishDrag);

    return () => {
      app.stage.off('globalpointermove', handlePointerMove);
      app.stage.off('pointerup', finishDrag);
      app.stage.off('pointerupoutside', finishDrag);
      app.stage.off('pointercancel', finishDrag);
    };
  }, [app, canPlay, dropZone, dragging, onPlay, setSelected]);

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
    [dragging, setSelected]
  );

  const cardsInHand = hand.map((card, index) => {
    const x = startX + index * spacing;
    const disabled = !canPlay(card);
    if (dragging && dragging.card.instanceId === card.instanceId) {
      return null;
    }

    return (
      <Card
        key={card.instanceId}
        card={card}
        x={x}
        y={y}
        disabled={disabled}
        selected={selected === card.instanceId}
        onHover={setHovered}
        onClick={handleCardClick}
        onDragStart={(c, e) => handleDragStart(c, e, { x, y })}
      />
    );
  });

  const draggingCard = dragging ? (
    <Card
      key={`${dragging.card.instanceId}-dragging`}
      card={dragging.card}
      x={dragging.x}
      y={dragging.y}
      disabled={!canPlay(dragging.card)}
      selected={selected === dragging.card.instanceId}
      onHover={setHovered}
      onClick={handleCardClick}
    />
  ) : null;

  return (
    <pixiContainer>
      {cardsInHand}
      {draggingCard}
    </pixiContainer>
  );
}
