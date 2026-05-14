import type { StateCreator } from 'zustand';
import type { AppState } from '../types';

export const createConfigSlice: StateCreator<AppState, [], [], Partial<AppState>> = (set) => ({
  haUrl: '',
  haToken: '',
  modelUrl: '',
  isLocked: false,
  uiLevel: 0,
  walkSpeed: 5,
  longPressDelay: 1000,
  showDiagnostics: false,
  transitionType: 'fly',

  setIsLocked: (locked) => set({ isLocked: locked }),
  setHaConfig: (url, token) => set({ haUrl: url, haToken: token }),
  setModelUrl: (url) => set({ modelUrl: url }),
  setUiLevel: (level) => set({ uiLevel: level }),
  setWalkSpeed: (speed) => set({ walkSpeed: speed }),
  setLongPressDelay: (delay) => set({ longPressDelay: delay }),
  setShowDiagnostics: (showDiagnostics) => set({ showDiagnostics }),
  setTransitionType: (type) => set({ transitionType: type }),
});
