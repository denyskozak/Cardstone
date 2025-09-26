import type {
  CardInHand,
  GameState,
  MinionEntity,
  PlayerSide,
  TargetDescriptor
} from '@cardstone/shared/types';
import { getTargetingPredicate } from '@cardstone/shared/targeting';
import { useTick } from '@pixi/react';
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

const MINION_WIDTH = 120;
const MINION_HEIGHT = 140;
const MINION_ART_INSET_X = 2;
const MINION_ART_INSET_Y = 6;

const WINDUP_DURATION = 110;
const LUNGE_DURATION = 190;
const HITSTOP_DURATION = 90;
const RECOIL_DURATION = 230;
const PARTICLE_LIFETIME = 360;
const DAMAGE_NUMBER_LIFETIME = 900;
const FLASH_DECAY = 280;
const SHAKE_DURATION = 240;

const DELTA_MS = 1000 / 60;

type PlayerLayoutMap = Record<
  string,
  {
    x: number;
    y: number;
    center: { x: number; y: number };
    side: PlayerSide;
  }
>;

interface AttackAnimationState {
  attackerId: string;
  attackerSide: PlayerSide;
  target: TargetDescriptor;
  phase: 'windup' | 'lunge' | 'hitstop' | 'recoil';
  phaseTime: number;
  elapsed: number;
  origin: { x: number; y: number };
  center: { x: number; y: number };
  direction: { x: number; y: number };
  angle: number;
  windupDistance: number;
  lungeDistance: number;
  offset: { x: number; y: number };
  rotation: number;
  scale: number;
  targetPoint: { x: number; y: number };
  targetKey: string;
  damageAmount: number;
  impactTriggered: boolean;
}

interface DamageNumberState {
  id: number;
  amount: number;
  position: { x: number; y: number };
  elapsed: number;
}

interface ImpactParticleState {
  id: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  elapsed: number;
  rotation: number;
  length: number;
}

interface AttackEventCandidate {
  attackerId: string;
  side: PlayerSide;
  target: TargetDescriptor;
  damage: number;
}

const EASING = {
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

function vecLength(v: { x: number; y: number }) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v: { x: number; y: number }) {
  const len = vecLength(v) || 1;
  return { x: v.x / len, y: v.y / len };
}

function createLayoutMap(
  state: GameState,
  playerSide: PlayerSide,
  laneX: number,
  boardTopY: number,
  boardBottomY: number
): PlayerLayoutMap {
  const layout: PlayerLayoutMap = {};
  (['A', 'B'] as PlayerSide[]).forEach((side) => {
    const rowY = side === playerSide ? boardBottomY : boardTopY;
    const minions = state.board[side];
    minions.forEach((entity, index) => {
      const x = laneX + index * (MINION_WIDTH + 20);
      layout[entity.instanceId] = {
        x,
        y: rowY,
        side,
        center: {
          x: x + MINION_WIDTH / 2,
          y: rowY + MINION_HEIGHT / 2
        }
      };
    });
  });
  return layout;
}

const targetKey = (target: TargetDescriptor) =>
  target.type === 'minion' ? `minion:${target.entityId}` : `hero:${target.side}`;

function detectAttackEvents(prev: GameState, next: GameState): AttackEventCandidate[] {
  const events: AttackEventCandidate[] = [];
  (['A', 'B'] as PlayerSide[]).forEach((side) => {
    const prevBoard = prev.board[side];
    const nextBoard = next.board[side];
    prevBoard.forEach((prevMinion) => {
      const nextMinion = nextBoard.find((entity) => entity.instanceId === prevMinion.instanceId);
      const attackerDied = !nextMinion;
      const lostAttack = nextMinion ? nextMinion.attacksRemaining < prevMinion.attacksRemaining : false;
      if (!attackerDied && !lostAttack) {
        return;
      }
      const enemySide: PlayerSide = side === 'A' ? 'B' : 'A';
      const prevEnemyBoard = prev.board[enemySide];
      const nextEnemyBoard = next.board[enemySide];

      const defeatedEnemy = prevEnemyBoard.find(
        (enemy) => !nextEnemyBoard.some((e) => e.instanceId === enemy.instanceId)
      );
      if (defeatedEnemy) {
        events.push({
          attackerId: prevMinion.instanceId,
          side,
          target: { type: 'minion', side: enemySide, entityId: defeatedEnemy.instanceId },
          damage: defeatedEnemy.health
        });
        return;
      }
      const damagedEnemy = prevEnemyBoard.find((enemy) => {
        const after = nextEnemyBoard.find((e) => e.instanceId === enemy.instanceId);
        return after && after.health < enemy.health;
      });
      if (damagedEnemy) {
        const after = nextEnemyBoard.find((e) => e.instanceId === damagedEnemy.instanceId);
        events.push({
          attackerId: prevMinion.instanceId,
          side,
          target: { type: 'minion', side: enemySide, entityId: damagedEnemy.instanceId },
          damage: after ? damagedEnemy.health - after.health : prevMinion.attack
        });
        return;
      }
      const prevHeroHp = prev.players[enemySide].hero.hp;
      const nextHeroHp = next.players[enemySide].hero.hp;
      if (nextHeroHp < prevHeroHp) {
        events.push({
          attackerId: prevMinion.instanceId,
          side,
          target: { type: 'hero', side: enemySide },
          damage: prevHeroHp - nextHeroHp
        });
      }
    });
  });
  return events;
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
  const targetRef = useRef<TargetDescriptor | null>(null);
  const [attackAnimations, setAttackAnimations] = useState<Record<string, AttackAnimationState>>({});
  const animationRef = useRef<Record<string, AttackAnimationState>>(attackAnimations);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumberState[]>([]);
  const damageRef = useRef<DamageNumberState[]>(damageNumbers);
  const [particles, setParticles] = useState<ImpactParticleState[]>([]);
  const particlesRef = useRef<ImpactParticleState[]>(particles);
  const [hitFlashes, setHitFlashes] = useState<Record<string, number>>({});
  const hitFlashesRef = useRef<Record<string, number>>(hitFlashes);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const shakeOffsetRef = useRef({ x: 0, y: 0 });
  const shakeStateRef = useRef({
    time: SHAKE_DURATION,
    duration: 0,
    magnitude: 0,
    seedX: Math.random() * Math.PI * 2,
    seedY: Math.random() * Math.PI * 2
  });
  const recentAttacksRef = useRef<Array<{ signature: string; timestamp: number }>>([]);

  useEffect(() => {
    animationRef.current = attackAnimations;
  }, [attackAnimations]);

  useEffect(() => {
    damageRef.current = damageNumbers;
  }, [damageNumbers]);

  useEffect(() => {
    particlesRef.current = particles;
  }, [particles]);

  useEffect(() => {
    hitFlashesRef.current = hitFlashes;
  }, [hitFlashes]);

  const setShake = useCallback((value: { x: number; y: number }) => {
    shakeOffsetRef.current = value;
    setShakeOffset(value);
  }, []);

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
        const attackerSide = (['A', 'B'] as PlayerSide[]).find((side) =>
          state.board[side].some((entity) => entity.instanceId === action.source.entityId)
        );
        if (attackerSide) {
          const minion = state.board[attackerSide].find(
            (entity) => entity.instanceId === action.source.entityId
          );
          triggerAttackAnimation(
            action.source.entityId,
            attackerSide,
            target,
            minion?.attack ?? 0
          );
        }
        onAttack(action.source.entityId, target);
      } else if (action.source.kind === 'spell') {
        setSelected(undefined);
        onCastSpell(action.source.card, target);
      }
    },
    [
      onAttack,
      onCastSpell,
      setCurrentTarget,
      setSelected,
      setTargeting,
      state.board,
      targeting,
      triggerAttackAnimation
    ]
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

  const boardTopY = height * 0.2;
  const boardBottomY = height * 0.55;
  const laneWidth = width - 200;
  const laneX = (width - laneWidth) / 2;

  const minionLayout = useMemo(
    () => createLayoutMap(state, playerSide, laneX, boardTopY, boardBottomY),
    [boardBottomY, boardTopY, laneX, playerSide, state]
  );

  const heroCenters = useMemo(
    () => ({
      [playerSide]: { x: 40, y: boardBottomY + MINION_HEIGHT - 20 },
      [playerSide === 'A' ? 'B' : 'A']: { x: 40, y: boardTopY - 80 }
    }),
    [boardBottomY, boardTopY, playerSide]
  );

  const queueShake = useCallback((magnitude: number, duration = SHAKE_DURATION) => {
    shakeStateRef.current = {
      time: 0,
      duration,
      magnitude,
      seedX: Math.random() * Math.PI * 2,
      seedY: Math.random() * Math.PI * 2
    };
  }, []);

  const spawnImpact = useCallback(
    (position: { x: number; y: number }, amount: number, key: string) => {
      setDamageNumbers((prev) => [
        ...prev,
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          amount: Math.round(amount),
          position,
          elapsed: 0
        }
      ]);
      setParticles((prev) => {
        const count = 10;
        const base = Date.now();
        const created: ImpactParticleState[] = Array.from({ length: count }).map((_, idx) => {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.24 + Math.random() * 0.32;
          return {
            id: base + idx,
            position: { ...position },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            elapsed: 0,
            rotation: angle,
            length: 10 + Math.random() * 10
          };
        });
        return [...prev, ...created];
      });
      setHitFlashes((prev) => ({
        ...prev,
        [key]: Math.max(prev[key] ?? 0, 1)
      }));
      queueShake(6, SHAKE_DURATION);
    },
    [queueShake]
  );

  const triggerAttackAnimation = useCallback(
    (
      attackerId: string,
      attackerSide: PlayerSide,
      target: TargetDescriptor,
      damageAmount: number,
      layoutSource?: PlayerLayoutMap
    ) => {
      const layout = layoutSource ?? minionLayout;
      const info = layout[attackerId];
      if (!info) {
        return;
      }
      const attackerCenter = info.center;
      let impactPoint: { x: number; y: number } | null = null;
      if (target.type === 'minion') {
        const targetInfo = layout[target.entityId] ?? minionLayout[target.entityId];
        if (targetInfo) {
          impactPoint = targetInfo.center;
        }
      } else {
        impactPoint = heroCenters[target.side] ?? null;
      }
      if (!impactPoint) {
        return;
      }
      const direction = normalize({
        x: impactPoint.x - attackerCenter.x,
        y: impactPoint.y - attackerCenter.y
      });
      const angle = Math.atan2(direction.y, direction.x);
      const distance = Math.max(
        30,
        Math.min(
          120,
          vecLength({ x: impactPoint.x - attackerCenter.x, y: impactPoint.y - attackerCenter.y }) - 36
        )
      );
      const signature = `${attackerId}:${targetKey(target)}`;
      const timestamp = Date.now();
      recentAttacksRef.current = recentAttacksRef.current
        .filter((entry) => timestamp - entry.timestamp < 800)
        .concat({ signature, timestamp });
      setAttackAnimations((prev) => ({
        ...prev,
        [attackerId]: {
          attackerId,
          attackerSide,
          target,
          phase: 'windup',
          phaseTime: 0,
          elapsed: 0,
          origin: { x: info.x, y: info.y },
          center: attackerCenter,
          direction,
          angle,
          windupDistance: 18,
          lungeDistance: distance,
          offset: { x: 0, y: 0 },
          rotation: 0,
          scale: 1,
          targetPoint: impactPoint,
          targetKey: targetKey(target),
          damageAmount,
          impactTriggered: false
        }
      }));
    },
    [heroCenters, minionLayout]
  );

  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';
  const opponentHero = state.players[opponentSide];
  const playerHero = state.players[playerSide];
  const boardHitArea = useMemo(() => new Rectangle(0, 0, width, height), [height, width]);

  const prevStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    targetRef.current = currentTarget;
  }, [currentTarget]);

  useEffect(() => {
    const prevState = prevStateRef.current;
    if (prevState && prevState.seq !== state.seq) {
      const events = detectAttackEvents(prevState, state);
      if (events.length) {
        const prevLayout = createLayoutMap(prevState, playerSide, laneX, boardTopY, boardBottomY);
        const now = Date.now();
        events.forEach((event) => {
          const signature = `${event.attackerId}:${targetKey(event.target)}`;
          const isRecent = recentAttacksRef.current.some(
            (entry) => entry.signature === signature && now - entry.timestamp < 600
          );
          if (!isRecent) {
            triggerAttackAnimation(
              event.attackerId,
              event.side,
              event.target,
              event.damage,
              prevLayout
            );
          }
        });
      }
    }
    prevStateRef.current = state;
  }, [boardBottomY, boardTopY, laneX, playerSide, state, triggerAttackAnimation]);

  useTick((delta) => {
    const deltaMs = delta * DELTA_MS;
    const animations = animationRef.current;
    if (Object.keys(animations).length) {
      const updated: Record<string, AttackAnimationState> = {};
      Object.values(animations).forEach((anim) => {
        let next: AttackAnimationState = {
          ...anim,
          phaseTime: anim.phaseTime + deltaMs,
          elapsed: anim.elapsed + deltaMs
        };
        let keep = true;
        if (next.phase === 'windup') {
          const progress = Math.min(1, next.phaseTime / WINDUP_DURATION);
          const eased = EASING.easeOutCubic(progress);
          next = {
            ...next,
            offset: {
              x: -next.direction.x * next.windupDistance * eased,
              y: -next.direction.y * next.windupDistance * eased
            },
            rotation: -0.12 * Math.sin(next.angle) * eased,
            scale: 1 - 0.04 * eased
          };
          if (next.phaseTime >= WINDUP_DURATION) {
            next = { ...next, phase: 'lunge', phaseTime: 0 };
          }
        } else if (next.phase === 'lunge') {
          const progress = Math.min(1, next.phaseTime / LUNGE_DURATION);
          const eased = EASING.easeOutBack(progress);
          next = {
            ...next,
            offset: {
              x: next.direction.x * next.lungeDistance * eased,
              y: next.direction.y * next.lungeDistance * eased
            },
            rotation: Math.sin(next.angle) * 0.18 * eased,
            scale: 1 + 0.08 * eased
          };
          if (next.phaseTime >= LUNGE_DURATION) {
            next = { ...next, phase: 'hitstop', phaseTime: 0 };
          }
        } else if (next.phase === 'hitstop') {
          next = {
            ...next,
            offset: {
              x: next.direction.x * next.lungeDistance,
              y: next.direction.y * next.lungeDistance
            },
            rotation: Math.sin(next.angle) * 0.18,
            scale: 1.08
          };
          if (!next.impactTriggered) {
            spawnImpact(next.targetPoint, next.damageAmount, next.targetKey);
            next = { ...next, impactTriggered: true };
          }
          if (next.phaseTime >= HITSTOP_DURATION) {
            next = { ...next, phase: 'recoil', phaseTime: 0 };
          }
        } else if (next.phase === 'recoil') {
          const progress = Math.min(1, next.phaseTime / RECOIL_DURATION);
          const eased = EASING.easeOutCubic(progress);
          next = {
            ...next,
            offset: {
              x: next.direction.x * next.lungeDistance * (1 - eased),
              y: next.direction.y * next.lungeDistance * (1 - eased)
            },
            rotation: Math.sin(next.angle) * 0.18 * (1 - eased),
            scale: 1 + 0.08 * (1 - eased)
          };
          if (next.phaseTime >= RECOIL_DURATION) {
            keep = false;
          }
        }
        if (keep) {
          updated[next.attackerId] = next;
        }
      });
      animationRef.current = updated;
      setAttackAnimations(updated);
    }

    if (damageRef.current.length) {
      const updated = damageRef.current
        .map((entry) => ({ ...entry, elapsed: entry.elapsed + deltaMs }))
        .filter((entry) => entry.elapsed < DAMAGE_NUMBER_LIFETIME);
      damageRef.current = updated;
      setDamageNumbers(updated);
    }

    if (particlesRef.current.length) {
      const updated = particlesRef.current
        .map((particle) => ({
          ...particle,
          elapsed: particle.elapsed + deltaMs,
          position: {
            x: particle.position.x + particle.velocity.x * deltaMs,
            y: particle.position.y + particle.velocity.y * deltaMs
          },
          velocity: {
            x: particle.velocity.x * 0.96,
            y: particle.velocity.y * 0.96 + 0.0006 * deltaMs
          }
        }))
        .filter((particle) => particle.elapsed < PARTICLE_LIFETIME);
      particlesRef.current = updated;
      setParticles(updated);
    }

    if (Object.keys(hitFlashesRef.current).length) {
      const updated: Record<string, number> = {};
      Object.entries(hitFlashesRef.current).forEach(([key, value]) => {
        const nextValue = value - deltaMs / FLASH_DECAY;
        if (nextValue > 0.02) {
          updated[key] = nextValue;
        }
      });
      hitFlashesRef.current = updated;
      setHitFlashes(updated);
    }

    const shakeState = shakeStateRef.current;
    if (shakeState.time < shakeState.duration) {
      const time = Math.min(shakeState.time + deltaMs, shakeState.duration);
      const intensity = 1 - time / shakeState.duration;
      const offsetX = Math.sin(shakeState.seedX + time * 0.18) * shakeState.magnitude * intensity;
      const offsetY = Math.cos(shakeState.seedY + time * 0.22) * shakeState.magnitude * intensity * 0.6;
      shakeStateRef.current = { ...shakeState, time };
      setShake({ x: offsetX, y: offsetY });
    } else if (shakeOffsetRef.current.x !== 0 || shakeOffsetRef.current.y !== 0) {
      setShake({ x: 0, y: 0 });
    }
  });

  const renderRow = useCallback(
    (side: PlayerSide, y: number) => {
      const minions = state.board[side];
      return minions.map((entity, index) => {
        const x = laneX + index * (MINION_WIDTH + 20);
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

        const layoutInfo = minionLayout[entity.instanceId];
        const animation = attackAnimations[entity.instanceId];
        const flash = hitFlashes[targetKey(targetDescriptor)] ?? 0;
        const offset = animation?.offset ?? { x: 0, y: 0 };
        const rotation = animation?.rotation ?? 0;
        const scale = animation?.scale ?? 1;

        return (
          <pixiContainer
            key={entity.instanceId}
            x={(layoutInfo?.x ?? x) + offset.x}
            y={(layoutInfo?.y ?? y) + offset.y}
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
                ? () => handleTargetOver(targetDescriptor)
                : undefined
            }
            onPointerOut={
              targetingPredicate && canBeSpellTarget
                ? () => handleTargetOut(targetDescriptor)
                : undefined
            }
            zIndex={animation ? 10 : 0}
          >
            <pixiContainer
              x={MINION_WIDTH / 2}
              y={MINION_HEIGHT / 2}
              pivot={{ x: MINION_WIDTH / 2, y: MINION_HEIGHT / 2 }}
              rotation={rotation}
              scale={scale}
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
              <pixiText
                text={`${entity.attack}`}
                x={MINION_WIDTH * 0.12}
                y={MINION_HEIGHT * 0.7}
                style={{ fill: 0xffffff, fontSize: 24, fontWeight: 'bold' }}
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
              {flash ? (
                <pixiGraphics
                  alpha={flash * 0.7}
                  draw={(g) => {
                    g.clear();
                    g.beginFill(0xffffff, 0.8);
                    g.drawRoundedRect(0, 0, MINION_WIDTH, MINION_HEIGHT, 18);
                    g.endFill();
                  }}
                />
              ) : null}
            </pixiContainer>
          </pixiContainer>
        );
      });
    },
    [
      attackAnimations,
      canAttack,
      currentTarget,
      handleStartAttack,
      handleTargetOut,
      handleTargetOver,
      hitFlashes,
      laneX,
      minionLayout,
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

  const opponentHeroFlash = hitFlashes[`hero:${opponentSide}`] ?? 0;
  const friendlyHeroFlash = hitFlashes[`hero:${playerSide}`] ?? 0;

  return (
    <pixiContainer
      ref={boardRef}
      eventMode="static"
      hitArea={boardHitArea}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
      onPointerCancel={handlePointerUp}
      sortableChildren
      x={shakeOffset.x}
      y={shakeOffset.y}
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
            g.beginFill(0xffffff, opponentHeroFlash * 0.6);
            g.drawCircle(0, 0, 48);
            g.endFill();
            g.beginFill(opponentTargeted ? 0xff7675 : 0xd63031, opponentTargeted ? 0.95 : 0.8);
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
            g.beginFill(0xffffff, friendlyHeroFlash * 0.6);
            g.drawCircle(0, 0, 48);
            g.endFill();
            g.beginFill(friendlyTargeted ? 0x55efc4 : 0x0984e3, friendlyTargeted ? 0.95 : 0.8);
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
      {damageNumbers.map((entry) => {
        const progress = entry.elapsed / DAMAGE_NUMBER_LIFETIME;
        const rise = 40 * EASING.easeOutCubic(progress);
        const alpha = Math.max(0, 1 - progress);
        return (
          <pixiText
            key={`damage-${entry.id}`}
            text={`-${entry.amount}`}
            x={entry.position.x}
            y={entry.position.y - rise}
            anchor={{ x: 0.5, y: 0.5 }}
            alpha={alpha}
            style={{
              fill: 0xffeaa7,
              fontSize: 32,
              fontWeight: 'bold',
              stroke: 0x000000,
              strokeThickness: 4
            }}
          />
        );
      })}
      {particles.map((particle) => {
        const progress = particle.elapsed / PARTICLE_LIFETIME;
        const alpha = Math.max(0, 1 - progress);
        return (
          <pixiGraphics
            key={`spark-${particle.id}`}
            x={particle.position.x}
            y={particle.position.y}
            rotation={particle.rotation}
            alpha={alpha}
            draw={(g) => {
              g.clear();
              g.lineStyle(2, 0xfff3a5, 1);
              g.moveTo(-particle.length / 2, 0);
              g.lineTo(particle.length / 2, 0);
              g.endFill();
            }}
          />
        );
      })}
    </pixiContainer>
  );
}
