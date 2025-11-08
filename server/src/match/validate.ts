import type {
  CardPlacement,
  GameState,
  MinionCard,
  PlayerSide,
  SpellCard,
  TargetDescriptor
} from '@cardstone/shared/types.js';
import {
  getTargetingPredicate,
  hasTauntOnBoard,
  targetMatchesSelector
} from '@cardstone/shared/targeting';
import {
  actionRequiresTarget,
  getActionTargetSelector,
  getEffectsByTrigger,
  getPrimaryPlayAction,
  hasTaunt
} from '@cardstone/shared/effects';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function assertPlayersTurn(state: GameState, side: PlayerSide): void {
  if (state.turn.current !== side) {
    throw new ValidationError('Not your turn');
  }
}

export function validatePlayCard(
  state: GameState,
  side: PlayerSide,
  cardInstanceId: string,
  target?: TargetDescriptor,
  _placement?: CardPlacement
): void {
  assertPlayersTurn(state, side);
  if (state.turn.phase !== 'Main') {
    throw new ValidationError('Cannot play cards right now');
  }
  const player = state.players[side];
  const handCard = player.hand.find((c) => c.instanceId === cardInstanceId);
  if (!handCard) {
    throw new ValidationError('Card missing from hand');
  }
  if (handCard.card.cost > player.mana.current) {
    throw new ValidationError('Not enough mana');
  }
  if (handCard.card.type === 'Spell') {
    validateSpellTarget(state, side, handCard.card, target);
  } else if (handCard.card.type === 'Minion') {
    validateMinionTarget(state, side, handCard.card, target);
  }
}

function validateSpellTarget(
  state: GameState,
  actingSide: PlayerSide,
  card: SpellCard,
  target: TargetDescriptor | undefined
): void {
  const action = getPrimaryPlayAction(card);
  if (!action || !actionRequiresTarget(action)) {
    return;
  }
  if (!target) {
    throw new ValidationError('Target required');
  }

  assertTargetExists(state, target);

  const predicate = getTargetingPredicate({ kind: 'spell', action }, actingSide);
  if (!predicate(target)) {
    throw new ValidationError('Invalid target for spell');
  }

  const selector = getActionTargetSelector(action);
  if (selector && !targetMatchesSelector(target, selector, actingSide)) {
    throw new ValidationError('Invalid target for spell');
  }
}

function validateMinionTarget(
  state: GameState,
  actingSide: PlayerSide,
  card: MinionCard,
  target: TargetDescriptor | undefined
): void {
  const effects = getEffectsByTrigger(card, 'Battlecry');
  for (const effect of effects) {
    const action = effect.action;
    if (!actionRequiresTarget(action)) {
      continue;
    }
    const selector = getActionTargetSelector(action);
    if (!selector) {
      continue;
    }
    if (selector === 'Hero' || selector === 'Self') {
      continue;
    }
    if (!target) {
      throw new ValidationError('Target required');
    }
    assertTargetExists(state, target);
    if (!targetMatchesSelector(target, selector, actingSide)) {
      throw new ValidationError('Invalid target for minion effect');
    }
  }
}

function assertTargetExists(state: GameState, target: TargetDescriptor): void {
  if (target.type === 'hero') {
    if (!state.players[target.side]) {
      throw new ValidationError('Target hero not found');
    }
    return;
  }
  const board = state.board[target.side];
  if (!board.find((entity) => entity.instanceId === target.entityId)) {
    throw new ValidationError('Target minion not found');
  }
}

export function validateEndTurn(state: GameState, side: PlayerSide): void {
  assertPlayersTurn(state, side);
  if (state.turn.phase !== 'Main') {
    throw new ValidationError('Cannot end turn from this phase');
  }
}

export function validateAttack(
  state: GameState,
  side: PlayerSide,
  attackerId: string,
  target: TargetDescriptor
): void {
  assertPlayersTurn(state, side);
  if (state.turn.phase !== 'Main') {
    throw new ValidationError('Cannot attack right now');
  }

  const attacker = state.board[side].find((entity) => entity.instanceId === attackerId);
  if (!attacker) {
    throw new ValidationError('Attacking minion not found');
  }
  if (attacker.attack <= 0) {
    throw new ValidationError('This minion cannot attack');
  }
  if (attacker.attacksRemaining <= 0) {
    throw new ValidationError('This minion has already attacked');
  }

  const opponentSide: PlayerSide = side === 'A' ? 'B' : 'A';
  const opponentHasTaunt = hasTauntOnBoard(state, opponentSide);

  if (target.type === 'hero') {
    if (target.side === side) {
      throw new ValidationError('Cannot attack your own hero');
    }
    if (!state.players[target.side]) {
      throw new ValidationError('Target hero not found');
    }
    if (opponentHasTaunt) {
      throw new ValidationError('Must attack taunt minions first');
    }
    return;
  }

  if (target.side === side) {
    throw new ValidationError('Cannot attack your own minions');
  }
  const defender = state.board[target.side].find((entity) => entity.instanceId === target.entityId);
  if (!defender) {
    throw new ValidationError('Target minion not found');
  }
  if (opponentHasTaunt && !hasTaunt(defender.card)) {
    throw new ValidationError('Must attack taunt minions first');
  }
}
