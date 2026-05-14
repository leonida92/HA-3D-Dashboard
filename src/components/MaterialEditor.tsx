import { useState } from 'react';
import * as THREE from 'three';
import { useMaterialStore } from '../store/useMaterialStore';
import { useStore } from '../store/useStore';

export function MaterialEditor() {
  const selectedMaterial = useMaterialStore((state) => state.selectedMaterial);
  const selectedMeshName = useMaterialStore((state) => state.selectedMeshName);
  const setSelectedMaterial = useMaterialStore((state) => state.setSelectedMaterial);
  const invalidate = useMaterialStore((state) => state.invalidate);
  const scene = useMaterialStore((state) => state.scene);
  const setMaterialOverride = useStore((state) => state.setMaterialOverride);

  const [applyToShared, setApplyToShared] = useState(true);
  const [, setForceRender] = useState(0);

  const mat = selectedMaterial as any; // Use any for dynamic property access
  const isWhiteView = useStore(state => state.isWhiteView);

  // If no material selected, don't render
  if (!mat) return null;

  // We use forceRender to re-render the UI when we mutate the material properties
  const mutateMaterial = (updater: (m: any, meshName: string) => void) => {
    if (applyToShared && mat.userData.sourceMaterialUuid && scene) {
      const sourceUuid = mat.userData.sourceMaterialUuid;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const meshName = obj.userData.originalName || obj.name;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m.userData.sourceMaterialUuid === sourceUuid) {
              updater(m, meshName);
              m.needsUpdate = true;
            }
          });
        }
      });
    } else {
      updater(mat, selectedMeshName || '');
      mat.needsUpdate = true;
    }
    setForceRender(prev => prev + 1);
    if (invalidate) invalidate();
  };

  const handleColorChange = (prop: string, hex: string) => {
    const key = applyToShared ? `global::${mat.name}` : `mesh::${selectedMeshName}::${mat.name}`;
    setMaterialOverride(key, { [prop]: hex });
    mutateMaterial((m) => {
      if (!m[prop]) m[prop] = new THREE.Color();
      m[prop].set(hex);
      // Save to origColor/origEmissive so it persists across white view toggles
      if (prop === 'color') {
          if (!m.userData.origColor) m.userData.origColor = new THREE.Color();
          m.userData.origColor.set(hex);
      }
      if (prop === 'emissive') {
          if (!m.userData.origEmissive) m.userData.origEmissive = new THREE.Color();
          m.userData.origEmissive.set(hex);
      }
    });
  };

  const handleValueChange = (prop: string, value: number) => {
    const key = applyToShared ? `global::${mat.name}` : `mesh::${selectedMeshName}::${mat.name}`;
    setMaterialOverride(key, { [prop]: value });
    mutateMaterial((m) => {
      m[prop] = value;
      // Save to orig properties
      if (prop === 'roughness') m.userData.origRoughness = value;
      if (prop === 'metalness') m.userData.origMetalness = value;
      if (prop === 'opacity') m.userData.origOpacity = value;
      if (prop === 'emissiveIntensity') (m as any).emissiveIntensity = value;
    });
  };

  const handleToggleChange = (prop: string, value: boolean) => {
    const key = applyToShared ? `global::${mat.name}` : `mesh::${selectedMeshName}::${mat.name}`;
    setMaterialOverride(key, { [prop]: value });
    mutateMaterial((m) => {
      m[prop] = value;
      if (prop === 'transparent') {
          m.userData.origTransparent = value;
          m.depthWrite = !value;
      }
    });
  };

  const handleRestoreOriginal = () => {
    const key = applyToShared ? `global::${mat.name}` : `mesh::${selectedMeshName}::${mat.name}`;
    setMaterialOverride(key, null); // remove override
    
    const freshOverrides = useStore.getState().materialOverrides || {};

    mutateMaterial((m, meshName) => {
        // 1. Reset to factory defaults
        if (m.userData.factoryColor && m.color) m.color.copy(m.userData.factoryColor);
        if (m.userData.factoryEmissive && m.emissive) m.emissive.copy(m.userData.factoryEmissive);
        if (m.userData.factoryRoughness !== undefined) m.roughness = m.userData.factoryRoughness;
        if (m.userData.factoryMetalness !== undefined) m.metalness = m.userData.factoryMetalness;
        if (m.userData.factoryOpacity !== undefined) m.opacity = m.userData.factoryOpacity;
        if (m.userData.factoryTransparent !== undefined) {
          m.transparent = m.userData.factoryTransparent;
          m.depthWrite = !m.transparent;
        }
        if (m.userData.factoryEmissiveIntensity !== undefined) m.emissiveIntensity = m.userData.factoryEmissiveIntensity;
        
        if (m.map && m.map !== m.userData.factoryMap) m.map.dispose();
        m.map = m.userData.factoryMap;

        // 2. Re-apply any remaining cascading overrides
        const globalOverride = freshOverrides[`global::${m.name}`] || {};
        const specificOverride = freshOverrides[`mesh::${meshName}::${m.name}`] || {};
        const ov = { ...globalOverride, ...specificOverride };

        if (Object.keys(ov).length > 0) {
           if (ov.color) m.color?.set(ov.color);
           if (ov.emissive) m.emissive?.set(ov.emissive);
           if (ov.emissiveIntensity !== undefined) m.emissiveIntensity = ov.emissiveIntensity;
           if (ov.roughness !== undefined) m.roughness = ov.roughness;
           if (ov.metalness !== undefined) m.metalness = ov.metalness;
           if (ov.opacity !== undefined) m.opacity = ov.opacity;
           if (ov.transparent !== undefined) {
               m.transparent = ov.transparent;
               m.depthWrite = !ov.transparent;
           }
        }
        
        m.userData.origColor = m.color?.clone();
        m.userData.origEmissive = m.emissive?.clone();
        m.userData.origRoughness = m.roughness;
        m.userData.origMetalness = m.metalness;
        m.userData.origOpacity = m.opacity;
        m.userData.origTransparent = m.transparent;
        m.userData.origMap = m.map;
    });
  };

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>, prop: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      createImageBitmap(img).then((bitmap) => {
        const texture = new THREE.CanvasTexture(bitmap);
        texture.colorSpace = prop === 'map' ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        mutateMaterial((m) => {
          if (m[prop]) {
              m[prop].dispose();
          }
          m[prop] = texture;
          if (prop === 'map') m.userData.origMap = texture;
        });
        URL.revokeObjectURL(url);
      });
    };
  };

  const handleRemoveTexture = (prop: string) => {
      mutateMaterial((m) => {
          if (m[prop]) {
              m[prop].dispose();
              m[prop] = null;
          }
          if (prop === 'map') m.userData.origMap = null;
      });
  };


  return (
    <div className="absolute top-16 left-4 z-50 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl p-4 w-72 pointer-events-auto flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
        <h3 className="text-sm font-bold text-white">Material Editor</h3>
        <button 
          onClick={() => setSelectedMaterial(null, null)}
          className="text-neutral-500 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-neutral-400">Target Mesh: <span className="text-white font-mono">{selectedMeshName}</span></span>
        <span className="text-xs text-neutral-400">Material Name: <span className="text-white font-mono truncate">{mat.name || 'Unnamed'}</span></span>
        <span className="text-[10px] text-neutral-500 font-mono">Type: {mat.type}</span>
      </div>

      {isWhiteView && (
          <div className="bg-yellow-900/30 border border-yellow-700/50 p-2 rounded text-xs text-yellow-500">
              White View is active. Some color edits may not be visible until disabled.
          </div>
      )}

      <div className="flex justify-between items-center bg-neutral-800 p-2 rounded">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={applyToShared}
            onChange={(e) => setApplyToShared(e.target.checked)}
            className="rounded bg-neutral-700 border-neutral-600"
          />
          <span className="text-xs text-neutral-300">Apply to shared</span>
        </label>
        <button 
          onClick={handleRestoreOriginal}
          className="text-xs bg-neutral-700 hover:bg-neutral-600 px-2 py-1 rounded text-neutral-300 transition-colors"
          title="Restore original material properties"
        >
          Restore
        </button>
      </div>

      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {/* Colors */}
        {mat.color !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-300">Base Color</span>
            <input 
              type="color" 
              value={'#' + (mat.userData.origColor || mat.color).getHexString()}
              onChange={(e) => handleColorChange('color', e.target.value)}
              className="bg-transparent border-0 w-8 h-8 rounded cursor-pointer"
            />
          </div>
        )}
        
        {mat.emissive !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-300">Emissive Color</span>
            <input 
              type="color" 
              value={'#' + (mat.userData.origEmissive || mat.emissive).getHexString()}
              onChange={(e) => handleColorChange('emissive', e.target.value)}
              className="bg-transparent border-0 w-8 h-8 rounded cursor-pointer"
            />
          </div>
        )}

        {mat.emissiveIntensity !== undefined && (
           <div className="flex flex-col gap-1">
             <div className="flex justify-between text-xs">
               <span className="text-neutral-300">Emissive Intensity</span>
               <span className="text-neutral-400">{mat.emissiveIntensity.toFixed(2)}</span>
             </div>
             <input 
               type="range" min="0" max="10" step="0.1" 
               value={mat.emissiveIntensity} 
               onChange={(e) => handleValueChange('emissiveIntensity', parseFloat(e.target.value))}
               className="w-full accent-blue-500"
             />
           </div>
        )}

        <hr className="border-neutral-800" />

        {/* PBR */}
        {mat.roughness !== undefined && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-300">Roughness</span>
              <span className="text-neutral-400">{(mat.userData.origRoughness ?? mat.roughness).toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={mat.userData.origRoughness ?? mat.roughness} 
              onChange={(e) => handleValueChange('roughness', parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        )}

        {mat.metalness !== undefined && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-300">Metalness</span>
              <span className="text-neutral-400">{(mat.userData.origMetalness ?? mat.metalness).toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={mat.userData.origMetalness ?? mat.metalness} 
              onChange={(e) => handleValueChange('metalness', parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        )}

        <hr className="border-neutral-800" />

        {/* Transparency */}
        <div className="flex items-center gap-2">
            <input 
                type="checkbox" 
                checked={mat.userData.origTransparent ?? mat.transparent}
                onChange={(e) => handleToggleChange('transparent', e.target.checked)}
                className="rounded bg-neutral-700 border-neutral-600"
            />
            <span className="text-xs text-neutral-300">Transparent</span>
        </div>

        {(mat.userData.origTransparent ?? mat.transparent) && mat.opacity !== undefined && (
           <div className="flex flex-col gap-1">
             <div className="flex justify-between text-xs">
               <span className="text-neutral-300">Opacity</span>
               <span className="text-neutral-400">{(mat.userData.origOpacity ?? mat.opacity).toFixed(2)}</span>
             </div>
             <input 
               type="range" min="0" max="1" step="0.01" 
               value={mat.userData.origOpacity ?? mat.opacity} 
               onChange={(e) => handleValueChange('opacity', parseFloat(e.target.value))}
               className="w-full accent-blue-500"
             />
           </div>
        )}

        <hr className="border-neutral-800" />

        {/* Textures */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-neutral-300 font-bold">Base Map (Texture)</span>
          <div className="flex gap-2 items-center">
             {(mat.userData.origMap || mat.map) ? (
                 <div className="flex flex-col gap-2 w-full">
                     <span className="text-[10px] text-green-400">Texture Active</span>
                     <button 
                         onClick={() => handleRemoveTexture('map')}
                         className="text-xs bg-red-900/30 hover:bg-red-800/50 text-red-400 py-1 rounded"
                     >
                         Remove Texture
                     </button>
                 </div>
             ) : (
                 <div className="relative w-full">
                     <input 
                         type="file" 
                         accept="image/*"
                         onChange={(e) => handleTextureUpload(e, 'map')}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     />
                     <div className="text-xs bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 py-1.5 rounded text-center text-neutral-300">
                         Upload Image
                     </div>
                 </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
