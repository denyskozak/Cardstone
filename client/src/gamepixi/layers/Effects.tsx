import type {
  GameState,
  HeroState,
  MinionEntity,
  PlayerSide,
  TargetDescriptor
} from '@cardstone/shared/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import TargetingArrow from '../effects/TargetingArrow';
import { computeBoardLayout } from '../layout';
import useMiniTicker from '../hooks/useMiniTicker';
import { useUiStore } from '../../state/store';

interface EffectsProps {
  state: GameState;
  playerSide: PlayerSide;
  width: number;
  height: number;
}

interface AttackAnimation {
  key: string;
  attackerId: string;
  side: PlayerSide;
  target: TargetDescriptor;
  origin: { x: number; y: number };
  targetPoint: { x: number; y: number };
  elapsed: number;
  duration: number;
}

interface DamageSummary {
  damaged: string[];
  destroyed: string[];
  heroDamaged: boolean;
}

const ATTACK_DURATION = 420;
const ATTACK_ARC_HEIGHT = 36;
const ATTACK_LUNGE_SCALE = 0.08;
const SIDES: PlayerSide[] = ['A', 'B'];

export default function Effects({ state, playerSide, width, height }: EffectsProps) {
  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';
  const player = state.players[playerSide];
  const opponent = state.players[opponentSide];
  const setMinionAnimation = useUiStore((s) => s.setMinionAnimation);
  const clearMinionAnimation = useUiStore((s) => s.clearMinionAnimation);
  const resetMinionAnimations = useUiStore((s) => s.resetMinionAnimations);
  const consumeLocalAttackQueue = useUiStore((s) => s.consumeLocalAttackQueue);
  const localAttackQueueVersion = useUiStore((s) => s.localAttackQueueVersion);

  const layout = useMemo(
    () => computeBoardLayout(state, playerSide, width, height),
    [state, playerSide, width, height]
  );

  const [animations, setAnimations] = useState<AttackAnimation[]>([]);
  const prevStateRef = useRef<GameState | null>(null);
  const prevLayoutRef = useRef<ReturnType<typeof computeBoardLayout> | null>(null);

  useEffect(() => {
    return () => {
      resetMinionAnimations();
      setAnimations([]);
      prevStateRef.current = null;
      prevLayoutRef.current = null;
    };
  }, [resetMinionAnimations]);

  useEffect(() => {
    const previous = prevStateRef.current;
    const previousLayout = prevLayoutRef.current;

    if (!previous) {
      prevStateRef.current = state;
      prevLayoutRef.current = layout;
      return;
    }

    if (previous.seq >= state.seq) {
      prevStateRef.current = state;
      prevLayoutRef.current = layout;
      return;
    }

    const attackEvents = detectAttackEvents(previous, state);
    if (attackEvents.length === 0) {
      prevStateRef.current = state;
      prevLayoutRef.current = layout;
      return;
    }

    const busyAttackers = new Set(attackEvents.map((event) => event.attackerId));

    setAnimations((current) => {
      const survivors: AttackAnimation[] = [];
      current.forEach((animation) => {
        if (busyAttackers.has(animation.attackerId)) {
          clearMinionAnimation(animation.attackerId);
        } else {
          survivors.push(animation);
        }
      });

      attackEvents.forEach((event, index) => {
        const origin =
          layout.minions[event.side]?.[event.attackerId] ??
          previousLayout?.minions[event.side]?.[event.attackerId];
        if (!origin) {
          return;
        }

        const targetPoint = resolveTargetPoint(event.target, layout, previousLayout);
        if (!targetPoint) {
          return;
        }

        const key = `${state.seq}:${event.attackerId}:${index}`;

        setMinionAnimation(event.attackerId, {
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
          scale: 1,
          zIndex: 2000
        });

        survivors.push({
          key,
          attackerId: event.attackerId,
          side: event.side,
          target: event.target,
          origin,
          targetPoint,
          elapsed: 0,
          duration: ATTACK_DURATION
        });
      });
      return survivors;
    });
    prevStateRef.current = state;
    prevLayoutRef.current = layout;
  }, [clearMinionAnimation, layout, setMinionAnimation, state]);

  useEffect(() => {
    if (!localAttackQueueVersion) {
      return;
    }
    const localEvents = consumeLocalAttackQueue();
    if (localEvents.length === 0) {
      return;
    }
    const previousLayout = prevLayoutRef.current;
    setAnimations((current) => {
      const survivors: AttackAnimation[] = [];
      const busyAttackers = new Set(localEvents.map((event) => event.attackerId));
      current.forEach((animation) => {
        if (busyAttackers.has(animation.attackerId)) {
          clearMinionAnimation(animation.attackerId);
        } else {
          survivors.push(animation);
        }
      });
      localEvents.forEach((event, index) => {
        const origin = layout.minions[event.side]?.[event.attackerId] ??
          previousLayout?.minions[event.side]?.[event.attackerId];
        if (!origin) {
          return;
        }
        const targetPoint = resolveTargetPoint(event.target, layout, previousLayout);
        if (!targetPoint) {
          return;
        }
        const key = `local:${localAttackQueueVersion}:${event.attackerId}:${index}`;
        setMinionAnimation(event.attackerId, {
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
          scale: 1,
          zIndex: 2000
        });
        survivors.push({
          key,
          attackerId: event.attackerId,
          side: event.side,
          target: event.target,
          origin,
          targetPoint,
          elapsed: 0,
          duration: ATTACK_DURATION
        });
      });
      return survivors;
    });
  }, [
    clearMinionAnimation,
    consumeLocalAttackQueue,
    layout,
    localAttackQueueVersion,
    setMinionAnimation
  ]);

  useMiniTicker(
    (deltaMS) => {
      setAnimations((current) => {
        if (current.length === 0) {
          return current;
        }
        const next: AttackAnimation[] = [];
        current.forEach((animation) => {
          const elapsed = Math.min(animation.elapsed + deltaMS, animation.duration);
          const progress = elapsed / animation.duration;
          const frame = computeAttackFrame(animation, progress);

          setMinionAnimation(animation.attackerId, {
            offsetX: frame.x - animation.origin.x,
            offsetY: frame.y - animation.origin.y,
            rotation: 0,
            scale: frame.scale,
            zIndex: 2000
          });

          if (elapsed < animation.duration) {
            next.push({ ...animation, elapsed });
          } else {
            clearMinionAnimation(animation.attackerId);
          }
        });
        return next;
      });
    },
    animations.length > 0
  );

  return (
    <pixiContainer>
      <TargetingArrow />
      <pixiText
        text={`Mana ${player.mana.current}/${player.mana.max}`}
        x={width - 220}
        y={height - 220}
        style={{ fill: 0x74b9ff, fontSize: 24 }}
      />
      {player.mana.temporary ? (
        <pixiText
          text={`+${player.mana.temporary} temporary`}
          x={width - 220}
          y={height - 190}
          style={{ fill: 0xffd166, fontSize: 16 }}
        />
      ) : null}
      <pixiText
        text={`Opponent Hand: ${opponent.hand.length}`}
        x={width - 260}
        y={80}
        style={{ fill: 0xffffff, fontSize: 18 }}
      />
    </pixiContainer>
  );
}

function computeAttackFrame(animation: AttackAnimation, progress: number) {
  const clampProgress = Math.max(0, Math.min(1, progress));
  const forward = Math.min(clampProgress * 2, 1);
  const backward = clampProgress <= 0.5 ? 0 : (clampProgress - 0.5) * 2;

  let x = animation.origin.x;
  let y = animation.origin.y;
  let scale = 1;

  if (clampProgress <= 0.5) {
    const eased = easeOutCubic(forward);
    x = lerp(animation.origin.x, animation.targetPoint.x, eased);
    y = lerp(animation.origin.y, animation.targetPoint.y, eased);
    const lift = Math.sin(eased * Math.PI) * ATTACK_ARC_HEIGHT;
    y -= lift;
    scale = 1 + Math.sin(eased * Math.PI) * ATTACK_LUNGE_SCALE;
  } else {
    const eased = easeInCubic(backward);
    x = lerp(animation.targetPoint.x, animation.origin.x, eased);
    y = lerp(animation.targetPoint.y, animation.origin.y, eased);
    scale = 1 + Math.sin((1 - eased) * Math.PI) * (ATTACK_LUNGE_SCALE * 0.6);
  }

  return { x, y, scale };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number) {
  return t * t * t;
}

function resolveTargetPoint(
  target: TargetDescriptor,
  layout: ReturnType<typeof computeBoardLayout>,
  previousLayout: ReturnType<typeof computeBoardLayout> | null
) {
  if (target.type === 'hero') {
    return layout.heroes[target.side];
  }
  return (
    layout.minions[target.side]?.[target.entityId] ??
    previousLayout?.minions[target.side]?.[target.entityId] ??
    null
  );
}

function detectAttackEvents(previous: GameState, next: GameState) {
  const events: { side: PlayerSide; attackerId: string; target: TargetDescriptor }[] = [];

  const damageSummaries: Record<PlayerSide, DamageSummary> = {
    A: summarizeDamage(previous.board.A, next.board.A, previous.players.A.hero, next.players.A.hero),
    B: summarizeDamage(previous.board.B, next.board.B, previous.players.B.hero, next.players.B.hero)
  };

  const consumed = {
    A: { damaged: new Set<string>(), destroyed: new Set<string>(), hero: false },
    B: { damaged: new Set<string>(), destroyed: new Set<string>(), hero: false }
  };

  SIDES.forEach((side) => {
    const nextMap = new Map(next.board[side].map((minion) => [minion.instanceId, minion]));
    previous.board[side].forEach((minion) => {
      const updated = nextMap.get(minion.instanceId);
      if (!updated) {
        return;
      }
      if (updated.attacksRemaining < minion.attacksRemaining) {
        const opponentSide: PlayerSide = side === 'A' ? 'B' : 'A';
        const summary = damageSummaries[opponentSide];
        const record = consumed[opponentSide];

        let target: TargetDescriptor | null = null;
        const destroyed = summary.destroyed.find((id) => !record.destroyed.has(id));
        if (destroyed) {
          record.destroyed.add(destroyed);
          target = { type: 'minion', side: opponentSide, entityId: destroyed };
        } else {
          const damaged = summary.damaged.find((id) => !record.damaged.has(id));
          if (damaged) {
            record.damaged.add(damaged);
            target = { type: 'minion', side: opponentSide, entityId: damaged };
          } else if (summary.heroDamaged && !record.hero) {
            record.hero = true;
            target = { type: 'hero', side: opponentSide };
          }
        }

        if (!target) {
          target = { type: 'hero', side: opponentSide };
        }

        events.push({ side, attackerId: minion.instanceId, target });
      }
    });
  });

  return events;
}

function summarizeDamage(
  previous: MinionEntity[],
  next: MinionEntity[],
  previousHero: HeroState,
  nextHero: HeroState
): DamageSummary {
  const summary: DamageSummary = {
    damaged: [],
    destroyed: [],
    heroDamaged: nextHero.hp < previousHero.hp
  };

  const nextMap = new Map(next.map((minion) => [minion.instanceId, minion]));
  previous.forEach((minion) => {
    const updated = nextMap.get(minion.instanceId);
    if (!updated) {
      summary.destroyed.push(minion.instanceId);
    } else if (updated.health < minion.health) {
      summary.damaged.push(minion.instanceId);
    }
  });

  return summary;
}
