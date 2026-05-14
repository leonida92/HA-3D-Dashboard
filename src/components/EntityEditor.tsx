import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { PinStyleConfig } from './Pin';

export function EntityEditor({ meshName }: { meshName: string }) {
  const mappings = useStore(state => state.mappings);
  const setMapping = useStore(state => state.setMapping);
  const entities = useStore(state => state.entities);
  const tags = useStore(state => state.tags);
  const meshTags = useStore(state => state.meshTags);
  const assignTagToMesh = useStore(state => state.assignTagToMesh);
  const removeTagFromMesh = useStore(state => state.removeTagFromMesh);

  const currentMapping = mappings[meshName];
  const activeTagIds = meshTags[meshName] || [];

  const currentEid = currentMapping ? (typeof currentMapping === 'string' ? currentMapping : currentMapping.eid) : '';
  const currentType = currentMapping?.type || 'toggle';
  const currentAction = currentMapping?.action || 'toggle';
  const currentIntensity = currentMapping?.lightIntensity ?? 1.0;
  const currentDistance = currentMapping?.lightDistance ?? 8.0;
  const currentOffset = currentMapping?.lightOffset || [0, 0, 0];
  const currentColorTemp = currentMapping?.colorTemp ?? 2700;
  const currentHighlightColor = currentMapping?.highlightColor || '#ffff00';
  const currentEnablePin = currentMapping?.enablePin || false;
  const currentPinConfig: PinStyleConfig = currentMapping?.pinConfig || {};

  const [eid, setEid] = useState(currentEid || '');
  const [type, setType] = useState(currentType);
  const [action, setAction] = useState(currentAction);
  const [highlightColor, setHighlightColor] = useState(currentHighlightColor);
  const [lightIntensity, setLightIntensity] = useState(currentIntensity);
  const [lightDistance, setLightDistance] = useState(currentDistance);
  const [colorTemp, setColorTemp] = useState(currentColorTemp);
  const [offsetX, setOffsetX] = useState(currentOffset[0]);
  const [offsetY, setOffsetY] = useState(currentOffset[1]);
  const [offsetZ, setOffsetZ] = useState(currentOffset[2]);
  const [enablePin, setEnablePin] = useState(currentEnablePin);
  const [pinConfig, setPinConfig] = useState<PinStyleConfig>(currentPinConfig);
  
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const initialMappingRef = useRef<any>(null);

  // Check if we should auto-open pin settings from right click
  const editingPinForMesh = useStore(state => state.editingPinForMesh);
  const setEditingPinForMesh = useStore(state => state.setEditingPinForMesh);
  
  useEffect(() => {
    if (editingPinForMesh === meshName) {
      if (!isEditing) handleStartEdit();
      // Scroll to pin settings or show them automatically handled by state
    }
  }, [editingPinForMesh, meshName]);

  // Separate effect for closing when mesh changes
  useEffect(() => {
    setIsEditing(false);
    setEditingPinForMesh(null);
  }, [meshName, setEditingPinForMesh]);

  // Real-time update helper
  const updateRealtime = (overrides: any = {}) => {
    if (!eid && !overrides.eid) return;
    setMapping(meshName, {
      eid: overrides.eid ?? eid,
      type: overrides.type ?? type,
      action: overrides.action ?? action,
      lightIntensity: overrides.lightIntensity ?? lightIntensity,
      lightDistance: overrides.lightDistance ?? lightDistance,
      colorTemp: overrides.colorTemp ?? colorTemp,
      highlightColor: overrides.highlightColor ?? highlightColor,
      lightOffset: [
        overrides.offsetX ?? offsetX,
        overrides.offsetY ?? offsetY,
        overrides.offsetZ ?? offsetZ
      ],
      enablePin: overrides.enablePin ?? enablePin,
      pinConfig: overrides.pinConfig ?? pinConfig
    });
  };

  const allEntityIds = useMemo(() => Object.keys(entities), [entities]);
  
  const filteredEntities = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return allEntityIds
      .filter(id => {
        if (!search) return true;
        return id.toLowerCase().includes(lowerSearch) || (entities[id]?.attributes?.friendly_name?.toLowerCase() || '').includes(lowerSearch);
      })
      .slice(0, 100);
  }, [search, allEntityIds, entities]);

  const handleStartEdit = () => {
    initialMappingRef.current = currentMapping;
    setEid(currentEid || '');
    setType(currentType);
    setAction(currentAction);
    setHighlightColor(currentHighlightColor);
    setLightIntensity(currentIntensity);
    setLightDistance(currentDistance);
    setOffsetX(currentOffset[0]);
    setOffsetY(currentOffset[1]);
    setOffsetZ(currentOffset[2]);
    setEnablePin(currentEnablePin);
    setPinConfig(currentPinConfig);
    
    setSearch('');
    setIsFocused(false);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!eid) {
      setMapping(meshName, null);
    } else {
      updateRealtime();
    }
    setIsEditing(false);
    setEditingPinForMesh(null);
  };

  const handleCancel = () => {
    setMapping(meshName, initialMappingRef.current);
    setIsEditing(false);
    setEditingPinForMesh(null);
    setSearch('');
  };

  if (!isEditing && editingPinForMesh !== meshName) {
    return (
      <div className="mt-3 flex gap-2">
        <button 
          onClick={handleStartEdit}
          className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-xs font-semibold py-1.5 rounded transition"
        >
          {currentEid ? 'Edit Assignment' : 'Assign Entity'}
        </button>
        {currentEid && (
          <button 
            onClick={() => setMapping(meshName, null)}
            className="bg-red-900/50 hover:bg-red-800/80 text-red-300 px-3 text-xs font-semibold rounded transition"
            title="Remove Assignment"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3 bg-neutral-900/50 rounded p-3 border border-neutral-700 max-h-[60vh] overflow-y-auto custom-scrollbar">
      {/* Entity ID Search */}
      <div className="flex flex-col gap-1 relative">
        <label className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Entity ID</label>
        <input 
          type="text" 
          value={isFocused ? search : (eid || search)} 
          onChange={(e) => {
            const val = e.target.value;
            setSearch(val);
            setEid(val);
            updateRealtime({ eid: val });
          }}
          onFocus={() => {
            setIsFocused(true);
            setSearch(eid);
          }}
          onBlur={() => {
            setTimeout(() => {
              setIsFocused(false);
              setSearch('');
            }, 200);
          }}
          className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 w-full"
          placeholder="Search entities..."
        />
        {isFocused && filteredEntities.length > 0 && (
          <div className="mt-1 w-full bg-neutral-800 border border-neutral-600 rounded shadow-2xl max-h-48 overflow-y-auto z-[100]">
            {filteredEntities.map(id => (
              <div 
                key={id} 
                className="px-2 py-1.5 text-xs hover:bg-blue-600 cursor-pointer flex flex-col border-b border-neutral-700/50 last:border-0"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents blur
                  setEid(id);
                  setSearch('');
                  setIsFocused(false);
                  updateRealtime({ eid: id });
                }}
              >
                <span className="font-mono text-neutral-200">{id}</span>
                {entities[id]?.attributes?.friendly_name && (
                  <span className="text-[10px] text-neutral-500">{entities[id].attributes.friendly_name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Type</label>
          <select 
            value={type} 
            onChange={(e) => {
              const val = e.target.value;
              setType(val);
              updateRealtime({ type: val });
            }}
            className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs outline-none"
          >
            <option value="toggle">Toggle (Default)</option>
            <option value="light">Light (Emits Light)</option>
          </select>
        </div>
        
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Click Action</label>
          <select 
            value={action} 
            onChange={(e) => {
              const val = e.target.value;
              setAction(val);
              updateRealtime({ action: val });
            }}
            className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs outline-none"
          >
            <option value="toggle">Toggle Entity</option>
            <option value="more-info">More Info</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Highlight Color</label>
        <div className="flex gap-2 items-center">
          <input 
            type="color" 
            value={highlightColor} 
            onChange={(e) => {
              const val = e.target.value;
              setHighlightColor(val);
              updateRealtime({ highlightColor: val });
            }}
            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
          />
          <span className="text-xs text-neutral-400 uppercase font-mono">{highlightColor}</span>
        </div>
      </div>

      {/* Light Settings */}
      {type === 'light' && (
        <div className="flex flex-col gap-3 pt-2 border-t border-neutral-700/50">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] uppercase text-neutral-500 font-bold">Intensity</label>
              <input 
                type="range" min="0" max="5" step="0.1" 
                value={lightIntensity} 
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setLightIntensity(val);
                  updateRealtime({ lightIntensity: val });
                }}
                className="w-full h-1.5 accent-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] uppercase text-neutral-500 font-bold">Distance</label>
              <input 
                type="range" min="1" max="20" step="0.5" 
                value={lightDistance} 
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setLightDistance(val);
                  updateRealtime({ lightDistance: val });
                }}
                className="w-full h-1.5 accent-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[9px] uppercase text-neutral-500 font-bold">
              <span>Color Temp</span>
              <span>{colorTemp}K</span>
            </div>
            <input 
              type="range" min="1500" max="7500" step="100" 
              value={colorTemp} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setColorTemp(val);
                updateRealtime({ colorTemp: val });
              }}
              className="w-full h-1.5 accent-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase text-neutral-500 font-bold">Light Offset (X / Z / Y)</label>
            <div className="flex gap-1">
               <input type="number" step="0.1" value={offsetX} title="X Offset" onChange={(e)=>{
                 const val = parseFloat(e.target.value);
                 setOffsetX(val);
                 updateRealtime({ offsetX: val });
               }} className="w-full bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-[10px]" />
               
               <input type="number" step="0.1" value={offsetZ} title="Z Offset (Vertical)" onChange={(e)=>{
                 const val = parseFloat(e.target.value);
                 setOffsetZ(val);
                 updateRealtime({ offsetZ: val });
               }} className="w-full bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-[10px]" />

               <input type="number" step="0.1" value={offsetY} title="Y Offset" onChange={(e)=>{
                 const val = parseFloat(e.target.value);
                 setOffsetY(val);
                 updateRealtime({ offsetY: val });
               }} className="w-full bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-[10px]" />
            </div>
          </div>
        </div>
      )}

      {/* Pin Settings */}
      <div className="flex flex-col gap-3 pt-2 border-t border-neutral-700/50">
        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={enablePin} 
              onChange={(e) => {
                setEnablePin(e.target.checked);
                updateRealtime({ enablePin: e.target.checked });
              }}
              className="rounded bg-neutral-800 border-neutral-600 accent-blue-500"
            />
            <span className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Enable 3D Pin</span>
          </label>
          {enablePin && (
            <button 
              onClick={() => useStore.getState().setEditingPinForMesh(meshName)}
              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-800/50 px-2 py-1 rounded transition"
            >
              SETTINGS
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-neutral-700/50">
        <label className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Tags</label>
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => {
            const isActive = activeTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => isActive ? removeTagFromMesh(meshName, tag.id) : assignTagToMesh(meshName, tag.id)}
                className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                  isActive 
                    ? 'text-white border-transparent' 
                    : 'text-neutral-500 border-neutral-700 hover:border-neutral-500'
                }`}
                style={{ backgroundColor: isActive ? tag.color : 'transparent' }}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 mt-1">
        <button 
          onClick={handleSave}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs font-semibold py-1.5 rounded transition"
        >
          Save
        </button>
        <button 
          onClick={handleCancel}
          className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-xs font-semibold py-1.5 rounded transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}