import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useMaterialStore } from '../store/useMaterialStore';

export function MaterialPickerMode({ clonedScene }: { clonedScene: THREE.Object3D }) {
  const { camera, gl, invalidate, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const pointerDownPos = useRef({ x: 0, y: 0 });

  const isPickerActive = useMaterialStore((state) => state.isPickerActive);
  const setSelectedMaterial = useMaterialStore((state) => state.setSelectedMaterial);
  const setHoveredMeshName = useMaterialStore((state) => state.setHoveredMeshName);
  const setCanvasContext = useMaterialStore((state) => state.setCanvasContext);

  useEffect(() => {
    setCanvasContext(invalidate, scene);
  }, [invalidate, scene, setCanvasContext]);
  
  // Keep track of the currently hovered mesh to restore its material properties
  const hoveredMeshRef = useRef<{ meshUuid: string; hoverId: string; name: string; originalEmissives: Map<string, { color: THREE.Color, intensity: number }> } | null>(null);

  useEffect(() => {
    if (!isPickerActive) {
      if (hoveredMeshRef.current) {
        // Restore previous hover state if picker is disabled while hovering
        const mesh = clonedScene.getObjectByProperty('uuid', hoveredMeshRef.current.meshUuid) as THREE.Mesh;
        if (mesh) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(m => {
                if (!m) return;
                const orig = hoveredMeshRef.current?.originalEmissives.get(m.uuid);
                if (orig && (m as any).emissive) {
                    (m as any).emissive.copy(orig.color);
                    (m as any).emissiveIntensity = orig.intensity;
                }
            });
            invalidate();
        }
        hoveredMeshRef.current = null;
        setHoveredMeshName(null);
      }
      // Restore cursor
      gl.domElement.style.cursor = 'auto';
      return;
    }

    gl.domElement.style.cursor = 'crosshair';

    const canvas = gl.domElement;

    const onPointerMove = (e: PointerEvent) => {
      // Check if hovering UI
      const topEl = document.elementFromPoint(e.clientX, e.clientY);
      if (topEl && topEl !== canvas) {
          if (hoveredMeshRef.current) {
              const mesh = clonedScene.getObjectByProperty('uuid', hoveredMeshRef.current.meshUuid) as THREE.Mesh;
              if (mesh) {
                  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                  mats.forEach(m => {
                      if (!m) return;
                      const orig = hoveredMeshRef.current?.originalEmissives.get(m.uuid);
                      if (orig && (m as any).emissive) {
                          (m as any).emissive.copy(orig.color);
                          (m as any).emissiveIntensity = orig.intensity;
                      }
                  });
                  invalidate();
              }
              hoveredMeshRef.current = null;
              setHoveredMeshName(null);
          }
          return;
      }

      const rect = canvas.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(pointer.current, camera);
      const intersects = raycaster.current.intersectObjects(clonedScene.children, true);
      
      let foundMesh: THREE.Mesh | null = null;
      let foundMaterialIndex: number | undefined = undefined;
      for (const hit of intersects) {
        if (hit.object instanceof THREE.Mesh) {
          foundMesh = hit.object;
          foundMaterialIndex = hit.face?.materialIndex;
          break;
        }
      }

      if (foundMesh) {
        const hoverId = `${foundMesh.uuid}_${foundMaterialIndex}`;
        if (hoveredMeshRef.current?.hoverId !== hoverId) {
            // Restore previous
            if (hoveredMeshRef.current) {
                const oldMesh = clonedScene.getObjectByProperty('uuid', hoveredMeshRef.current.meshUuid) as THREE.Mesh;
                if (oldMesh) {
                    const mats = Array.isArray(oldMesh.material) ? oldMesh.material : [oldMesh.material];
                    mats.forEach(m => {
                        if (!m) return;
                        const orig = hoveredMeshRef.current?.originalEmissives.get(m.uuid);
                        if (orig && (m as any).emissive) {
                            (m as any).emissive.copy(orig.color);
                            (m as any).emissiveIntensity = orig.intensity;
                        }
                    });
                }
            }

            // Highlight new
            const logName = foundMesh.userData.originalName || foundMesh.name;
            const originalEmissives = new Map();
            const mats = Array.isArray(foundMesh.material) ? foundMesh.material : [foundMesh.material];
            
            let targetMats = mats;
            if (foundMaterialIndex !== undefined && mats[foundMaterialIndex]) {
                targetMats = [mats[foundMaterialIndex]];
            }

            targetMats.forEach((m: any) => {
                if (!m) return;
                if (m.emissive) {
                    originalEmissives.set(m.uuid, { color: m.emissive.clone(), intensity: m.emissiveIntensity });
                    // Highlight with white overlay
                    m.emissive.setHex(0xffffff);
                    m.emissiveIntensity = 0.5;
                }
            });
            
            hoveredMeshRef.current = { meshUuid: foundMesh.uuid, hoverId, name: logName, originalEmissives };
            setHoveredMeshName(logName);
            invalidate();
        }
      } else if (hoveredMeshRef.current) {
         // Restore
         const oldMesh = clonedScene.getObjectByProperty('uuid', hoveredMeshRef.current.meshUuid) as THREE.Mesh;
         if (oldMesh) {
             const mats = Array.isArray(oldMesh.material) ? oldMesh.material : [oldMesh.material];
             mats.forEach(m => {
                 if (!m) return;
                 const orig = hoveredMeshRef.current?.originalEmissives.get(m.uuid);
                 if (orig && (m as any).emissive) {
                     (m as any).emissive.copy(orig.color);
                     (m as any).emissiveIntensity = orig.intensity;
                 }
             });
         }
         hoveredMeshRef.current = null;
         setHoveredMeshName(null);
         invalidate();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      if (dx * dx + dy * dy > 9) return;

      const topEl = document.elementFromPoint(e.clientX, e.clientY);
      if (topEl && topEl !== canvas) return;

      const rect = canvas.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(pointer.current, camera);
      const intersects = raycaster.current.intersectObjects(clonedScene.children, true);

      for (const hit of intersects) {
        if (hit.object instanceof THREE.Mesh) {
            const meshName = hit.object.userData.originalName || hit.object.name;
            const mats = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
            
            // Try to pick the exact material face if available, otherwise just grab the first one
            let selectedMat = mats[0];
            if (hit.face && hit.face.materialIndex !== undefined && mats[hit.face.materialIndex]) {
                selectedMat = mats[hit.face.materialIndex];
            }

            // Defer the selection state change so that other pointerup listeners (OrbitControls,
            // ManualClickHandler) can evaluate the native event before isPickerActive becomes false.
            setTimeout(() => {
                setSelectedMaterial(selectedMat, meshName);
            }, 0);
            
            // DO NOT call e.stopPropagation() here, as it blocks OrbitControls from
            // seeing the pointerup event and gets it stuck in drag mode!
            return;
        }
      }
    };

    // Use capture phase to intercept clicks before they reach ManualClickHandler
    canvas.addEventListener('pointermove', onPointerMove, true);
    canvas.addEventListener('pointerdown', onPointerDown, true);
    canvas.addEventListener('pointerup', onPointerUp, true);

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove, true);
      canvas.removeEventListener('pointerdown', onPointerDown, true);
      canvas.removeEventListener('pointerup', onPointerUp, true);
    };
  }, [isPickerActive, camera, clonedScene, gl, invalidate, setSelectedMaterial, setHoveredMeshName]);

  return null;
}