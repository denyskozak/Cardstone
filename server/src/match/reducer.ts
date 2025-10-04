import { randomUUID } from 'node:crypto';
import {
  type CardPlacement,
  type GameState,
  type MinionCard,
  type MinionEntity,
  type PlayerSide,
  type SpellCard,
  type TargetDescriptor
} from '@cardstone/shared/types';
import { getCardDefinition } from '@cardstone/shared/cards/demo';
import { CARD_IDS, DRAW_PER_TURN, MATCH_CONFIG } from '@cardstone/shared/constants';
import { getTargetingPredicate } from '@cardstone/shared/targeting';

export function gainMana(state: GameState, side: PlayerSide): void {
  const player = state.players[side];
  player.mana.max = Math.min(MATCH_CONFIG.maxMana, player.mana.max + 1);
  player.mana.current = player.mana.max;
  player.mana.temporary = 0;
}

export function drawCard(state: GameState, side: PlayerSide): void {
  const player = state.players[side];
  const cardId = player.deck.shift();
  if (!cardId) {
    return;
  }
  const definition = getCardDefinition(cardId);
  player.hand.push({
    instanceId: randomUUID(),
    card: definition
  });
}

export function startTurn(state: GameState, side: PlayerSide): void {
  gainMana(state, side);
  for (let i = 0; i < DRAW_PER_TURN; i += 1) {
    drawCard(state, side);
  }
  for (const minion of state.board[side]) {
    minion.attacksRemaining = 1;
  }
  state.turn.phase = 'Main';
}

export function endTurn(state: GameState, side: PlayerSide): void {
  const player = state.players[side];
  const temporary = player.mana.temporary ?? 0;
  if (temporary > 0) {
    player.mana.current = Math.max(0, player.mana.current - temporary);
    player.mana.temporary = 0;
  }
  state.turn.phase = 'End';
  state.turn.current = side === 'A' ? 'B' : 'A';
  state.turn.turnNumber += 1;
  state.turn.phase = 'Start';
}

export function applyPlayCard(
  state: GameState,
  side: PlayerSide,
  cardInstanceId: string,
  target?: TargetDescriptor,
  placement?: CardPlacement
): void {
  const player = state.players[side];
  const handIndex = player.hand.findIndex((card) => card.instanceId === cardInstanceId);
  if (handIndex === -1) {
    throw new Error('Card not found in hand');
  }
  const handCard = player.hand[handIndex];
  if (handCard.card.cost > player.mana.current) {
    throw new Error('Not enough mana');
  }
  player.mana.current -= handCard.card.cost;
  player.hand.splice(handIndex, 1);

  if (handCard.card.type === 'Minion') {
    summonMinion(state, side, handCard.card, placement);
  } else {
    resolveSpell(state, side, handCard.card, target);
    player.graveyard.push(handCard.card.id);
  }
}

function summonMinion(
  state: GameState,
  side: PlayerSide,
  card: MinionCard,
  placement: CardPlacement | undefined
): void {
  const minion = {
    instanceId: randomUUID(),
    card,
    attack: card.attack,
    health: card.health,
    attacksRemaining: 0
  };

  if (placement === 'left') {
    state.board[side].unshift(minion);
  } else {
    state.board[side].push(minion);
  }

  applySummonEffects(state, side, minion);
}

function applySummonEffects(state: GameState, side: PlayerSide, minion: MinionEntity): void {
  switch (minion.card.effect) {
    case 'take_card':
      drawCard(state, side);
      break;
    default:
      break;
  }
}

function resolveSpell(
  state: GameState,
  side: PlayerSide,
  card: SpellCard,
  target?: TargetDescriptor
): void {
  switch (card.effect) {
    case 'Firebolt':
      if (!target) {
        throw new Error('Firebolt requires target');
      }
      assertSpellTargetAllowed(side, card.effect, target);
      applyDamage(state, target, card.amount ?? 0, side);
      break;
    case 'Heal':
      if (!target) {
        throw new Error('Heal requires target');
      }
      assertSpellTargetAllowed(side, card.effect, target);
      applyHeal(state, target, card.amount ?? 0);
      break;
    case 'Coin':
      applyCoin(state, side, card.amount ?? 1);
      break;
    default:
      const effect: never = card.effect;
      throw new Error(`Unhandled spell effect ${effect}`);
  }
}

function assertSpellTargetAllowed(
  actingSide: PlayerSide,
  effect: SpellCard['effect'],
  target: TargetDescriptor
): void {
  const predicate = getTargetingPredicate({ kind: 'spell', effect }, actingSide);
  if (!predicate(target)) {
    throw new Error('Invalid target for spell effect');
  }
}

function applyDamage(state: GameState, target: TargetDescriptor, amount: number, source: PlayerSide): void {
  if (target.type === 'hero') {
    const hero = state.players[target.side].hero;
    hero.hp -= amount;
    if (hero.hp <= 0) {
      state.winner = source;
    }
    return;
  }

  const minions = state.board[target.side];
  const entity = minions.find((m) => m.instanceId === target.entityId);
  if (!entity) {
    throw new Error('Target minion missing');
  }
  entity.health -= amount;
  if (entity.health <= 0) {
    removeMinion(state, target.side, target.entityId);
  }
}

function applyHeal(state: GameState, target: TargetDescriptor, amount: number): void {
  if (target.type === 'hero') {
    const hero = state.players[target.side].hero;
    hero.hp = Math.min(hero.maxHp, hero.hp + amount);
    return;
  }
  const minions = state.board[target.side];
  const entity = minions.find((m) => m.instanceId === target.entityId);
  if (!entity) {
    throw new Error('Target minion missing');
  }
  entity.health += amount;
}

function applyCoin(state: GameState, side: PlayerSide, amount: number): void {
  const player = state.players[side];
  player.mana.current += amount;
  player.mana.temporary = (player.mana.temporary ?? 0) + amount;
  player.ownsCoin = false;
}

function removeMinion(state: GameState, side: PlayerSide, entityId: string): void {
  const minions = state.board[side];
  const index = minions.findIndex((m) => m.instanceId === entityId);
  if (index >= 0) {
    const [dead] = minions.splice(index, 1);
    state.players[side].graveyard.push(dead.card.id);
  }
}

export function isCoin(cardId: string): boolean {
  return cardId === CARD_IDS.coin;
}

export function applyAttack(
  state: GameState,
  side: PlayerSide,
  attackerId: string,
  target: TargetDescriptor
): void {
  const attackers = state.board[side];
  const attacker = attackers.find((entity) => entity.instanceId === attackerId);
  if (!attacker) {
    throw new Error('Attacker not found');
  }
  if (attacker.attack <= 0) {
    throw new Error('Attacker cannot attack');
  }
  if (attacker.attacksRemaining <= 0) {
    throw new Error('Attacker has no attacks remaining');
  }

  attacker.attacksRemaining = Math.max(0, attacker.attacksRemaining - 1);

  if (target.type === 'hero') {
    applyDamage(state, target, attacker.attack, side);
    return;
  }

  const defenders = state.board[target.side];
  const defender = defenders.find((entity) => entity.instanceId === target.entityId);
  if (!defender) {
    throw new Error('Defender not found');
  }

  const retaliation = defender.attack;
  applyDamage(state, target, attacker.attack, side);

  const attackerTarget: TargetDescriptor = { type: 'minion', side, entityId: attackerId };
  applyDamage(state, attackerTarget, retaliation, target.side);
}
