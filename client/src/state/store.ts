import type { CardInHand, TargetDescriptor } from '@cardstone/shared/types';
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

interface UiState {
  hoveredCard?: string;
  selectedCard?: string;
  targeting?: TargetingState;
  currentTarget?: TargetDescriptor | null;
  currentTargetPoint?: { x: number; y: number } | null;
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
  setCurrentTargetPoint: (point: { x: number; y: number } | null) => void;
  cancelTargeting: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  hoveredCard: undefined,
  selectedCard: undefined,
  targeting: undefined,
  currentTarget: null,
  currentTargetPoint: null,
  setHovered: (id) => set({ hoveredCard: id }),
  setSelected: (id) => set({ selectedCard: id }),
  setTargeting: (targeting) =>
    set((state) => ({
      targeting,
      currentTarget: targeting ? state.currentTarget ?? null : null,
      currentTargetPoint: targeting ? state.currentTargetPoint ?? null : null
    })),
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
  setCurrentTargetPoint: (point) => set({ currentTargetPoint: point }),
  cancelTargeting: () =>
    set({ targeting: undefined, currentTarget: null, currentTargetPoint: null, selectedCard: undefined })
}));
