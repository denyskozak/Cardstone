import type { PlayerState } from '@cardstone/shared/types';

interface EffectsProps {
  player: PlayerState;
  opponent: PlayerState;
  width: number;
  height: number;
}

export default function Effects({ player, opponent, width, height }: EffectsProps) {
  return (
    <pixiContainer>
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
