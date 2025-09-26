import type { CardInHand } from '@cardstone/shared/types';
import type { FederatedPointerEvent } from 'pixi.js';
import { DisplayObject } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CARD_SIZE } from '../Card';
import { useUiStore } from '../../state/store';

const MAX_FAN_DEG = 50;
const FAN_MIX_WEIGHT = 0.72;
const CARD_OVERLAP = 0.32;
const MIN_RADIUS = CARD_SIZE.height * 2.6;
const HAND_MARGIN_BOTTOM = 20;
const HOVER_LIFT = 42;
const HOVER_SCALE = 1.1;
const HOVER_Z_INDEX = 9999;
const DRAG_Z_INDEX = HOVER_Z_INDEX + 1;
const HOVER_SPEED = 0.5;
const RETURN_SPEED = 0.18;
const EPSILON = 0.0001;

type Transform = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  z: number;
};

type AnimationIntent = 'base' | 'hover';

interface CardAnimationState {
  base: Transform;
  current: Transform;
  target: Transform;
  intent: AnimationIntent;
}

function isTargetedSpell(card: CardInHand): boolean {
  return card.card.type === 'Spell' && (card.card.effect === 'Firebolt' || card.card.effect === 'Heal');
}

function cloneTransform(transform: Transform): Transform {
  return { ...transform };
}

function toBaseTarget(base: Transform): Transform {
  return cloneTransform(base);
}

function toHoverTarget(base: Transform): Transform {
  return {
    x: base.x,
    y: base.y - HOVER_LIFT,
    rotation: 0,
    scale: base.scale * HOVER_SCALE,
    z: HOVER_Z_INDEX
  };
}

function approach(current: number, target: number, factor: number): number {
  const diff = target - current;
  if (Math.abs(diff) <= EPSILON) {
    return target;
  }
  return current + diff * factor;
}

function computeHandLayout(count: number, width: number, height: number): Transform[] {
  if (count === 0) {
    return [];
  }

  const centerX = width / 2;
  const handBaseY = height - HAND_MARGIN_BOTTOM;
  const maxFan = count > 1 ? MAX_FAN_DEG : 0;
  const stepDeg = count > 1 ? maxFan / (count - 1) : 0;
  const radiusBase = Math.min(width, height) * 0.65;
  const radius = Math.max(MIN_RADIUS, radiusBase);
  const linearSpacing = CARD_SIZE.width * (1 - CARD_OVERLAP);
  const linearStartX = centerX - ((count - 1) * linearSpacing) / 2;

  return new Array(count).fill(null).map((_, index) => {
    const thetaDeg = count === 1 ? 0 : -maxFan / 2 + index * stepDeg;
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const arcX = centerX + radius * Math.sin(thetaRad);
    const arcY = handBaseY - radius * (1 - Math.cos(thetaRad));
    const linearX = linearStartX + index * linearSpacing;
    const mixedX = arcX * FAN_MIX_WEIGHT + linearX * (1 - FAN_MIX_WEIGHT);

    return {
      x: mixedX,
      y: arcY,
      rotation: thetaRad,
      scale: 1,
      z: index
    };
  });
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
  const [, setAnimationTick] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const hoverCardRef = useRef<string | null>(null);
  const animationStatesRef = useRef<Map<string, CardAnimationState>>(new Map());

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

  const handLayout = useMemo(
    () => computeHandLayout(hand.length, width, height),
    [hand.length, width, height]
  );

  const ensureAnimationState = useCallback(
    (id: string, base: Transform) => {
      const store = animationStatesRef.current;
      let state = store.get(id);
      const baseState = cloneTransform(base);

      if (!state) {
        state = {
          base: baseState,
          current: cloneTransform(baseState),
          target: toBaseTarget(baseState),
          intent: 'base'
        };
        store.set(id, state);
      } else {
        state.base = baseState;
        if (state.intent === 'base') {
          state.target = toBaseTarget(state.base);
        } else if (state.intent === 'hover') {
          state.target = toHoverTarget(state.base);
        }
      }

      return state;
    },
    []
  );

  const handleCardHover = useCallback(
    (id?: string) => {
      const nextId = id ?? null;
      if (hoverCardRef.current === nextId) {
        return;
      }

      const states = animationStatesRef.current;

      if (hoverCardRef.current) {
        const previousState = states.get(hoverCardRef.current);
        if (previousState) {
          previousState.intent = 'base';
          previousState.target = toBaseTarget(previousState.base);
        }
      }

      hoverCardRef.current = nextId;

      if (nextId) {
        const nextState = states.get(nextId);
        if (nextState) {
          nextState.intent = 'hover';
          nextState.target = toHoverTarget(nextState.base);
        }
      }

      setHovered(nextId ?? undefined);
    },
    [setHovered]
  );

  const handlePointerLeave = useCallback(() => {
    if (hoverCardRef.current !== null) {
      handleCardHover(undefined);
    }
  }, [handleCardHover]);

  useEffect(() => {
    const states = animationStatesRef.current;
    const validIds = new Set(hand.map((card) => card.instanceId));
    states.forEach((_, key) => {
      if (!validIds.has(key)) {
        states.delete(key);
      }
    });

    if (hoverCardRef.current && !validIds.has(hoverCardRef.current)) {
      hoverCardRef.current = null;
      setHovered(undefined);
    }
  }, [hand, setHovered]);

  useEffect(() => {
    let mounted = true;

    const tick = () => {
      const states = animationStatesRef.current;
      let mutated = false;

      states.forEach((state) => {
        const speed = state.intent === 'hover' ? HOVER_SPEED : RETURN_SPEED;

        const nextX = approach(state.current.x, state.target.x, speed);
        if (nextX !== state.current.x) {
          state.current.x = nextX;
          mutated = true;
        }

        const nextY = approach(state.current.y, state.target.y, speed);
        if (nextY !== state.current.y) {
          state.current.y = nextY;
          mutated = true;
        }

        const nextRotation = approach(state.current.rotation, state.target.rotation, speed);
        if (nextRotation !== state.current.rotation) {
          state.current.rotation = nextRotation;
          mutated = true;
        }

        const nextScale = approach(state.current.scale, state.target.scale, speed);
        if (nextScale !== state.current.scale) {
          state.current.scale = nextScale;
          mutated = true;
        }

        if (state.current.z !== state.target.z) {
          state.current.z = state.target.z;
          mutated = true;
        }
      });

      if (mutated) {
        setAnimationTick((value) => value + 1);
      }

      if (mounted) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);
  const dropZone = useMemo(() => {
    const boardBottomY = height * 0.55;
    return {
      top: boardBottomY - 80,
      bottom: boardBottomY + 120
    };
  }, [height]);

  const updateTargeting = useUiStore((s) => s.updateTargeting);

  const updateDraggingPosition = useCallback(
    (event: FederatedPointerEvent, expectedCardId?: string) => {
      setDragging((prev) => {
        if (!prev || prev.pointerId !== event.pointerId) {
          return prev;
        }
        if (expectedCardId && prev.card.instanceId !== expectedCardId) {
          return prev;
        }

        const nextX = event.global.x - prev.offsetX;
        const nextY = event.global.y - prev.offsetY;

        if (prev.x === nextX && prev.y === nextY && prev.hasMoved) {
          return prev;
        }

        const hasMoved = prev.hasMoved || Math.hypot(nextX - prev.startX, nextY - prev.startY) > 4;

        return {
          ...prev,
          x: nextX,
          y: nextY,
          hasMoved
        };
      });

      if (targeting?.pointerId === event.pointerId) {
        updateTargeting({ x: event.global.x, y: event.global.y });
      }
    },
    [targeting?.pointerId, updateTargeting]
  );

  const handleDragMove = useCallback(
    (card: CardInHand, event: FederatedPointerEvent) => {
      updateDraggingPosition(event, card.instanceId);
    },
    [updateDraggingPosition]
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
        const cardBottom = cardY;
        const cardTop = cardY - CARD_SIZE.height;
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
      handleCardHover(undefined);

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
    [dragging, handleCardHover, setCurrentTarget, setSelected, setTargeting, targeting]
  );
  const cardsInHand = hand.map((card, index) => {
    const base = handLayout[index] ?? {
      x: width / 2,
      y: height - HAND_MARGIN_BOTTOM,
      rotation: 0,
      scale: 1,
      z: index
    };
    const state = ensureAnimationState(card.instanceId, base);
    const disabled = !canPlay(card);
    const isDraggingThisCard = dragging?.card.instanceId === card.instanceId;
    const isOverDropZone =
      isDraggingThisCard && dragging
        ? dragging.y >= dropZone.top && dragging.y - CARD_SIZE.height <= dropZone.bottom
        : false;
    const dragScale = isOverDropZone ? 0.94 : 1;

    const cardX = isDraggingThisCard && dragging ? dragging.x : state.current.x;
    const cardY = isDraggingThisCard && dragging ? dragging.y : state.current.y;
    const cardScale = isDraggingThisCard ? dragScale : state.current.scale;
    const cardRotation = isDraggingThisCard ? 0 : state.current.rotation;
    const cardZIndex = isDraggingThisCard ? DRAG_Z_INDEX : state.current.z;

    return (
      <Card
        key={card.instanceId}
        card={card}
        x={cardX}
        y={cardY}
        rotation={cardRotation}
        disabled={disabled}
        selected={selected === card.instanceId}
        onHover={handleCardHover}
        onClick={handleCardClick}
        onDragStart={(c, e) => {
          const currentState = animationStatesRef.current.get(card.instanceId);
          const start = currentState
            ? { x: currentState.current.x, y: currentState.current.y }
            : { x: base.x, y: base.y };
          handleDragStart(c, e, start);
        }}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        scale={cardScale}
        zIndex={cardZIndex}
      />
    );
  });

  return (
    <pixiContainer
      sortableChildren
      eventMode="static"
      onPointerLeave={handlePointerLeave}
      onGlobalPointerMove={updateDraggingPosition}
    >
      {cardsInHand}
    </pixiContainer>
  );
}
