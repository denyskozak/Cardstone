import type { CardInHand, CardPlacement } from '@cardstone/shared/types';
import { actionRequiresTarget, getPrimaryPlayAction } from '@cardstone/shared/effects';
import type { FederatedPointerEvent } from 'pixi.js';
import { DisplayObject } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CARD_SIZE } from '../Card';
import { useUiStore } from '../../state/store';
import { getBoardLaneGeometry } from '../layout';

const MAX_FAN_DEG = 50;
const FAN_MIX_WEIGHT = 0.72;
const CARD_OVERLAP = 0.42;
const BASE_CARD_SCALE = 0.8;
export const HAND_BASE_SCALE = BASE_CARD_SCALE;
export const HAND_CARD_DIMENSIONS = {
  width: CARD_SIZE.width * BASE_CARD_SCALE,
  height: CARD_SIZE.height * BASE_CARD_SCALE
};
const MIN_RADIUS = HAND_CARD_DIMENSIONS.height * 2.6;
const HAND_MARGIN_BOTTOM = -10;
const HAND_MARGIN_LEFT = 50;
const HOVER_LIFT = 80;
const HOVER_SCALE = 1.7;
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
  if (card.card.type !== 'Spell') {
    return false;
  }
  const action = getPrimaryPlayAction(card.card);
  return Boolean(action && actionRequiresTarget(action));
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

export interface HandLayoutOptions {
  /**
   * Scales the base radius that determines the curvature of the card fan.
   * Larger values flatten the arc by placing cards further away from the
   * center of the circle.
   */
  radiusScale?: number;
  /**
   * Scales the maximum fan angle. Values below 1 reduce the spread between
   * cards and therefore lessen the curvature.
   */
  fanAngleScale?: number;
  /**
   * Adds a fixed vertical offset to every card in the layout.
   */
  verticalOffset?: number;
}

export function computeHandLayout(
  count: number,
  width: number,
  height: number,
  options: HandLayoutOptions = {}
): Transform[] {
  if (count === 0) {
    return [];
  }

  const { radiusScale = 1, fanAngleScale = 1, verticalOffset = 0 } = options;

  const centerX = width / 2 - HAND_MARGIN_LEFT;
  const handBaseY = height - HAND_MARGIN_BOTTOM;
  const maxFan = count > 1 ? MAX_FAN_DEG * fanAngleScale : 0;
  const stepDeg = count > 1 ? maxFan / (count - 1) : 0;
  const radiusBase = Math.min(width, height) * 0.65 * radiusScale;
  const radius = Math.max(MIN_RADIUS, radiusBase);
  const linearSpacing = HAND_CARD_DIMENSIONS.width * (1 - CARD_OVERLAP);
  const linearStartX = centerX - ((count - 1) * linearSpacing) / 2;

  return new Array(count).fill(null).map((_, index) => {
    const thetaDeg = count === 1 ? 0 : -maxFan / 2 + index * stepDeg;
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const arcX = centerX + radius * Math.sin(thetaRad);
    const arcY = handBaseY + radius * (1 - Math.cos(thetaRad)) + verticalOffset;
    const linearX = linearStartX + index * linearSpacing;
    const mixedX = arcX * FAN_MIX_WEIGHT + linearX * (1 - FAN_MIX_WEIGHT);

    return {
      x: mixedX,
      y: arcY,
      rotation: thetaRad,
      scale: BASE_CARD_SCALE,
      z: index
    };
  });
}

interface HandProps {
  hand: CardInHand[];
  canPlay: (card: CardInHand) => boolean;
  onPlay: (card: CardInHand, options?: { placement?: CardPlacement }) => void;
  boardMinionCount: number;
  width: number;
  height: number;
}

export default function HandLayer({
  hand,
  canPlay,
  onPlay,
  boardMinionCount,
  width,
  height
}: HandProps) {
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
    () =>
      computeHandLayout(hand.length, width, height, {
        radiusScale: 1.25,
        fanAngleScale: 0.7,
        verticalOffset: HAND_CARD_DIMENSIONS.height * 0.3,
      }),
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
  const { laneX, laneWidth, boardBottomY } = useMemo(() => {
    const geometry = getBoardLaneGeometry(width, height);
    return { laneX: geometry.laneX, laneWidth: geometry.laneWidth, boardBottomY: geometry.boardBottomY };
  }, [height, width]);

  const dropZone = useMemo(() => {
    return {
      top: boardBottomY - 80,
      bottom: boardBottomY + 120
    };
  }, [boardBottomY]);

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
          let placement: CardPlacement | undefined;
          if (boardMinionCount > 0) {
            const cardCenterX = current.x + CARD_SIZE.width / 2;
            const boardCenterX = laneX + laneWidth / 2;
            placement = cardCenterX < boardCenterX ? 'left' : 'right';
          }

          onPlay(card, placement ? { placement } : undefined);
          setSelected(undefined);
          playedFromDragRef.current = card.instanceId;
        } else {
          playedFromDragRef.current = undefined;
        }

        return undefined;
      });
    },
    [
      boardMinionCount,
      canPlay,
      dropZone.bottom,
      dropZone.top,
      laneWidth,
      laneX,
      onPlay,
      setSelected,
      targeting?.pointerId,
      updateTargeting
    ]
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
      x: width / 2 - HAND_MARGIN_LEFT,
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
