import type { StateCreator } from 'zustand';
import type { AppState } from '../types';

export const createEntitySlice: StateCreator<AppState, [], [], Partial<AppState>> = (set) => ({
  connectionState: 'disconnected',
  entities: {},

  setConnectionState: (connectionState) => set({ connectionState }),
  
  setEntities: (incoming) => set((state) => {
    // Fast path: check if anything actually changed before allocating
    let hasChanges = false;
    for (const eid in incoming) {
      if (state.entities[eid] !== incoming[eid]) { hasChanges = true; break; }
    }
    if (!hasChanges) {
      // Check for removed entities
      for (const eid in state.entities) {
        if (!(eid in incoming)) { hasChanges = true; break; }
      }
    }
    if (!hasChanges) return {};

    // Only spread when we know something changed
    const next = { ...state.entities };
    for (const eid in incoming) {
      if (next[eid] !== incoming[eid]) {
        next[eid] = incoming[eid];
      }
    }
    for (const eid in next) {
      if (!(eid in incoming)) {
        delete next[eid];
      }
    }
    return { entities: next };
  }),
  
  updateEntity: (entity) =>
    set((state) => ({
      entities: { ...state.entities, [entity.entity_id]: entity },
    })),
});
