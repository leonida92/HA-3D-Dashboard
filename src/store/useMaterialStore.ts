import { create } from 'zustand';
import * as THREE from 'three';

interface MaterialStoreState {
  isPickerActive: boolean;
  selectedMaterial: THREE.Material | null;
  selectedMeshName: string | null;
  hoveredMeshName: string | null;
  invalidate: (() => void) | null;
  scene: THREE.Object3D | null;
  setIsPickerActive: (active: boolean) => void;
  setSelectedMaterial: (material: THREE.Material | null, meshName: string | null) => void;
  setHoveredMeshName: (meshName: string | null) => void;
  setCanvasContext: (invalidate: () => void, scene: THREE.Object3D) => void;
}

export const useMaterialStore = create<MaterialStoreState>((set) => ({
  isPickerActive: false,
  selectedMaterial: null,
  selectedMeshName: null,
  hoveredMeshName: null,
  invalidate: null,
  scene: null,
  setIsPickerActive: (active) => set({ isPickerActive: active, hoveredMeshName: null }),
  setSelectedMaterial: (material, meshName) => set({ selectedMaterial: material, selectedMeshName: meshName, isPickerActive: false, hoveredMeshName: null }),
  setHoveredMeshName: (meshName) => set({ hoveredMeshName: meshName }),
  setCanvasContext: (invalidate, scene) => set({ invalidate, scene }),
}));
