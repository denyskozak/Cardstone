import type { GameState, PlayerSide, TargetDescriptor } from '@cardstone/shared/types.js';

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
  target?: TargetDescriptor
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
    validateSpellTarget(state, handCard.card.effect, target);
  }
}

function validateSpellTarget(
  state: GameState,
  effect: string,
  target: TargetDescriptor | undefined
): void {
  if (effect === 'Coin') {
    return;
  }
  if (!target) {
    throw new ValidationError('Target required');
  }
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
  if (attacker.attacksRemaining <= 0) {
    throw new ValidationError('This minion has already attacked');
  }

  if (target.type === 'hero') {
    if (target.side === side) {
      throw new ValidationError('Cannot attack your own hero');
    }
    if (!state.players[target.side]) {
      throw new ValidationError('Target hero not found');
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
}
