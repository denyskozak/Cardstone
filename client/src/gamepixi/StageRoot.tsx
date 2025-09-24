import type { CardInHand, GameState, MinionEntity, PlayerSide, TargetDescriptor } from '@cardstone/shared/types';
import Background from './layers/Background';
import Board from './layers/Board';
import HandLayer from './layers/Hand';
import Effects from './layers/Effects';
import { useApplication } from '@pixi/react';

interface StageRootProps {
  state: GameState | null;
  playerSide: PlayerSide | null;
  onPlayCard: (card: CardInHand) => void;
  canPlayCard: (card: CardInHand) => boolean;
  onAttack: (attackerId: string, target: TargetDescriptor) => void;
  canAttack: (minion: MinionEntity) => boolean;
}

const WIDTH = 1024;
const HEIGHT = 640;

export default function StageRoot({
  state,
  playerSide,
  onPlayCard,
  canPlayCard,
  onAttack,
  canAttack
}: StageRootProps) {
  const { app } = useApplication();
  window.__PIXI_DEVTOOLS__ = {
    app: app,
  };
  if (!state || !playerSide) {
    return (
      <pixiContainer width={WIDTH} height={HEIGHT} options={{ backgroundAlpha: 0 }}>
        <Background width={WIDTH} height={HEIGHT} />
      </pixiContainer>
    );
  }
  const player = state.players[playerSide];
  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';
  const opponent = state.players[opponentSide];

  return (
    <pixiContainer width={WIDTH} height={HEIGHT} options={{ backgroundAlpha: 0 }}>
      <Background width={WIDTH} height={HEIGHT} />
      <pixiContainer>
        <Board
          state={state}
          playerSide={playerSide}
          width={WIDTH}
          height={HEIGHT}
          onAttack={onAttack}
          canAttack={canAttack}
        />
        <HandLayer
          hand={player.hand}
          canPlay={canPlayCard}
          onPlay={onPlayCard}
          width={WIDTH}
          height={HEIGHT}
        />
        <Effects
          player={player}
          opponent={opponent}
          width={WIDTH}
          height={HEIGHT}
        />
      </pixiContainer>
    </pixiContainer>
  );
}
