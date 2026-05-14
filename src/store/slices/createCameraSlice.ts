import type { StateCreator } from 'zustand';
import type { AppState } from '../types';

export const createCameraSlice: StateCreator<AppState, [], [], Partial<AppState>> = (set) => ({
  views: [],
  activeViewId: null,

  addView: (view) => set((state) => ({ views: [...state.views, view] })),
  removeView: (id) => set((state) => ({ views: state.views.filter(v => v.id !== id) })),
  renameView: (id, name) => set((state) => ({
    views: state.views.map(v => v.id === id ? { ...v, name } : v)
  })),
  updateView: (id, updatedView) => set((state) => ({
    views: state.views.map(v => v.id === id ? { ...v, ...updatedView } : v)
  })),
  setActiveViewId: (id) => set({ activeViewId: id }),
});
