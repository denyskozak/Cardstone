export type PlayerSide = 'A' | 'B';
export type Phase = 'Start' | 'Main' | 'End';

export type EntityId = string;
export type CardId = string;

export type TargetSelector =
  | 'Self'
  | 'FriendlyMinion'
  | 'EnemyMinion'
  | 'AnyMinion'
  | 'Hero'
  | 'AllEnemies'
  | 'AllFriendlies'
  | 'RandomEnemy';

export type EffectTrigger =
  | { type: 'Battlecry' }
  | { type: 'Deathrattle' }
  | { type: 'SpellCast' }
  | { type: 'TurnStart' }
  | { type: 'TurnEnd' }
  | { type: 'Attack' }
  | { type: 'Play' }
  | { type: 'Aura' }
  | { type: 'Custom'; key: string };

export type EffectAction =
  | { type: 'Damage'; amount: number; target: TargetSelector }
  | { type: 'Heal'; amount: number; target: TargetSelector }
  | { type: 'DrawCard'; amount: number }
  | { type: 'Summon'; cardId: string; count: number; target: 'Board' }
  | { type: 'Buff'; stats: { attack?: number; health?: number }; target: TargetSelector }
  | { type: 'ManaCrystal'; amount: number }
  | { type: 'Custom'; key: string; data?: unknown };

export type EffectCondition =
  | { type: 'IfDamaged'; target: TargetSelector }
  | { type: 'IfClass'; class: string }
  | { type: 'RandomChance'; percent: number }
  | { type: 'HasTribe'; tribe: string }
  | { type: 'Custom'; key: string; [key: string]: unknown };

export type Effect = {
  trigger: EffectTrigger;
  action: EffectAction;
  condition?: EffectCondition;
};

export type CardType = 'Minion' | 'Spell' | 'Weapon' | 'Hero';

export type CardPlacement = 'left' | 'right';

interface CardDefinitionBase {
  id: CardId;
  name: string;
  type: CardType;
  cost: number;
  rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  set?: string;
  tribe?: string;
  text?: string;
  effects?: Effect[];
}

export type MinionCard = CardDefinitionBase & {
  type: 'Minion';
  attack: number;
  health: number;
};

export type SpellCard = CardDefinitionBase & {
  type: 'Spell';
};

export type WeaponCard = CardDefinitionBase & {
  type: 'Weapon';
  attack: number;
  durability: number;
};

export type HeroCard = CardDefinitionBase & {
  type: 'Hero';
};

export type CardDefinition = MinionCard | SpellCard | WeaponCard | HeroCard;

export interface CardInHand {
  instanceId: EntityId;
  card: CardDefinition;
}

export interface MinionEntity {
  instanceId: EntityId;
  card: MinionCard;
  attack: number;
  health: number;
  maxHealth: number;
  attacksRemaining: number;
  divineShield?: boolean;
  berserkActive?: boolean;
}

export interface HeroState {
  hp: number;
  maxHp: number;
}

export interface PlayerMana {
  current: number;
  max: number;
  temporary?: number;
}

export interface PlayerState {
  id: string;
  hero: HeroState;
  deck: CardId[];
  hand: CardInHand[];
  graveyard: CardId[];
  mana: PlayerMana;
  ownsCoin?: boolean;
  ready: boolean;
}

export interface TurnState {
  current: PlayerSide;
  phase: Phase;
  turnNumber: number;
}

export interface GameState {
  id: string;
  seed: string;
  seq: number;
  players: Record<PlayerSide, PlayerState>;
  board: Record<PlayerSide, MinionEntity[]>;
  turn: TurnState;
  winner?: PlayerSide;
}

export type CommandBase<T extends string, P> = {
  type: T;
  player: PlayerSide;
  payload: P;
  seq: number;
  nonce: string;
};

export type Command =
  | CommandBase<'PlayCard', { cardId: EntityId; target?: TargetDescriptor; placement?: CardPlacement }>
  | CommandBase<'EndTurn', Record<string, never>>
  | CommandBase<'Attack', { attackerId: EntityId; target: TargetDescriptor }>
  | CommandBase<'Ready', object>;

export type TargetDescriptor =
  | { type: 'hero'; side: PlayerSide }
  | { type: 'minion'; side: PlayerSide; entityId: EntityId };

export interface EventBase<T extends string, P> {
  type: T;
  payload: P;
}

export type Event =
  | EventBase<'CardPlayed', { player: PlayerSide; cardId: EntityId }>
  | EventBase<'TurnEnded', { player: PlayerSide }>
  | EventBase<'DamageDealt', { target: TargetDescriptor; amount: number }>
  | EventBase<'HealApplied', { target: TargetDescriptor; amount: number }>
  | EventBase<'StateUpdated', { seq: number }>;

export interface MatchJoinInfo {
  playerId: string;
  matchId: string;
  side: PlayerSide;
}

export interface ClientMessageBase<T extends string, P> {
  t: T;
  payload: P;
  seq?: number;
  nonce?: string;
}

export type ClientToServer =
  | ClientMessageBase<'JoinMatch', { matchId: 'auto' | string; playerId?: string }>
  | ClientMessageBase<'Ready', { playerId?: string }>
  | ClientMessageBase<'PlayCard', { cardId: EntityId; target?: TargetDescriptor; placement?: CardPlacement }>
  | ClientMessageBase<'EndTurn', Record<string, never>>
  | ClientMessageBase<'Attack', { attackerId: EntityId; target: TargetDescriptor }>
  | ClientMessageBase<'Emote', { type: 'Hello' | 'WellPlayed' | 'Oops' }>;

export interface ServerMessageBase<T extends string, P> {
  t: T;
  payload: P;
  seq?: number;
}

export type StateSyncPayload = {
  state: GameState;
};

export type ActionResultPayload = {
  ok: boolean;
  error?: string;
  patch?: unknown;
  stateChanged?: boolean;
  duplicate?: boolean;
};

export type ServerToClient =
  | ServerMessageBase<'MatchJoined', MatchJoinInfo>
  | ServerMessageBase<'StateSync', StateSyncPayload>
  | ServerMessageBase<'ActionResult', ActionResultPayload>
  | ServerMessageBase<'Toast', { message: string }>
  | ServerMessageBase<'OpponentLeft', { playerId: string }>
  | ServerMessageBase<'GameOver', { winner: PlayerSide }>;

export interface MatchConfig {
  startingHandSize: number;
  startingMana: number;
  maxMana: number;
  heroHp: number;
  handLimit: number;
}
