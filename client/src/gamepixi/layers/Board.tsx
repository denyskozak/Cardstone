import type {
  GameState,
  MinionEntity,
  PlayerSide,
  TargetDescriptor
} from '@cardstone/shared/types';
import { useApplication } from '@pixi/react';
import type { FederatedPointerEvent } from 'pixi.js';
import { Container, DisplayObject, Point } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface BoardProps {
  state: GameState;
  playerSide: PlayerSide;
  width: number;
  height: number;
  onAttack: (attackerId: string, target: TargetDescriptor) => void;
  canAttack: (minion: MinionEntity) => boolean;
}

interface AttackDrag {
  attackerId: string;
  pointerId: number;
  origin: { x: number; y: number };
  current: { x: number; y: number };
}

const MINION_WIDTH = 100;
const MINION_HEIGHT = 100;

export default function Board({ state, playerSide, width, height, onAttack, canAttack }: BoardProps) {
  const { app } = useApplication();
  const boardRef = useRef<Container | null>(null);
  const [attackDrag, setAttackDrag] = useState<AttackDrag | null>(null);
  const [currentTarget, setCurrentTarget] = useState<TargetDescriptor | null>(null);
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

  useEffect(() => {
    if (!attackDrag) {
      return undefined;
    }

    const handlePointerMove = (event: FederatedPointerEvent) => {
      if (event.pointerId !== attackDrag.pointerId) {
        return;
      }
      const next = toLocal(event.global as Point);
      setAttackDrag((prev) => (prev ? { ...prev, current: next } : prev));
    };

    const finishDrag = (event: FederatedPointerEvent) => {
      if (event.pointerId !== attackDrag.pointerId) {
        return;
      }
      setAttackDrag(null);
      const target = targetRef.current;
      const attackerId = attackDrag.attackerId;
      const shouldAttack = Boolean(target);
      setCurrentTarget(null);
      if (shouldAttack && target) {
        onAttack(attackerId, target);
      }
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
  }, [app, attackDrag, onAttack, toLocal]);

  const handleStartAttack = useCallback(
    (entity: MinionEntity, event: FederatedPointerEvent) => {
      if (!canAttack(entity)) {
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
      const origin = toLocal(centerGlobal);
      const current = toLocal(event.global as Point);
      setAttackDrag({
        attackerId: entity.instanceId,
        pointerId: event.pointerId,
        origin,
        current
      });
      setCurrentTarget(null);
      event.stopPropagation();
    },
    [canAttack, toLocal]
  );

  const handleTargetOver = useCallback(
    (target: TargetDescriptor) => {
      if (!attackDrag) {
        return;
      }
      setCurrentTarget(target);
    },
    [attackDrag]
  );

  const handleTargetOut = useCallback(
    (target: TargetDescriptor) => {
      if (!attackDrag) {
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
    [attackDrag]
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

        const targetDescriptor: TargetDescriptor = { type: 'minion', side, entityId: entity.instanceId };

        return (
          <pixiContainer
            key={entity.instanceId}
            x={x}
            y={y}
            interactive={isFriendly || Boolean(attackDrag)}
            cursor={isFriendly && canAttackThisMinion ? 'pointer' : undefined}
            onPointerDown={handleDown}
            onPointerOver={!isFriendly ? () => handleTargetOver(targetDescriptor) : undefined}
            onPointerOut={!isFriendly ? () => handleTargetOut(targetDescriptor) : undefined}
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
      attackDrag,
      canAttack,
      currentTarget,
      handleStartAttack,
      handleTargetOut,
      handleTargetOver,
      laneX,
      playerSide,
      state.board
    ]
  );

  const opponentTargeted = useMemo(
    () => currentTarget?.type === 'hero' && currentTarget.side === opponentSide,
    [currentTarget, opponentSide]
  );

  const attackIndicator = attackDrag ? (
    <pixiGraphics
      key="attack-indicator"
      draw={(g) => {
        g.clear();
        g.lineStyle(4, 0xffeaa7, 0.95);
        g.moveTo(attackDrag.origin.x, attackDrag.origin.y);
        g.lineTo(attackDrag.current.x, attackDrag.current.y);
        g.beginFill(0xff7675, 0.9);
        g.drawCircle(attackDrag.current.x, attackDrag.current.y, 8);
        g.endFill();
      }}
    />
  ) : null;

  return (
    <pixiContainer ref={boardRef}>
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
        interactive={Boolean(attackDrag)}
        cursor={attackDrag ? 'pointer' : undefined}
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
      <pixiContainer x={40} y={boardBottomY + MINION_HEIGHT - 20}>
        <pixiGraphics
          draw={(g) => {
            g.clear();
            g.beginFill(0x0984e3, 0.8);
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
