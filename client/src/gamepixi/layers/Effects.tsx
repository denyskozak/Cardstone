import type {
  GameState,
  HeroState,
  MinionEntity,
  PlayerSide,
  TargetDescriptor
} from '@cardstone/shared/types';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Texture } from 'pixi.js';
import TargetingArrow from '../effects/TargetingArrow';
import { computeBoardLayout } from '../layout';
import useMiniTicker from '../hooks/useMiniTicker';
import { useUiStore } from '../../state/store';
import CardBurnEmitter from '../effects/CardBurnEmitter';

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
  damageAmount: number;
  impactEmitted?: boolean;
}

interface DamageSummaryEntry {
  id: string;
  amount: number;
}

interface DamageSummary {
  damaged: DamageSummaryEntry[];
  destroyed: DamageSummaryEntry[];
  heroDamage: number;
}

interface BurnBurst {
  key: string;
  side: PlayerSide;
}

const ATTACK_DURATION = 420;
const ATTACK_ARC_HEIGHT = 36;
const ATTACK_LUNGE_SCALE = 0.08;
const SIDES: PlayerSide[] = ['A', 'B'];
const DAMAGE_DISPLAY_DURATION = 2000;
const DAMAGE_IMPACT_THRESHOLD = 0.5;

const DAMAGE_TEXTURE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="core" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#ffe5e5" stop-opacity="0.95" />
      <stop offset="55%" stop-color="#ff4d4d" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#7a0a0a" stop-opacity="0.9" />
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#ff9a9a" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#ff9a9a" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="64" cy="64" r="58" fill="url(#glow)" />
  <circle cx="64" cy="64" r="46" fill="url(#core)" stroke="#ffb3b3" stroke-width="6" stroke-opacity="0.7" />
  <circle cx="64" cy="50" r="18" fill="#ffffff" fill-opacity="0.35" />
</svg>
`;

const DAMAGE_TEXTURE_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DAMAGE_TEXTURE_SVG)}`;

interface DamageIndicator {
  key: string;
  x: number;
  y: number;
  amount: number;
  remaining: number;
}

export default function Effects({ state, playerSide, width, height }: EffectsProps) {
  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';
  const player = state.players[playerSide];
  const opponent = state.players[opponentSide];
  const setMinionAnimation = useUiStore((s) => s.setMinionAnimation);
  const clearMinionAnimation = useUiStore((s) => s.clearMinionAnimation);
  const resetMinionAnimations = useUiStore((s) => s.resetMinionAnimations);
  const consumeLocalAttackQueue = useUiStore((s) => s.consumeLocalAttackQueue);
  const localAttackQueueVersion = useUiStore((s) => s.localAttackQueueVersion);

  const pendingLocalAttackersRef = useRef(new Map<string, number>());

  const layout = useMemo(
    () => computeBoardLayout(state, playerSide, width, height),
    [state, playerSide, width, height]
  );

  const [animations, setAnimations] = useState<AttackAnimation[]>([]);
  const prevStateRef = useRef<GameState | null>(null);
  const prevLayoutRef = useRef<ReturnType<typeof computeBoardLayout> | null>(null);
  const burnPrevStateRef = useRef<GameState | null>(null);
  const burnSequenceRef = useRef(0);
  const [burnBursts, setBurnBursts] = useState<BurnBurst[]>([]);
  const [damageIndicators, setDamageIndicators] = useState<DamageIndicator[]>([]);
  const damageSequenceRef = useRef(0);
  const damageTexture = useMemo(() => Texture.from(DAMAGE_TEXTURE_DATA_URL), []);

  useEffect(() => {
    return () => {
      resetMinionAnimations();
      setAnimations([]);
      prevStateRef.current = null;
      prevLayoutRef.current = null;
      setBurnBursts([]);
      burnPrevStateRef.current = null;
      burnSequenceRef.current = 0;
      pendingLocalAttackersRef.current.clear();
      setDamageIndicators([]);
      damageSequenceRef.current = 0;
    };
  }, [resetMinionAnimations]);

  useEffect(() => {
    const previous = burnPrevStateRef.current;
    if (!previous) {
      burnPrevStateRef.current = state;
      return;
    }
    if (previous.seq >= state.seq) {
      burnPrevStateRef.current = state;
      return;
    }
    const burnEvents = detectBurnCounts(previous, state);
    if (burnEvents.length > 0) {
      setBurnBursts((current) => {
        if (burnEvents.length === 0) {
          return current;
        }
        let sequence = burnSequenceRef.current;
        const additions: BurnBurst[] = [];
        burnEvents.forEach((event) => {
          for (let i = 0; i < event.count; i += 1) {
            additions.push({ key: `${state.seq}:${event.side}:${sequence}`, side: event.side });
            sequence += 1;
          }
        });
        if (additions.length === 0) {
          return current;
        }
        burnSequenceRef.current = sequence;
        return [...current, ...additions];
      });
    }
    burnPrevStateRef.current = state;
  }, [state]);

  const handleBurnComplete = useCallback((key: string) => {
    setBurnBursts((current) => current.filter((burst) => burst.key !== key));
  }, []);

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

    const pendingLocalAttackers = pendingLocalAttackersRef.current;
    const attackEvents = detectAttackEvents(previous, state);
    const filteredEvents = attackEvents.filter((event) => {
      const pending = pendingLocalAttackers.get(event.attackerId);
      if (pending && pending > 0) {
        if (pending === 1) {
          pendingLocalAttackers.delete(event.attackerId);
        } else {
          pendingLocalAttackers.set(event.attackerId, pending - 1);
        }
        return false;
      }
      return true;
    });

    if (filteredEvents.length === 0) {
      prevStateRef.current = state;
      prevLayoutRef.current = layout;
      return;
    }

    const busyAttackers = new Set(filteredEvents.map((event) => event.attackerId));

    setAnimations((current) => {
      const survivors: AttackAnimation[] = [];
      current.forEach((animation) => {
        if (!busyAttackers.has(animation.attackerId)) {
          survivors.push(animation);
        }
      });

      filteredEvents.forEach((event, index) => {
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
        survivors.push({
          key,
          attackerId: event.attackerId,
          side: event.side,
          target: event.target,
          origin,
          targetPoint,
          elapsed: 0,
          duration: ATTACK_DURATION,
          damageAmount: event.damage,
          impactEmitted: false
        });
      });
      return survivors;
    });
    prevStateRef.current = state;
    prevLayoutRef.current = layout;
  }, [layout, state]);

  useEffect(() => {
    if (!localAttackQueueVersion) {
      return;
    }
    const localEvents = consumeLocalAttackQueue();
    if (localEvents.length === 0) {
      return;
    }
    const previousLayout = prevLayoutRef.current;
    // Record that these attackers are already animating locally so that
    // the upcoming authoritative server update does not schedule a
    // duplicate strike animation for the same attacker.
    localEvents.forEach((event) => {
      const pending = pendingLocalAttackersRef.current.get(event.attackerId) ?? 0;
      pendingLocalAttackersRef.current.set(event.attackerId, pending + 1);
    });
    setAnimations((current) => {
      const survivors: AttackAnimation[] = [];
      const busyAttackers = new Set(localEvents.map((event) => event.attackerId));
      current.forEach((animation) => {
        if (!busyAttackers.has(animation.attackerId)) {
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
        survivors.push({
          key,
          attackerId: event.attackerId,
          side: event.side,
          target: event.target,
          origin,
          targetPoint,
          elapsed: 0,
          duration: ATTACK_DURATION,
          damageAmount: 0,
          impactEmitted: false
        });
      });
      return survivors;
    });
  }, [consumeLocalAttackQueue, layout, localAttackQueueVersion]);

  useMiniTicker(
    (deltaMS) => {
      setAnimations((current) => {
        if (current.length === 0) {
          return current;
        }
        const additions: DamageIndicator[] = [];
        const next: AttackAnimation[] = [];
        current.forEach((animation) => {
          const elapsed = Math.min(animation.elapsed + deltaMS, animation.duration);
          const progress = animation.duration === 0 ? 1 : elapsed / animation.duration;
          const impactReady =
            !animation.impactEmitted && progress >= DAMAGE_IMPACT_THRESHOLD && animation.damageAmount > 0;
          if (impactReady) {
            const key = `${animation.key}:impact:${damageSequenceRef.current}`;
            damageSequenceRef.current += 1;
            additions.push({
              key,
              x: animation.targetPoint.x,
              y: animation.targetPoint.y,
              amount: animation.damageAmount,
              remaining: DAMAGE_DISPLAY_DURATION
            });
          }
          if (elapsed < animation.duration) {
            next.push({
              ...animation,
              elapsed,
              impactEmitted: animation.impactEmitted || impactReady
            });
          }
        });
        if (additions.length > 0) {
          setDamageIndicators((currentIndicators) => [...currentIndicators, ...additions]);
        }
        return next;
      });
    },
    animations.length > 0
  );

  useMiniTicker(
    (deltaMS) => {
      setDamageIndicators((current) => {
        if (current.length === 0) {
          return current;
        }
        const next = current
          .map((indicator) => ({ ...indicator, remaining: indicator.remaining - deltaMS }))
          .filter((indicator) => indicator.remaining > 0);
        return next;
      });
    },
    damageIndicators.length > 0
  );

  const previousAnimationIdsRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    const previousIds = previousAnimationIdsRef.current;
    const nextIds = new Set<string>();

    animations.forEach((animation) => {
      nextIds.add(animation.attackerId);
      const progress = animation.duration === 0 ? 1 : animation.elapsed / animation.duration;
      const frame = computeAttackFrame(animation, progress);
      setMinionAnimation(animation.attackerId, {
        offsetX: frame.x - animation.origin.x,
        offsetY: frame.y - animation.origin.y,
        rotation: 0,
        scale: frame.scale,
        zIndex: 2000
      });
    });

    previousIds.forEach((id) => {
      if (!nextIds.has(id)) {
        clearMinionAnimation(id);
      }
    });

    previousAnimationIdsRef.current = nextIds;
  }, [animations, clearMinionAnimation, setMinionAnimation]);

  return (
    <pixiContainer>
      <TargetingArrow playerSide={playerSide} />
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
      {burnBursts
        .filter((burst) => burst.side === playerSide)
        .map((burst) => (
          <CardBurnEmitter
            key={burst.key}
            x={Math.max(64, width * 0.12)}
            y={Math.max(96, height - 120)}
            onComplete={() => handleBurnComplete(burst.key)}
          />
        ))}
      {damageIndicators.map((indicator) => (
        <pixiContainer key={indicator.key} x={indicator.x} y={indicator.y}>
          <pixiSprite
            texture={damageTexture}
            width={120}
            height={120}
            anchor={{ x: 0.5, y: 0.5 }}
            alpha={damageTexture.baseTexture.valid ? 1 : 0}
          />
          <pixiText
            text={`${indicator.amount}`}
            anchor={{ x: 0.5, y: 0.5 }}
            style={{ fill: 0xffffff, fontSize: 40, fontWeight: 'bold', align: 'center' }}
          />
        </pixiContainer>
      ))}
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
  const events: {
    side: PlayerSide;
    attackerId: string;
    target: TargetDescriptor;
    damage: number;
  }[] = [];

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
      const opponentSide: PlayerSide = side === 'A' ? 'B' : 'A';
      const summary = damageSummaries[opponentSide];
      const record = consumed[opponentSide];

      const attacked = !!updated && updated.attacksRemaining < minion.attacksRemaining;
      const removed = !updated;

      if (!attacked && !removed) {
        return;
      }

      const allocation = allocateAttackTarget(summary, record, opponentSide, attacked);
      if (!allocation) {
        return;
      }

      events.push({ side, attackerId: minion.instanceId, target: allocation.target, damage: allocation.damage });
    });
  });

  return events;
}

interface BurnDetectionResult {
  side: PlayerSide;
  count: number;
}

function detectBurnCounts(previous: GameState, next: GameState): BurnDetectionResult[] {
  const results: BurnDetectionResult[] = [];
  SIDES.forEach((side) => {
    const prevPlayer = previous.players[side];
    const nextPlayer = next.players[side];
    if (!prevPlayer || !nextPlayer) {
      return;
    }
    const deckDiff = prevPlayer.deck.length - nextPlayer.deck.length;
    if (deckDiff <= 0) {
      return;
    }
    const prevHandIds = new Set(prevPlayer.hand.map((card) => card.instanceId));
    let added = 0;
    nextPlayer.hand.forEach((card) => {
      if (!prevHandIds.has(card.instanceId)) {
        added += 1;
      }
    });
    const burned = deckDiff - added;
    if (burned > 0) {
      results.push({ side, count: burned });
    }
  });
  return results;
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
    heroDamage: Math.max(0, previousHero.hp - nextHero.hp)
  };

  const nextMap = new Map(next.map((minion) => [minion.instanceId, minion]));
  previous.forEach((minion) => {
    const updated = nextMap.get(minion.instanceId);
    if (!updated) {
      summary.destroyed.push({ id: minion.instanceId, amount: minion.health });
    } else if (updated.health < minion.health) {
      summary.damaged.push({ id: minion.instanceId, amount: minion.health - updated.health });
    }
  });

  return summary;
}

function allocateAttackTarget(
  summary: DamageSummary,
  record: { damaged: Set<string>; destroyed: Set<string>; hero: boolean },
  opponentSide: PlayerSide,
  allowFallback: boolean
): { target: TargetDescriptor; damage: number } | null {
  const destroyed = summary.destroyed.find((entry) => !record.destroyed.has(entry.id));
  if (destroyed) {
    record.destroyed.add(destroyed.id);
    return {
      target: { type: 'minion', side: opponentSide, entityId: destroyed.id },
      damage: destroyed.amount
    };
  }

  const damaged = summary.damaged.find((entry) => !record.damaged.has(entry.id));
  if (damaged) {
    record.damaged.add(damaged.id);
    return {
      target: { type: 'minion', side: opponentSide, entityId: damaged.id },
      damage: damaged.amount
    };
  }

  if (summary.heroDamage > 0 && !record.hero) {
    record.hero = true;
    return { target: { type: 'hero', side: opponentSide }, damage: summary.heroDamage };
  }

  if (allowFallback) {
    return { target: { type: 'hero', side: opponentSide }, damage: 0 };
  }

  return null;
}
