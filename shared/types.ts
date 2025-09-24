export type PlayerSide = 'A' | 'B';
export type Phase = 'Start' | 'Main' | 'End';

export type EntityId = string;
export type CardId = string;

export type CardType = 'Minion' | 'Spell';

export interface CardBase {
  id: CardId;
  name: string;
  cost: number;
  type: CardType;
}

export interface MinionCard extends CardBase {
  type: 'Minion';
  attack: number;
  health: number;
}

export type SpellEffect = 'Firebolt' | 'Heal' | 'Coin';

export interface SpellCard extends CardBase {
  type: 'Spell';
  effect: SpellEffect;
  amount?: number;
}

export type CardDefinition = MinionCard | SpellCard;

export interface CardInHand {
  instanceId: EntityId;
  card: CardDefinition;
}

export interface MinionEntity {
  instanceId: EntityId;
  card: MinionCard;
  attack: number;
  health: number;
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
  | CommandBase<'PlayCard', { cardId: EntityId; target?: TargetDescriptor }>
  | CommandBase<'EndTurn', object>
  | CommandBase<'Attack', { attackerId: EntityId; defenderId: EntityId }>
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
  | ClientMessageBase<'PlayCard', { cardId: EntityId; target?: TargetDescriptor }>
  | ClientMessageBase<'EndTurn', object>
  | ClientMessageBase<'Attack', { attackerId: EntityId; defenderId: EntityId }>
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
}
