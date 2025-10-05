import type {
  CardDefinition,
  Effect,
  EffectAction,
  EffectTrigger,
  SpellCard,
  TargetSelector
} from './types.js';

export type EffectTriggerType = EffectTrigger['type'];

export function getCardEffects(card: CardDefinition): Effect[] {
  return card.effects ?? [];
}

export function getEffectsByTrigger(
  card: CardDefinition,
  triggerType: EffectTriggerType
): Effect[] {
  return getCardEffects(card).filter((effect) => effect.trigger.type === triggerType);
}

export function getFirstActionByTrigger(
  card: CardDefinition,
  triggerType: EffectTriggerType
): EffectAction | undefined {
  const effect = getEffectsByTrigger(card, triggerType)[0];
  return effect?.action;
}

export function getPrimaryPlayAction(card: SpellCard): EffectAction | undefined {
  return getFirstActionByTrigger(card, 'Play');
}

export function hasCustomEffect(card: CardDefinition, key: string): boolean {
  return getCardEffects(card).some(
    (effect) => effect.action.type === 'Custom' && effect.action.key === key
  );
}

export function hasTaunt(card: CardDefinition): boolean {
  return getCardEffects(card).some(
    (effect) => effect.trigger.type === 'Aura' && effect.action.type === 'Custom' && effect.action.key === 'Taunt'
  );
}

export function hasDivineShield(card: CardDefinition): boolean {
  return getCardEffects(card).some(
    (effect) =>
      effect.trigger.type === 'Aura' && effect.action.type === 'Custom' && effect.action.key === 'DivineShield'
  );
}

export function getBerserkAttackBonus(card: CardDefinition): number | undefined {
  const effect = getCardEffects(card).find(
    (candidate) =>
      candidate.trigger.type === 'Aura' &&
      candidate.action.type === 'Custom' &&
      candidate.action.key === 'Berserk'
  );
  if (!effect) {
    return undefined;
  }
  const data = (effect.action as { data?: { attack?: number } }).data;
  const bonus = data?.attack;
  if (typeof bonus === 'number') {
    return bonus;
  }
  return 2;
}

export function actionRequiresTarget(action: EffectAction): boolean {
  switch (action.type) {
    case 'Damage':
    case 'Heal':
      return true;
    case 'Buff':
      return action.target !== 'Self';
    case 'Summon':
      return false;
    case 'DrawCard':
    case 'ManaCrystal':
    case 'Custom':
      return false;
    default:
      throw new Error('Unhandled effect action type');
  }
}

export function getActionTargetSelector(action: EffectAction): TargetSelector | undefined {
  switch (action.type) {
    case 'Damage':
    case 'Heal':
    case 'Buff':
      return action.target;
    default:
      return undefined;
  }
}
