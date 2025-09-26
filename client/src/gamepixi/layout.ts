import type { GameState, MinionEntity, PlayerSide } from '@cardstone/shared/types';

export const MINION_WIDTH = 120;
export const MINION_HEIGHT = 140;
export const MINION_ART_INSET_X = 2;
export const MINION_ART_INSET_Y = 6;
export const MINION_HORIZONTAL_GAP = 20;

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
  const boardTopY = height * 0.2;
  const boardBottomY = height * 0.55;
  const laneWidth = width - 200;
  const laneX = (width - laneWidth) / 2;

  return { boardTopY, boardBottomY, laneWidth, laneX };
}

function computeRowPositions(
  minions: MinionEntity[],
  laneX: number,
  y: number
): Record<string, EntityPosition> {
  const positions: Record<string, EntityPosition> = {};
  minions.forEach((entity, index) => {
    const x = laneX + index * (MINION_WIDTH + MINION_HORIZONTAL_GAP);
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

  minions[playerSide] = computeRowPositions(state.board[playerSide], geometry.laneX, geometry.boardBottomY);
  minions[opponentSide] = computeRowPositions(state.board[opponentSide], geometry.laneX, geometry.boardTopY);

  const heroes: Record<PlayerSide, EntityPosition> = {
    A:
      playerSide === 'A'
        ? { x: 40, y: geometry.boardBottomY + MINION_HEIGHT - 20 }
        : { x: 40, y: geometry.boardTopY - 80 },
    B:
      playerSide === 'B'
        ? { x: 40, y: geometry.boardBottomY + MINION_HEIGHT - 20 }
        : { x: 40, y: geometry.boardTopY - 80 }
  };

  return { minions, heroes };
}
