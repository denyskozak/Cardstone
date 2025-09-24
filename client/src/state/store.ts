import { create } from 'zustand';

interface UiState {
  hoveredCard?: string;
  selectedCard?: string;
  setHovered: (id?: string) => void;
  setSelected: (id?: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  hoveredCard: undefined,
  selectedCard: undefined,
  setHovered: (id) => set({ hoveredCard: id }),
  setSelected: (id) => set({ selectedCard: id })
}));
