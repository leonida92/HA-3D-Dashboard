import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';

export interface CameraView {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  zoom?: number;
  viewMode: 'standard' | '2-point' | 'ortho';
  timeOfDay: number;
  sunIntensity?: number;
  ambientIntensity?: number;
  latitude?: number;
  northOffset?: number;
  thumbnail?: string; // base64 data URL
  thumbnailCustom?: boolean; // true if user uploaded, don't overwrite on update
  thumbnailLocked?: boolean;
  thumbnailPos?: { x: number, y: number };
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  thumbnailRadius?: number;
  showName?: boolean;
  namePosition?: 'left' | 'center' | 'right';
  hiddenTags?: string[];
  isolatedTag?: string | null;
  backgroundColor?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  behavior: 'default' | 'static' | 'occluder' | 'mirror';
}

export interface MaterialOverride {
  color?: string; // hex string
  emissive?: string; // hex string
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
}

export interface AppState {
  // Config Slice
  haUrl: string;
  haToken: string;
  modelUrl: string;
  isLocked: boolean;
  uiLevel: 0 | 1 | 2;
  walkSpeed: number;
  longPressDelay: number;
  showDiagnostics: boolean;
  transitionType: 'fly' | 'fade';
  setIsLocked: (locked: boolean) => void;
  setHaConfig: (url: string, token: string) => void;
  setModelUrl: (url: string) => void;
  setUiLevel: (level: 0 | 1 | 2) => void;
  setWalkSpeed: (speed: number) => void;
  setLongPressDelay: (delay: number) => void;
  setShowDiagnostics: (show: boolean) => void;
  setTransitionType: (type: 'fly' | 'fade') => void;

  // Render Slice
  reflectionMode: 'none' | 'city' | 'apartment' | 'studio' | 'sunset' | 'night' | 'park' | 'forest';
  backgroundColor: string;
  fadeState: 'idle' | 'fading-out' | 'fading-in';
  shadowRes: number;
  shadowBounds: number;
  lightShadowRes: number;
  isWhiteView: boolean;
  viewMode: 'standard' | '2-point' | 'ortho';
  fov: number;
  timeOfDay: number;
  sunIntensity: number;
  ambientIntensity: number;
  latitude: number;
  northOffset: number;
  materialOverrides: Record<string, MaterialOverride>;
  setReflectionMode: (mode: 'none' | 'city' | 'apartment' | 'studio' | 'sunset' | 'night' | 'park' | 'forest') => void;
  setBackgroundColor: (color: string) => void;
  setFadeState: (state: 'idle' | 'fading-out' | 'fading-in') => void;
  setShadowRes: (res: number) => void;
  setShadowBounds: (bounds: number) => void;
  setLightShadowRes: (res: number) => void;
  setIsWhiteView: (enabled: boolean) => void;
  setViewMode: (mode: 'standard' | '2-point' | 'ortho') => void;
  setFov: (fov: number) => void;
  setTimeOfDay: (time: number) => void;
  setSunIntensity: (intensity: number) => void;
  setAmbientIntensity: (intensity: number) => void;
  setLatitude: (lat: number) => void;
  setNorthOffset: (offset: number) => void;
  setMaterialOverride: (key: string, override: Partial<MaterialOverride> | null) => void;

  // Mesh/Tags Slice
  mappings: Record<string, any>;
  tags: Tag[];
  meshTags: Record<string, string[]>; // meshName -> tagIds[]
  hiddenTags: string[];
  isolatedTag: string | null;
  selectedMesh: string | null;
  allMeshes: string[];
  editingPinForMesh: string | null;
  staticPinPositions: { name: string; x: number; y: number; visible: boolean }[];
  setMapping: (meshName: string, data: any) => void;
  setHiddenTags: (tags: string[]) => void;
  addTag: (tag: Tag) => void;
  removeTag: (id: string) => void;
  updateTag: (id: string, tag: Partial<Tag>) => void;
  assignTagToMesh: (meshName: string, tagId: string) => void;
  removeTagFromMesh: (meshName: string, tagId: string) => void;
  toggleTagHidden: (id: string) => void;
  setIsolatedTag: (id: string | null) => void;
  setSelectedMesh: (meshName: string | null) => void;
  setAllMeshes: (meshes: string[]) => void;
  setEditingPinForMesh: (meshName: string | null) => void;
  setStaticPinPositions: (positions: { name: string; x: number; y: number; visible: boolean }[]) => void;

  // Camera Slice
  views: CameraView[];
  activeViewId: string | null;
  addView: (view: CameraView) => void;
  removeView: (id: string) => void;
  renameView: (id: string, name: string) => void;
  updateView: (id: string, view: Partial<CameraView>) => void;
  setActiveViewId: (id: string | null) => void;

  // Entity/HA Slice
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  entities: HassEntities;
  setConnectionState: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  setEntities: (entities: HassEntities) => void;
  updateEntity: (entity: HassEntity) => void;
}
