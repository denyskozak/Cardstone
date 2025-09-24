import type { PlayerSide, SpellCard, TargetDescriptor } from './types.js';

type SpellEffect = SpellCard['effect'];

export type TargetingSource =
  | { kind: 'minion' }
  | { kind: 'spell'; effect: SpellEffect };

export type TargetingPredicate = (target: TargetDescriptor) => boolean;

export function getTargetingPredicate(
  source: TargetingSource,
  actingSide: PlayerSide
): TargetingPredicate {
  if (source.kind === 'minion') {
    return (target) => target.side !== actingSide;
  }

  return getSpellTargetingPredicate(source.effect, actingSide);
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
