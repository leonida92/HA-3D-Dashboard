import { useStore } from '../store/useStore';
import { useState, useEffect, useRef } from 'react';
import { MeshListPanel } from './MeshListPanel';
import { SettingsPanel } from './SettingsPanel';
import { EntityEditor } from './EntityEditor';
import { PinSettingsPopup } from './PinSettingsPopup';
import { MaterialEditor } from './MaterialEditor';
import { useMaterialStore } from '../store/useMaterialStore';

function ViewSettingsPopup({ view, isDocked, onClose }: { view: any, isDocked?: boolean, onClose?: () => void }) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 2) return;
      if (popupRef.current && popupRef.current.contains(e.target as Node)) return;
      onClose?.();
    };
    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown, true);
    }, 10);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [onClose]);

  return (
    <div ref={popupRef} className={`absolute z-50 bg-neutral-900 border border-neutral-700 rounded-lg p-3 flex flex-col gap-3 shadow-2xl w-48 ${isDocked ? 'right-full mr-2 bottom-0' : 'left-full ml-2 top-0'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-neutral-400 font-bold uppercase">Size (px)</span>
        <div className="flex gap-1">
          <input 
            type="number" 
            value={view.thumbnailWidth || 150} 
            onChange={(e) => useStore.getState().updateView(view.id, { thumbnailWidth: parseInt(e.target.value) || 150 })}
            className="w-12 bg-neutral-800 border border-neutral-700 text-white text-xs px-1 py-0.5 rounded outline-none"
            title="Width"
          />
          <span className="text-neutral-500">x</span>
          <input 
            type="number" 
            value={view.thumbnailHeight || 100} 
            onChange={(e) => useStore.getState().updateView(view.id, { thumbnailHeight: parseInt(e.target.value) || 100 })}
            className="w-12 bg-neutral-800 border border-neutral-700 text-white text-xs px-1 py-0.5 rounded outline-none"
            title="Height"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-neutral-400 font-bold uppercase">Radius</span>
        <input 
          type="number" min="0" max="100" 
          value={view.thumbnailRadius ?? 8} 
          onChange={(e) => useStore.getState().updateView(view.id, { thumbnailRadius: parseInt(e.target.value) })}
          className="w-16 bg-neutral-800 border border-neutral-700 text-white text-xs px-1 py-0.5 rounded outline-none"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-neutral-400 font-bold uppercase">Show Name</span>
        <input 
          type="checkbox" 
          checked={view.showName !== false} 
          onChange={(e) => useStore.getState().updateView(view.id, { showName: e.target.checked })} 
          className="rounded bg-neutral-700 border-neutral-600"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-neutral-400 font-bold uppercase">Name Pos</span>
        <select 
          value={view.namePosition || 'center'}
          onChange={(e) => useStore.getState().updateView(view.id, { namePosition: e.target.value as any })}
          className="bg-neutral-800 border border-neutral-700 rounded px-1 py-0.5 text-xs outline-none"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      <hr className="border-neutral-800" />

      <div className="flex flex-col gap-2">
        <button 
          onClick={() => {
             const input = document.createElement('input');
             input.type = 'file';
             input.accept = 'image/*';
             input.onchange = (ev: any) => {
               const file = ev.target.files?.[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onload = (re) => {
                   useStore.getState().updateView(view.id, { thumbnail: re.target?.result as string, thumbnailCustom: true });
                 };
                 reader.readAsDataURL(file);
               }
             };
             input.click();
          }}
          className="text-xs bg-neutral-800 hover:bg-neutral-700 py-1.5 rounded transition"
        >
          Upload Image
        </button>
        {view.thumbnail && (
          <button 
            onClick={() => useStore.getState().updateView(view.id, { thumbnail: undefined, thumbnailCustom: false })}
            className="text-xs bg-red-900/30 hover:bg-red-800/50 text-red-400 py-1.5 rounded transition"
          >
            Remove Image
          </button>
        )}
        <button 
          onClick={() => {
            useStore.getState().updateView(view.id, { thumbnailLocked: !(view.thumbnailLocked !== false) });
            onClose?.();
          }}
          className="text-xs bg-blue-600 hover:bg-blue-500 py-1.5 rounded transition mt-1"
        >
          {view.thumbnailLocked === false ? 'Send to Dock' : 'Float View'}
        </button>
      </div>
    </div>
  );
}

export function UI() {
  // Individual selectors — prevents re-render on unrelated store changes (e.g. HA entity updates)
  const haUrl = useStore(state => state.haUrl);
  const connectionState = useStore(state => state.connectionState);
  const isWhiteView = useStore(state => state.isWhiteView);
  const setIsWhiteView = useStore(state => state.setIsWhiteView);
  const viewMode = useStore(state => state.viewMode);
  const setViewMode = useStore(state => state.setViewMode);
  const selectedMesh = useStore(state => state.selectedMesh);
  const setSelectedMesh = useStore(state => state.setSelectedMesh);
  const mappings = useStore(state => state.mappings);
  const views = useStore(state => state.views);
  const removeView = useStore(state => state.removeView);
  const renameView = useStore(state => state.renameView);
  const activeViewId = useStore(state => state.activeViewId);
  const setActiveViewId = useStore(state => state.setActiveViewId);
  const fadeState = useStore(state => state.fadeState);
  const backgroundColor = useStore(state => state.backgroundColor);
  const isLocked = useStore(state => state.isLocked);
  const setIsLocked = useStore(state => state.setIsLocked);
  const uiLevel = useStore(state => state.uiLevel);
  const setUiLevel = useStore(state => state.setUiLevel);

  const ambientIntensity = useStore(state => state.ambientIntensity);
  const setAmbientIntensity = useStore(state => state.setAmbientIntensity);
  const sunIntensity = useStore(state => state.sunIntensity);
  const setSunIntensity = useStore(state => state.setSunIntensity);
  const timeOfDay = useStore(state => state.timeOfDay);
  const setTimeOfDay = useStore(state => state.setTimeOfDay);
  const latitude = useStore(state => state.latitude);
  const setLatitude = useStore(state => state.setLatitude);
  const northOffset = useStore(state => state.northOffset);
  const setNorthOffset = useStore(state => state.setNorthOffset);

  const fov = useStore(state => state.fov);
  const setFov = useStore(state => state.setFov);

  const isPickerActive = useMaterialStore(state => state.isPickerActive);
  const setIsPickerActive = useMaterialStore(state => state.setIsPickerActive);

  const selectedMapping = selectedMesh ? mappings[selectedMesh] : null;
  const selectedEntityId = selectedMapping ? (typeof selectedMapping === 'string' ? selectedMapping : selectedMapping.eid) : null;
  // Targeted selector: only subscribes to the one entity we're displaying, not all 50+
  const selectedEntity = useStore(state => selectedEntityId ? state.entities[selectedEntityId] : null);

  const [showSettings, setShowSettings] = useState(!haUrl);
  const [showMeshList, setShowMeshList] = useState(false);
  const meshListContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 2) return;
      if (showMeshList && meshListContainerRef.current && !meshListContainerRef.current.contains(e.target as Node)) {
        setShowMeshList(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [showMeshList]);

  const [newViewName, setNewViewName] = useState('');
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [renderingExpanded, setRenderingExpanded] = useState(true);
  const [environmentExpanded, setEnvironmentExpanded] = useState(true);

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    const event = new CustomEvent('request-camera-save', { detail: { name: newViewName } });
    window.dispatchEvent(event);
    setNewViewName('');
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameView(id, editName);
    }
    setEditingViewId(null);
  };

  const [editingThumbnailId, setEditingThumbnailId] = useState<string | null>(null);
  const [viewMenuId, setViewMenuId] = useState<string | null>(null);

  useEffect(() => {
    const closeMenu = () => setViewMenuId(null);
    window.addEventListener('pointerdown', closeMenu);
    return () => window.removeEventListener('pointerdown', closeMenu);
  }, []);

  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedMesh) return;
    const handlePointerDown = (e: PointerEvent) => {
      // Ignore right clicks so it doesn't immediately close when opening
      if (e.button === 2) return;
      // If clicking inside the popup, do nothing
      if (popupRef.current && popupRef.current.contains(e.target as Node)) {
        return;
      }
      setSelectedMesh(null);
    };
    // Use capture phase to catch before other elements stop propagation, but delay slightly so the opening click doesn't trigger it
    setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown, true);
    }, 10);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [selectedMesh, setSelectedMesh]);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 flex flex-col justify-between p-4">
      {/* UI Fade Overlay */}
      <div 
        className="absolute inset-0 z-0 transition-opacity pointer-events-none"
        style={{
          backgroundColor,
          opacity: fadeState === 'idle' ? 0 : 1,
          transitionDuration: fadeState === 'idle' ? '500ms' : '250ms', // Slightly slower fade in
        }}
      />
      
      {haUrl && (
        <div className="absolute bottom-4 left-4 z-50 flex gap-2 pointer-events-auto">
          <button
            onClick={() => setUiLevel((uiLevel + 1) % 3 as 0 | 1 | 2)}
            className="p-2 bg-neutral-900/50 hover:bg-neutral-800/80 text-neutral-400 hover:text-white rounded-full backdrop-blur transition-all border border-neutral-700 shadow-lg"
            title={`Toggle UI Visibility (Current: Level ${uiLevel})`}
          >
            {uiLevel === 0 ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ) : uiLevel === 1 ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><path d="M12 12l0 .01"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            )}
          </button>
          {uiLevel < 2 && (
            <button
              onClick={() => setIsPickerActive(!isPickerActive)}
              className={`p-2 rounded-full backdrop-blur transition-all border shadow-lg ${isPickerActive ? 'bg-purple-600 text-white border-purple-500 ring-2 ring-purple-500/50' : 'bg-neutral-900/50 hover:bg-neutral-800/80 text-neutral-400 hover:text-white border-neutral-700'}`}
              title={isPickerActive ? 'Cancel Material Picker' : 'Pick Material'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>
            </button>
          )}
        </div>
      )}

      {/* Main UI Elements (hidden during sign in) */}
      {haUrl && uiLevel === 0 && (
        <div className="flex justify-between items-start mt-10 sm:mt-0">
          <div ref={meshListContainerRef} className="flex flex-col gap-4 pointer-events-auto">
            <div className="bg-neutral-900/80 backdrop-blur rounded-lg p-3 text-sm flex gap-4 items-center shadow-lg border border-neutral-700">
              <div className="flex items-center gap-2">
                 <div className={`w-3 h-3 rounded-full ${
                   connectionState === 'connected' ? 'bg-green-500' :
                   connectionState === 'connecting' ? 'bg-yellow-500' :
                   connectionState === 'error' ? 'bg-red-500' : 'bg-gray-500'
                 }`} />
                 <span>{connectionState === 'connected' ? 'HA Connected' : 'HA Disconnected'}</span>
              </div>
              <button 
                className={`px-3 py-1 rounded text-xs transition flex items-center justify-center ${isLocked ? 'bg-red-900/60 text-red-300 hover:bg-red-800/80' : 'bg-neutral-700 hover:bg-neutral-600'}`}
                onClick={() => setIsLocked(!isLocked)}
                title={isLocked ? "Unlock navigation and clicking" : "Lock navigation and clicking"}
              >
                {isLocked ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                )}
              </button>
              <button 
                className="bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded text-xs transition"
                onClick={() => setShowSettings(true)}
              >
                Settings
              </button>
              <button 
                className={`px-3 py-1 rounded text-xs transition ${showMeshList ? 'bg-blue-600 hover:bg-blue-500' : 'bg-neutral-700 hover:bg-neutral-600'}`}
                onClick={() => setShowMeshList(!showMeshList)}
              >
                All Meshes
              </button>
            </div>

            {showMeshList && <MeshListPanel />}
          </div>

          {/* Tools Panel */}
          <div className="bg-neutral-900/80 backdrop-blur rounded-lg p-4 text-sm flex flex-col gap-4 shadow-lg border border-neutral-700 w-64 pointer-events-auto">

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setRenderingExpanded(!renderingExpanded)}
              className="flex justify-between items-center w-full text-xs text-neutral-400 font-semibold uppercase tracking-wider hover:text-white transition-colors"
            >
              <span>Rendering</span>
              <svg 
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-200 ${renderingExpanded ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {renderingExpanded && (
              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>White / Clay Mode</span>
                  <input 
                    type="checkbox" 
                    checked={isWhiteView} 
                    onChange={(e) => setIsWhiteView(e.target.checked)} 
                    className="rounded bg-neutral-700 border-neutral-600"
                  />
                </label>
                <div className="flex items-center justify-between">
                  <span>Camera</span>
                  <select 
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value as any)}
                    className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs outline-none"
                  >
                    <option value="standard">Perspective</option>
                    <option value="2-point">2-Point Perspective</option>
                    <option value="ortho">Orthographic</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between text-xs">
                    <span>Field of View</span>
                    <span className="text-neutral-400">{fov.toFixed(0)}°</span>
                  </div>
                  <input 
                    type="range" min="10" max="120" step="1" 
                    value={fov} 
                    onChange={(e) => setFov(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <hr className="border-neutral-700" />

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setEnvironmentExpanded(!environmentExpanded)}
              className="flex justify-between items-center w-full text-xs text-neutral-400 font-semibold uppercase tracking-wider hover:text-white transition-colors"
            >
              <span>Environment</span>
              <svg 
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-200 ${environmentExpanded ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            
            {environmentExpanded && (
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span>Time of Day</span>
                    <span className="text-neutral-400">{timeOfDay.toFixed(1)}h</span>
                  </div>
                  <input 
                    type="range" min="0" max="24" step="0.1" 
                    value={timeOfDay} 
                    onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span>Sun Intensity</span>
                    <span className="text-neutral-400">{sunIntensity.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="2" step="0.1" 
                    value={sunIntensity} 
                    onChange={(e) => setSunIntensity(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span>Ambient Intensity</span>
                    <span className="text-neutral-400">{ambientIntensity.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="2" step="0.1" 
                    value={ambientIntensity} 
                    onChange={(e) => setAmbientIntensity(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span>Latitude</span>
                    <span className="text-neutral-400">{latitude.toFixed(0)}°</span>
                  </div>
                  <input 
                    type="range" min="-90" max="90" step="1" 
                    value={latitude} 
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span>North Offset</span>
                    <span className="text-neutral-400">{northOffset.toFixed(0)}°</span>
                  </div>
                  <input 
                    type="range" min="0" max="360" step="1" 
                    value={northOffset} 
                    onChange={(e) => setNorthOffset(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Views Panel (Separate) — hidden at level 1 when no docked views */}
      {haUrl && (uiLevel === 0 || (uiLevel === 1 && views.some(v => v.thumbnailLocked !== false))) && (
        <div className="absolute bottom-4 right-4 bg-neutral-900/80 backdrop-blur rounded-lg p-4 text-sm flex flex-col gap-4 shadow-lg border border-neutral-700 w-64 pointer-events-auto">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Saved Views</span>
              {views.some(v => v.thumbnailLocked === false) && (
                <button
                  onClick={() => {
                    useStore.setState(state => ({
                      views: state.views.map(v => v.thumbnailLocked === false ? { ...v, thumbnailLocked: true } : v)
                    }));
                  }}
                  className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white px-2 py-0.5 rounded transition uppercase font-bold"
                  title="Return all floating views to dock"
                >
                  Dock All
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {views.filter(v => v.thumbnailLocked !== false).map(view => (
                <div key={view.id} className={`relative group rounded-lg border transition-colors ${activeViewId === view.id ? 'border-blue-500 ring-1 ring-blue-500/50 bg-neutral-800' : 'border-neutral-700 bg-neutral-800 hover:border-neutral-500'}`}>
                  <button 
                    onClick={() => setActiveViewId(view.id)}
                    className="w-full relative overflow-hidden rounded-lg flex items-end p-2 text-left"
                    style={{ height: view.thumbnailHeight ? `${view.thumbnailHeight}px` : '64px' }}
                  >
                    {view.thumbnail && (
                      <img src={view.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="relative z-10 w-full">
                      {editingViewId === view.id ? (
                        <input 
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleRename(view.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(view.id);
                            if (e.key === 'Escape') setEditingViewId(null);
                          }}
                          className="w-full bg-blue-900/90 text-[10px] font-bold text-white px-1 rounded outline-none border border-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div 
                          className="text-[10px] font-bold text-white truncate leading-tight cursor-pointer"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingViewId(view.id);
                            setEditName(view.name);
                          }}
                          title="Double-click to rename"
                        >
                          {view.name}
                        </div>
                      )}
                      <div className="text-[8px] text-neutral-400 flex gap-2">
                        <span>{view.timeOfDay.toFixed(1)}h</span>
                        <span className="uppercase">{view.viewMode}</span>
                      </div>
                    </div>
                  </button>
                  
                  {/* Actions Overlay */}
                  <div className="absolute top-1 right-1 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingThumbnailId(editingThumbnailId === view.id ? null : view.id);
                      }}
                      className="p-1 bg-neutral-600/80 hover:bg-neutral-500 text-white rounded shadow-lg"
                      title="View Settings"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        useStore.getState().updateView(view.id, { thumbnailLocked: false, thumbnailPos: { x: window.innerWidth - 300, y: window.innerHeight - 200 } });
                      }}
                      className="p-1 bg-green-600/80 hover:bg-green-500 text-white rounded shadow-lg"
                      title="Unlock & Float"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('request-camera-update', { detail: { id: view.id } }));
                      }}
                      className="p-1 bg-blue-600/80 hover:bg-blue-500 text-white rounded shadow-lg"
                      title="Update view with current settings"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeView(view.id);
                      }}
                      className="p-1 bg-red-600/80 hover:bg-red-500 text-white rounded shadow-lg"
                      title="Delete View"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
              {views.filter(v => v.thumbnailLocked !== false).length === 0 && <span className="text-[10px] text-neutral-500 italic px-1">No saved views.</span>}
            </div>
            
            {editingThumbnailId && views.find(v => v.id === editingThumbnailId && v.thumbnailLocked !== false) && (
              <ViewSettingsPopup 
                view={views.find(v => v.id === editingThumbnailId)!} 
                isDocked={true} 
                onClose={() => setEditingThumbnailId(null)}
              />
            )}

            <div className="flex gap-1 mt-1">
              <input 
                type="text" 
                placeholder="Name current view..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
              />
              <button 
                onClick={handleSaveView}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs transition font-bold"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Views */}
      {haUrl && uiLevel < 2 && views.filter(v => v.thumbnailLocked === false).map(view => {
        const tw = view.thumbnailWidth || 150;
        const th = (view.thumbnailHeight || 100) + (view.showName !== false ? 30 : 0);
        return (
        <div 
          key={view.id} 
          className="absolute flex flex-col gap-1 pointer-events-auto"
          style={{ 
            left: Math.max(10, Math.min(view.thumbnailPos?.x ?? 100, windowSize.width - tw - 10)), 
            top: Math.max(10, Math.min(view.thumbnailPos?.y ?? 100, windowSize.height - th - 10)),
          }}
        >
          <div className="relative group">
            <button 
              onClick={() => setActiveViewId(view.id)}
              className={`relative overflow-hidden flex items-end p-2 text-left border shadow-2xl bg-neutral-800 w-full transition-colors ${activeViewId === view.id ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-neutral-600 hover:border-neutral-400'}`}
              style={{ 
                width: view.thumbnailWidth || 150,
                height: view.thumbnailHeight || 100,
                borderRadius: view.thumbnailRadius !== undefined ? `${view.thumbnailRadius}px` : '8px'
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const startPos = view.thumbnailPos || { x: 100, y: 100 };
                const target = e.currentTarget as HTMLElement;
                const wrapper = target.closest('.absolute') as HTMLElement; // The wrapping div with absolute positioning
                
                let isDragging = false;
                let finalPos = { ...startPos };
                
                const timer = setTimeout(() => {
                  isDragging = true;
                  target.classList.add('ring-4', 'ring-purple-500/80', 'scale-105'); // Visual feedback for draggable state
                }, useStore.getState().longPressDelay);

                const onMove = (ev: PointerEvent) => {
                  if (!isDragging) {
                    if (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5) {
                      clearTimeout(timer);
                    }
                    return;
                  }
                  // Direct DOM mutation for 0-latency dragging without re-renders
                  finalPos = { 
                    x: startPos.x + (ev.clientX - startX), 
                    y: startPos.y + (ev.clientY - startY) 
                  };
                  if (wrapper) {
                    wrapper.style.left = `${Math.max(10, Math.min(finalPos.x, window.innerWidth - tw - 10))}px`;
                    wrapper.style.top = `${Math.max(10, Math.min(finalPos.y, window.innerHeight - th - 10))}px`;
                  }
                };
                
                const onUp = () => {
                  clearTimeout(timer);
                  target.classList.remove('ring-4', 'ring-purple-500/80', 'scale-105');
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                  if (isDragging) {
                    // Commit final position to store only once
                    useStore.getState().updateView(view.id, { thumbnailPos: finalPos });
                  } else {
                    setActiveViewId(view.id);
                  }
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              }}
            >
              {view.thumbnail && (
                <img src={view.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
            </button>
            
            {/* ⋯ Menu Button (Floating) */}
            <div className={`absolute top-1 right-1 z-20 transition-opacity ${viewMenuId === view.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMenuId(viewMenuId === view.id ? null : view.id);
                }}
                className="p-1 bg-black/40 hover:bg-black/60 text-neutral-300 hover:text-white rounded transition"
                title="Actions"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
              {viewMenuId === view.id && (
                <div 
                  className="absolute right-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl py-1 w-36 z-50"
                  onPointerDown={(e) => e.stopPropagation()} // Prevent closing when clicking inside the menu
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingThumbnailId(view.id); setViewMenuId(null); }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
                  >Settings</button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('request-camera-update', { detail: { id: view.id } })); setViewMenuId(null); }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
                  >Update View</button>
                  <hr className="border-neutral-800 my-1" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeView(view.id); setViewMenuId(null); }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-900/30 hover:text-red-300 transition"
                  >Delete</button>
                </div>
              )}
            </div>
            
            {editingThumbnailId === view.id && <ViewSettingsPopup view={view} isDocked={false} onClose={() => setEditingThumbnailId(null)} />}
          </div>

          {/* Name outside thumbnail */}
          {view.showName !== false && (
            <div 
              className="text-xs font-bold text-white drop-shadow-md truncate pointer-events-none"
              style={{
                width: view.thumbnailWidth || 150,
                textAlign: view.namePosition === 'left' ? 'left' : view.namePosition === 'right' ? 'right' : 'center'
              }}
            >
              {view.name}
            </div>
          )}
        </div>
        );
      })}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Pin Settings Popup */}
      <PinSettingsPopup />

      {/* Material Editor */}
      <MaterialEditor />

      {/* Selected Mesh Popup */}
      {uiLevel === 0 && (
        <div 
          ref={popupRef}
          className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto transition-all duration-300 ease-out bg-neutral-900/90 backdrop-blur border border-neutral-700 shadow-2xl rounded-xl p-4 w-80 ${
            selectedMesh ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 truncate">{selectedMesh}</h3>
              <span className="text-xs text-neutral-400">Mesh Object</span>
            </div>
            <button 
              onClick={() => setSelectedMesh(null)}
              className="text-neutral-500 hover:text-neutral-300 transition"
            >
              ✕
            </button>
          </div>
          
          <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/50 flex items-center justify-between">
            {selectedEntity ? (
              <>
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-blue-400 truncate w-48" title={selectedEntityId || ''}>
                    {selectedEntityId}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {selectedEntity.attributes.friendly_name || selectedEntityId}
                  </span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  ['on', 'heat', 'cool'].includes(selectedEntity.state) 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-neutral-700/50 text-neutral-400 border border-neutral-600/50'
                }`}>
                  {selectedEntity.state}
                </div>
              </>
            ) : (
              <span className="text-xs text-neutral-500 italic">No entity assigned.</span>
            )}
          </div>
          
          {selectedMesh && <EntityEditor key={selectedMesh} meshName={selectedMesh} />}
        </div>
      )}
    </div>
  );
}
