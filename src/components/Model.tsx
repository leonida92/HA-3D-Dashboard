import { useGLTF } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { useMemo, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { callService } from '../ha/connection';
import { kelvinToColor } from '../utils/colors';
import { MaterialPickerMode } from './MaterialPickerMode';
import { useMaterialStore } from '../store/useMaterialStore';

function MappedLight({ light, mapping }: { light: any, mapping: any }) {
  const lightShadowRes = useStore(state => state.lightShadowRes);
  const ent = useStore(state => state.entities[mapping.eid]);
  const { invalidate } = useThree();
  const lightRef = useRef<THREE.PointLight>(null);

  // Only invalidate when visually-relevant properties change, NOT on every entity ref update
  const visualKey = ent
    ? `${ent.state}|${ent.attributes?.brightness}|${ent.attributes?.rgb_color}|${ent.attributes?.color_temp}`
    : 'off';

  useEffect(() => {
    invalidate();
    // When light properties change, request a single shadow map update
    if (lightRef.current?.shadow) {
      lightRef.current.shadow.needsUpdate = true;
    }
  }, [visualKey, invalidate]);

  // Disable continuous shadow map updates — the shadow only needs to re-render
  // when the light itself changes, not when the camera orbits.
  // A point light shadow renders the scene 6 EXTRA TIMES (one per cubemap face)
  // per frame, so this saves ~6× the draw calls during orbit.
  useEffect(() => {
    if (lightRef.current?.shadow) {
      lightRef.current.shadow.autoUpdate = false;
      lightRef.current.shadow.needsUpdate = true;
    }
  }, []);

  // Memoize position to avoid creating new Vector3 on every render
  const position = useMemo(() => {
    const offset = mapping.lightOffset || [0, 0, 0];
    return light.position.clone().add(new THREE.Vector3(offset[0], offset[1], offset[2]));
  }, [light.position, mapping.lightOffset]);

  // Memoize color to avoid creating new Color on every render
  const color = useMemo(() => {
    if (!ent || ent.state !== 'on') return null;
    const attrs = ent.attributes || {};
    if (mapping.colorTemp) return kelvinToColor(mapping.colorTemp);
    if (attrs.rgb_color) return new THREE.Color(`rgb(${attrs.rgb_color.join(',')})`)
    return new THREE.Color(0xffffcc);
  }, [ent, mapping.colorTemp]);

  if (!ent || ent.state !== 'on' || !color) return null;

  const attrs = ent.attributes || {};
  const brightness = attrs.brightness ? (attrs.brightness / 255) : 1.0;

  return (
    <pointLight 
      ref={lightRef}
      position={position}
      intensity={brightness * (mapping.lightIntensity ?? 1.0) * 5.0}
      color={color}
      distance={mapping.lightDistance ?? 8}
      decay={2}
      castShadow
      shadow-bias={-0.005}
      shadow-normalBias={0.05}
      shadow-mapSize={[lightShadowRes, lightShadowRes]}
    />
  );
}

function PinProjector({ pointLights, mappings, isMeshHidden }: { pointLights: { name: string; position: THREE.Vector3 }[]; mappings: Record<string, any>; isMeshHidden: (name: string) => boolean }) {
  const { camera, size } = useThree();
  const setStaticPinPositions = useStore(state => state.setStaticPinPositions);
  const activeViewId = useStore(state => state.activeViewId);
  const _projected = useRef(new THREE.Vector3());
  
  // Use numeric comparison instead of string hashing to avoid GC pressure
  const lastCamX = useRef(NaN);
  const lastCamY = useRef(NaN);
  const lastCamZ = useRef(NaN);
  const lastCamQW = useRef(NaN);
  const hasPublishedStatic = useRef(false);

  useEffect(() => {
    // Force a recalculation when mappings or visibility changes
    hasPublishedStatic.current = false;
    // Clear pins immediately so they don't linger from the previous state
    setStaticPinPositions([]);
  }, [mappings, isMeshHidden, setStaticPinPositions]);

  useEffect(() => {
    // Force recalculation of projection on window resize without clearing first
    // to prevent flickering. R3F automatically invalidates on resize.
    hasPublishedStatic.current = false;
  }, [size.width, size.height]);

  useFrame(() => {
    // Zero-allocation numeric comparison to detect camera movement
    const { x, y, z } = camera.position;
    const qw = camera.quaternion.w;
    const cameraMoved = x !== lastCamX.current || y !== lastCamY.current
                     || z !== lastCamZ.current || qw !== lastCamQW.current;
    lastCamX.current = x;
    lastCamY.current = y;
    lastCamZ.current = z;
    lastCamQW.current = qw;
    
    // If the camera is moving OR we are not locked to a saved view, hide pins immediately
    if (cameraMoved || !activeViewId) {
      // Only clear once to avoid re-triggering React on every frame
      if (hasPublishedStatic.current) {
        hasPublishedStatic.current = false;
        setStaticPinPositions([]);
      }
      // Don't call invalidate() here — during 'always' mode (fly transitions)
      // it accumulates R3F's frame counter, causing issues when switching to 'demand'.
      // CameraController schedules the needed extra frames at transition end.
      return;
    }

    // If we reach here, the camera is completely STILL and locked to a view.
    if (!hasPublishedStatic.current) {
      const results: { name: string; x: number; y: number; visible: boolean }[] = [];
      for (const light of pointLights) {
        if (isMeshHidden(light.name)) continue;
        const mapping = mappings[light.name];
        if (!mapping?.enablePin || !mapping.eid) continue;

        // View Filtering: Check if the pin is explicitly assigned to a specific view
        if (mapping.pinConfig?.viewIds) {
          if (!mapping.pinConfig.viewIds.includes(activeViewId!)) continue;
        } else if (mapping.pinConfig?.viewId && mapping.pinConfig.viewId !== activeViewId) {
          continue; // Legacy single view support
        }

        _projected.current.copy(light.position).project(camera);
        const x = Math.round((_projected.current.x * 0.5 + 0.5) * size.width);
        const y = Math.round((-_projected.current.y * 0.5 + 0.5) * size.height);
        const visible = _projected.current.z < 1;

        results.push({ name: light.name, x, y, visible });
      }
      hasPublishedStatic.current = true;
      setStaticPinPositions(results);
    }
  });

  return null;
}

// Manual click handler — bypasses R3F's event system entirely.
// R3F raycasts on every pointermove when any event handler is attached.
// This component instead listens for native DOM click/contextmenu events
// and only raycasts once per actual user click.
function ManualClickHandler({
  clonedScene,
  mappings,
  getMeshBehavior,
  isMeshHidden,
  setSelectedMesh,
}: {
  clonedScene: THREE.Object3D;
  mappings: Record<string, any>;
  getMeshBehavior: (name: string) => string;
  isMeshHidden: (name: string) => boolean;
  setSelectedMesh: (name: string | null) => void;
}) {
  const { camera, gl, size } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  // Track pointer down position to distinguish click from drag
  const pointerDownPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      // Only handle left clicks (button 0)
      if (e.button !== 0) return;

      // Ignore if this was a drag (orbit/pan)
      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      if (dx * dx + dy * dy > 9) return; // 3px threshold

      // Check if the click is on a UI element above the canvas
      const topEl = document.elementFromPoint(e.clientX, e.clientY);
      if (topEl && topEl !== canvas) return;

      // Calculate NDC coordinates from the canvas rect
      const rect = canvas.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(pointer.current, camera);
      const intersects = raycaster.current.intersectObjects(clonedScene.children, true);

      let handled = false;
      for (const hit of intersects) {
        if (!(hit.object instanceof THREE.Mesh)) continue;
        const logName = hit.object.userData.originalName || hit.object.name;
        if (getMeshBehavior(logName) !== 'default' || isMeshHidden(logName)) continue;

        // Found a valid mesh — handle click
        const mapping = mappings[logName];
        if (mapping) {
          const action = mapping.action || 'toggle';
          if (action === 'toggle') {
            const eid = typeof mapping === 'string' ? mapping : mapping.eid;
            const domain = eid?.split('.')[0];
            if (domain) callService(domain, 'toggle', { entity_id: eid });
          } else if (action === 'more-info') {
            const eid = typeof mapping === 'string' ? mapping : mapping.eid;
            const event = new CustomEvent('hass-more-info', { detail: { entityId: eid }, bubbles: true, composed: true });
            document.dispatchEvent(event);
          }
        }
        handled = true;
        break;
      }

      // Click on nothing = deselect (replaces Canvas onPointerMissed)
      if (!handled) {
        setSelectedMesh(null);
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      // Ignore clicks if the material picker is active
      if (useMaterialStore.getState().isPickerActive) return;

      // Ignore if this was a drag
      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      if (dx * dx + dy * dy > 9) return;

      // Check if the click is on a UI element above the canvas
      const topEl = document.elementFromPoint(e.clientX, e.clientY);
      if (topEl && topEl !== canvas) return;

      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(pointer.current, camera);
      const intersects = raycaster.current.intersectObjects(clonedScene.children, true);

      for (const hit of intersects) {
        if (!(hit.object instanceof THREE.Mesh)) continue;
        const logName = hit.object.userData.originalName || hit.object.name;
        if (getMeshBehavior(logName) !== 'default' || isMeshHidden(logName)) continue;

        setSelectedMesh(logName);
        break;
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [gl, camera, clonedScene, mappings, getMeshBehavior, isMeshHidden, setSelectedMesh, size]);

  return null;
}

export function Model() {
  const { invalidate } = useThree();
  const modelUrl = useStore((state) => state.modelUrl);
  const isWhiteView = useStore((state) => state.isWhiteView);
  const mappings = useStore((state) => state.mappings);
  
  // Read actual full object during render without subscribing
  const selectedMesh = useStore((state) => state.selectedMesh);
  const setSelectedMesh = useStore((state) => state.setSelectedMesh);
  const setAllMeshes = useStore((state) => state.setAllMeshes);
  const setShadowBounds = useStore((state) => state.setShadowBounds);
  const tags = useStore((state) => state.tags);
  const meshTags = useStore((state) => state.meshTags);
  const hiddenTags = useStore((state) => state.hiddenTags);
  const isolatedTag = useStore((state) => state.isolatedTag);



  const { scene } = useGLTF(modelUrl || '/placeholder.glb');

  const getMeshBehavior = useCallback((meshName: string) => {
    const activeTagIds = meshTags[meshName] || [];
    const activeTags = tags.filter(t => activeTagIds.includes(t.id));
    if (activeTags.some(t => t.behavior === 'occluder')) return 'occluder';
    if (activeTags.some(t => t.behavior === 'static')) return 'static';
    if (activeTags.some(t => t.behavior === 'mirror') || meshName.endsWith('_mirror')) return 'mirror';
    return 'default';
  }, [tags, meshTags]);

  const isMeshHidden = useCallback((meshName: string) => {
    const activeTagIds = meshTags[meshName] || [];
    if (isolatedTag) {
      return !activeTagIds.includes(isolatedTag);
    }
    return activeTagIds.some(id => hiddenTags.includes(id));
  }, [meshTags, hiddenTags, isolatedTag]);

  const { clonedScene, pointLights, uniqueNames, maxExtent, meshMaterials } = useMemo(() => {
    const clone = scene.clone();
    const nameSet = new Set<string>();
    const groupBounds: Record<string, THREE.Box3> = {};
    const materialsMap: Record<string, THREE.Material[]> = {};
    
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const cent = box.getCenter(new THREE.Vector3());
    const scale = 12 / Math.max(size.x, size.y, size.z);
    clone.scale.setScalar(scale);
    clone.position.copy(cent.clone().multiplyScalar(-scale));
    clone.updateMatrixWorld(true);

    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;

        let logName = obj.name || ('Mesh_' + obj.id);
        const groupMatch = logName.match(/^(.*)_\d+$/);
        if (groupMatch) {
          logName = groupMatch[1];
        }
        obj.userData.originalName = logName;
        
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        const overrides = useStore.getState().materialOverrides || {};

        const clonedMats = mats.map((m, index) => {
           const cm = m.clone();
           // Assign a stable name for unnamed materials so they don't share a blank save slot
           cm.name = cm.name || `mat_${index}`;
           cm.userData.sourceMaterialUuid = m.uuid;
           
           // Save factory defaults
           cm.userData.factoryColor = cm.color?.clone();
           cm.userData.factoryEmissive = cm.emissive?.clone();
           cm.userData.factoryRoughness = cm.roughness;
           cm.userData.factoryMetalness = cm.metalness;
           cm.userData.factoryOpacity = cm.opacity;
           cm.userData.factoryTransparent = cm.transparent;
           cm.userData.factoryEmissiveIntensity = (cm as any).emissiveIntensity;
           cm.userData.factoryMap = cm.map;

           // Apply overrides
           const globalOverride = overrides[`global::${cm.name}`] || {};
           const specificOverride = overrides[`mesh::${logName}::${cm.name}`] || {};
           const ov = { ...globalOverride, ...specificOverride }; // Merge, specific wins

           if (Object.keys(ov).length > 0) {
             if (ov.color) cm.color?.set(ov.color);
             if (ov.emissive) cm.emissive?.set(ov.emissive);
             if (ov.emissiveIntensity !== undefined) (cm as any).emissiveIntensity = ov.emissiveIntensity;
             if (ov.roughness !== undefined) cm.roughness = ov.roughness;
             if (ov.metalness !== undefined) cm.metalness = ov.metalness;
             if (ov.opacity !== undefined) cm.opacity = ov.opacity;
             if (ov.transparent !== undefined) cm.transparent = ov.transparent;
           }

           // orig* properties used for White View toggler and fast entity highlighting restores
           cm.userData.origColor = cm.color?.clone();
           cm.userData.origEmissive = cm.emissive?.clone();
           cm.userData.origRoughness = cm.roughness;
           cm.userData.origMetalness = cm.metalness;
           cm.userData.origTransparent = cm.transparent;
           cm.userData.origOpacity = cm.opacity;
           cm.userData.origMap = cm.map;
           return cm;
        });
        obj.material = Array.isArray(obj.material) ? clonedMats : clonedMats[0];
        
        if (!groupBounds[logName]) groupBounds[logName] = new THREE.Box3();
        groupBounds[logName].union(new THREE.Box3().setFromObject(obj));
        nameSet.add(logName);

        if (!materialsMap[logName]) materialsMap[logName] = [];
        materialsMap[logName].push(...clonedMats);
      }
    });

    const lights = Object.entries(groupBounds).map(([name, bounds]) => ({
      name,
      position: bounds.getCenter(new THREE.Vector3())
    }));

    const scaledBox = new THREE.Box3().setFromObject(clone);
    const boundingSphere = new THREE.Sphere();
    scaledBox.getBoundingSphere(boundingSphere);
    const maxExtent = Math.ceil(boundingSphere.center.length() + boundingSphere.radius) + 5;

    return { clonedScene: clone, pointLights: lights, uniqueNames: Array.from(nameSet).sort(), maxExtent, meshMaterials: materialsMap };
  }, [scene]);

  useEffect(() => {
    setAllMeshes(uniqueNames);
  }, [uniqueNames, setAllMeshes]);

  useEffect(() => {
    setShadowBounds(maxExtent);
  }, [maxExtent, setShadowBounds]);

  // --- Effect 1: Static Properties (Visibility, Base Materials, White View) ---
  useEffect(() => {
    const entities = useStore.getState().entities;

    clonedScene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const logName = obj.userData.originalName || obj.name;
        
        const isHidden = isMeshHidden(logName);
        obj.visible = !isHidden;
        if (isHidden) {
          obj.raycast = () => null;
        } else {
          delete (obj as any).raycast;
        }

        const behavior = getMeshBehavior(logName);
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        
        mats.forEach((mat: any) => {
          if (mat.isMaterial) {
            if (mat.transparent !== undefined) {
              mat.transparent = mat.userData.origTransparent || false;
              mat.opacity = mat.userData.origOpacity ?? 1.0;
              mat.depthWrite = !mat.transparent;
            }
            obj.castShadow = true;

            if (mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('translucent')) {
              mat.transparent = true;
              mat.opacity = Math.min(mat.opacity, 0.4);
              mat.roughness = 0.1;
              mat.metalness = 0.8;
              mat.envMapIntensity = 2.0;
              obj.castShadow = false;
            }

            if (behavior === 'occluder') {
              obj.raycast = () => null;
              mat.transparent = true;
              mat.opacity = 0;
              mat.depthWrite = false;
            } else if (behavior === 'mirror') {
              mat.transparent = false;
              mat.opacity = 1.0;
              if (mat.roughness !== undefined) mat.roughness = 0.05;
              if (mat.metalness !== undefined) mat.metalness = 1;
              if (mat.envMapIntensity !== undefined) mat.envMapIntensity = 2.0;
              obj.castShadow = true;
              if (mat.color && mat.userData.origColor) mat.color.copy(mat.userData.origColor);
            } else if (isWhiteView) {
              if (mat.color) mat.color.setHex(0xffffff);
              if (mat.emissive) mat.emissive.setHex(0x000000);
              if (mat.map !== undefined && mat.map !== null) {
                mat.map = null;
                mat.needsUpdate = true;
              }
              if (mat.roughness !== undefined) mat.roughness = 0.8;
              if (mat.metalness !== undefined) mat.metalness = 0.1;
            } else {
              if (mat.color && mat.userData.origColor) mat.color.copy(mat.userData.origColor);
              if (mat.emissive && mat.userData.origEmissive) mat.emissive.copy(mat.userData.origEmissive);
              if (mat.map === null && mat.userData.origMap) {
                mat.map = mat.userData.origMap;
                mat.needsUpdate = true;
              }
              if (mat.roughness !== undefined && mat.userData.origRoughness !== undefined) mat.roughness = mat.userData.origRoughness;
              if (mat.metalness !== undefined && mat.userData.origMetalness !== undefined) mat.metalness = mat.userData.origMetalness;
              
              const mapping = mappings[logName];
              if (mapping) {
                const eid = typeof mapping === 'string' ? mapping : mapping.eid;
                if (['on', 'heat', 'cool'].includes(entities[eid]?.state)) {
                  if (mat.emissive) {
                    mat.emissive.set(mapping.highlightColor || '#ffff00');
                    mat.emissiveIntensity = 0.5;
                  }
                } else {
                  if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 1.0;
                }
              }
            }
          }
        });
      }
    });
    invalidate();
  }, [clonedScene, isWhiteView, mappings, tags, meshTags, hiddenTags, isolatedTag, getMeshBehavior, isMeshHidden, invalidate]);

  // --- Effect 2: Fast Entity Updates ---
  useEffect(() => {
    const unsub = useStore.subscribe((state, prevState) => {
      if (state.entities === prevState.entities) return;
      if (state.isWhiteView) return; // Don't highlight in white view

      let changed = false;
      for (const meshName in state.mappings) {
        const mapping = state.mappings[meshName];
        if (!mapping) continue;
        const eid = typeof mapping === 'string' ? mapping : mapping.eid;
        
        const ent = state.entities[eid];
        const prevEnt = prevState.entities[eid];
        
        if (ent !== prevEnt && ent?.state !== prevEnt?.state) {
          if (state.selectedMesh === meshName) continue; // Let selection effect handle this
          
          const mats = meshMaterials[meshName];
          if (mats) {
            mats.forEach((mat: any) => {
              if (!mat.isMaterial || !mat.emissive) return;
              if (['on', 'heat', 'cool'].includes(ent?.state as string)) {
                mat.emissive.set(mapping.highlightColor || '#ffff00');
                mat.emissiveIntensity = 0.5;
              } else {
                if (mat.userData.origEmissive) {
                  mat.emissive.copy(mat.userData.origEmissive);
                  mat.emissiveIntensity = 1.0;
                }
              }
            });            changed = true;
          }
        }
      }
      if (changed) invalidate();
    });
    return unsub;
  }, [meshMaterials, invalidate]);

  // --- Effect 3: Fast Selection Highlighting ---
  const prevSelected = useRef<string | null>(null);
  useEffect(() => {
    let changed = false;
    const state = useStore.getState();
    const currentMappings = state.mappings;
    const entities = state.entities;

    if (prevSelected.current && meshMaterials[prevSelected.current]) {
      const pMesh = prevSelected.current;
      const mats = meshMaterials[pMesh];
      const mapping = currentMappings[pMesh];
      const eid = mapping ? (typeof mapping === 'string' ? mapping : mapping.eid) : null;
      const entState = eid ? entities[eid]?.state : null;
      
      mats.forEach((mat: any) => {
        if (!mat.isMaterial || !mat.emissive) return;
        if (!state.isWhiteView && ['on', 'heat', 'cool'].includes(entState as string)) {
          mat.emissive.set(mapping?.highlightColor || '#ffff00');
          mat.emissiveIntensity = 0.5;
        } else {
          if (mat.userData.origEmissive) {
            mat.emissive.copy(mat.userData.origEmissive);
            mat.emissiveIntensity = 1.0;
          }
        }
      });
      changed = true;
    }

    if (selectedMesh && meshMaterials[selectedMesh]) {
      const mats = meshMaterials[selectedMesh];
      mats.forEach((mat: any) => {
        if (!mat.isMaterial || !mat.emissive) return;
        mat.emissive.setHex(0x00ffff);
        mat.emissiveIntensity = 0.8;
      });
      changed = true;
    }

    prevSelected.current = selectedMesh;
    if (changed) invalidate();
  }, [selectedMesh, meshMaterials, invalidate]);

  return (
    <>
      <primitive object={clonedScene} />
      <MaterialPickerMode clonedScene={clonedScene} />
      <ManualClickHandler
        clonedScene={clonedScene}
        mappings={mappings}
        getMeshBehavior={getMeshBehavior}
        isMeshHidden={isMeshHidden}
        setSelectedMesh={setSelectedMesh}
      />
      
      {!isWhiteView && pointLights.map((light, idx) => {
        if (isMeshHidden(light.name)) return null;
        const mapping = mappings[light.name];
        if (mapping?.type === 'light') {
          return <MappedLight key={`light-${idx}`} light={light} mapping={mapping} />;
        }
        return null;
      })}

      {/* Pin Position Projector (runs inside Canvas, publishes to overlay) */}
      <PinProjector pointLights={pointLights} mappings={mappings} isMeshHidden={isMeshHidden} />
    </>
  );
}
