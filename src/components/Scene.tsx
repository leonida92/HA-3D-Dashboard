import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { useStore, type CameraView } from '../store/useStore';
import { Model } from './Model';
import { Lighting } from './Lighting';
import { Suspense, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

function CameraController() {
  const { camera, gl, scene, setFrameloop, invalidate } = useThree();
  const controlsRef = useRef<any>(null);
  
  const addView = useStore(state => state.addView);
  const activeViewId = useStore(state => state.activeViewId);
  const setActiveViewId = useStore(state => state.setActiveViewId);
  const updateView = useStore(state => state.updateView);

  // Store setters for "morphing" environment
  const setViewMode = useStore(state => state.setViewMode);
  const viewMode = useStore(state => state.viewMode);
  const walkSpeed = useStore(state => state.walkSpeed);
  const isLocked = useStore(state => state.isLocked);
  
  const targetView = useRef<CameraView | null>(null);
  const isTransitioning = useRef(false);
  const hasViewOffset = useRef(false);

  const keys = useRef<{ [key: string]: boolean }>({});

  // Sync camera transform when camera changes (e.g. view mode switch)
  const prevCamPos = useRef(new THREE.Vector3(0, 5, 10));
  const prevCamQuat = useRef(new THREE.Quaternion());
  
  useEffect(() => {
    // When camera instance changes, restore the previous transform
    camera.position.copy(prevCamPos.current);
    camera.quaternion.copy(prevCamQuat.current);
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.update();
    }
    invalidate();
  }, [camera, invalidate]);

  // Pre-allocated vectors to avoid per-frame GC pressure
  const _forward = useRef(new THREE.Vector3());
  const _right = useRef(new THREE.Vector3());
  const _up = useRef(new THREE.Vector3(0, 1, 0));
  const _move = useRef(new THREE.Vector3());
  const _targetPos = useRef(new THREE.Vector3());
  const _targetTarget = useRef(new THREE.Vector3());

  // Debounce the switch to 'demand' mode to prevent rapid toggling.
  // OrbitControls fires onStart/onEnd rapidly during normal orbiting —
  // every micro-pause triggers onEnd, then onStart again instantly.
  const demandTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const switchToDemand = () => {
    if (demandTimeout.current) clearTimeout(demandTimeout.current);
    demandTimeout.current = setTimeout(() => {
      if (!Object.values(keys.current).some(Boolean) && !isTransitioning.current) {
        setFrameloop('demand');
        invalidate();
        requestAnimationFrame(() => invalidate());
      }
    }, 400);
  };

  const switchToAlways = () => {
    if (demandTimeout.current) {
      clearTimeout(demandTimeout.current);
      demandTimeout.current = null;
    }
    setFrameloop('always');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Skip key repeats — the key is already tracked in keys.current
      if (e.repeat) return;
      keys.current[e.code] = true; 
      switchToAlways();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      keys.current[e.code] = false; 
      if (!Object.values(keys.current).some(Boolean) && !isTransitioning.current) {
        switchToDemand();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setFrameloop]);

  // Listen for save and update requests from UI
  useEffect(() => {
    const handleSave = (e: any) => {
      if (!controlsRef.current) return;
      
      // Capture thumbnail
      gl.render(scene, camera);
      const thumbnail = gl.domElement.toDataURL('image/jpeg', 0.5);
      
      const currentStore = useStore.getState();

      const viewData: any = {
        position: [camera.position.x, camera.position.y, camera.position.z] as [number, number, number],
        target: [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z] as [number, number, number],
        // @ts-ignore
        fov: camera.fov || 50,
        // @ts-ignore
        zoom: camera.zoom || 40,
        viewMode: currentStore.viewMode,
        timeOfDay: currentStore.timeOfDay,
        sunIntensity: currentStore.sunIntensity,
        ambientIntensity: currentStore.ambientIntensity,
        latitude: currentStore.latitude,
        northOffset: currentStore.northOffset,
        hiddenTags: currentStore.hiddenTags,
        isolatedTag: currentStore.isolatedTag,
        backgroundColor: currentStore.backgroundColor,
        thumbnail
      };

      if (e.type === 'request-camera-save') {
        addView({
          id: Math.random().toString(36).substr(2, 9),
          name: e.detail.name,
          ...viewData
        });
      } else if (e.type === 'request-camera-update') {
        // Don't overwrite user-uploaded thumbnails
        const existingView = useStore.getState().views.find((v: any) => v.id === e.detail.id);
        if (existingView?.thumbnailCustom) {
          delete viewData.thumbnail;
        }
        updateView(e.detail.id, viewData);
      }
    };

    window.addEventListener('request-camera-save', handleSave);
    window.addEventListener('request-camera-update', handleSave);
    return () => {
      window.removeEventListener('request-camera-save', handleSave);
      window.removeEventListener('request-camera-update', handleSave);
    };
  }, [camera, gl, scene, addView, updateView]);

  const setHiddenTags = useStore(state => state.setHiddenTags);
  const setIsolatedTag = useStore(state => state.setIsolatedTag);

  // Watch for active view changes
  useEffect(() => {
    if (activeViewId) {
      // Read views from getState to avoid re-triggering when thumbnail positions update
      const currentStore = useStore.getState();
      const view = currentStore.views.find(v => v.id === activeViewId);
      if (view) {
        if (currentStore.transitionType === 'fade') {
          // Classic UI Fade Transition
          currentStore.setFadeState('fading-out');
          
          // Wait for CSS transition (250ms fade out)
          setTimeout(() => {
            if (!controlsRef.current) return;
            
            // Instantly teleport camera
            camera.position.set(view.position[0], view.position[1], view.position[2]);
            controlsRef.current.target.set(view.target[0], view.target[1], view.target[2]);
            
            if (camera instanceof THREE.PerspectiveCamera && view.fov) {
              camera.fov = view.fov;
              camera.updateProjectionMatrix();
            } else if (camera instanceof THREE.OrthographicCamera && view.zoom) {
              camera.zoom = view.zoom;
              camera.updateProjectionMatrix();
            }
            controlsRef.current.update();
            
            // Apply environment settings instantly
            const envUpdate: Record<string, any> = {};
            if (view.timeOfDay !== undefined) envUpdate.timeOfDay = view.timeOfDay;
            if (view.sunIntensity !== undefined) envUpdate.sunIntensity = view.sunIntensity;
            if (view.ambientIntensity !== undefined) envUpdate.ambientIntensity = view.ambientIntensity;
            if (view.latitude !== undefined) envUpdate.latitude = view.latitude;
            if (view.northOffset !== undefined) envUpdate.northOffset = view.northOffset;
            if (view.backgroundColor !== undefined) envUpdate.backgroundColor = view.backgroundColor;
            
            envUpdate.viewMode = view.viewMode;
            if (view.hiddenTags !== undefined) envUpdate.hiddenTags = view.hiddenTags;
            if (view.isolatedTag !== undefined) envUpdate.isolatedTag = view.isolatedTag;
            
            useStore.setState(envUpdate);
            
            // Render two frames: first lets PinProjector record the new camera position,
            // second lets it detect camera is settled and publish pins.
            setFrameloop('demand');
            invalidate();
            requestAnimationFrame(() => invalidate());
            
            // Fade in (wait a tiny bit to ensure renderer has caught up)
            setTimeout(() => {
              useStore.getState().setFadeState('fading-in');
              
              // After fade in completes, set back to idle
              setTimeout(() => {
                useStore.getState().setFadeState('idle');
              }, 500); // UI.tsx uses 500ms for fading-in -> idle
            }, 50);
          }, 250);
        } else {
          // Classic Flying Transition
          targetView.current = view;
          isTransitioning.current = true;
          setFrameloop('always');
          
          // Immediate settings apply
          setViewMode(view.viewMode);
          if (view.backgroundColor !== undefined) useStore.getState().setBackgroundColor(view.backgroundColor);
          if (view.hiddenTags !== undefined) setHiddenTags(view.hiddenTags);
          if (view.isolatedTag !== undefined) setIsolatedTag(view.isolatedTag);
        }
      }
    }
  }, [activeViewId, setViewMode, setHiddenTags, setIsolatedTag, setFrameloop, camera, invalidate]);

  useFrame((state, rawDelta) => {
    // Clamp delta to prevent movement bursts after idle (first frame after
    // switching from 'demand' to 'always' can have delta of several seconds)
    const delta = Math.min(rawDelta, 0.05); // 50ms max = 20 FPS floor

    // Continuously save the current camera transform so we have it if the camera instance swaps
    prevCamPos.current.copy(camera.position);
    prevCamQuat.current.copy(camera.quaternion);

    if (controlsRef.current && !isLocked && !isTransitioning.current) {
      // Keyboard Movement — reuse pre-allocated vectors
      const speed = walkSpeed * (keys.current['ShiftLeft'] || keys.current['ShiftRight'] ? 0.25 : 1) * delta;
      
      const forward = _forward.current;
      const right = _right.current;
      const up = _up.current;
      const move = _move.current;

      camera.getWorldDirection(forward);
      right.crossVectors(forward, up).normalize();
      move.set(0, 0, 0);

      if (keys.current['KeyW']) move.add(forward);
      if (keys.current['KeyS']) move.sub(forward);
      if (keys.current['KeyA']) move.sub(right);
      if (keys.current['KeyD']) move.add(right);
      if (keys.current['KeyQ']) move.sub(up);
      if (keys.current['KeyE']) move.add(up);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed);
        camera.position.add(move);
        controlsRef.current.target.add(move);
        controlsRef.current.update();
        // Only update store once when movement starts, not every frame
        if (useStore.getState().activeViewId !== null) {
          setActiveViewId(null);
        }
      }
    }

    if (isTransitioning.current && targetView.current && controlsRef.current) {
      const v = targetView.current;
      const lerpFactor = 1 - Math.pow(0.001, delta); // Smoother transition

      // Move camera — reuse pre-allocated vectors
      _targetPos.current.set(v.position[0], v.position[1], v.position[2]);
      camera.position.lerp(_targetPos.current, lerpFactor);
      
      // Move controls target
      _targetTarget.current.set(v.target[0], v.target[1], v.target[2]);
      controlsRef.current.target.lerp(_targetTarget.current, lerpFactor);
      
      // Lerp FOV if perspective
      if (camera instanceof THREE.PerspectiveCamera && v.fov) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, v.fov, lerpFactor);
        camera.updateProjectionMatrix();
      }

      // Lerp Zoom if orthographic
      if (camera instanceof THREE.OrthographicCamera && v.zoom) {
        camera.zoom = THREE.MathUtils.lerp(camera.zoom, v.zoom, lerpFactor);
        camera.updateProjectionMatrix();
      }

      // Lerp environment settings — batch into a single state update to avoid 5 separate re-renders per frame
      const currentStore = useStore.getState();
      const envUpdate: Record<string, number> = {};
      
      if (Math.abs(currentStore.timeOfDay - v.timeOfDay) > 0.01) {
        envUpdate.timeOfDay = THREE.MathUtils.lerp(currentStore.timeOfDay, v.timeOfDay, lerpFactor);
      }
      if (v.sunIntensity !== undefined && Math.abs(currentStore.sunIntensity - v.sunIntensity) > 0.01) {
        envUpdate.sunIntensity = THREE.MathUtils.lerp(currentStore.sunIntensity, v.sunIntensity, lerpFactor);
      }
      if (v.ambientIntensity !== undefined && Math.abs(currentStore.ambientIntensity - v.ambientIntensity) > 0.01) {
        envUpdate.ambientIntensity = THREE.MathUtils.lerp(currentStore.ambientIntensity, v.ambientIntensity, lerpFactor);
      }
      if (v.latitude !== undefined && Math.abs(currentStore.latitude - v.latitude) > 0.1) {
        envUpdate.latitude = THREE.MathUtils.lerp(currentStore.latitude, v.latitude, lerpFactor);
      }
      if (v.northOffset !== undefined && Math.abs(currentStore.northOffset - v.northOffset) > 0.1) {
        envUpdate.northOffset = THREE.MathUtils.lerp(currentStore.northOffset, v.northOffset, lerpFactor);
      }
      if (Object.keys(envUpdate).length > 0) {
        useStore.setState(envUpdate);
      }

      controlsRef.current.update();

      // Check if we're close enough to stop
      const distPos = camera.position.distanceTo(_targetPos.current);
      if (distPos < 0.01) {
        isTransitioning.current = false;
        // DO NOT clear activeViewId here, so we know we are settled in a view
        if (!Object.values(keys.current).some(Boolean)) {
          state.setFrameloop('demand');
          // Two frames: first lets PinProjector record final position,
          // second lets it detect settled state and publish pins.
          state.invalidate();
          requestAnimationFrame(() => state.invalidate());
        }
      }
    }

    // Apply 2-point perspective hack
    if (viewMode === '2-point' && camera instanceof THREE.PerspectiveCamera && controlsRef.current) {
      const target = controlsRef.current.target;
      const camY = camera.position.y;
      const tarY = target.y;
      const dist = Math.sqrt(
        Math.pow(camera.position.x - target.x, 2) +
        Math.pow(camera.position.z - target.z, 2)
      );
      
      if (dist > 0.1) {
         // Override lookAt so camera looks perfectly horizontal
         camera.lookAt(target.x, camera.position.y, target.z);
         
         // Apply offset to shift the frustum
         const fullHeight = camera.getFilmHeight();
         const fullWidth = camera.getFilmWidth();
         // The angle to the target
         const angle = Math.atan2(camY - tarY, dist);
         const focalLength = camera.getFocalLength();
         const yOffset = Math.tan(angle) * focalLength;

         camera.setViewOffset(fullWidth, fullHeight, 0, yOffset, fullWidth, fullHeight);
         camera.updateProjectionMatrix();
      }
      hasViewOffset.current = true;
    } else if (hasViewOffset.current && camera instanceof THREE.PerspectiveCamera) {
      camera.clearViewOffset();
      hasViewOffset.current = false;
    }
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      makeDefault 
      enabled={!isLocked}
      onStart={() => {
        isTransitioning.current = false;
        setActiveViewId(null);
      }}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: undefined
      }}
    />
  );
}

// Performance diagnostic — displays renderer stats, frame time, and worst-frame as an HTML overlay
function PerformanceDiag() {
  const { gl } = useThree();
  const getState = useThree(state => state.get);
  const divRef = useRef<HTMLDivElement | null>(null);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsRef = useRef(0);
  const prevFrameTime = useRef(performance.now());
  const worstFrame = useRef(0);
  const lastFrameMs = useRef(0);

  useEffect(() => {
    // Create the overlay div and append to body
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(0,0,0,0.85);color:#0f0;font:bold 11px monospace;padding:8px 14px;border-radius:8px;pointer-events:none;white-space:pre;line-height:1.6;border:1px solid #333;';
    document.body.appendChild(div);
    divRef.current = div;
    return () => { document.body.removeChild(div); };
  }, []);

  useFrame(() => {
    const now = performance.now();
    const frameDelta = now - prevFrameTime.current;
    prevFrameTime.current = now;
    lastFrameMs.current = frameDelta;

    // Track worst frame in the current measurement window
    if (frameDelta > worstFrame.current) {
      worstFrame.current = frameDelta;
    }

    frameCount.current++;
    const elapsed = now - lastTime.current;
    let worstDisplay = worstFrame.current;
    if (elapsed >= 500) {
      fpsRef.current = Math.round((frameCount.current / elapsed) * 1000);
      frameCount.current = 0;
      lastTime.current = now;
      worstDisplay = worstFrame.current;
      worstFrame.current = 0; // Reset for next window
    }

    if (divRef.current) {
      const info = gl.info;
      const ftColor = lastFrameMs.current > 33 ? '#f44' : lastFrameMs.current > 16.7 ? '#fa0' : '#0f0';
      const worstColor = worstDisplay > 50 ? '#f44' : worstDisplay > 33 ? '#fa0' : '#0f0';
      // Read frameloop from R3F state
      const frameloop = getState().frameloop || '?';
      divRef.current.innerHTML = [
        `FPS: ${fpsRef.current}  Loop: ${frameloop}`,
        `Frame: <span style="color:${ftColor}">${lastFrameMs.current.toFixed(1)}ms</span>  Worst: <span style="color:${worstColor}">${worstDisplay.toFixed(1)}ms</span>`,
        `Draw Calls: ${info.render.calls}`,
        `Triangles:  ${info.render.triangles}`,
        `Geometries: ${info.memory.geometries}`,
        `Textures:   ${info.memory.textures}`,
        `Programs:   ${info.programs?.length ?? '?'}`,
      ].join('\n');
    }
  });

  return null;
}

export function Scene() {
  const modelUrl = useStore((state) => state.modelUrl);
  const viewMode = useStore((state) => state.viewMode);
  const fov = useStore((state) => state.fov);
  const backgroundColor = useStore((state) => state.backgroundColor);
  const showDiagnostics = useStore((state) => state.showDiagnostics);

  const reflectionMode = useStore((state) => state.reflectionMode);
  const envIntensity = useMemo(() => 0.5, []); // Fixed low intensity for reflection-only HDRI

  return (
    <Canvas 
      frameloop="demand"
      dpr={[1, 1.5]}
      shadows={{ type: THREE.PCFShadowMap }}
    >
      {viewMode === 'ortho' ? (
        <OrthographicCamera makeDefault position={[0, 5, 10]} zoom={40} near={0.1} far={1000} />
      ) : (
        <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={fov} near={0.1} far={1000} />
      )}

      <color attach="background" args={[backgroundColor]} />
      
      <Suspense fallback={null}>
        {modelUrl && (
          <>
            <Lighting />
            <Model />
            {reflectionMode !== 'none' && (
              <Environment preset={reflectionMode} environmentIntensity={envIntensity} />
            )}
          </>
        )}
      </Suspense>

      <CameraController />
      {showDiagnostics && <PerformanceDiag />}
    </Canvas>
  );
}
