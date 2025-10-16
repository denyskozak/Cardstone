import { randomUUID } from 'node:crypto';
import {
  type CardPlacement,
  type EffectAction,
  type GameState,
  type MinionCard,
  type MinionEntity,
  type PlayerSide,
  type SpellCard,
  type TargetDescriptor
} from '@cardstone/shared/types';
import { getCardDefinition } from '@cardstone/shared/cards/demo';
import { CARD_IDS, DRAW_PER_TURN, MATCH_CONFIG } from '@cardstone/shared/constants';
import { getTargetingPredicate, targetMatchesSelector } from '@cardstone/shared/targeting';
import {
  actionRequiresTarget,
  getActionTargetSelector,
  getEffectsByTrigger,
  getBerserkAttackBonus,
  hasDivineShield
} from '@cardstone/shared/effects';

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
  if (player.hand.length >= MATCH_CONFIG.handLimit) {
    player.graveyard.push(cardId);
    return;
  }
  player.hand.push({
    instanceId: randomUUID(),
    card: definition
  });
}

export function startTurn(state: GameState, side: PlayerSide): void {
  determineMatchWinner(state);
  if (state.winner) {
    return;
  }
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
  determineMatchWinner(state);
  if (state.winner) {
    return;
  }
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
  determineMatchWinner(state);
  if (state.winner) {
    return;
  }
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
  } else if (handCard.card.type === 'Spell') {
    resolveSpell(state, side, handCard.card, target);
    player.graveyard.push(handCard.card.id);
  } else {
    throw new Error(`Unsupported card type ${handCard.card.type}`);
  }
}

function summonMinion(
  state: GameState,
  side: PlayerSide,
  card: MinionCard,
  placement: CardPlacement | undefined
): void {
  const minion: MinionEntity = {
    instanceId: randomUUID(),
    card,
    attack: card.attack,
    health: card.health,
    maxHealth: card.health,
    attacksRemaining: 0,
    divineShield: hasDivineShield(card)
  };

  if (placement === 'left') {
    state.board[side].unshift(minion);
  } else {
    state.board[side].push(minion);
  }

  applySummonEffects(state, side, minion);
}

function applySummonEffects(state: GameState, side: PlayerSide, minion: MinionEntity): void {
  const effects = [
    ...getEffectsByTrigger(minion.card, 'Battlecry'),
    ...getEffectsByTrigger(minion.card, 'Play')
  ];
  for (const effect of effects) {
    if (actionRequiresTarget(effect.action)) {
      throw new Error('Summon effect requires a target which is not supported yet');
    }
    executeEffectAction(state, side, effect.action);
  }
}

function executeEffectAction(
  state: GameState,
  side: PlayerSide,
  action: EffectAction,
  target?: TargetDescriptor
): void {
  switch (action.type) {
    case 'Damage':
      if (!target) {
        throw new Error('Target required for damage effect');
      }
      applyDamage(state, target, action.amount, side);
      return;
    case 'Heal':
      if (!target) {
        throw new Error('Target required for heal effect');
      }
      applyHeal(state, target, action.amount);
      return;
    case 'DrawCard':
      for (let i = 0; i < action.amount; i += 1) {
        drawCard(state, side);
      }
      return;
    case 'ManaCrystal':
      applyManaCrystal(state, side, action.amount);
      return;
    case 'Buff':
      if (!target) {
        throw new Error('Target required for buff effect');
      }
      applyBuff(state, target, action.stats);
      return;
    case 'Summon':
      if (action.target !== 'Board') {
        throw new Error('Unsupported summon target');
      }
      for (let i = 0; i < action.count; i += 1) {
        const definition = getCardDefinition(action.cardId);
        if (definition.type !== 'Minion') {
          throw new Error('Only minions can be summoned onto the board');
        }
        summonMinion(state, side, definition, undefined);
      }
      return;
    case 'Custom':
      return;
    default:
      throw new Error('Unhandled effect action');
  }
}

function applyBuff(
  state: GameState,
  target: TargetDescriptor,
  stats: { attack?: number; health?: number }
): void {
  if (target.type !== 'minion') {
    throw new Error('Buff effects can only target minions');
  }
  const minions = state.board[target.side];
  const entity = minions.find((m) => m.instanceId === target.entityId);
  if (!entity) {
    throw new Error('Target minion missing');
  }
  if (typeof stats.attack === 'number') {
    entity.attack += stats.attack;
  }
  if (typeof stats.health === 'number') {
    entity.health += stats.health;
    entity.maxHealth += stats.health;
    if (entity.health > entity.maxHealth) {
      entity.health = entity.maxHealth;
    }
  }
  updateBerserkState(entity);
}

function resolveSpell(
  state: GameState,
  side: PlayerSide,
  card: SpellCard,
  target?: TargetDescriptor
): void {
  const effects = getEffectsByTrigger(card, 'Play');
  for (const effect of effects) {
    const action = effect.action;
    if (actionRequiresTarget(action)) {
      if (!target) {
        throw new Error('Target required for spell effect');
      }
      assertSpellTargetAllowed(state, side, action, target);
      executeEffectAction(state, side, action, target);
    } else {
      executeEffectAction(state, side, action);
    }
  }
}

function assertSpellTargetAllowed(
  state: GameState,
  actingSide: PlayerSide,
  action: EffectAction,
  target: TargetDescriptor
): void {
  const predicate = getTargetingPredicate({ kind: 'spell', action }, actingSide);
  if (!predicate(target)) {
    throw new Error('Invalid target for spell effect');
  }
  const selector = getActionTargetSelector(action);
  if (!selector) {
    throw new Error('Spell action does not take a target');
  }
  if (!targetMatchesSelector(target, selector, actingSide)) {
    throw new Error('Invalid target for spell effect');
  }
  if (target.type === 'hero') {
    if (!state.players[target.side]) {
      throw new Error('Target hero not found');
    }
    return;
  }
  const board = state.board[target.side];
  if (!board.find((entity) => entity.instanceId === target.entityId)) {
    throw new Error('Target minion not found');
  }
}

function applyDamage(state: GameState, target: TargetDescriptor, amount: number, source: PlayerSide): void {
  if (target.type === 'hero') {
    const hero = state.players[target.side].hero;
    hero.hp = Math.max(0, hero.hp - amount);
    if (hero.hp <= 0 && !state.winner) {
      state.winner = source;
    }
    determineMatchWinner(state);
    return;
  }

  const minions = state.board[target.side];
  const entity = minions.find((m) => m.instanceId === target.entityId);
  if (!entity) {
    throw new Error('Target minion missing');
  }
  if (amount > 0 && entity.divineShield) {
    entity.divineShield = false;
    return;
  }
  entity.health -= amount;
  if (entity.health <= 0) {
    removeMinion(state, target.side, target.entityId);
    return;
  }
  updateBerserkState(entity);
}

function determineMatchWinner(state: GameState): void {
  if (state.winner) {
    return;
  }
  const heroADead = state.players.A.hero.hp <= 0;
  const heroBDead = state.players.B.hero.hp <= 0;
  if (heroADead && !heroBDead) {
    state.winner = 'B';
  } else if (heroBDead && !heroADead) {
    state.winner = 'A';
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
  const maxHealth = entity.maxHealth ?? entity.card.health;
  entity.health = Math.min(maxHealth, entity.health + amount);
  updateBerserkState(entity);
}

function applyManaCrystal(state: GameState, side: PlayerSide, amount: number): void {
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
  determineMatchWinner(state);
  if (state.winner) {
    return;
  }
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

function updateBerserkState(entity: MinionEntity): void {
  const bonus = getBerserkAttackBonus(entity.card);
  if (!bonus) {
    return;
  }
  const maxHealth = entity.maxHealth ?? entity.card.health;
  const isDamaged = entity.health < maxHealth;
  const active = Boolean(entity.berserkActive);
  if (isDamaged && !active) {
    entity.attack += bonus;
    entity.berserkActive = true;
  } else if (!isDamaged && active) {
    entity.attack -= bonus;
    entity.berserkActive = false;
  }
}
