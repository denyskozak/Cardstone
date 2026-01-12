import type {
  GameState,
  HeroState,
  MinionEntity,
  PlayerSide,
  TargetDescriptor
} from '@cardstone/shared/types';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Assets, Texture } from 'pixi.js';
import TargetingArrow from '../effects/TargetingArrow';
import { computeBoardLayout, DECK_SCALE, getDeckPositions } from '../layout';
import useMiniTicker from '../hooks/useMiniTicker';
import { useUiStore } from '../../state/store';
import CardBurnEmitter from '../effects/CardBurnEmitter';
import { GameSoundId, playGameSound } from '../sounds';
import { CARD_SIZE } from '../Card';
import { computeHandLayout, HAND_BASE_SCALE, HAND_CARD_DIMENSIONS } from './Hand';

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

interface PendingImpactResult {
  target: TargetDescriptor;
  targetPoint: { x: number; y: number };
  damage: number;
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

interface StatChange {
  target: TargetDescriptor;
  kind: 'damage' | 'heal' | 'buff';
  amount?: number;
  attackDelta?: number;
  healthDelta?: number;
  destroyed?: boolean;
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
const DAMAGE_FADE_OUT_DURATION = 350;
const HEAL_DISPLAY_DURATION = 1800;
const BUFF_DISPLAY_DURATION = 1600;
const INDICATOR_FLOAT_DISTANCE = 24;
const DAMAGE_IMPACT_THRESHOLD = 0.5;
const DRAW_DURATION = 620;
const DRAW_LIFT = 26;
const DRAW_STAGGER = 70;
const PLACEMENT_FADE_DURATION = 250;
const MINION_DEATH_FADE_DURATION = 800;
const CARD_BACK_TEXTURE = '/assets/card_skins/1.webp';

interface StatusIndicator {
  key: string;
  x: number;
  y: number;
  text: string;
  remaining: number;
  duration: number;
  kind: 'damage' | 'heal' | 'buff';
  target?: TargetDescriptor;
}

interface DrawAnimation {
  key: string;
  side: PlayerSide;
  from: { x: number; y: number; rotation: number; scale: number };
  to: { x: number; y: number; rotation: number; scale: number };
  elapsed: number;
  duration: number;
}

interface PlacementFade {
  id: string;
  elapsed: number;
  duration: number;
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
  const heroPositions = useUiStore((s) => s.heroPositions);
  const minionAnimations = useUiStore((s) => s.minionAnimations);
  const minionAnimationsRef = useRef(minionAnimations);

  const pendingLocalAttackersRef = useRef(new Map<string, number>());
  const pendingImpactResultsRef = useRef(new Map<string, PendingImpactResult[]>());
  const destroyedMinionsRef = useRef(new Set<string>());
  const prevDeathStateRef = useRef<GameState | null>(null);

  const layout = useMemo(
    () => computeBoardLayout(state, playerSide, width, height),
    [state, playerSide, width, height]
  );

  const [animations, setAnimations] = useState<AttackAnimation[]>([]);
  const prevStateRef = useRef<GameState | null>(null);
  const prevLayoutRef = useRef<ReturnType<typeof computeBoardLayout> | null>(null);
  const prevHeroPositionsRef = useRef(heroPositions);
  const burnPrevStateRef = useRef<GameState | null>(null);
  const burnSequenceRef = useRef(0);
  const [burnBursts, setBurnBursts] = useState<BurnBurst[]>([]);
  const [statusIndicators, setStatusIndicators] = useState<StatusIndicator[]>([]);
  const indicatorSequenceRef = useRef(0);
  const [damageTexture, setDamageTexture] = useState<Texture>(Texture.EMPTY);
  const damageTextureReady = damageTexture !== Texture.EMPTY;
  const [drawAnimations, setDrawAnimations] = useState<DrawAnimation[]>([]);
  const drawSequenceRef = useRef(0);
  const [cardBackTexture, setCardBackTexture] = useState<Texture>(Texture.EMPTY);
  const [placementFades, setPlacementFades] = useState<PlacementFade[]>([]);
  const [deathFades, setDeathFades] = useState<PlacementFade[]>([]);
  const deckPositions = useMemo(() => getDeckPositions(width, height), [height, width]);
  useEffect(() => {
    prevHeroPositionsRef.current = heroPositions;
  }, [heroPositions]);

  useEffect(() => {
    minionAnimationsRef.current = minionAnimations;
  }, [minionAnimations]);

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
      pendingImpactResultsRef.current.clear();
      setStatusIndicators([]);
      indicatorSequenceRef.current = 0;
      destroyedMinionsRef.current.clear();
      setPlacementFades([]);
      setDeathFades([]);
    };
  }, [resetMinionAnimations]);

  useEffect(() => {
    const previous = prevDeathStateRef.current;
    if (!previous) {
      prevDeathStateRef.current = state;
      return;
    }
    if (previous.seq >= state.seq) {
      prevDeathStateRef.current = state;
      return;
    }
    const destroyed = detectDestroyedMinions(previous, state);
    if (destroyed.length > 0) {
      destroyed.forEach((id) => {
        if (destroyedMinionsRef.current.has(id)) {
          return;
        }
        destroyedMinionsRef.current.add(id);
        const existing = minionAnimationsRef.current[id];
        setMinionAnimation(id, {
          offsetX: 0,
          offsetY: 0,
          grayscale: true,
          opacity: existing?.opacity
        });
        setDeathFades((current) => {
          const exists = current.some((fade) => fade.id === id);
          return exists
            ? current
            : [...current, { id, elapsed: 0, duration: MINION_DEATH_FADE_DURATION }];
        });
      });
    }
    prevDeathStateRef.current = state;
  }, [clearMinionAnimation, setMinionAnimation, state]);


  useEffect(() => {
    let cancelled = false;
    Assets.load('/assets/damage-background.svg').then((texture) => {
      if (!cancelled) {
        setDamageTexture(texture);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (cardBackTexture !== Texture.EMPTY) {
      return;
    }
    let cancelled = false;
    Assets.load(CARD_BACK_TEXTURE).then((texture) => {
      if (!cancelled) {
        setCardBackTexture(texture);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cardBackTexture]);

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

    const drawnBySide: Record<PlayerSide, string[]> = {
      A: detectNewHandCards(previous, state, 'A'),
      B: detectNewHandCards(previous, state, 'B')
    };
    const playerDrawn = drawnBySide[playerSide];
    if (playerDrawn.length > 0) {
      playerDrawn.forEach(() => playGameSound(GameSoundId.CardDraw));
    }

    const nextAnimations: DrawAnimation[] = [];
    SIDES.forEach((side) => {
      const drawnCards = drawnBySide[side];
      if (drawnCards.length === 0) {
        return;
      }
      const nextPlayer = state.players[side];
      const handPositions = resolveHandPositions(side, playerSide, width, height, nextPlayer.hand.length);
      const deckPosition = side === playerSide ? deckPositions.player : deckPositions.opponent;
      drawnCards.forEach((cardId, index) => {
        const handIndex = nextPlayer.hand.findIndex((card) => card.instanceId === cardId);
        const target = handPositions[handIndex];
        if (!target) {
          return;
        }
        const sequence = drawSequenceRef.current;
        drawSequenceRef.current += 1;
        nextAnimations.push({
          key: `${state.seq}:${side}:${sequence}`,
          side,
          from: {
            x: deckPosition.x,
            y: deckPosition.y,
            rotation: 0,
            scale: DECK_SCALE
          },
          to: {
            x: target.x,
            y: target.y,
            rotation: target.rotation,
            scale: target.scale
          },
          elapsed: -index * DRAW_STAGGER,
          duration: DRAW_DURATION
        });
      });
    });

    if (nextAnimations.length > 0) {
      setDrawAnimations((current) => [...current, ...nextAnimations]);
    }

    const placements = detectBoardPlacements(previous, state);
    if (placements.length > 0) {
      placements.forEach(() => playGameSound(GameSoundId.CardPlacement));
      setPlacementFades((current) => {
        const existing = new Set(current.map((fade) => fade.id));
        const additions = placements
          .filter((id) => !existing.has(id))
          .map((id) => ({ id, elapsed: 0, duration: PLACEMENT_FADE_DURATION }));
        return additions.length > 0 ? [...current, ...additions] : current;
      });
    }

    const attackEvents = detectAttackEvents(previous, state);
    const attackTargetKeys = new Set<string>();
    attackEvents.forEach((event) => {
      if (event.damage > 0) {
        attackTargetKeys.add(getTargetKey(event.target));
      }
    });

    const statChanges = detectStatChanges(previous, state, attackTargetKeys);
    if (statChanges.length > 0) {
      const additions: StatusIndicator[] = [];
      statChanges.forEach((change) => {
        const targetPoint = resolveTargetPoint(
          change.target,
          layout,
          previousLayout,
          heroPositions,
          prevHeroPositionsRef.current
        );
        if (!targetPoint) {
          return;
        }
        const key = `${state.seq}:stat:${indicatorSequenceRef.current}`;
        indicatorSequenceRef.current += 1;
        if (change.kind === 'buff') {
          const attackPart = change.attackDelta ? `+${change.attackDelta}` : '';
          const healthPart = change.healthDelta ? `+${change.healthDelta}` : '';
          const text = attackPart && healthPart ? `${attackPart}/${healthPart}` : attackPart || healthPart;
          if (!text) {
            return;
          }
          additions.push({
            key,
            x: targetPoint.x,
            y: targetPoint.y,
            text,
            remaining: BUFF_DISPLAY_DURATION,
            duration: BUFF_DISPLAY_DURATION,
            kind: 'buff',
            target: change.target
          });
          return;
        }
        const amount = change.amount ?? 0;
        if (amount <= 0) {
          return;
        }
        const duration =
          change.kind === 'damage' && change.destroyed ? MINION_DEATH_FADE_DURATION : change.kind === 'heal'
            ? HEAL_DISPLAY_DURATION
            : DAMAGE_DISPLAY_DURATION;
        const text = change.kind === 'heal' ? `+${amount}` : `-${amount}`;
        additions.push({
          key,
          x: targetPoint.x,
          y: targetPoint.y,
          text,
          remaining: duration,
          duration,
          kind: change.kind,
          target: change.target
        });
      });
      if (additions.length > 0) {
        setStatusIndicators((current) => [...current, ...additions]);
      }
    }

    const pendingLocalAttackers = pendingLocalAttackersRef.current;
    const pendingImpactResults = pendingImpactResultsRef.current;

    const newAnimations: AttackAnimation[] = [];
    const busyAttackers = new Set<string>();

    if (attackEvents.length > 0) {
      attackEvents.forEach((event, index) => {
        const origin =
          layout.minions[event.side]?.[event.attackerId] ??
          previousLayout?.minions[event.side]?.[event.attackerId];
        if (!origin) {
          return;
        }

        const targetPoint = resolveTargetPoint(
          event.target,
          layout,
          previousLayout,
          heroPositions,
          prevHeroPositionsRef.current
        );
        if (!targetPoint) {
          return;
        }

        const pending = pendingLocalAttackers.get(event.attackerId) ?? 0;
        if (pending > 0) {
          const existing = pendingImpactResults.get(event.attackerId) ?? [];
          pendingImpactResults.set(event.attackerId, [
            ...existing,
            { target: event.target, targetPoint, damage: event.damage }
          ]);
          if (pending === 1) {
            pendingLocalAttackers.delete(event.attackerId);
          } else {
            pendingLocalAttackers.set(event.attackerId, pending - 1);
          }
          return;
        }

        busyAttackers.add(event.attackerId);
        const key = `${state.seq}:${event.attackerId}:${index}`;
        newAnimations.push({
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

      if (newAnimations.length > 0) {
        setAnimations((current) => {
          const survivors = current.filter((animation) => !busyAttackers.has(animation.attackerId));
          return [...survivors, ...newAnimations];
        });
      }
    }
    prevStateRef.current = state;
    prevLayoutRef.current = layout;
  }, [layout, playerSide, state]);

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
        const targetPoint = resolveTargetPoint(
          event.target,
          layout,
          previousLayout,
          heroPositions,
          prevHeroPositionsRef.current
        );
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
        const additions: StatusIndicator[] = [];
        const next: AttackAnimation[] = [];
        current.forEach((animation) => {
          let updated = animation;
          if (animation.damageAmount <= 0) {
            const pendingImpacts = pendingImpactResultsRef.current.get(animation.attackerId);
            if (pendingImpacts && pendingImpacts.length > 0) {
              const [result, ...rest] = pendingImpacts;
              updated = {
                ...animation,
                damageAmount: result.damage,
                target: result.target,
                targetPoint: result.targetPoint
              };
              if (rest.length > 0) {
                pendingImpactResultsRef.current.set(animation.attackerId, rest);
              } else {
                pendingImpactResultsRef.current.delete(animation.attackerId);
              }
            }
          }

          const elapsed = Math.min(updated.elapsed + deltaMS, updated.duration);
          const progress = updated.duration === 0 ? 1 : elapsed / updated.duration;
          const impactReady =
            !updated.impactEmitted && progress >= DAMAGE_IMPACT_THRESHOLD && updated.damageAmount > 0;
          if (impactReady) {
            playGameSound(GameSoundId.AttackImpact);
            const key = `${animation.key}:impact:${indicatorSequenceRef.current}`;
            indicatorSequenceRef.current += 1;
            const isDestroyedTarget =
              updated.target.type === 'minion' &&
              destroyedMinionsRef.current.has(updated.target.entityId);
            const duration = isDestroyedTarget ? MINION_DEATH_FADE_DURATION : DAMAGE_DISPLAY_DURATION;
            additions.push({
              key,
              x: updated.targetPoint.x,
              y: updated.targetPoint.y,
              text: `-${updated.damageAmount}`,
              remaining: duration,
              duration,
              kind: 'damage',
              target: updated.target
            });
          }
          if (elapsed < updated.duration) {
            next.push({
              ...updated,
              elapsed,
              impactEmitted: updated.impactEmitted || impactReady
            });
          }
        });
        if (additions.length > 0) {
          setStatusIndicators((currentIndicators) => [...currentIndicators, ...additions]);
        }
        return next;
      });
    },
    animations.length > 0
  );

  useMiniTicker(
    (deltaMS) => {
      setStatusIndicators((current) => {
        if (current.length === 0) {
          return current;
        }
        const next = current
          .map((indicator) => ({ ...indicator, remaining: indicator.remaining - deltaMS }))
          .filter((indicator) => indicator.remaining > 0);
        return next;
      });
    },
    statusIndicators.length > 0
  );

  useMiniTicker(
    (deltaMS) => {
      setDrawAnimations((current) => {
        if (current.length === 0) {
          return current;
        }
        return current
          .map((animation) => ({ ...animation, elapsed: animation.elapsed + deltaMS }))
          .filter((animation) => animation.elapsed < animation.duration);
      });
    },
    drawAnimations.length > 0
  );

  useMiniTicker(
    (deltaMS) => {
      setPlacementFades((current) => {
        if (current.length === 0) {
          return current;
        }
        const next: PlacementFade[] = [];
        current.forEach((fade) => {
          const elapsed = fade.elapsed + deltaMS;
          const progress = Math.min(elapsed / fade.duration, 1);
          const existing = minionAnimationsRef.current[fade.id];
          const baseTransform = existing ?? { offsetX: 0, offsetY: 0 };
          setMinionAnimation(fade.id, { ...baseTransform, opacity: progress });
          if (elapsed < fade.duration) {
            next.push({ ...fade, elapsed });
            return;
          }
          if (
            baseTransform.offsetX === 0 &&
            baseTransform.offsetY === 0 &&
            baseTransform.rotation === undefined &&
            baseTransform.scale === undefined &&
            baseTransform.zIndex === undefined &&
            baseTransform.grayscale === undefined
          ) {
            clearMinionAnimation(fade.id);
          } else {
            setMinionAnimation(fade.id, { ...baseTransform, opacity: 1 });
          }
        });
        return next;
      });
    },
    placementFades.length > 0
  );

  useMiniTicker(
    (deltaMS) => {
      setDeathFades((current) => {
        if (current.length === 0) {
          return current;
        }
        const next: PlacementFade[] = [];
        current.forEach((fade) => {
          const elapsed = fade.elapsed + deltaMS;
          const progress = Math.min(elapsed / fade.duration, 1);
          const existing = minionAnimationsRef.current[fade.id];
          const baseTransform = existing ?? { offsetX: 0, offsetY: 0 };
          setMinionAnimation(fade.id, {
            ...baseTransform,
            grayscale: true,
            opacity: 1 - progress
          });
          if (elapsed < fade.duration) {
            next.push({ ...fade, elapsed });
            return;
          }
          clearMinionAnimation(fade.id);
          destroyedMinionsRef.current.delete(fade.id);
        });
        return next;
      });
    },
    deathFades.length > 0
  );

  const previousAnimationIdsRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    const previousIds = previousAnimationIdsRef.current;
    const nextIds = new Set<string>();
    const currentMinionAnimations = minionAnimationsRef.current;

    animations.forEach((animation) => {
      nextIds.add(animation.attackerId);
      const progress = animation.duration === 0 ? 1 : animation.elapsed / animation.duration;
      const frame = computeAttackFrame(animation, progress);
      const existing = currentMinionAnimations[animation.attackerId];
      setMinionAnimation(animation.attackerId, {
        offsetX: frame.x - animation.origin.x,
        offsetY: frame.y - animation.origin.y,
        rotation: 0,
        scale: frame.scale,
        zIndex: 2000,
        opacity: existing?.opacity
      });
    });

    previousIds.forEach((id) => {
      if (!nextIds.has(id) && !currentMinionAnimations[id]?.grayscale) {
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
      {statusIndicators.map((indicator) => {
        const progress = Math.min(1, 1 - indicator.remaining / indicator.duration);
        const floatY = indicator.y - INDICATOR_FLOAT_DISTANCE * progress;
        const fadeWindow = Math.min(DAMAGE_FADE_OUT_DURATION, indicator.duration);
        const alpha =
          indicator.duration === MINION_DEATH_FADE_DURATION
            ? indicator.remaining / indicator.duration
            : indicator.remaining <= fadeWindow
              ? indicator.remaining / fadeWindow
              : 1;
        const palette = getIndicatorPalette(indicator.kind);

        return (
          <pixiContainer
            key={indicator.key}
            x={indicator.x}
            y={floatY}
            alpha={alpha}
          >
            <pixiSprite
              texture={damageTexture}
              width={120}
              height={120}
              anchor={{ x: 0.5, y: 0.5 }}
              alpha={damageTextureReady ? 1 : 0}
              tint={palette.tint}
            />
            <pixiText
              text={indicator.text}
              anchor={{ x: 0.5, y: 0.5 }}
              style={{ fill: palette.textColor, fontSize: 40, fontWeight: 'bold', align: 'center' }}
            />
          </pixiContainer>
        );
      })}
      {drawAnimations.map((animation) => {
        const progress = Math.max(0, Math.min(1, animation.elapsed / animation.duration));
        const eased = easeInOutCubic(progress);
        const x = lerp(animation.from.x, animation.to.x, eased);
        const y = lerp(animation.from.y, animation.to.y, eased) - Math.sin(progress * Math.PI) * DRAW_LIFT;
        const rotation = lerp(animation.from.rotation, animation.to.rotation, eased);
        const scale = lerp(animation.from.scale, animation.to.scale, eased);
        const fadeOut = progress > 0.85 ? 1 - (progress - 0.85) / 0.15 : 1;

        return (
          <pixiSprite
            key={animation.key}
            texture={cardBackTexture}
            x={x}
            y={y}
            rotation={rotation}
            scale={scale}
            pivot={{ x: CARD_SIZE.width / 2, y: CARD_SIZE.height }}
            width={CARD_SIZE.width}
            height={CARD_SIZE.height}
            alpha={fadeOut}
            zIndex={2200}
          />
        );
      })}
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

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInCubic(t: number) {
  return t * t * t;
}

function getIndicatorPalette(kind: StatusIndicator['kind']): { tint: number; textColor: number } {
  switch (kind) {
    case 'heal':
      return { tint: 0x1dd1a1, textColor: 0xffffff };
    case 'buff':
      return { tint: 0x74b9ff, textColor: 0xffffff };
    case 'damage':
    default:
      return { tint: 0xff6b6b, textColor: 0xffffff };
  }
}

function resolveTargetPoint(
  target: TargetDescriptor,
  layout: ReturnType<typeof computeBoardLayout>,
  previousLayout: ReturnType<typeof computeBoardLayout> | null,
  heroPositions: Record<PlayerSide, { x: number; y: number } | null>,
  previousHeroPositions: Record<PlayerSide, { x: number; y: number } | null>
) {
  if (target.type === 'hero') {
    return (
      heroPositions[target.side] ??
      previousHeroPositions[target.side] ??
      layout.heroes[target.side] ??
      previousLayout?.heroes[target.side] ??
      null
    );
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

function getTargetKey(target: TargetDescriptor): string {
  return target.type === 'hero' ? `hero:${target.side}` : `minion:${target.side}:${target.entityId}`;
}

function detectStatChanges(
  previous: GameState,
  next: GameState,
  excludedDamageTargets: Set<string>
): StatChange[] {
  const changes: StatChange[] = [];

  SIDES.forEach((side) => {
    const prevHero = previous.players[side].hero;
    const nextHero = next.players[side].hero;
    const heroDelta = nextHero.hp - prevHero.hp;
    if (heroDelta !== 0) {
      const target: TargetDescriptor = { type: 'hero', side };
      const key = getTargetKey(target);
      if (!excludedDamageTargets.has(key)) {
        changes.push({
          target,
          kind: heroDelta > 0 ? 'heal' : 'damage',
          amount: Math.abs(heroDelta)
        });
      }
    }
  });

  SIDES.forEach((side) => {
    const prevMap = new Map(previous.board[side].map((minion) => [minion.instanceId, minion]));
    const nextMap = new Map(next.board[side].map((minion) => [minion.instanceId, minion]));

    prevMap.forEach((prevMinion, id) => {
      const target: TargetDescriptor = { type: 'minion', side, entityId: id };
      const key = getTargetKey(target);
      const nextMinion = nextMap.get(id);
      if (!nextMinion) {
        if (!excludedDamageTargets.has(key) && prevMinion.health > 0) {
          changes.push({
            target,
            kind: 'damage',
            amount: prevMinion.health,
            destroyed: true
          });
        }
        return;
      }

      const attackDelta = nextMinion.attack - prevMinion.attack;
      const maxHealthDelta = nextMinion.maxHealth - prevMinion.maxHealth;
      const healthDelta = nextMinion.health - prevMinion.health;

      if (attackDelta > 0 || maxHealthDelta > 0) {
        changes.push({
          target,
          kind: 'buff',
          attackDelta: attackDelta > 0 ? attackDelta : undefined,
          healthDelta: maxHealthDelta > 0 ? maxHealthDelta : undefined
        });
      }

      if (healthDelta < 0 && !excludedDamageTargets.has(key)) {
        changes.push({
          target,
          kind: 'damage',
          amount: Math.abs(healthDelta)
        });
      } else if (healthDelta > 0 && maxHealthDelta <= 0) {
        changes.push({
          target,
          kind: 'heal',
          amount: healthDelta
        });
      }
    });
  });

  return changes;
}

function detectNewHandCards(previous: GameState, next: GameState, side: PlayerSide): string[] {
  const prevPlayer = previous.players[side];
  const nextPlayer = next.players[side];
  if (!prevPlayer || !nextPlayer) {
    return [];
  }
  const previousIds = new Set(prevPlayer.hand.map((card) => card.instanceId));
  return nextPlayer.hand
    .filter((card) => !previousIds.has(card.instanceId))
    .map((card) => card.instanceId);
}

function resolveHandPositions(
  side: PlayerSide,
  playerSide: PlayerSide,
  width: number,
  height: number,
  count: number
) {
  if (count === 0) {
    return [];
  }
  if (side === playerSide) {
    return computeHandLayout(count, width, height, {
      radiusScale: 1.25,
      fanAngleScale: 0.7,
      verticalOffset: HAND_CARD_DIMENSIONS.height * 0.3
    });
  }
  const layout = computeHandLayout(count, width, height);
  const verticalOffset = CARD_SIZE.height * HAND_BASE_SCALE * 0.5;
  return layout.map((base) => ({
    x: base.x,
    y: CARD_SIZE.height * HAND_BASE_SCALE + (height - base.y) - verticalOffset,
    rotation: -base.rotation,
    scale: base.scale,
    z: base.z
  }));
}

function detectBoardPlacements(previous: GameState, next: GameState): string[] {
  const placements: string[] = [];
  SIDES.forEach((side) => {
    const prevIds = new Set(previous.board[side].map((minion) => minion.instanceId));
    next.board[side].forEach((minion) => {
      if (!prevIds.has(minion.instanceId)) {
        placements.push(minion.instanceId);
      }
    });
  });
  return placements;
}

function detectDestroyedMinions(previous: GameState, next: GameState): string[] {
  const destroyed: string[] = [];
  SIDES.forEach((side) => {
    const nextIds = new Set(next.board[side].map((minion) => minion.instanceId));
    previous.board[side].forEach((minion) => {
      if (!nextIds.has(minion.instanceId)) {
        destroyed.push(minion.instanceId);
      }
    });
  });
  return destroyed;
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
