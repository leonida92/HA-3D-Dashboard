import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from './types';

// Re-export types so we don't break existing imports
export * from './types';

import { createConfigSlice } from './slices/createConfigSlice';
import { createRenderSlice } from './slices/createRenderSlice';
import { createMeshSlice } from './slices/createMeshSlice';
import { createCameraSlice } from './slices/createCameraSlice';
import { createEntitySlice } from './slices/createEntitySlice';

export const useStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createConfigSlice(set, get, api),
      ...createRenderSlice(set, get, api),
      ...createMeshSlice(set, get, api),
      ...createCameraSlice(set, get, api),
      ...createEntitySlice(set, get, api),
    } as AppState),
    {
      name: 'ha3d-storage',
      partialize: (state) => ({
        // Config
        haUrl: state.haUrl,
        haToken: state.haToken,
        modelUrl: state.modelUrl,
        isLocked: state.isLocked,
        uiLevel: state.uiLevel,
        walkSpeed: state.walkSpeed,
        longPressDelay: state.longPressDelay,
        showDiagnostics: state.showDiagnostics,
        transitionType: state.transitionType,
        
        // Render
        reflectionMode: state.reflectionMode,
        backgroundColor: state.backgroundColor,
        shadowRes: state.shadowRes,
        lightShadowRes: state.lightShadowRes,
        isWhiteView: state.isWhiteView,
        viewMode: state.viewMode,
        fov: state.fov,
        timeOfDay: state.timeOfDay,
        sunIntensity: state.sunIntensity,
        ambientIntensity: state.ambientIntensity,
        latitude: state.latitude,
        northOffset: state.northOffset,
        materialOverrides: state.materialOverrides,

        // Mesh/Tags
        mappings: state.mappings,
        tags: state.tags,
        meshTags: state.meshTags,
        
        // Camera
        views: state.views,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Cleanup: Remove legacy 'sys-floor' tag if it exists in storage
          if (state.tags) {
            state.tags = state.tags.filter((t) => t.id !== 'sys-floor');
            if (!state.tags.some((t) => t.id === 'sys-mirror')) {
              state.tags.push({ id: 'sys-mirror', name: 'Mirror', color: '#38bdf8', behavior: 'mirror' });
            }
          }
          // Cleanup: Remove legacy blob URLs
          if (state.modelUrl?.startsWith('blob:')) {
            state.modelUrl = '';
          }
          // Fix legacy reflection modes
          const validPresets = ['none', 'city', 'apartment', 'studio', 'sunset', 'night', 'park', 'forest'];
          if (state.reflectionMode && !validPresets.includes(state.reflectionMode)) {
            state.reflectionMode = 'none';
          }
        }
      },
    }
  )
);
