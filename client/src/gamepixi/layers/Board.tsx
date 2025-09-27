import type {
  CardInHand,
  GameState,
  MinionEntity,
  PlayerSide,
  TargetDescriptor
} from '@cardstone/shared/types';
import { getTargetingPredicate } from '@cardstone/shared/targeting';
import type { FederatedPointerEvent } from 'pixi.js';
import { Assets, Container, DisplayObject, Graphics, Point, Rectangle, Texture } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore, type MinionAnimationTransform, type TargetingState } from '../../state/store';
import { Card, CARD_SIZE } from '../Card';
import {
  MINION_ART_INSET_X,
  MINION_ART_INSET_Y,
  MINION_HEIGHT,
  MINION_WIDTH,
  getBoardLaneGeometry,
  MINION_HORIZONTAL_GAP
} from '../layout';

interface BoardProps {
  state: GameState;
  playerSide: PlayerSide;
  width: number;
  height: number;
  onAttack: (attackerId: string, target: TargetDescriptor) => void;
  canAttack: (minion: MinionEntity) => boolean;
  onCastSpell: (card: CardInHand, target: TargetDescriptor) => void;
}

function MinionCardArt({ cardId }: { cardId: string }) {
  const [innerTexture, setInnerTexture] = useState<Texture>(Texture.EMPTY);
  const [texture, setTexture] = useState(Texture.EMPTY);

  const [mask, setMask] = useState<Graphics | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (innerTexture === Texture.EMPTY) {
      Assets.load(`/assets/cards/${cardId}.png`).then((result) => {
        if (!cancelled) {
          setInnerTexture(result);
        }
      });
    }

    if (texture === Texture.EMPTY) {
      Assets.load('/assets/board_minion_template.webp').then((result) => {
        setTexture(result);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const handleMaskRef = useCallback((instance: Graphics | null) => {
    setMask(instance);
  }, []);

  const artWidth = MINION_WIDTH - MINION_ART_INSET_X * 2;
  const artHeight = MINION_HEIGHT - MINION_ART_INSET_Y * 2;
  const artX = MINION_ART_INSET_X;
  const artY = MINION_ART_INSET_Y - 4;

  return (
    <>
      <pixiSprite
        texture={innerTexture}
        width={artWidth}
        height={artHeight + 8}
        x={artX}
        y={artY}
        mask={mask ?? undefined}
        alpha={texture === Texture.EMPTY ? 0 : 1}
      />
      <pixiSprite x={-(MINION_ART_INSET_X * 4)}
                  y={0} texture={texture} width={MINION_WIDTH + (MINION_ART_INSET_X * 5)} height={MINION_HEIGHT} />
      <pixiGraphics
        ref={handleMaskRef}
        draw={(g) => {
          g.clear();
          g.beginFill(0xffffff, 1);
          g.drawEllipse(MINION_WIDTH / 2, MINION_HEIGHT / 2, artWidth / 2, (artHeight + 8) / 2);
          g.endFill();
        }}
      />
    </>
  );
}

export default function Board({
  state,
  playerSide,
  width,
  height,
  onAttack,
  canAttack,
  onCastSpell
}: BoardProps) {
  const boardRef = useRef<Container | null>(null);
  const [boardTexture, setBoardTexture] = useState<Texture>(Texture.EMPTY);
  const targeting = useUiStore((s) => s.targeting);
  const setTargeting = useUiStore((s) => s.setTargeting);
  const updateTargeting = useUiStore((s) => s.updateTargeting);
  const currentTarget = useUiStore((s) => s.currentTarget ?? null);
  const setCurrentTarget = useUiStore((s) => s.setCurrentTarget);
  const setSelected = useUiStore((s) => s.setSelected);
  const minionAnimations = useUiStore((s) => s.minionAnimations);
  const hoveredCardId = useUiStore((s) => s.hoveredCard);
  const setHovered = useUiStore((s) => s.setHovered);
  const targetRef = useRef<TargetDescriptor | null>(null);

  useEffect(() => {
    let cancelled = false;
    Assets.load('/assets/board_template.webp').then((result) => {
      if (!cancelled) {
        setBoardTexture(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    targetRef.current = currentTarget;
  }, [currentTarget]);

  const handlePointerMove = useCallback(
    (event: FederatedPointerEvent) => {
      if (!targeting || event.pointerId !== targeting.pointerId) {
        return;
      }
      updateTargeting({ x: event.global.x, y: event.global.y });
    },
    [targeting, updateTargeting]
  );

  const handlePointerUp = useCallback(
    (event: FederatedPointerEvent) => {
      if (!targeting || event.pointerId !== targeting.pointerId) {
        return;
      }
      const action: TargetingState | undefined = targeting;
      const target = targetRef.current;
      setTargeting(undefined);
      setCurrentTarget(null);
      if (!target || !action) {
        return;
      }

      if (action.source.kind === 'minion') {
        onAttack(action.source.entityId, target);
      } else if (action.source.kind === 'spell') {
        setSelected(undefined);
        onCastSpell(action.source.card, target);
      }
    },
    [onAttack, onCastSpell, setCurrentTarget, setSelected, setTargeting, targeting]
  );

  const handleStartAttack = useCallback(
    (entity: MinionEntity, event: FederatedPointerEvent) => {
      if (!canAttack(entity)) {
        return;
      }
      if (targeting) {
        return;
      }
      if (event.button !== 0 && event.pointerType !== 'touch') {
        return;
      }
      const container = boardRef.current;
      if (!container) {
        return;
      }
      const display = event.currentTarget as DisplayObject | null;
      let centerGlobal = event.global as Point;
      if (display) {
        const bounds = display.getBounds();
        centerGlobal = new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      }
      setTargeting({
        source: { kind: 'minion', entityId: entity.instanceId },
        pointerId: event.pointerId,
        origin: { x: centerGlobal.x, y: centerGlobal.y },
        current: { x: event.global.x, y: event.global.y }
      });
      setCurrentTarget(null);
      event.stopPropagation();
    },
    [canAttack, setCurrentTarget, setTargeting, targeting]
  );

  const targetingPredicate = useMemo(() => {
    if (!targeting) {
      return null;
    }
    if (targeting.source.kind === 'minion') {
      return getTargetingPredicate({ kind: 'minion' }, playerSide);
    }
    return getTargetingPredicate(
      { kind: 'spell', effect: targeting.source.card.card.effect },
      playerSide
    );
  }, [playerSide, targeting]);

  const handleTargetOver = useCallback(
    (target: TargetDescriptor) => {
      if (!targetingPredicate || !targetingPredicate(target)) {
        return;
      }
      setCurrentTarget(target);
    },
    [setCurrentTarget, targetingPredicate]
  );

  const handleTargetOut = useCallback(
    (target: TargetDescriptor) => {
      if (!targetingPredicate) {
        return;
      }
      setCurrentTarget((prev) => {
        if (!prev) {
          return prev;
        }
        if (prev.type === 'hero' && target.type === 'hero' && prev.side === target.side) {
          return null;
        }
        if (
          prev.type === 'minion' &&
          target.type === 'minion' &&
          prev.side === target.side &&
          prev.entityId === target.entityId
        ) {
          return null;
        }
        return prev;
      });
    },
    [setCurrentTarget, targetingPredicate]
  );

  const { boardTopY, boardBottomY, laneWidth, laneX } = useMemo(
    () => getBoardLaneGeometry(width, height),
    [width, height]
  );

  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';
  const opponentHero = state.players[opponentSide];
  const playerHero = state.players[playerSide];
  const boardHitArea = useMemo(() => new Rectangle(0, 0, width, height), [height, width]);

  const renderRow = useCallback(
    (side: PlayerSide, y: number) => {
      const minions = state.board[side];
      const count = minions.length;
      const rowWidth =
        count > 0 ? count * MINION_WIDTH + (count - 1) * MINION_HORIZONTAL_GAP : 0;
      const startX = laneX + (laneWidth - rowWidth) / 2;
      return minions.map((entity, index) => {
        const x = startX + index * (MINION_WIDTH + MINION_HORIZONTAL_GAP);
        const isFriendly = side === playerSide;
        const canAttackThisMinion = isFriendly && canAttack(entity);
        const targetDescriptor: TargetDescriptor = {
          type: 'minion',
          side,
          entityId: entity.instanceId
        };

        const canBeSpellTarget = targetingPredicate ? targetingPredicate(targetDescriptor) : false;
        const isTargeted =
          currentTarget?.type === 'minion' &&
          currentTarget.side === side &&
          currentTarget.entityId === entity.instanceId;

        const fillColor = isFriendly
          ? canAttackThisMinion
            ? 0x55efc4
            : 0x0984e3
          : isTargeted
            ? 0xff7675
            : 0xd63031;

        const handleDown = isFriendly
          ? (event: FederatedPointerEvent) => handleStartAttack(entity, event)
          : undefined;

        const animation: MinionAnimationTransform | undefined = minionAnimations[entity.instanceId];
        const offsetX = animation?.offsetX ?? 0;
        const offsetY = animation?.offsetY ?? 0;
        const scale = animation?.scale ?? 1;
        const rotation = animation?.rotation ?? 0;
        const zIndex = animation?.zIndex ?? index;

        return (
          <pixiContainer
            key={entity.instanceId}
            x={x + offsetX}
            y={y + offsetY}
            scale={scale}
            rotation={rotation}
            zIndex={zIndex}
            interactive
            eventMode="static"
            cursor={
              isFriendly && canAttackThisMinion
                ? 'pointer'
                : targetingPredicate && canBeSpellTarget
                  ? 'pointer'
                  : 'default'
            }
            onPointerDown={handleDown}
            onPointerOver={() => {
              setHovered(entity.instanceId);
              if (targetingPredicate && canBeSpellTarget) {
                handleTargetOver(targetDescriptor);
              }
            }}
            onPointerOut={() => {
              if (targetingPredicate && canBeSpellTarget) {
                handleTargetOut(targetDescriptor);
              }
              setHovered(undefined);
            }}
          >
            <pixiGraphics
              draw={(g) => {
                g.clear();
                g.beginFill(fillColor, isFriendly && !canAttackThisMinion ? 0.6 : 0.85);
                g.drawEllipse(
                  MINION_WIDTH / 2,
                  MINION_HEIGHT / 2,
                  MINION_WIDTH / 2,
                  MINION_HEIGHT / 2
                );
                g.endFill();
              }}
            />
            <MinionCardArt cardId={entity.card.id} />
            {/*<pixiGraphics*/}
            {/*  draw={(g) => {*/}
            {/*    g.clear();*/}
            {/*    g.beginFill(0x000000, 0.35);*/}
            {/*    g.drawRoundedRect(*/}
            {/*      MINION_WIDTH * 0.12,*/}
            {/*      MINION_HEIGHT * 0.62,*/}
            {/*      MINION_WIDTH * 0.76,*/}
            {/*      MINION_HEIGHT * 0.22,*/}
            {/*      12*/}
            {/*    );*/}
            {/*    g.endFill();*/}
            {/*  }}*/}
            {/*/>*/}
            {/*<pixiText*/}
            {/*  text={entity.card.name}*/}
            {/*  x={8}*/}
            {/*  y={12}*/}
            {/*  style={{ fill: 0xffffff, fontSize: 14 }}*/}
            {/*/>*/}
            <pixiText
              text={`${entity.attack}`}
              x={MINION_WIDTH * 0.12}
              y={MINION_HEIGHT * 0.7}
              style={{ fill: 0xffffff, fontSize: 24, fontWeight: 'bold' }}
            />
            <pixiText
              text={`${entity.health}`}
              x={MINION_WIDTH * 0.8}
              y={MINION_HEIGHT * 0.7}
              style={{ fill: 0xffffff, fontSize: 24, fontWeight: 'bold' }}
            />
          </pixiContainer>
        );
      });
    },
    [
      canAttack,
      currentTarget,
      handleStartAttack,
      handleTargetOut,
      handleTargetOver,
      laneX,
      laneWidth,
      minionAnimations,
      playerSide,
      setHovered,
      state.board,
      targetingPredicate
    ]
  );

  const opponentTargeted = useMemo(
    () => currentTarget?.type === 'hero' && currentTarget.side === opponentSide,
    [currentTarget, opponentSide]
  );

  const friendlyTargeted = useMemo(
    () => currentTarget?.type === 'hero' && currentTarget.side === playerSide,
    [currentTarget, playerSide]
  );

  const hoveredMinionPreview = useMemo(() => {
    if (!hoveredCardId) {
      return null;
    }

    const sides: PlayerSide[] = ['A', 'B'];
    for (const side of sides) {
      const minions = state.board[side];
      const index = minions.findIndex((minion) => minion.instanceId === hoveredCardId);
      if (index === -1) {
        continue;
      }

      const entity = minions[index];
      const baseX = laneX + index * (MINION_WIDTH + MINION_HORIZONTAL_GAP);
      const baseY = side === playerSide ? boardBottomY : boardTopY;
      const animation = minionAnimations[entity.instanceId];
      const offsetX = animation?.offsetX ?? 0;
      const offsetY = animation?.offsetY ?? 0;
      const scale = animation?.scale ?? 1;

      const widthWithScale = MINION_WIDTH * scale;
      const heightWithScale = MINION_HEIGHT * scale;

      const previewX = baseX + offsetX + widthWithScale + 10 + CARD_SIZE.width / 2;
      const previewY = baseY + offsetY + heightWithScale;

      const previewCard: CardInHand = {
        instanceId: entity.instanceId,
        card: entity.card
      };

      return {
        card: previewCard,
        x: previewX,
        y: previewY
      };
    }

    return null;
  }, [
    boardBottomY,
    boardTopY,
    hoveredCardId,
    laneX,
    minionAnimations,
    playerSide,
    state.board
  ]);

  return (
    <pixiContainer
      ref={boardRef}
      eventMode="static"
      sortableChildren
      hitArea={boardHitArea}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <pixiSprite texture={boardTexture} width={width} height={height} />
      <pixiGraphics
        draw={(g) => {
          g.clear();
          g.lineStyle(2, 0xffffff, 0.2);
          g.drawRoundedRect(laneX, boardTopY - 20, laneWidth, MINION_HEIGHT + 40, 20);
          g.drawRoundedRect(laneX, boardBottomY - 20, laneWidth, MINION_HEIGHT + 40, 20);
        }}
      />
      <pixiContainer
        x={40}
        y={boardTopY - 80}
        interactive={Boolean(
          targetingPredicate && targetingPredicate({ type: 'hero', side: opponentSide })
        )}
        cursor={
          targetingPredicate && targetingPredicate({ type: 'hero', side: opponentSide })
            ? 'pointer'
            : undefined
        }
        onPointerOver={() => handleTargetOver({ type: 'hero', side: opponentSide })}
        onPointerOut={() => handleTargetOut({ type: 'hero', side: opponentSide })}
      >
        <pixiGraphics
          draw={(g) => {
            g.clear();
            g.beginFill(opponentTargeted ? 0xff7675 : 0xd63031, opponentTargeted ? 1 : 0.8);
            g.drawCircle(0, 0, 48);
            g.endFill();
          }}
        />
        <pixiText
          text={`HP ${opponentHero.hero.hp}`}
          x={-36}
          y={-12}
          style={{ fill: 0xffffff, fontSize: 18 }}
        />
      </pixiContainer>
      <pixiContainer
        x={40}
        y={boardBottomY + MINION_HEIGHT - 20}
        interactive={Boolean(
          targetingPredicate && targetingPredicate({ type: 'hero', side: playerSide })
        )}
        cursor={
          targetingPredicate && targetingPredicate({ type: 'hero', side: playerSide })
            ? 'pointer'
            : undefined
        }
        onPointerOver={() => handleTargetOver({ type: 'hero', side: playerSide })}
        onPointerOut={() => handleTargetOut({ type: 'hero', side: playerSide })}
      >
        <pixiGraphics
          draw={(g) => {
            g.clear();
            g.beginFill(friendlyTargeted ? 0x55efc4 : 0x0984e3, friendlyTargeted ? 1 : 0.8);
            g.drawCircle(0, 0, 48);
            g.endFill();
          }}
        />
        <pixiText
          text={`HP ${playerHero.hero.hp}`}
          x={-36}
          y={-12}
          style={{ fill: 0xffffff, fontSize: 18 }}
        />
      </pixiContainer>
      {renderRow(opponentSide, boardTopY)}
      {renderRow(playerSide, boardBottomY)}
      {hoveredMinionPreview ? (
        <Card
          card={hoveredMinionPreview.card}
          x={hoveredMinionPreview.x}
          y={hoveredMinionPreview.y}
          rotation={0}
          disabled
          eventMode="none"
          cursor="default"
          zIndex={10000}
        />
      ) : null}
    </pixiContainer>
  );
}
