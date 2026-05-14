import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { connectHA } from '../ha/connection';

import pkg from '../../package.json';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const haUrl = useStore(state => state.haUrl);
  const haToken = useStore(state => state.haToken);
  const modelUrl = useStore(state => state.modelUrl);
  const setHaConfig = useStore(state => state.setHaConfig);
  const setModelUrl = useStore(state => state.setModelUrl);
  const backgroundColor = useStore(state => state.backgroundColor);
  const setBackgroundColor = useStore(state => state.setBackgroundColor);
  const shadowRes = useStore(state => state.shadowRes);
  const setShadowRes = useStore(state => state.setShadowRes);
  const lightShadowRes = useStore(state => state.lightShadowRes);
  const setLightShadowRes = useStore(state => state.setLightShadowRes);
  const walkSpeed = useStore(state => state.walkSpeed);
  const setWalkSpeed = useStore(state => state.setWalkSpeed);
  const transitionType = useStore(state => state.transitionType);
  const setTransitionType = useStore(state => state.setTransitionType);
  const reflectionMode = useStore(state => state.reflectionMode);
  const setReflectionMode = useStore(state => state.setReflectionMode);
  const longPressDelay = useStore(state => state.longPressDelay);
  const setLongPressDelay = useStore(state => state.setLongPressDelay);
  const showDiagnostics = useStore(state => state.showDiagnostics);
  const setShowDiagnostics = useStore(state => state.setShowDiagnostics);

  const [tempUrl, setTempUrl] = useState(haUrl);
  const [tempToken, setTempToken] = useState(haToken);
  const [tempModel, setTempModel] = useState(modelUrl);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveHA = () => {
    setHaConfig(tempUrl, tempToken);
    setModelUrl(tempModel);
    connectHA();
  };

  const handleHardReset = () => {
    if (confirm('Are you sure? This will wipe ALL your settings, mappings, and views.')) {
      // Reset in-memory state so that if persist saves on unload, it saves empty defaults
      useStore.setState({
        haUrl: '', haToken: '', modelUrl: '',
        mappings: {}, views: [], meshTags: {},
        tags: [
          { id: 'sys-static', name: 'Static', color: '#6b7280', behavior: 'static' },
          { id: 'sys-occluder', name: 'Occluder', color: '#9333ea', behavior: 'occluder' },
        ],
        timeOfDay: 12, backgroundColor: '#1a1a1a', viewMode: 'standard', fov: 50,
        isWhiteView: false, sunIntensity: 0.8, ambientIntensity: 1.0, latitude: 35, northOffset: 0
      });
      useStore.persist.clearStorage();
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      window.location.reload();
    }
  };

  const handleClearModelCache = () => {
    setModelUrl('');
    setTimeout(() => setModelUrl(tempModel), 100);
  };

  const exportConfig = () => {
    const state = useStore.getState();
    const exportData = {
      state: {
        haUrl: state.haUrl,
        haToken: state.haToken,
        modelUrl: state.modelUrl,
        isLocked: state.isLocked,
        uiLevel: state.uiLevel,
        walkSpeed: state.walkSpeed,
        longPressDelay: state.longPressDelay,
        showDiagnostics: state.showDiagnostics,
        transitionType: state.transitionType,
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
        mappings: state.mappings,
        tags: state.tags,
        meshTags: state.meshTags,
        views: state.views,
      },
      version: 0
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ha-3d-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        JSON.parse(content); // Validate JSON
        localStorage.setItem('ha3d-storage', content);
        window.location.reload();
      } catch (err) {
        alert('Invalid config file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              Dashboard Settings
              <span className="text-[10px] bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded font-mono border border-blue-500/30">v{pkg.version}</span>
            </h2>
            <p className="text-xs text-neutral-500">Configure your 3D Home Assistant environment</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition text-neutral-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ scrollbarWidth: 'thin' }}>
          
          {/* Section: HA Config */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest">Home Assistant Connectivity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase font-bold">WebSocket URL</label>
                <input 
                  type="text" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition"
                  placeholder="wss://your-ha-instance:8123"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase font-bold">Access Token</label>
                <input 
                  type="password" value={tempToken} onChange={(e) => setTempToken(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition"
                  placeholder="Long-lived access token..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-neutral-500 uppercase font-bold">GLB Model URL / Path</label>
                <div className="flex gap-2">
                   <button 
                     onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.glb,.gltf';
                        input.onchange = (e: any) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setTempModel(url);
                          }
                        };
                        input.click();
                     }}
                     className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase"
                   >
                     Load Local File
                   </button>
                </div>
              </div>
              <input 
                type="text" value={tempModel} onChange={(e) => setTempModel(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition"
                placeholder="/models/house.glb"
              />
            </div>
            <button onClick={handleSaveHA} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition w-full md:w-auto uppercase">
              Apply Connectivity Settings
            </button>
          </section>

          <hr className="border-neutral-800" />

          {/* Section: Visuals */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest">Scene & Rendering</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-500 uppercase font-bold">Background Color</label>
                  <div className="flex gap-3 items-center bg-neutral-800 p-2 rounded-lg border border-neutral-700">
                    <input 
                      type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-8 rounded bg-transparent border-0 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-neutral-300 uppercase">{backgroundColor}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-bold">
                    <span>Camera Transitions</span>
                  </div>
                  <select 
                    value={transitionType} onChange={(e) => setTransitionType(e.target.value as 'fly' | 'fade')}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                  >
                    <option value="fly">Fly (Classic)</option>
                    <option value="fade">Fade (Performance)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-bold">
                    <span>Walk Speed (WASD)</span>
                    <span className="text-blue-400">{walkSpeed.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="10" step="0.1" 
                    value={walkSpeed} 
                    onChange={(e) => setWalkSpeed(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-bold">
                    <span>UI Drag Delay (ms)</span>
                    <span className="text-blue-400">{longPressDelay}</span>
                  </div>
                  <input 
                    type="range" min="200" max="3000" step="100" 
                    value={longPressDelay} 
                    onChange={(e) => setLongPressDelay(parseInt(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Performance Diagnostics</span>
                  <input 
                    type="checkbox" 
                    checked={showDiagnostics} 
                    onChange={(e) => setShowDiagnostics(e.target.checked)} 
                    className="rounded bg-neutral-700 border-neutral-600"
                  />
                </label>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-bold">
                      <span>Sun Shadow Quality</span>
                      <span className="text-blue-400">{shadowRes > 0 ? `${shadowRes}px` : 'Off'}</span>
                    </div>
                    <select 
                      value={shadowRes} onChange={(e) => setShadowRes(parseInt(e.target.value))}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                    >
                      <option value="0">Off (Performance)</option>
                      <option value="512">Low (512px)</option>
                      <option value="1024">Medium (1024px)</option>
                      <option value="2048">High (2048px)</option>
                      <option value="4096">Ultra (4096px)</option>
                      <option value="8192">Extreme (8192px)</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-bold">
                      <span>Interior Shadow Quality</span>
                      <span className="text-blue-400">{lightShadowRes}px</span>
                    </div>
                    <select 
                      value={lightShadowRes} onChange={(e) => setLightShadowRes(parseInt(e.target.value))}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                    >
                      <option value="256">Low (256px)</option>
                      <option value="512">Medium (512px)</option>
                      <option value="1024">High (1024px)</option>
                      <option value="2048">Ultra (2048px)</option>
                      <option value="4096">Extreme (4096px)</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-500 uppercase font-bold">
                      <span>Mirror Reflections</span>
                      <span className="text-blue-400">{reflectionMode}</span>
                    </div>
                    <select
                      value={reflectionMode}
                      onChange={(e) => setReflectionMode(e.target.value as any)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                    >
                      <option value="none">None (Performance)</option>
                      <option value="city">City</option>                      <option value="apartment">Apartment</option>
                      <option value="studio">Studio</option>
                      <option value="sunset">Sunset</option>
                      <option value="night">Night</option>
                      <option value="park">Park</option>
                      <option value="forest">Forest</option>
                    </select>
                 </div>
              </div>
            </div>
          </section>

          <hr className="border-neutral-800" />

          {/* Section: Maintenance */}
          <section className="space-y-4 pb-4">
            <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest">Maintenance & Backup</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-red-400 uppercase">Cache & State</h4>
                  <div className="flex flex-col gap-2">
                    <button onClick={handleClearModelCache} className="text-left bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded text-[10px] font-bold uppercase transition">
                      Force Reload 3D Model
                    </button>
                    <button onClick={handleHardReset} className="text-left bg-red-900/40 hover:bg-red-800/60 text-red-200 px-3 py-2 rounded text-[10px] font-bold uppercase transition">
                      Factory Hard Reset
                    </button>
                  </div>
               </div>

               <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-blue-400 uppercase">Configuration Data</h4>
                  <div className="flex flex-col gap-2">
                    <button onClick={exportConfig} className="text-left bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded text-[10px] font-bold uppercase transition">
                      Export Settings (.JSON)
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="text-left bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded text-[10px] font-bold uppercase transition">
                      Import Settings (.JSON)
                    </button>
                    <input type="file" ref={fileInputRef} onChange={importConfig} className="hidden" accept=".json" />
                  </div>
               </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-800/50 border-t border-neutral-800 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-lg text-sm font-bold shadow-lg transition"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
