import { useStore } from '../store/useStore';
import * as THREE from 'three';
import { useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';

const _nightSky = new THREE.Color(0x0a0a1a);
const _daySky = new THREE.Color(0x445577);
const _nightGround = new THREE.Color(0x0a0808);
const _dayGround = new THREE.Color(0x553322);

// Pre-allocated objects — mutated in-place to avoid GC pressure
const _timeRot = new THREE.Matrix4();
const _latRot = new THREE.Matrix4();
const _northRot = new THREE.Matrix4();
const _sunPos = new THREE.Vector3();
const _sunDir = new THREE.Vector3();
const _upRef = new THREE.Vector3(0, 1, 0);
const _skyResult = new THREE.Color();
const _groundResult = new THREE.Color();

export function Lighting() {
  const timeOfDay = useStore(state => state.timeOfDay);
  const sunIntensity = useStore(state => state.sunIntensity);
  const ambientIntensity = useStore(state => state.ambientIntensity);
  const latitude = useStore(state => state.latitude);
  const northOffset = useStore(state => state.northOffset);
  const shadowRes = useStore(state => state.shadowRes);
  const shadowBounds = useStore(state => state.shadowBounds);

  const { gl, invalidate } = useThree();

  const { sunPosition, intensity, skyColor, groundColor } = useMemo(() => {
    const hourAngle = (timeOfDay - 12) * (Math.PI / 12);
    const r = 100;
    
    _timeRot.makeRotationZ(-hourAngle);
    _latRot.makeRotationX(latitude * THREE.MathUtils.DEG2RAD);
    _northRot.makeRotationY(northOffset * THREE.MathUtils.DEG2RAD);
    
    _sunPos.set(0, r, 0);
    _sunPos.applyMatrix4(_timeRot);
    _sunPos.applyMatrix4(_latRot);
    _sunPos.applyMatrix4(_northRot);

    _sunDir.copy(_sunPos).normalize();
    const calculatedIntensity = Math.max(0, _sunDir.dot(_upRef));

    _skyResult.copy(_nightSky).lerp(_daySky, calculatedIntensity);
    _groundResult.copy(_nightGround).lerp(_dayGround, calculatedIntensity);

    return { 
      sunPosition: _sunPos.clone(), // clone once for the JSX prop
      intensity: calculatedIntensity,
      skyColor: _skyResult.clone(),
      groundColor: _groundResult.clone()
    };
  }, [timeOfDay, latitude, northOffset]);

  useEffect(() => {
    const nightExposure = 0.3;
    const dayExposure = 0.6;
    gl.toneMappingExposure = nightExposure + (dayExposure - nightExposure) * intensity;
    invalidate();
  }, [gl, intensity, invalidate]);

  return (
    <>
      <hemisphereLight 
        args={[skyColor, groundColor]} 
        intensity={0.5 * ambientIntensity} 
      />
      <ambientLight intensity={0.2 * ambientIntensity} />
      {sunIntensity > 0 && (
        <directionalLight 
          key={`sun-${shadowRes}-${shadowBounds}`}
          castShadow={shadowRes > 0} 
          position={sunPosition} 
          intensity={intensity * sunIntensity * Math.PI} 
          shadow-mapSize={shadowRes > 0 ? [shadowRes, shadowRes] : [512, 512]}
          shadow-bias={-0.0005}
          shadow-normalBias={0.04}
          ref={(light: THREE.DirectionalLight | null) => {
            if (light && shadowRes > 0) {
              light.shadow.camera.left = -shadowBounds;
              light.shadow.camera.right = shadowBounds;
              light.shadow.camera.top = shadowBounds;
              light.shadow.camera.bottom = -shadowBounds;
              light.shadow.camera.near = 0.1;
              light.shadow.camera.far = 300;
              light.shadow.camera.updateProjectionMatrix();
            }
          }}
        />
      )}
    </>
  );
}
