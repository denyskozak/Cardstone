import type { GameState, PlayerSide, SpellCard, TargetDescriptor } from './types.js';

type SpellEffect = SpellCard['effect'];

export type TargetingSource =
  | { kind: 'minion' }
  | { kind: 'spell'; effect: SpellEffect };

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
      const hasTaunt = defendingBoard.some((entity) => entity.card.effect === 'taunt');
      if (!hasTaunt) {
        return true;
      }

      if (target.type !== 'minion') {
        return false;
      }

      const defender = defendingBoard.find((entity) => entity.instanceId === target.entityId);
      return Boolean(defender && defender.card.effect === 'taunt');
    };
  }

  return getSpellTargetingPredicate(source.effect, actingSide);
}

export function hasTauntOnBoard(state: GameState, side: PlayerSide): boolean {
  return state.board[side].some((entity) => entity.card.effect === 'taunt');
}

function getSpellTargetingPredicate(effect: SpellEffect, actingSide: PlayerSide): TargetingPredicate {
  switch (effect) {
    case 'Firebolt':
      return (target) => target.side !== actingSide;
    case 'Heal':
      return (target) => target.side === actingSide;
    case 'Coin':
      return () => false;
    default: {
      const exhaustive: never = effect;
      throw new Error(`Unhandled spell effect: ${exhaustive}`);
    }
  }
}
