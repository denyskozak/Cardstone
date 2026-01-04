import type { CardInHand, PlayerSide, TargetDescriptor } from '@cardstone/shared/types';
import { create } from 'zustand';

type TargetingSource =
  | { kind: 'minion'; entityId: string }
  | { kind: 'spell'; card: CardInHand };

export interface TargetingState {
  source: TargetingSource;
  pointerId: number;
  origin: { x: number; y: number };
  current: { x: number; y: number };
}

export interface MinionAnimationTransform {
  offsetX: number;
  offsetY: number;
  rotation?: number;
  scale?: number;
  zIndex?: number;
  grayscale?: boolean;
}

interface LocalAttackAnimation {
  attackerId: string;
  side: PlayerSide;
  target: TargetDescriptor;
}

type HeroPositions = Record<PlayerSide, { x: number; y: number } | null>;

interface UiState {
  hoveredCard?: string;
  selectedCard?: string;
  targeting?: TargetingState;
  currentTarget?: TargetDescriptor | null;
  minionAnimations: Record<string, MinionAnimationTransform>;
  localAttackQueue: LocalAttackAnimation[];
  localAttackQueueVersion: number;
  heroPositions: HeroPositions;
  setHovered: (id?: string) => void;
  setSelected: (id?: string) => void;
  setTargeting: (targeting?: TargetingState) => void;
  updateTargeting: (point: { x: number; y: number }) => void;
  setCurrentTarget: (
    target:
      | TargetDescriptor
      | null
      | ((prev: TargetDescriptor | null) => TargetDescriptor | null)
  ) => void;
  setMinionAnimation: (id: string, transform?: MinionAnimationTransform) => void;
  clearMinionAnimation: (id: string) => void;
  resetMinionAnimations: () => void;
  enqueueLocalAttackAnimation: (animation: LocalAttackAnimation) => void;
  consumeLocalAttackQueue: () => LocalAttackAnimation[];
  setHeroPosition: (side: PlayerSide, position: { x: number; y: number }) => void;
  clearHeroPosition: (side: PlayerSide) => void;
}

export const useUiStore = create<UiState>((set) => ({
  hoveredCard: undefined,
  selectedCard: undefined,
  targeting: undefined,
  currentTarget: null,
  minionAnimations: {},
  localAttackQueue: [],
  localAttackQueueVersion: 0,
  heroPositions: { A: null, B: null },
  setHovered: (id) => set({ hoveredCard: id }),
  setSelected: (id) => set({ selectedCard: id }),
  setTargeting: (targeting) => set({ targeting }),
  updateTargeting: (point) =>
    set((state) =>
      state.targeting
        ? {
            targeting: {
              ...state.targeting,
              current: point
            }
          }
        : {}
    ),
  setCurrentTarget: (target) =>
    set((state) => ({
      currentTarget: typeof target === 'function' ? target(state.currentTarget ?? null) : target
    })),
  setMinionAnimation: (id, transform) =>
    set((state) => {
      const next = { ...state.minionAnimations };
      if (transform) {
        next[id] = transform;
      } else {
        delete next[id];
      }
      return { minionAnimations: next };
    }),
  clearMinionAnimation: (id) =>
    set((state) => {
      if (!state.minionAnimations[id]) {
        return state;
      }
      const next = { ...state.minionAnimations };
      delete next[id];
      return { minionAnimations: next };
    }),
  resetMinionAnimations: () => set({ minionAnimations: {} }),
  enqueueLocalAttackAnimation: (animation) =>
    set((state) => ({
      localAttackQueue: [...state.localAttackQueue, animation],
      localAttackQueueVersion: state.localAttackQueueVersion + 1
    })),
  consumeLocalAttackQueue: () => {
    let queue: LocalAttackAnimation[] = [];
    set((state) => {
      queue = state.localAttackQueue;
      return { localAttackQueue: [] };
    });
    return queue;
  },
  setHeroPosition: (side, position) =>
    set((state) => {
      const current = state.heroPositions[side];
      if (current && current.x === position.x && current.y === position.y) {
        return state;
      }
      return {
        heroPositions: { ...state.heroPositions, [side]: position }
      };
    }),
  clearHeroPosition: (side) =>
    set((state) => {
      if (!state.heroPositions[side]) {
        return state;
      }
      return {
        heroPositions: { ...state.heroPositions, [side]: null }
      };
    })
}));
