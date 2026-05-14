import type { StateCreator } from 'zustand';
import type { AppState } from '../types';

export const createRenderSlice: StateCreator<AppState, [], [], Partial<AppState>> = (set) => ({
  reflectionMode: 'city',
  backgroundColor: '#1a1a1a',
  fadeState: 'idle',
  shadowRes: 1024,
  shadowBounds: 40,
  lightShadowRes: 512,
  isWhiteView: false,
  viewMode: 'standard',
  fov: 50,
  timeOfDay: 12,
  sunIntensity: 0.8,
  ambientIntensity: 1.0,
  latitude: 35,
  northOffset: 0,
  materialOverrides: {},

  setReflectionMode: (mode) => set({ reflectionMode: mode }),
  setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
  setFadeState: (state) => set({ fadeState: state }),
  setShadowRes: (shadowRes) => set({ shadowRes }),
  setShadowBounds: (shadowBounds) => set({ shadowBounds }),
  setLightShadowRes: (lightShadowRes) => set({ lightShadowRes }),
  setIsWhiteView: (enabled) => set({ isWhiteView: enabled }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFov: (fov) => set({ fov }),
  setTimeOfDay: (time) => set({ timeOfDay: time }),
  setSunIntensity: (intensity) => set({ sunIntensity: intensity }),
  setAmbientIntensity: (intensity) => set({ ambientIntensity: intensity }),
  setLatitude: (lat) => set({ latitude: lat }),
  setNorthOffset: (offset) => set({ northOffset: offset }),
  setMaterialOverride: (key, override) => set((state) => {
    const newOverrides = { ...state.materialOverrides };
    if (override === null) {
      delete newOverrides[key];
    } else {
      newOverrides[key] = { ...(newOverrides[key] || {}), ...override };
    }
    return { materialOverrides: newOverrides };
  }),
});
