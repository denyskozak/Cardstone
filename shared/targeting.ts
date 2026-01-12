import type {
  EffectAction,
  GameState,
  PlayerSide,
  TargetDescriptor,
  TargetSelector
} from './types.js';
import { getActionTargetSelector, hasTaunt } from './effects.js';

export type TargetingSource =
  | { kind: 'minion' }
  | { kind: 'spell'; action: EffectAction };

export type TargetingPredicate = (target: TargetDescriptor) => boolean;

export function getTargetingPredicate(
  source: TargetingSource,
  actingSide: PlayerSide,
  state?: GameState
): TargetingPredicate {
  if (source.kind === 'minion') {
    return (target) => {
      if (target.side === actingSide) {
        return false;
      }
      if (!state) {
        return true;
      }

      const defendingBoard = state.board[target.side];
      const hasTauntMinion = defendingBoard.some((entity) => hasTaunt(entity.card));
      if (!hasTauntMinion) {
        return true;
      }

      if (target.type !== 'minion') {
        return false;
      }

      const defender = defendingBoard.find((entity) => entity.instanceId === target.entityId);
      return Boolean(defender && hasTaunt(defender.card));
    };
  }

  return getSpellTargetingPredicate(source.action, actingSide);
}

export function hasTauntOnBoard(state: GameState, side: PlayerSide): boolean {
  return state.board[side].some((entity) => hasTaunt(entity.card));
}

export function targetMatchesSelector(
  target: TargetDescriptor,
  selector: TargetSelector,
  actingSide: PlayerSide
): boolean {
  switch (selector) {
    case 'Self':
      return target.type === 'hero' && target.side === actingSide;
    case 'FriendlyMinion':
      return target.type === 'minion' && target.side === actingSide;
    case 'EnemyMinion':
      return target.type === 'minion' && target.side !== actingSide;
    case 'AnyMinion':
      return target.type === 'minion';
    case 'Hero':
      return target.type === 'hero';
    case 'AllEnemies':
    case 'RandomEnemy':
      return target.side !== actingSide;
    case 'RandomMinion':
      return target.type === 'minion';
    case 'AllFriendlies':
      return target.side === actingSide;
    default:
      throw new Error('Unhandled target selector');
  }
}

function getSpellTargetingPredicate(
  action: EffectAction,
  actingSide: PlayerSide
): TargetingPredicate {
  const selector = getActionTargetSelector(action);
  if (!selector) {
    return () => false;
  }
  return (target) => targetMatchesSelector(target, selector, actingSide);
}
