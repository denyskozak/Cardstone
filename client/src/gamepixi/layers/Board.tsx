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
import { useUiStore, type TargetingState } from '../../state/store';

interface BoardProps {
  state: GameState;
  playerSide: PlayerSide;
  width: number;
  height: number;
  onAttack: (attackerId: string, target: TargetDescriptor) => void;
  canAttack: (minion: MinionEntity) => boolean;
  onCastSpell: (card: CardInHand, target: TargetDescriptor) => void;
}

const MINION_WIDTH = 100;
const MINION_HEIGHT = 120;
const MINION_ART_INSET_X = 14;
const MINION_ART_INSET_Y = 10;

function MinionCardArt({ cardId }: { cardId: string }) {
  const [texture, setTexture] = useState<Texture>(Texture.EMPTY)
  const [mask, setMask] = useState<Graphics | null>(null)

  useEffect(() => {
    let cancelled = false
    setTexture(Texture.EMPTY)
    Assets
      .load(`/assets/cards/${cardId}.png`)
      .then((result) => {
        if (!cancelled) {
          setTexture(result)
        }
      })

    return () => {
      cancelled = true
    }
  }, [cardId])

  const handleMaskRef = useCallback((instance: Graphics | null) => {
    setMask(instance)
  }, [])

  const artWidth = MINION_WIDTH - MINION_ART_INSET_X * 2
  const artHeight = MINION_HEIGHT - MINION_ART_INSET_Y * 2
  const artX = MINION_ART_INSET_X
  const artY = MINION_ART_INSET_Y - 4

  return (
    <>
      <pixiSprite
        texture={texture}
        width={artWidth}
        height={artHeight + 8}
        x={artX}
        y={artY}
        mask={mask ?? undefined}
        alpha={texture === Texture.EMPTY ? 0 : 1}
      />
      <pixiGraphics
        ref={handleMaskRef}
        draw={(g) => {
          g.clear()
          g.beginFill(0xffffff, 1)
          g.drawEllipse(
            MINION_WIDTH / 2,
            MINION_HEIGHT / 2,
            artWidth / 2,
            (artHeight + 8) / 2
          )
          g.endFill()
        }}
      />
    </>
  )
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
  const targeting = useUiStore((s) => s.targeting);
  const setTargeting = useUiStore((s) => s.setTargeting);
  const updateTargeting = useUiStore((s) => s.updateTargeting);
  const currentTarget = useUiStore((s) => s.currentTarget ?? null);
  const setCurrentTarget = useUiStore((s) => s.setCurrentTarget);
  const setCurrentTargetPoint = useUiStore((s) => s.setCurrentTargetPoint);
  const cancelTargeting = useUiStore((s) => s.cancelTargeting);
  const setSelected = useUiStore((s) => s.setSelected);
  const targetRef = useRef<TargetDescriptor | null>(null);

  useEffect(() => {
    targetRef.current = currentTarget;
  }, [currentTarget]);

  useEffect(() => {
    if (!targeting) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelTargeting();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [cancelTargeting, targeting]);

  const handlePointerMove = useCallback(
    (event: FederatedPointerEvent) => {
      if (!targeting || event.pointerId !== targeting.pointerId) {
        return;
      }
      updateTargeting({ x: event.global.x, y: event.global.y });
    },
    [targeting, updateTargeting]
  );

  const handleBoardPointerDown = useCallback(
    (event: FederatedPointerEvent) => {
      if (!targeting) {
        return;
      }
      if (event.button === 2 || (!currentTarget && event.target === event.currentTarget)) {
        event.preventDefault();
        cancelTargeting();
        event.stopPropagation();
      }
    },
    [cancelTargeting, currentTarget, targeting]
  );

  const handlePointerUp = useCallback(
    (event: FederatedPointerEvent) => {
      if (!targeting || event.pointerId !== targeting.pointerId) {
        return;
      }
      const action: TargetingState | undefined = targeting;
      const target = targetRef.current;
      cancelTargeting();
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
    [cancelTargeting, onAttack, onCastSpell, setSelected, targeting]
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
      setCurrentTargetPoint(null);
      event.stopPropagation();
    },
    [canAttack, setCurrentTarget, setCurrentTargetPoint, setTargeting, targeting]
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
    (target: TargetDescriptor, event: FederatedPointerEvent) => {
      if (!targetingPredicate || !targetingPredicate(target)) {
        return;
      }
      setCurrentTarget(target);
      const display = event.currentTarget as DisplayObject | null;
      if (display) {
        const bounds = display.getBounds();
        setCurrentTargetPoint({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
      } else {
        setCurrentTargetPoint({ x: event.global.x, y: event.global.y });
      }
    },
    [setCurrentTarget, setCurrentTargetPoint, targetingPredicate]
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
        if (prev.type === 'minion' && target.type === 'minion' && prev.side === target.side && prev.entityId === target.entityId) {
          return null;
        }
        return prev;
      });
      setCurrentTargetPoint(null);
    },
    [setCurrentTarget, setCurrentTargetPoint, targetingPredicate]
  );

  const boardTopY = height * 0.2;
  const boardBottomY = height * 0.55;
  const laneWidth = width - 200;
  const laneX = (width - laneWidth) / 2;

  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';
  const opponentHero = state.players[opponentSide];
  const playerHero = state.players[playerSide];
  const boardHitArea = useMemo(() => new Rectangle(0, 0, width, height), [height, width]);

  const renderRow = useCallback(
    (side: PlayerSide, y: number) => {
      const minions = state.board[side];
      return minions.map((entity, index) => {
        const x = laneX + index * (MINION_WIDTH + 20);
        const isFriendly = side === playerSide;
        const canAttackThisMinion = isFriendly && canAttack(entity);
        const targetDescriptor: TargetDescriptor = { type: 'minion', side, entityId: entity.instanceId };

        const canBeSpellTarget = targetingPredicate
          ? targetingPredicate(targetDescriptor)
          : false;
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

        return (
          <pixiContainer
            key={entity.instanceId}
            x={x}
            y={y}
            interactive={
              isFriendly
                ? canAttackThisMinion || Boolean(targetingPredicate && canBeSpellTarget)
                : Boolean(targetingPredicate && canBeSpellTarget)
            }
            cursor={
              isFriendly && canAttackThisMinion
                ? 'pointer'
                : targetingPredicate && canBeSpellTarget
                  ? 'pointer'
                  : undefined
            }
            onPointerDown={handleDown}
            onPointerOver={
              targetingPredicate && canBeSpellTarget
                ? (event) => handleTargetOver(targetDescriptor, event)
                : undefined
            }
            onPointerOut={
              targetingPredicate && canBeSpellTarget
                ? () => handleTargetOut(targetDescriptor)
                : undefined
            }
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
            <pixiGraphics
              draw={(g) => {
                g.clear();
                g.beginFill(0x000000, 0.35);
                g.drawRoundedRect(
                  MINION_WIDTH * 0.12,
                  MINION_HEIGHT * 0.62,
                  MINION_WIDTH * 0.76,
                  MINION_HEIGHT * 0.22,
                  12
                );
                g.endFill();
              }}
            />
            <pixiText text={entity.card.name} x={8} y={12} style={{ fill: 0xffffff, fontSize: 14 }} />
            <pixiText
              text={`${entity.attack}`}
              x={8}
              y={MINION_HEIGHT - 28}
              style={{ fill: 0xffd166, fontSize: 18 }}
            />
            <pixiText
              text={`${entity.health}`}
              x={MINION_WIDTH - 36}
              y={MINION_HEIGHT - 28}
              style={{ fill: 0xff6b6b, fontSize: 18 }}
            />
            {isFriendly ? (
              <pixiText
                text={`⚔ ${entity.attacksRemaining}`}
                x={MINION_WIDTH / 2 - 18}
                y={MINION_HEIGHT - 52}
                style={{ fill: 0xffffff, fontSize: 14 }}
              />
            ) : null}
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
      playerSide,
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

  return (
    <pixiContainer
      ref={boardRef}
      eventMode="static"
      hitArea={boardHitArea}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerDown={handleBoardPointerDown}
      cursor={
        targeting
          ? currentTarget
            ? 'pointer'
            : 'not-allowed'
          : undefined
      }
    >
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
        interactive={
          Boolean(
            targetingPredicate && targetingPredicate({ type: 'hero', side: opponentSide })
          )
        }
        cursor={
          targetingPredicate && targetingPredicate({ type: 'hero', side: opponentSide })
            ? 'pointer'
            : undefined
        }
        onPointerOver={(event) => handleTargetOver({ type: 'hero', side: opponentSide }, event)}
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
        <pixiText text={`HP ${opponentHero.hero.hp}`} x={-36} y={-12} style={{ fill: 0xffffff, fontSize: 18 }} />
      </pixiContainer>
      <pixiContainer
        x={40}
        y={boardBottomY + MINION_HEIGHT - 20}
        interactive={
          Boolean(
            targetingPredicate && targetingPredicate({ type: 'hero', side: playerSide })
          )
        }
        cursor={
          targetingPredicate && targetingPredicate({ type: 'hero', side: playerSide })
            ? 'pointer'
            : undefined
        }
        onPointerOver={(event) => handleTargetOver({ type: 'hero', side: playerSide }, event)}
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
        <pixiText text={`HP ${playerHero.hero.hp}`} x={-36} y={-12} style={{ fill: 0xffffff, fontSize: 18 }} />
      </pixiContainer>
      {renderRow(opponentSide, boardTopY)}
      {renderRow(playerSide, boardBottomY)}
    </pixiContainer>
  );
}
