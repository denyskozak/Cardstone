import type { CardInHand, GameState, MinionEntity, PlayerSide, TargetDescriptor } from '@cardstone/shared/types';
import Background from './layers/Background';
import Board from './layers/Board';
import HandLayer from './layers/Hand';
import Effects from './layers/Effects';
import { useApplication } from '@pixi/react';
import { useEffect, useMemo } from 'react';

interface StageRootProps {
  state: GameState | null;
  playerSide: PlayerSide | null;
  onPlayCard: (card: CardInHand, target?: TargetDescriptor) => void;
  canPlayCard: (card: CardInHand) => boolean;
  onAttack: (attackerId: string, target: TargetDescriptor) => void;
  canAttack: (minion: MinionEntity) => boolean;
  width?: number;
  height?: number;
}

const BASE_WIDTH = 1024;
const BASE_HEIGHT = 640;

export default function StageRoot({
  state,
  playerSide,
  onPlayCard,
  canPlayCard,
  onAttack,
  canAttack,
  width,
  height
}: StageRootProps) {
  const { app } = useApplication();
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

  window.__PIXI_DEVTOOLS__ = {
    app: app,
  };
  if (!state || !playerSide) {
    return (
      <pixiContainer width={targetWidth} height={targetHeight} options={{ backgroundAlpha: 0 }}>
        <Background width={targetWidth} height={targetHeight} />
      </pixiContainer>
    );
  }
  const player = state.players[playerSide];

  return (
    <pixiContainer width={targetWidth} height={targetHeight} options={{ backgroundAlpha: 0 }}>
      <Background width={targetWidth} height={targetHeight} />
      <pixiContainer>
        <Board
          state={state}
          playerSide={playerSide}
          width={targetWidth}
          height={targetHeight}
          onAttack={onAttack}
          canAttack={canAttack}
          onCastSpell={(card, target) => onPlayCard(card, target)}
        />
        <HandLayer
          hand={player.hand}
          canPlay={canPlayCard}
          onPlay={(card) => onPlayCard(card)}
          width={targetWidth}
          height={targetHeight}
        />
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
