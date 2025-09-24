import type { GameState, PlayerSide } from '@cardstone/shared/types';

interface BoardProps {
  state: GameState;
  playerSide: PlayerSide;
  width: number;
  height: number;
}

const MINION_WIDTH = 100;
const MINION_HEIGHT = 100;

export default function Board({ state, playerSide, width, height }: BoardProps) {
  const boardTopY = height * 0.2;
  const boardBottomY = height * 0.55;
  const laneWidth = width - 200;
  const laneX = (width - laneWidth) / 2;

  const renderRow = (side: PlayerSide, y: number) => {
    const minions = state.board[side];
    return minions.map((entity, index) => {
      const x = laneX + index * (MINION_WIDTH + 20);
      return (
        <pixiContainer key={entity.instanceId} x={x} y={y}>
          <pixiGraphics
            draw={(g) => {
              g.clear();
              g.beginFill(side === playerSide ? 0x0984e3 : 0xd63031, 0.8);
              g.drawRoundedRect(0, 0, MINION_WIDTH, MINION_HEIGHT, 12);
              g.endFill();
            }}
          />
          <pixiText text={entity.card.name} x={8} y={12} style={{ fill: 0xffffff, fontSize: 14 }} />
          <pixiText
            text={`${entity.attack}`}
            x={8}
            y={MINION_HEIGHT - 28}
            style={{ fill: 0xffd166, fontSize: 18 }}
          />
          <pixiText
            text={`${entity.health}`}
            x={MINION_WIDTH - 36}
            y={MINION_HEIGHT - 28}
            style={{ fill: 0xff6b6b, fontSize: 18 }}
          />
        </pixiContainer>
      );
    });
  };

  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';
  const opponentHero = state.players[opponentSide];
  const playerHero = state.players[playerSide];

  return (
    <pixiContainer>
      <pixiGraphics
        draw={(g) => {
          g.clear();
          g.lineStyle(2, 0xffffff, 0.2);
          g.drawRoundedRect(laneX, boardTopY - 20, laneWidth, MINION_HEIGHT + 40, 20);
          g.drawRoundedRect(laneX, boardBottomY - 20, laneWidth, MINION_HEIGHT + 40, 20);
        }}
      />
      <pixiContainer x={40} y={boardTopY - 80}>
        <pixiGraphics
          draw={(g) => {
            g.clear();
            g.beginFill(0xd63031, 0.8);
            g.drawCircle(0, 0, 48);
            g.endFill();
          }}
        />
        <pixiText text={`HP ${opponentHero.hero.hp}`} x={-36} y={-12} style={{ fill: 0xffffff, fontSize: 18 }} />
      </pixiContainer>
      <pixiContainer x={40} y={boardBottomY + MINION_HEIGHT - 20}>
        <pixiGraphics
          draw={(g) => {
            g.clear();
            g.beginFill(0x0984e3, 0.8);
            g.drawCircle(0, 0, 48);
            g.endFill();
          }}
        />
        <pixiText text={`HP ${playerHero.hero.hp}`} x={-36} y={-12} style={{ fill: 0xffffff, fontSize: 18 }} />
      </pixiContainer>
      {renderRow(opponentSide, boardTopY)}
      {renderRow(playerSide, boardBottomY)}
    </pixiContainer>
  );
}
