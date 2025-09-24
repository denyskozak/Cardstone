import type {
  CardInHand,
  GameState,
  MinionEntity,
  PlayerSide,
  TargetDescriptor
} from '@cardstone/shared/types';
import type { FederatedPointerEvent } from 'pixi.js';
import { Container, DisplayObject, Point } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef } from 'react';
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
const MINION_HEIGHT = 100;

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
  const setSelected = useUiStore((s) => s.setSelected);
  const targetRef = useRef<TargetDescriptor | null>(null);

  useEffect(() => {
    targetRef.current = currentTarget;
  }, [currentTarget]);

  const toLocal = useCallback((point: Point) => {
    const container = boardRef.current;
    if (!container) {
      return { x: point.x, y: point.y };
    }
    const local = container.toLocal(point);
    return { x: local.x, y: local.y };
  }, []);

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

  const handleTargetOver = useCallback(
    (target: TargetDescriptor) => {
      if (!targeting) {
        return;
      }
      const source = targeting.source;
      if (!isValidTarget(source, target, playerSide)) {
        return;
      }
      setCurrentTarget(target);
    },
    [playerSide, setCurrentTarget, targeting]
  );

  const handleTargetOut = useCallback(
    (target: TargetDescriptor) => {
      if (!targeting) {
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
    },
    [setCurrentTarget, targeting]
  );

  const boardTopY = height * 0.2;
  const boardBottomY = height * 0.55;
  const laneWidth = width - 200;
  const laneX = (width - laneWidth) / 2;

  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';
  const opponentHero = state.players[opponentSide];
  const playerHero = state.players[playerSide];

  const renderRow = useCallback(
    (side: PlayerSide, y: number) => {
      const minions = state.board[side];
      return minions.map((entity, index) => {
        const x = laneX + index * (MINION_WIDTH + 20);
        const isFriendly = side === playerSide;
        const canAttackThisMinion = isFriendly && canAttack(entity);
        const targetDescriptor: TargetDescriptor = { type: 'minion', side, entityId: entity.instanceId };

        const canBeSpellTarget = targeting
          ? isValidTarget(targeting.source, targetDescriptor, playerSide)
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
                ? canAttackThisMinion || Boolean(targeting && canBeSpellTarget)
                : Boolean(targeting && canBeSpellTarget)
            }
            cursor={
              isFriendly && canAttackThisMinion
                ? 'pointer'
                : targeting && canBeSpellTarget
                  ? 'pointer'
                  : undefined
            }
            onPointerDown={handleDown}
            onPointerOver={targeting && canBeSpellTarget ? () => handleTargetOver(targetDescriptor) : undefined}
            onPointerOut={targeting && canBeSpellTarget ? () => handleTargetOut(targetDescriptor) : undefined}
          >
            <pixiGraphics
              draw={(g) => {
                g.clear();
                g.beginFill(fillColor, isFriendly && !canAttackThisMinion ? 0.6 : 0.85);
                g.drawRoundedRect(0, 0, MINION_WIDTH, MINION_HEIGHT, 12);
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
      targeting
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

  const attackIndicator = targeting ? (
    <pixiGraphics
      key="attack-indicator"
      draw={(g) => {
        g.clear();
        g.lineStyle(4, 0xffeaa7, 0.95);
        const originLocal = toLocal(new Point(targeting.origin.x, targeting.origin.y));
        const currentLocal = toLocal(new Point(targeting.current.x, targeting.current.y));
        g.moveTo(originLocal.x, originLocal.y);
        g.lineTo(currentLocal.x, currentLocal.y);
        g.beginFill(0xff7675, 0.9);
        g.drawCircle(currentLocal.x, currentLocal.y, 8);
        g.endFill();
      }}
    />
  ) : null;

  return (
    <pixiContainer
      ref={boardRef}
      eventMode="static"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
          Boolean(targeting && isValidTarget(targeting.source, { type: 'hero', side: opponentSide }, playerSide))
        }
        cursor={
          targeting && isValidTarget(targeting.source, { type: 'hero', side: opponentSide }, playerSide)
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
        <pixiText text={`HP ${opponentHero.hero.hp}`} x={-36} y={-12} style={{ fill: 0xffffff, fontSize: 18 }} />
      </pixiContainer>
      <pixiContainer
        x={40}
        y={boardBottomY + MINION_HEIGHT - 20}
        interactive={
          Boolean(targeting && isValidTarget(targeting.source, { type: 'hero', side: playerSide }, playerSide))
        }
        cursor={
          targeting && isValidTarget(targeting.source, { type: 'hero', side: playerSide }, playerSide)
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
        <pixiText text={`HP ${playerHero.hero.hp}`} x={-36} y={-12} style={{ fill: 0xffffff, fontSize: 18 }} />
      </pixiContainer>
      {renderRow(opponentSide, boardTopY)}
      {renderRow(playerSide, boardBottomY)}
      {attackIndicator}
    </pixiContainer>
  );
}

function isValidTarget(source: TargetingState['source'], target: TargetDescriptor, playerSide: PlayerSide): boolean {
  if (source.kind === 'minion') {
    if (target.type === 'hero') {
      return target.side !== playerSide;
    }
    return target.side !== playerSide;
  }

  const effect = source.card.card.effect;
  switch (effect) {
    case 'Firebolt':
      return target.side !== playerSide;
    case 'Heal':
      return target.side === playerSide;
    default:
      return false;
  }
}
