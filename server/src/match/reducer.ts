import { randomUUID } from 'node:crypto';
import {
  type CardPlacement,
  type EffectAction,
  type GameState,
  type MinionCard,
  type MinionEntity,
  type PlayerSide,
  type SpellCard,
  type TargetDescriptor,
  type TargetSelector
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
  triggerTurnEffects(state, side, 'TurnStart');
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
  triggerTurnEffects(state, side, 'TurnEnd');
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
    summonMinion(state, side, handCard.card, placement, target);
  } else if (handCard.card.type === 'Spell') {
    resolveSpell(state, side, handCard.card, target);
    triggerSpellCastEffects(state, side);
    player.graveyard.push(handCard.card.id);
  } else {
    throw new Error(`Unsupported card type ${handCard.card.type}`);
  }
}

function summonMinion(
  state: GameState,
  side: PlayerSide,
  card: MinionCard,
  placement: CardPlacement | undefined,
  target?: TargetDescriptor
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

  applyExistingAurasToMinion(state, side, minion);
  applyAurasFromMinion(state, side, minion);
  applySummonEffects(state, side, minion, target);
}

function applySummonEffects(
  state: GameState,
  side: PlayerSide,
  minion: MinionEntity,
  providedTarget?: TargetDescriptor
): void {
  const effects = [
    ...getEffectsByTrigger(minion.card, 'Battlecry'),
    ...getEffectsByTrigger(minion.card, 'Play')
  ];
  for (const effect of effects) {
    const action = effect.action;
    let target = providedTarget;
    if (actionRequiresTarget(action)) {
      target = target ?? getDefaultEffectTarget(action, side, minion);
      if (!target) {
        throw new Error('Summon effect requires a target which is not supported yet');
      }
    }
    executeEffectAction(state, side, action, target, minion);
  }
}

function getDefaultEffectTarget(
  action: EffectAction,
  side: PlayerSide,
  minion: MinionEntity
): TargetDescriptor | undefined {
  if (action.type === 'Damage' || action.type === 'Heal' || action.type === 'Buff') {
    switch (action.target) {
      case 'Hero':
        return { type: 'hero', side };
      case 'Self':
        return { type: 'minion', side, entityId: minion.instanceId };
      default:
        return undefined;
    }
  }
  return undefined;
}

function triggerTurnEffects(
  state: GameState,
  side: PlayerSide,
  triggerType: 'TurnStart' | 'TurnEnd'
): void {
  for (const minion of state.board[side]) {
    const effects = getEffectsByTrigger(minion.card, triggerType);
    for (const effect of effects) {
      const action = effect.action;
      let target: TargetDescriptor | undefined;
      if (actionRequiresTarget(action)) {
        target = getDefaultEffectTarget(action, side, minion);
        if (!target) {
          throw new Error(`${triggerType} effect requires a target which is not supported yet`);
        }
      }
      executeEffectAction(state, side, action, target, minion);
    }
  }
}

function applyExistingAurasToMinion(state: GameState, side: PlayerSide, minion: MinionEntity): void {
  for (const candidateSide of ['A', 'B'] as const) {
    for (const source of state.board[candidateSide]) {
      if (source.instanceId === minion.instanceId) {
        continue;
      }
      const effects = getEffectsByTrigger(source.card, 'Aura');
      effects.forEach((effect, index) => {
        if (effect.action.type !== 'Buff') {
          return;
        }
        const auraKey = getAuraKey(source.instanceId, index);
        const targets = getAuraTargets(state, candidateSide, source, effect.action.target);
        if (targets.some((entry) => entry.minion.instanceId === minion.instanceId)) {
          applyAuraBuffToMinion(minion, auraKey, effect.action.stats);
        }
      });
    }
  }
}

function applyAurasFromMinion(state: GameState, side: PlayerSide, minion: MinionEntity): void {
  const effects = getEffectsByTrigger(minion.card, 'Aura');
  effects.forEach((effect, index) => {
    if (effect.action.type !== 'Buff') {
      return;
    }
    const auraKey = getAuraKey(minion.instanceId, index);
    const targets = getAuraTargets(state, side, minion, effect.action.target);
    for (const target of targets) {
      applyAuraBuffToMinion(target.minion, auraKey, effect.action.stats);
    }
  });
}

function getAuraKey(sourceId: string, index: number): string {
  return `${sourceId}:${index}`;
}

function getAuraTargets(
  state: GameState,
  side: PlayerSide,
  source: MinionEntity,
  selector: TargetSelector
): { side: PlayerSide; minion: MinionEntity }[] {
  switch (selector) {
    case 'Self':
      return [{ side, minion: source }];
    case 'FriendlyMinion':
    case 'AllFriendlies':
      return state.board[side].map((entity) => ({ side, minion: entity }));
    case 'EnemyMinion':
    case 'AllEnemies': {
      const opponent = getOpponentSide(side);
      return state.board[opponent].map((entity) => ({ side: opponent, minion: entity }));
    }
    case 'AnyMinion':
      return [
        ...state.board.A.map((entity) => ({ side: 'A' as PlayerSide, minion: entity })),
        ...state.board.B.map((entity) => ({ side: 'B' as PlayerSide, minion: entity }))
      ];
    default:
      return [];
  }
}

function applyAuraBuffToMinion(
  minion: MinionEntity,
  auraKey: string,
  stats: { attack?: number; health?: number }
): void {
  const attackBonus = stats.attack ?? 0;
  const healthBonus = stats.health ?? 0;
  if (attackBonus === 0 && healthBonus === 0) {
    return;
  }
  minion.auras ??= {};
  if (minion.auras[auraKey]) {
    return;
  }
  const record: { attack?: number; health?: number } = {};
  if (attackBonus !== 0) {
    minion.attack += attackBonus;
    record.attack = attackBonus;
  }
  if (healthBonus !== 0) {
    minion.maxHealth += healthBonus;
    minion.health += healthBonus;
    record.health = healthBonus;
  }
  if (record.attack !== undefined || record.health !== undefined) {
    minion.auras[auraKey] = record;
    updateBerserkState(minion);
  }
}

function removeAurasFromMinion(state: GameState, source: MinionEntity): void {
  const effects = getEffectsByTrigger(source.card, 'Aura');
  effects.forEach((effect, index) => {
    if (effect.action.type !== 'Buff') {
      return;
    }
    const auraKey = getAuraKey(source.instanceId, index);
    for (const side of ['A', 'B'] as const) {
      for (const minion of state.board[side]) {
        removeAuraBuffFromTarget(minion, auraKey);
      }
    }
  });
}

function removeAuraBuffFromTarget(minion: MinionEntity, auraKey: string): void {
  const record = minion.auras?.[auraKey];
  if (!record) {
    return;
  }
  if (record.attack) {
    minion.attack -= record.attack;
  }
  if (record.health) {
    minion.maxHealth -= record.health;
    if (minion.health > minion.maxHealth) {
      minion.health = minion.maxHealth;
    }
  }
  if (minion.auras) {
    delete minion.auras[auraKey];
    if (Object.keys(minion.auras).length === 0) {
      delete minion.auras;
    }
  }
  updateBerserkState(minion);
}

function executeEffectAction(
  state: GameState,
  side: PlayerSide,
  action: EffectAction,
  target?: TargetDescriptor,
  source?: MinionEntity
): void {
  switch (action.type) {
    case 'Damage':
      if (target) {
        applyDamage(state, target, action.amount, side);
        return;
      }
      if (actionRequiresTarget(action)) {
        throw new Error('Target required for damage effect');
      }
      applyDamageToSelector(state, side, action.target, action.amount);
      return;
    case 'Heal':
      if (target) {
        applyHeal(state, target, action.amount);
        return;
      }
      if (actionRequiresTarget(action)) {
        throw new Error('Target required for heal effect');
      }
      applyHealToSelector(state, side, action.target, action.amount);
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
      if (action.target === 'AllFriendlies' || action.target === 'AllEnemies' || action.target === 'AnyMinion') {
        applyBuffToSelector(state, side, action.target, action.stats, source);
        return;
      }
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
      executeCustomEffectAction(state, side, action, target, source);
      return;
    default:
      throw new Error('Unhandled effect action');
  }
}

function executeCustomEffectAction(
  state: GameState,
  side: PlayerSide,
  action: Extract<EffectAction, { type: 'Custom' }> ,
  target: TargetDescriptor | undefined,
  source?: MinionEntity
): void {
  switch (action.key) {
    case 'CunningPeopleBattlecry': {
      if (!action.data || typeof action.data !== 'object') {
        return;
      }
      const { options } = action.data as { options?: string[] };
      if (!Array.isArray(options) || options.length === 0) {
        return;
      }
      const index = Math.floor(Math.random() * options.length);
      const cardId = options[index];
      if (typeof cardId !== 'string') {
        return;
      }
      addCardToHand(state, side, cardId);
      return;
    }
    case 'BuffPerCardInHand': {
      if (!source) {
        return;
      }
      const amount = state.players[side].hand.length;
      if (amount <= 0) {
        return;
      }
      const selfTarget: TargetDescriptor = { type: 'minion', side, entityId: source.instanceId };
      applyBuff(state, selfTarget, { attack: amount, health: amount });
      return;
    }
    case 'Taunt':
    case 'Berserk':
    case 'DivineShield':
      return;
    default:
      return;
  }
}

function addCardToHand(state: GameState, side: PlayerSide, cardId: string): void {
  const player = state.players[side];
  if (player.hand.length >= MATCH_CONFIG.handLimit) {
    player.graveyard.push(cardId);
    return;
  }
  const definition = getCardDefinition(cardId);
  player.hand.push({
    instanceId: randomUUID(),
    card: definition
  });
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

function applyBuffToSelector(
  state: GameState,
  side: PlayerSide,
  selector: TargetSelector,
  stats: { attack?: number; health?: number },
  source?: MinionEntity
): void {
  switch (selector) {
    case 'AllFriendlies':
    case 'FriendlyMinion': {
      for (const entity of state.board[side]) {
        const descriptor: TargetDescriptor = { type: 'minion', side, entityId: entity.instanceId };
        applyBuff(state, descriptor, stats);
      }
      return;
    }
    case 'AllEnemies':
    case 'EnemyMinion': {
      const opponent = getOpponentSide(side);
      for (const entity of state.board[opponent]) {
        const descriptor: TargetDescriptor = { type: 'minion', side: opponent, entityId: entity.instanceId };
        applyBuff(state, descriptor, stats);
      }
      return;
    }
    case 'AnyMinion': {
      applyBuffToSelector(state, side, 'FriendlyMinion', stats, source);
      applyBuffToSelector(state, side, 'EnemyMinion', stats, source);
      return;
    }
    default:
      throw new Error('Unsupported buff selector');
  }
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

function triggerSpellCastEffects(state: GameState, side: PlayerSide): void {
  for (const minion of state.board[side]) {
    const effects = getEffectsByTrigger(minion.card, 'SpellCast');
    for (const effect of effects) {
      if (actionRequiresTarget(effect.action)) {
        throw new Error('Spell cast triggered effect requires a target which is not supported yet');
      }
      executeEffectAction(state, side, effect.action, undefined, minion);
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

function applyDamageToSelector(
  state: GameState,
  side: PlayerSide,
  selector: TargetSelector,
  amount: number
): void {
  const targets = getTargetsForSelector(state, side, selector);
  targets.forEach((entry) => applyDamage(state, entry, amount, side));
}

function applyHealToSelector(
  state: GameState,
  side: PlayerSide,
  selector: TargetSelector,
  amount: number
): void {
  const targets = getTargetsForSelector(state, side, selector);
  targets.forEach((entry) => applyHeal(state, entry, amount));
}

function getTargetsForSelector(
  state: GameState,
  side: PlayerSide,
  selector: TargetSelector
): TargetDescriptor[] {
  switch (selector) {
    case 'AllFriendlies':
      return [
        { type: 'hero', side },
        ...state.board[side].map((entity) => ({ type: 'minion', side, entityId: entity.instanceId }))
      ];
    case 'AllEnemies': {
      const opponent = getOpponentSide(side);
      return [
        { type: 'hero', side: opponent },
        ...state.board[opponent].map((entity) => ({
          type: 'minion',
          side: opponent,
          entityId: entity.instanceId
        }))
      ];
    }
    case 'FriendlyMinion':
      return state.board[side].map((entity) => ({
        type: 'minion',
        side,
        entityId: entity.instanceId
      }));
    case 'EnemyMinion': {
      const opponent = getOpponentSide(side);
      return state.board[opponent].map((entity) => ({
        type: 'minion',
        side: opponent,
        entityId: entity.instanceId
      }));
    }
    case 'AnyMinion':
      return [
        ...state.board.A.map((entity) => ({ type: 'minion', side: 'A' as PlayerSide, entityId: entity.instanceId })),
        ...state.board.B.map((entity) => ({ type: 'minion', side: 'B' as PlayerSide, entityId: entity.instanceId }))
      ];
    case 'RandomEnemy': {
      const opponent = getOpponentSide(side);
      const pool: TargetDescriptor[] = [
        { type: 'hero', side: opponent },
        ...state.board[opponent].map((entity) => ({
          type: 'minion',
          side: opponent,
          entityId: entity.instanceId
        }))
      ];
      return pickRandomTargets(pool);
    }
    case 'RandomMinion': {
      const pool: TargetDescriptor[] = [
        ...state.board.A.map((entity) => ({ type: 'minion', side: 'A' as PlayerSide, entityId: entity.instanceId })),
        ...state.board.B.map((entity) => ({ type: 'minion', side: 'B' as PlayerSide, entityId: entity.instanceId }))
      ];
      return pickRandomTargets(pool);
    }
    case 'Hero':
      return [{ type: 'hero', side }];
    default:
      return [];
  }
}

function pickRandomTargets(pool: TargetDescriptor[]): TargetDescriptor[] {
  if (pool.length === 0) {
    return [];
  }
  const index = Math.floor(Math.random() * pool.length);
  return [pool[index]];
}

function applyManaCrystal(state: GameState, side: PlayerSide, amount: number): void {
  const player = state.players[side];
  player.mana.current += amount;
  player.mana.temporary = (player.mana.temporary ?? 0) + amount;
  player.ownsCoin = false;
}

function getOpponentSide(side: PlayerSide): PlayerSide {
  return side === 'A' ? 'B' : 'A';
}

function removeMinion(state: GameState, side: PlayerSide, entityId: string): void {
  const minions = state.board[side];
  const index = minions.findIndex((m) => m.instanceId === entityId);
  if (index >= 0) {
    const [dead] = minions.splice(index, 1);
    removeAurasFromMinion(state, dead);
    state.players[side].graveyard.push(dead.card.id);
    applyDeathrattleEffects(state, side, dead);
  }
}

function applyDeathrattleEffects(state: GameState, side: PlayerSide, minion: MinionEntity): void {
  const effects = getEffectsByTrigger(minion.card, 'Deathrattle');
  for (const effect of effects) {
    const action = effect.action;
    if (actionRequiresTarget(action)) {
      throw new Error('Deathrattle effect requires a target which is not supported yet');
    }
    executeEffectAction(state, side, action, undefined, minion);
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
