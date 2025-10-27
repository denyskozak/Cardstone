import type { GameState, MinionEntity, PlayerSide } from '@cardstone/shared/types';

export const MINION_WIDTH = 96;
export const MINION_HEIGHT = 112;
export const MINION_ART_INSET_X = 2;
export const MINION_ART_INSET_Y = 6;
export const MINION_HORIZONTAL_GAP = 24;

export interface BoardLaneGeometry {
  boardTopY: number;
  boardBottomY: number;
  laneWidth: number;
  laneX: number;
}

export interface EntityPosition {
  x: number;
  y: number;
}

export interface BoardEntityLayout {
  minions: Record<PlayerSide, Record<string, EntityPosition>>;
  heroes: Record<PlayerSide, EntityPosition>;
}

export function getBoardLaneGeometry(width: number, height: number): BoardLaneGeometry {
  const centerY = height * 0.425;
  const topOffset = (centerY - height * 0.35) * 1.2;
  const bottomOffset = (height * 0.5 - centerY) * 1.2;
  const boardTopY = centerY - topOffset;
  const boardBottomY = centerY + bottomOffset;
  const laneWidth = width - 200;
  const laneX = (width - laneWidth) / 2;

  return { boardTopY, boardBottomY, laneWidth, laneX };
}

function computeRowPositions(
  minions: MinionEntity[],
  laneX: number,
  laneWidth: number,
  y: number
): Record<string, EntityPosition> {
  const positions: Record<string, EntityPosition> = {};
  const count = minions.length;
  const rowWidth = count > 0 ? count * MINION_WIDTH + (count - 1) * MINION_HORIZONTAL_GAP : 0;
  const startX = laneX + (laneWidth - rowWidth) / 2;
  minions.forEach((entity, index) => {
    const x = startX + index * (MINION_WIDTH + MINION_HORIZONTAL_GAP);
    positions[entity.instanceId] = {
      x: x + MINION_WIDTH / 2,
      y: y + MINION_HEIGHT / 2
    };
  });
  return positions;
}

export function computeBoardLayout(
  state: GameState,
  playerSide: PlayerSide,
  width: number,
  height: number
): BoardEntityLayout {
  const geometry = getBoardLaneGeometry(width, height);
  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';

  const minions: Record<PlayerSide, Record<string, EntityPosition>> = {
    A: {},
    B: {}
  };

  minions[playerSide] = computeRowPositions(
    state.board[playerSide],
    geometry.laneX,
    geometry.laneWidth,
    geometry.boardBottomY
  );
  minions[opponentSide] = computeRowPositions(
    state.board[opponentSide],
    geometry.laneX,
    geometry.laneWidth,
    geometry.boardTopY
  );

  const playerHeroPosition: EntityPosition = {
    x: geometry.laneX + geometry.laneWidth / 2 - 5,
    y: geometry.boardBottomY + MINION_HEIGHT + 70
  };

  const opponentHeroPosition: EntityPosition = {
    x: geometry.laneX + geometry.laneWidth / 2 - 10,
    y: geometry.boardTopY - 100
  };

  const heroes: Record<PlayerSide, EntityPosition> =
    playerSide === 'A'
      ? { A: playerHeroPosition, B: opponentHeroPosition }
      : { A: opponentHeroPosition, B: playerHeroPosition };

  return { minions, heroes };
}
