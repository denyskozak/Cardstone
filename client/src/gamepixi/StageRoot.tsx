import type {
  CardInHand,
  CardPlacement,
  GameState,
  MinionEntity,
  PlayerSide,
  TargetDescriptor
} from '@cardstone/shared/types';
import type { Application } from 'pixi.js';
import Background from './layers/Background';
import Board from './layers/Board';
import DecksLayer from './layers/Decks';
import HandLayer from './layers/Hand';
import OpponentHandLayer from './layers/OpponentHand';
import Effects from './layers/Effects';
import { useApplication } from '@pixi/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { preloadGameSounds } from './sounds';
import useMiniTicker from './hooks/useMiniTicker';

declare global {
  interface Window {
    __PIXI_DEVTOOLS__?: { app: Application };
  }
}

interface StageRootProps {
  state: GameState | null;
  playerSide: PlayerSide | null;
  onPlayCard: (
    card: CardInHand,
    options?: { target?: TargetDescriptor; placement?: CardPlacement }
  ) => void;
  canPlayCard: (card: CardInHand) => boolean;
  onAttack: (attackerId: string, target: TargetDescriptor) => void;
  canAttack: (minion: MinionEntity) => boolean;
  width?: number;
  height?: number;
  showPlayerHand?: boolean;
}

const BASE_WIDTH = 1024;
const BASE_HEIGHT = 640;
const HEAVY_HIT_DAMAGE_THRESHOLD = 5;
const SCREEN_SHAKE_DURATION = 380;
const SCREEN_SHAKE_INTENSITY = 7;

export default function StageRoot({
  state,
  playerSide,
  onPlayCard,
  canPlayCard,
  onAttack,
  canAttack,
  width,
  height,
  showPlayerHand = true
}: StageRootProps) {
  const { app } = useApplication();
  const previousStateRef = useRef<GameState | null>(null);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const [isShaking, setIsShaking] = useState(false);
  const shakeStateRef = useRef<{ elapsed: number; duration: number; intensity: number } | null>(null);
  const { targetWidth, targetHeight } = useMemo(() => {
    const hasWidth = typeof width === 'number' && width > 0;
    const hasHeight = typeof height === 'number' && height > 0;
    if (hasWidth && hasHeight) {
      const safeWidth = width as number;
      const safeHeight = height as number;
      const scale = Math.min(safeWidth / BASE_WIDTH, safeHeight / BASE_HEIGHT);
      return { targetWidth: BASE_WIDTH * scale, targetHeight: BASE_HEIGHT * scale };
    }
    if (hasWidth) {
      const safeWidth = width as number;
      const scale = safeWidth / BASE_WIDTH;
      return { targetWidth: safeWidth, targetHeight: BASE_HEIGHT * scale };
    }
    if (hasHeight) {
      const safeHeight = height as number;
      const scale = safeHeight / BASE_HEIGHT;
      return { targetWidth: BASE_WIDTH * scale, targetHeight: safeHeight };
    }
    return { targetWidth: BASE_WIDTH, targetHeight: BASE_HEIGHT };
  }, [height, width]);

  useEffect(() => {
    const { stage, renderer } = app;
    if (!stage || !renderer) return;
    const previousEventMode = stage.eventMode;
    const previousHitArea = stage.hitArea;
    stage.eventMode = 'static';
    stage.hitArea = renderer.screen;
    return () => {
      stage.eventMode = previousEventMode;
      stage.hitArea = previousHitArea;
    };
  }, [app]);

  useEffect(() => {
    app.renderer?.resize(targetWidth, targetHeight);
  }, [app, targetHeight, targetWidth]);

  useEffect(() => {
    preloadGameSounds();
  }, []);

  useEffect(() => {
    if (!state || !playerSide) {
      previousStateRef.current = state;
      shakeStateRef.current = null;
      setIsShaking(false);
      setShakeOffset({ x: 0, y: 0 });
      return;
    }
    const previous = previousStateRef.current;
    if (previous && previous.seq < state.seq && shouldShakeOnHeavyHit(previous, state, playerSide)) {
      shakeStateRef.current = {
        elapsed: 0,
        duration: SCREEN_SHAKE_DURATION,
        intensity: SCREEN_SHAKE_INTENSITY
      };
      setIsShaking(true);
    }
    previousStateRef.current = state;
  }, [playerSide, state]);

  useMiniTicker(
    (deltaMS) => {
      const activeShake = shakeStateRef.current;
      if (!activeShake) {
        return;
      }
      const nextElapsed = Math.min(activeShake.elapsed + deltaMS, activeShake.duration);
      const progress = nextElapsed / activeShake.duration;
      const damping = 1 - progress;
      const wave = Math.sin(nextElapsed * 0.06) * activeShake.intensity * damping;
      const jitter = (Math.random() - 0.5) * activeShake.intensity * 0.7 * damping;
      setShakeOffset({
        x: wave * 0.9 + jitter,
        y: wave * 0.35
      });
      if (nextElapsed >= activeShake.duration) {
        shakeStateRef.current = null;
        setIsShaking(false);
        setShakeOffset({ x: 0, y: 0 });
        return;
      }
      shakeStateRef.current = {
        ...activeShake,
        elapsed: nextElapsed
      };
    },
    isShaking
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.__PIXI_DEVTOOLS__ = { app };
    return () => {
      delete window.__PIXI_DEVTOOLS__;
    };
  }, [app]);
  if (!state || !playerSide) {
    return (
      // Корневой pixiContainer сцены: здесь только статичный фон, пока матч не готов.
      <pixiContainer width={targetWidth} height={targetHeight} options={{ backgroundAlpha: 0 }}>
        <Background width={targetWidth} height={targetHeight} />
      </pixiContainer>
    );
  }
  const player = state.players[playerSide];
  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';
  const opponent = state.players[opponentSide];


  return (
    // Главный контейнер игрового поля (вся Pixi-сцена матча).
    <pixiContainer width={targetWidth} height={targetHeight} options={{ backgroundAlpha: 0 }}>
      <Background width={targetWidth} height={targetHeight} />
      {/* Контейнер "камеры": сюда применяется screen-shake при сильных ударах. */}
      <pixiContainer x={shakeOffset.x} y={shakeOffset.y}>
        {/* Слой стола: герои, миньоны, интерактив атаки/таргетинга. */}
        <Board
          state={state}
          playerSide={playerSide}
          width={targetWidth}
          height={targetHeight}
          onAttack={onAttack}
          canAttack={canAttack}
          onCastSpell={(card, target) => onPlayCard(card, { target })}
        />
        {/* Слой колод игрока и оппонента. */}
        <DecksLayer
          playerSide={playerSide}
          playerCount={player.deck.length}
          opponentCount={opponent.deck.length}
          width={targetWidth}
          height={targetHeight}
        />
        {/* Слой руки игрока: hover, drag&drop, розыгрыш карт. */}
        {showPlayerHand ? (
          <HandLayer
            hand={player.hand}
            canPlay={canPlayCard}
            onPlay={(card, options) => onPlayCard(card, options)}
            boardMinionCount={state.board[playerSide].length}
            currentMana={player.mana.current}
            width={targetWidth}
            height={targetHeight}
          />
        ) : null}
        {/* Визуал карт в руке оппонента (рубашки). */}
        <OpponentHandLayer
          count={opponent.hand.length}
          width={targetWidth}
          height={targetHeight}
        />
        {/* Эффекты поверх поля: стрелка таргетинга, урон/хил, анимации добора и т.д. */}
        <Effects
          state={state}
          playerSide={playerSide}
          width={targetWidth}
          height={targetHeight}
        />
      </pixiContainer>
    </pixiContainer>
  );
}

function shouldShakeOnHeavyHit(previous: GameState, next: GameState, playerSide: PlayerSide) {
  const playerHeroDamage = Math.max(0, previous.players[playerSide].hero.hp - next.players[playerSide].hero.hp);
  if (playerHeroDamage > HEAVY_HIT_DAMAGE_THRESHOLD && hasAttackingMinion(previous, next, playerSide)) {
    return true;
  }
  const nextMinions = new Map(next.board[playerSide].map((minion) => [minion.instanceId, minion]));
  const highestMinionDamage = previous.board[playerSide].reduce((maxDamage, minion) => {
    const updated = nextMinions.get(minion.instanceId);
    if (!updated) {
      return Math.max(maxDamage, minion.health);
    }
    return Math.max(maxDamage, minion.health - updated.health);
  }, 0);
  if (highestMinionDamage > HEAVY_HIT_DAMAGE_THRESHOLD && hasAttackingMinion(previous, next, playerSide)) {
    return true;
  }
  return false;
}

function hasAttackingMinion(previous: GameState, next: GameState, defendingSide: PlayerSide) {
  const attackerSide: PlayerSide = defendingSide === 'A' ? 'B' : 'A';
  const nextById = new Map(next.board[attackerSide].map((minion) => [minion.instanceId, minion]));
  return previous.board[attackerSide].some((minion) => {
    const nextMinion = nextById.get(minion.instanceId);
    if (!nextMinion) {
      return false;
    }
    return nextMinion.attacksRemaining < minion.attacksRemaining;
  });
}
