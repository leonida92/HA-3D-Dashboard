import type { StateCreator } from 'zustand';
import type { AppState, Tag } from '../types';

export const createMeshSlice: StateCreator<AppState, [], [], Partial<AppState>> = (set) => ({
  mappings: {},
  tags: [
    { id: 'sys-static', name: 'Static', color: '#6b7280', behavior: 'static' },
    { id: 'sys-occluder', name: 'Occluder', color: '#9333ea', behavior: 'occluder' },
    { id: 'sys-mirror', name: 'Mirror', color: '#38bdf8', behavior: 'mirror' },
  ],
  meshTags: {},
  hiddenTags: [],
  isolatedTag: null,
  selectedMesh: null,
  allMeshes: [],
  editingPinForMesh: null,
  staticPinPositions: [],

  setMapping: (meshName, data) => set((state) => ({ mappings: { ...state.mappings, [meshName]: data } })),
  setHiddenTags: (tags) => set({ hiddenTags: tags }),
  
  toggleTagHidden: (id) => set((state) => ({
    hiddenTags: state.hiddenTags.includes(id) 
      ? state.hiddenTags.filter(t => t !== id)
      : [...state.hiddenTags, id]
  })),
  setIsolatedTag: (id) => set({ isolatedTag: id }),
  
  addTag: (tag: Tag) => set((state) => ({ tags: [...state.tags, tag] })),
  removeTag: (id: string) => set((state) => ({ 
    tags: state.tags.filter(t => t.id !== id),
    meshTags: Object.fromEntries(
      Object.entries(state.meshTags).map(([name, ids]) => [name, ids.filter(tid => tid !== id)])
    )
  })),
  updateTag: (id: string, updated: Partial<Tag>) => set((state) => ({
    tags: state.tags.map(t => t.id === id ? { ...t, ...updated } : t)
  })),
  
  assignTagToMesh: (meshName: string, tagId: string) => set((state) => ({
    meshTags: {
      ...state.meshTags,
      [meshName]: [...(state.meshTags[meshName] || []), tagId]
    }
  })),
  removeTagFromMesh: (meshName: string, tagId: string) => set((state) => ({
    meshTags: {
      ...state.meshTags,
      [meshName]: (state.meshTags[meshName] || []).filter(id => id !== tagId)
    }
  })),

  setSelectedMesh: (meshName) => set({ selectedMesh: meshName }),
  setAllMeshes: (meshes) => set({ allMeshes: meshes }),
  setEditingPinForMesh: (meshName) => set({ editingPinForMesh: meshName }),
  setStaticPinPositions: (positions) => set({ staticPinPositions: positions }),
});
