import type {
  CardInHand,
  GameState,
  MinionEntity,
  PlayerSide,
  TargetDescriptor
} from '@cardstone/shared/types';
import { getTargetingPredicate } from '@cardstone/shared/targeting';
import { actionRequiresTarget, getPrimaryPlayAction } from '@cardstone/shared/effects';
import type { FederatedPointerEvent } from 'pixi.js';
import { Assets, Container, DisplayObject, Graphics, Point, Rectangle, Texture, BlurFilter } from 'pixi.js';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  useUiStore,
  type MinionAnimationTransform,
  type TargetingState
} from '../../state/store';
import { Card, CARD_SIZE } from '../Card';
import {
  MINION_ART_INSET_X,
  MINION_ART_INSET_Y,
  MINION_HEIGHT,
  MINION_WIDTH,
  getBoardLaneGeometry,
  MINION_HORIZONTAL_GAP
} from '../layout';
import TargetReticle from '../effects/TargetReticle';

interface BoardProps {
  state: GameState;
  playerSide: PlayerSide;
  width: number;
  height: number;
  onAttack: (attackerId: string, target: TargetDescriptor) => void;
  canAttack: (minion: MinionEntity) => boolean;
  onCastSpell: (card: CardInHand, target: TargetDescriptor) => void;
}

const blurFilter = new BlurFilter(6);
function MinionCardArt({ cardId }: { cardId: string }) {
  const [innerTexture, setInnerTexture] = useState<Texture>(Texture.EMPTY);
  const [texture, setTexture] = useState(Texture.EMPTY);

  const [mask, setMask] = useState<Graphics | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (innerTexture === Texture.EMPTY) {
      Assets.load(`/assets/cards/${cardId}.webp`).then((result) => {
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

const HERO_ASSET_PATHS = [
  // '/assets/heroes/anduin.webp',
  '/assets/heroes/djaina.webp',
  // '/assets/heroes/garosh.webp',
  // '/assets/heroes/guldan.webp',
  // '/assets/heroes/illidan.webp',
  // '/assets/heroes/tral.webp'
];

const assignedHeroByKey = new Map<string, string>();

function getHeroAssetForPlayer(gameId: string, playerId: string) {
  const key = `${gameId}:${playerId}`;
  let asset = assignedHeroByKey.get(key);
  if (!asset) {
    const index = Math.floor(Math.random() * HERO_ASSET_PATHS.length);
    asset = HERO_ASSET_PATHS[index] ?? HERO_ASSET_PATHS[0];
    assignedHeroByKey.set(key, asset);
  }
  return asset;
}

function useHeroTexture(gameId: string | undefined, playerId: string | undefined) {
  const [texture, setTexture] = useState<Texture>(Texture.EMPTY);
  const [hpTexture, setHPTexture] = useState<Texture>(Texture.EMPTY);

  useEffect(() => {
    let cancelled = false;

    if (!gameId || !playerId) {
      setTexture(Texture.EMPTY);
      return () => {
        cancelled = true;
      };
    }

    setTexture(Texture.EMPTY);
    const assetPath = getHeroAssetForPlayer(gameId, playerId);
    Assets.load(assetPath).then((result) => {
      if (!cancelled) {
        setTexture(result);
      }
    });
    Assets.load('/assets/images/hp.webp').then((result) => {
      if (!cancelled) {
        setHPTexture(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameId, playerId]);

  return [texture, hpTexture];
}

interface HeroAvatarProps {
  gameId: string;
  playerId: string;
  hp: number;
  targeted: boolean;
  targetedColor: number;
}

function HeroAvatar({
  gameId,
  playerId,
  hp,
  targeted,
  targetedColor
}: HeroAvatarProps) {
  const [texture, hpTexture] = useHeroTexture(gameId, playerId);

  const avatarSize = 220;

  return (
    <>
      {targeted ? (
        <TargetReticle
          x={0}
          y={0}
          radius={avatarSize * 0.55}
          color={targetedColor}
          lineWidth={6}
          alpha={0.9}
          scaleX={1.1}
          scaleY={1.1}
          zIndex={50}
        />
      ) : null}
      {/*<pixiGraphics*/}
      {/*  draw={(g) => {*/}
      {/*    g.clear();*/}
      {/*    g.beginFill(targeted ? targetedColor : baseColor, targeted ? 1 : 0.9);*/}
      {/*    g.drawCircle(0, 0, backgroundRadius);*/}
      {/*    g.endFill();*/}
      {/*  }}*/}
      {/*/>*/}
      <pixiSprite
        texture={texture}
        width={avatarSize + 20}
        height={avatarSize}
        anchor={{ x: 0.5, y: 0.5 }}
        alpha={texture === Texture.EMPTY ? 0 : 1}
      />
      <pixiSprite texture={hpTexture} width={60} height={80} x={50} y={40} />
      {/*<pixiGraphics*/}
      {/*  ref={handleMaskRef}*/}
      {/*  draw={(g) => {*/}
      {/*    g.clear();*/}
      {/*    g.beginFill(0xffffff, 1);*/}
      {/*    g.drawCircle(0, 0, avatarSize / 2);*/}
      {/*    g.endFill();*/}
      {/*  }}*/}
      {/*/>*/}
      <pixiText
        text={hp}
        x={80}
        y={90}
        anchor={{ x: 0.5, y: 0.5 }}
        style={{ fill: 0xffffff, fontSize: 24, align: 'center', fontWeight: 'bold' }}
      />
    </>
  );
}

type TargetTaggedDisplayObject = DisplayObject & {
  cardstoneTarget?: TargetDescriptor;
};

function attachTargetDescriptor(display: DisplayObject | null, descriptor: TargetDescriptor) {
  if (!display) {
    return;
  }
  (display as TargetTaggedDisplayObject).cardstoneTarget = descriptor;
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
  const minionCacheRef = useRef(
    new Map<
      string,
      {
        entity: MinionEntity;
        side: PlayerSide;
        baseX: number;
        baseY: number;
        defaultZIndex: number;
      }
    >()
  );
  const targeting = useUiStore((s) => s.targeting);
  const setTargeting = useUiStore((s) => s.setTargeting);
  const updateTargeting = useUiStore((s) => s.updateTargeting);
  const currentTarget = useUiStore((s) => s.currentTarget ?? null);
  const setCurrentTarget = useUiStore((s) => s.setCurrentTarget);
  const setSelected = useUiStore((s) => s.setSelected);
  const minionAnimations = useUiStore((s) => s.minionAnimations);
  const hoveredCardId = useUiStore((s) => s.hoveredCard);
  const setHovered = useUiStore((s) => s.setHovered);
  const setHeroPosition = useUiStore((s) => s.setHeroPosition);
  const clearHeroPosition = useUiStore((s) => s.clearHeroPosition);
  const targetRef = useRef<TargetDescriptor | null>(null);
  const pendingAttackTimeoutsRef = useRef<Array<ReturnType<typeof window.setTimeout>>>([]);
  const enqueueLocalAttackAnimation = useUiStore((s) => s.enqueueLocalAttackAnimation);
  const heroRefs = useRef<Record<PlayerSide, Container | null>>({ A: null, B: null });

  const updateHeroPosition = useCallback(
    (side: PlayerSide) => {
      const instance = heroRefs.current[side];
      if (!instance) {
        clearHeroPosition(side);
        return;
      }
      const bounds = instance.getBounds();
      setHeroPosition(side, {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
      });
    },
    [clearHeroPosition, setHeroPosition]
  );

  const handleHeroContainerRef = useCallback(
    (side: PlayerSide) =>
      (instance: Container | null) => {
        attachTargetDescriptor(instance, { type: 'hero', side });
        heroRefs.current[side] = instance;
        if (instance) {
          updateHeroPosition(side);
        } else {
          clearHeroPosition(side);
        }
      },
    [clearHeroPosition, updateHeroPosition]
  );

  useLayoutEffect(() => {
    updateHeroPosition('A');
    updateHeroPosition('B');
  }, [boardBottomY, boardTopY, laneWidth, laneX, updateHeroPosition]);

  useEffect(() => {
    return () => {
      pendingAttackTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      pendingAttackTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    targetRef.current = currentTarget;
  }, [currentTarget]);

  const targetingPredicate = useMemo(() => {
    if (!targeting) {
      return null;
    }
    if (targeting.source.kind === 'minion') {
      return getTargetingPredicate({ kind: 'minion' }, playerSide, state);
    }
    const action = getPrimaryPlayAction(targeting.source.card.card);
    if (!action || !actionRequiresTarget(action)) {
      return null;
    }
    return getTargetingPredicate({ kind: 'spell', action }, playerSide, state);
  }, [playerSide, state, targeting]);

  useEffect(() => {
    const cache = minionCacheRef.current;
    const activeIds = new Set<string>();
    (['A', 'B'] as PlayerSide[]).forEach((side) => {
      state.board[side].forEach((minion) => {
        const cached = cache.get(minion.instanceId);
        cache.set(minion.instanceId, {
          entity: minion,
          side,
          baseX: cached?.baseX ?? 0,
          baseY: cached?.baseY ?? 0,
          defaultZIndex: cached?.defaultZIndex ?? 0
        });
        activeIds.add(minion.instanceId);
      });
    });

    Array.from(cache.keys()).forEach((id) => {
      if (!activeIds.has(id) && !minionAnimations[id]) {
        cache.delete(id);
      }
    });
  }, [minionAnimations, state.board]);

  const handlePointerMove = useCallback(
    (event: FederatedPointerEvent) => {
      if (!targeting || event.pointerId !== targeting.pointerId) {
        return;
      }

      updateTargeting({ x: event.global.x, y: event.global.y });

      if (!targetingPredicate) {
        setCurrentTarget(null);
        return;
      }

      const descriptor = resolveTargetDescriptor(event.target as DisplayObject | null);
      if (descriptor && targetingPredicate(descriptor)) {
        setCurrentTarget((previous) => {
          if (previous && targetsEqual(previous, descriptor)) {
            return previous;
          }
          return descriptor;
        });
        return;
      }

      setCurrentTarget((previous) => (previous ? null : previous));
    },
    [setCurrentTarget, targeting, targetingPredicate, updateTargeting]
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
        const queuedTarget: TargetDescriptor =
          target.type === 'hero'
            ? { type: 'hero', side: target.side }
            : { type: 'minion', side: target.side, entityId: target.entityId };
        // Kick off the local strike animation immediately so the attacker
        // lunges before the server confirms the combat result.
        enqueueLocalAttackAnimation({
          attackerId: action.source.entityId,
          side: playerSide,
          target: queuedTarget
        });
        const timeout = window.setTimeout(() => {
          onAttack(action.source.entityId, target);
          pendingAttackTimeoutsRef.current = pendingAttackTimeoutsRef.current.filter(
            (value) => value !== timeout
          );
        }, 420);
        pendingAttackTimeoutsRef.current.push(timeout);
      } else if (action.source.kind === 'spell') {
        setSelected(undefined);
        onCastSpell(action.source.card, target);
      }
    },
    [
      enqueueLocalAttackAnimation,
      onAttack,
      onCastSpell,
      playerSide,
      setCurrentTarget,
      setSelected,
      setTargeting,
      targeting
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
  const opponentPlayer = state.players[opponentSide];
  const playerPlayer = state.players[playerSide];
  const boardHitArea = useMemo(() => new Rectangle(0, 0, width, height), [height, width]);
  const opponentHeroRef = useMemo(
    () => handleHeroContainerRef(opponentSide),
    [handleHeroContainerRef, opponentSide]
  );
  const friendlyHeroRef = useMemo(
    () => handleHeroContainerRef(playerSide),
    [handleHeroContainerRef, playerSide]
  );

  const renderRow = useCallback(
    (side: PlayerSide, y: number) => {
      const cache = minionCacheRef.current;
      const minions = state.board[side];
      const count = minions.length;
      const rowWidth =
        count > 0 ? count * MINION_WIDTH + (count - 1) * MINION_HORIZONTAL_GAP : 0;
      const startX = laneX + (laneWidth - rowWidth) / 2;

      const renderedIds = new Set<string>();

      const createMinion = (
        entity: MinionEntity,
        baseX: number,
        baseY: number,
        interactive: boolean,
        defaultZIndex: number,
        key: string
      ) => {
        const isFriendly = side === playerSide;
        const canAttackThisMinion = interactive && isFriendly && canAttack(entity);
        const targetDescriptor: TargetDescriptor = {
          type: 'minion',
          side,
          entityId: entity.instanceId
        };

        const canBeSpellTarget =
          interactive && targetingPredicate ? targetingPredicate(targetDescriptor) : false;
        const isTargeted =
          interactive &&
          currentTarget?.type === 'minion' &&
          currentTarget.side === side &&
          currentTarget.entityId === entity.instanceId;

        const reticleColor = side === playerSide ? 0x55efc4 : 0xff7675;

        const handleDown =
          interactive && isFriendly
            ? (event: FederatedPointerEvent) => handleStartAttack(entity, event)
            : undefined;

        const animation: MinionAnimationTransform | undefined = minionAnimations[entity.instanceId];
        const offsetX = animation?.offsetX ?? 0;
        const offsetY = animation?.offsetY ?? 0;
        const scale = animation?.scale ?? 1.3;
        const rotation = animation?.rotation ?? 0;
        const zIndex = animation?.zIndex ?? defaultZIndex;

        return (
          <pixiContainer
            key={key}
            name={`minion:${side}:${entity.instanceId}`}
            x={baseX + offsetX}
            y={baseY + offsetY}
            scale={scale}
            rotation={rotation}
            zIndex={zIndex}
            interactive={interactive}
            eventMode={interactive ? 'static' : undefined}
            cursor={
              interactive && isFriendly && canAttackThisMinion
                ? 'pointer'
                : interactive && targetingPredicate && canBeSpellTarget
                  ? 'pointer'
                  : 'default'
            }
            onPointerDown={handleDown}
            onPointerOver={
              interactive
                ? () => {
                    setHovered(entity.instanceId);
                    if (targetingPredicate && canBeSpellTarget) {
                      handleTargetOver(targetDescriptor);
                    }
                  }
                : undefined
            }
            onPointerOut={
              interactive
                ? () => {
                    if (targetingPredicate && canBeSpellTarget) {
                      handleTargetOut(targetDescriptor);
                    }
                    setHovered(undefined);
                  }
                : undefined
            }
            ref={(instance) => attachTargetDescriptor(instance, targetDescriptor)}
          >
            {isFriendly && canAttackThisMinion ? (
              <pixiGraphics
                blendMode={"add"}
                anchor={0.5}
                alpha={0.7}
                filters={[blurFilter]}
                draw={(g) => {
                  g.clear();
                  g.beginFill(0x78ff5a, 0.85);
                  g.drawEllipse(
                    MINION_WIDTH / 2,
                    MINION_HEIGHT / 2,
                    MINION_WIDTH / 2 + 8,
                    MINION_HEIGHT / 2 + 8
                  );
                  g.endFill();
                }}
              />
            ) : null}
            {entity.divineShield ? (
              <pixiGraphics
                draw={(g) => {
                  g.clear();
                  g.lineStyle(4, 0xfff4aa, 0.9);
                  g.drawEllipse(
                    MINION_WIDTH / 2,
                    MINION_HEIGHT / 2,
                    MINION_WIDTH / 2 - 4,
                    MINION_HEIGHT / 2 - 4
                  );
                }}
              />
            ) : null}
            <MinionCardArt cardId={entity.card.id} />
            <pixiText
              text={`${entity.attack}`}
              x={MINION_WIDTH * 0.09}
              y={MINION_HEIGHT * 0.7}
              style={{ fill: 0xffffff, fontSize: 22, fontWeight: 'bold' }}
            />
            <pixiText
              text={`${entity.health}`}
              x={MINION_WIDTH * 0.8}
              y={MINION_HEIGHT * 0.7}
              style={{ fill: 0xffffff, fontSize: 22, fontWeight: 'bold' }}
            />
            {isTargeted ? (
              <TargetReticle
                x={MINION_WIDTH / 2}
                y={MINION_HEIGHT / 2}
                radius={MINION_WIDTH * 0.55}
                color={reticleColor}
                lineWidth={5}
                alpha={0.9}
                scaleX={1}
                scaleY={MINION_HEIGHT / MINION_WIDTH}
                zIndex={200}
              />
            ) : null}
          </pixiContainer>
        );
      };

      const elements = minions.map((entity, index) => {
        const baseX = startX + index * (MINION_WIDTH + MINION_HORIZONTAL_GAP);
        const baseY = y;
        cache.set(entity.instanceId, {
          entity,
          side,
          baseX,
          baseY,
          defaultZIndex: index
        });
        renderedIds.add(entity.instanceId);
        return createMinion(entity, baseX, baseY, true, index, entity.instanceId);
      });

      Object.entries(minionAnimations).forEach(([id, animation]) => {
        if (!animation) {
          return;
        }
        if (renderedIds.has(id)) {
          return;
        }
        const cached = cache.get(id);
        if (!cached || cached.side !== side) {
          return;
        }
        renderedIds.add(id);
        elements.push(
          createMinion(
            cached.entity,
            cached.baseX,
            cached.baseY,
            false,
            cached.defaultZIndex,
            `ghost-${id}`
          )
        );
      });

      return elements;
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
      const count = minions.length;
      const rowWidth =
        count > 0 ? count * MINION_WIDTH + (count - 1) * MINION_HORIZONTAL_GAP : 0;
      const startX = laneX + (laneWidth - rowWidth) / 2;
      const baseX = startX + index * (MINION_WIDTH + MINION_HORIZONTAL_GAP);
      const baseY = side === playerSide ? boardBottomY : boardTopY;
      const animation = minionAnimations[entity.instanceId];
      const offsetX = animation?.offsetX ?? 0;
      const offsetY = animation?.offsetY ?? 0;
      const scale = animation?.scale ?? 1;

      const widthWithScale = MINION_WIDTH * scale;
      const heightWithScale = MINION_HEIGHT * scale;

      const previewScale = 1.3;
      const previewGap = 10 * 0.2;

      const previewX =
        baseX +
        offsetX +
        widthWithScale +
        previewGap +
        (CARD_SIZE.width * previewScale) / 2;
      const previewY = baseY + offsetY + heightWithScale;

      const previewCard: CardInHand = {
        instanceId: entity.instanceId,
        card: entity.card
      };

      return {
        card: previewCard,
        x: previewX,
        y: previewY,
        scale: previewScale
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
      <pixiGraphics
        draw={(g) => {
          g.clear();
          g.lineStyle(2, 0xffffff, 0.2);
          g.drawRoundedRect(laneX, boardTopY - 20, laneWidth, MINION_HEIGHT + 40, 20);
          g.drawRoundedRect(laneX, boardBottomY - 20, laneWidth, MINION_HEIGHT + 40, 20);
        }}
      />
      {/*Opponent*/}
      <pixiContainer
        x={laneX + laneWidth * 0.1}
        y={boardTopY - 100}
        name={`hero:${opponentSide}`}
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
        ref={opponentHeroRef}
      >
        <HeroAvatar
          gameId={state.id}
          playerId={opponentPlayer.id}
          hp={opponentPlayer.hero.hp}
          targeted={opponentTargeted}
          targetedColor={0xff7675}
        />
      </pixiContainer>
      <pixiContainer
        x={laneX + laneWidth * 0.1}
        y={boardBottomY + MINION_HEIGHT + 70}
        name={`hero:${playerSide}`}
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
        ref={friendlyHeroRef}
      >
        <HeroAvatar
          gameId={state.id}
          playerId={playerPlayer.id}
          hp={playerPlayer.hero.hp}
          targeted={friendlyTargeted}
          targetedColor={0x55efc4}
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
          scale={hoveredMinionPreview.scale}
          disabled
          eventMode="none"
          cursor="default"
          zIndex={10000}
        />
      ) : null}
    </pixiContainer>
  );
}

function targetsEqual(a: TargetDescriptor | null, b: TargetDescriptor) {
  if (!a) {
    return false;
  }
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === 'hero' && b.type === 'hero') {
    return a.side === b.side;
  }
  if (a.type === 'minion' && b.type === 'minion') {
    return a.side === b.side && a.entityId === b.entityId;
  }
  return false;
}

function resolveTargetDescriptor(display: DisplayObject | null): TargetDescriptor | null {
  let current: DisplayObject | null = display;
  while (current) {
    const descriptor = (current as TargetTaggedDisplayObject).cardstoneTarget;
    if (descriptor) {
      return descriptor;
    }
    current = current.parent;
  }
  return null;
}
