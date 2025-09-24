import { Stage, Container } from '@pixi/react';
import type { CardInHand, GameState, PlayerSide } from '@cardstone/shared/types.js';
import Background from './layers/Background';
import Board from './layers/Board';
import HandLayer from './layers/Hand';
import Effects from './layers/Effects';

interface StageRootProps {
  state: GameState | null;
  playerSide: PlayerSide | null;
  onPlayCard: (card: CardInHand) => void;
  canPlayCard: (card: CardInHand) => boolean;
}

const WIDTH = 1024;
const HEIGHT = 640;

export default function StageRoot({ state, playerSide, onPlayCard, canPlayCard }: StageRootProps) {
  if (!state || !playerSide) {
    return (
      <Stage width={WIDTH} height={HEIGHT} options={{ backgroundAlpha: 0 }}>
        <Background width={WIDTH} height={HEIGHT} />
      </Stage>
    );
  }
  const player = state.players[playerSide];
  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';
  const opponent = state.players[opponentSide];

  return (
    <Stage width={WIDTH} height={HEIGHT} options={{ backgroundAlpha: 0 }}>
      <Background width={WIDTH} height={HEIGHT} />
      <Container>
        <Board state={state} playerSide={playerSide} width={WIDTH} height={HEIGHT} />
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
      </Container>
    </Stage>
  );
}
