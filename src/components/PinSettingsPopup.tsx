import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { PinStyleConfig } from './Pin';

export function PinSettingsPopup() {
  const meshName = useStore(state => state.editingPinForMesh);
  const setEditingPinForMesh = useStore(state => state.setEditingPinForMesh);
  const mappings = useStore(state => state.mappings);
  const setMapping = useStore(state => state.setMapping);
  const entities = useStore(state => state.entities);

  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [hasMoved, setHasMoved] = useState(false);

  useEffect(() => {
    if (meshName && !hasMoved) {
      setPos({ x: Math.max(20, window.innerWidth - 360), y: 100 });
      setHasMoved(true);
    }
  }, [meshName, hasMoved]);

  if (!meshName) return null;

  const currentMapping = mappings[meshName];
  if (!currentMapping) return null;

  const pinConfig: PinStyleConfig = currentMapping.pinConfig || {};
  const eid = currentMapping.eid;
  const entity = eid ? entities[eid] : null;

  const attributes = entity && entity.attributes 
    ? Object.keys(entity.attributes).filter(k => typeof entity.attributes[k] === 'string' || typeof entity.attributes[k] === 'number') 
    : [];

  const updateConfig = (key: keyof PinStyleConfig, value: any) => {
     const newConfig = { ...pinConfig, [key]: value };
     setMapping(meshName, { ...currentMapping, pinConfig: newConfig });
  };

  const handleAttributeToggle = (attr: string) => {
    const current = pinConfig.displayAttributes || ['state'];
    if (current.includes(attr)) {
      updateConfig('displayAttributes', current.filter(a => a !== attr));
    } else {
      updateConfig('displayAttributes', [...current, attr]);
    }
  };

  return (
    <div 
      className="absolute z-50 bg-neutral-900/90 backdrop-blur border border-neutral-700 rounded-xl shadow-2xl w-80 flex flex-col pointer-events-auto"
      style={{ left: pos.x, top: pos.y }}
    >
      <div 
        className="flex justify-between items-center p-3 border-b border-neutral-700 cursor-move bg-neutral-800/50 rounded-t-xl"
        onPointerDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          const startPos = { ...pos };
          
          const onMove = (ev: PointerEvent) => {
            setPos({ 
              x: startPos.x + (ev.clientX - startX), 
              y: startPos.y + (ev.clientY - startY) 
            });
          };
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        }}
      >
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
          Pin Settings
        </span>
        <button onClick={() => setEditingPinForMesh(null)} className="text-neutral-500 hover:text-white transition">✕</button>
      </div>

      <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Custom Label</label>
          <input 
            type="text" 
            value={pinConfig.customLabel || ''} 
            onChange={(e) => updateConfig('customLabel', e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white" 
            placeholder="Override default name..." 
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Visible In Views</label>
          <div className="bg-neutral-800 border border-neutral-600 rounded p-2 max-h-40 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={!pinConfig.viewIds || pinConfig.viewIds.length === 0} 
                onChange={() => updateConfig('viewIds', undefined)} 
                className="rounded bg-neutral-700 border-neutral-600 accent-blue-500" 
              />
              <span className="text-xs text-neutral-300">All Views (Always Visible)</span>
            </label>
            {useStore.getState().views.map(v => {
              const isSelected = pinConfig.viewIds?.includes(v.id) || (!pinConfig.viewIds && !!pinConfig.viewId && pinConfig.viewId === v.id);
              return (
                <label key={v.id} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={(e) => {
                      let current = pinConfig.viewIds || [];
                      if (pinConfig.viewId && !pinConfig.viewIds) {
                         current = [pinConfig.viewId];
                      }
                      if (e.target.checked) {
                        updateConfig('viewIds', [...current, v.id]);
                      } else {
                        const next = current.filter(id => id !== v.id);
                        updateConfig('viewIds', next.length > 0 ? next : undefined);
                      }
                    }} 
                    className="rounded bg-neutral-700 border-neutral-600 accent-blue-500" 
                  />
                  <span className="text-xs text-neutral-300">{v.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Click Action</label>
          <select 
            value={pinConfig.clickAction || 'toggle'} 
            onChange={(e) => updateConfig('clickAction', e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white outline-none"
          >
            <option value="toggle">Toggle Entity</option>
            <option value="more-info">More Info</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Display Attributes & Units</label>
          <div className="bg-neutral-800 border border-neutral-600 rounded p-2 max-h-40 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(pinConfig.displayAttributes || ['state']).includes('state')} onChange={() => handleAttributeToggle('state')} className="rounded bg-neutral-700 border-neutral-600 accent-blue-500" />
                <span className="text-xs text-neutral-300">State</span>
              </label>
              {(pinConfig.displayAttributes || ['state']).includes('state') && (
                <input 
                  type="text" 
                  value={pinConfig.attributeUnits?.['state'] || ''}
                  onChange={(e) => updateConfig('attributeUnits', { ...pinConfig.attributeUnits, 'state': e.target.value })}
                  placeholder="Unit" 
                  className="w-16 bg-neutral-900 border border-neutral-700 rounded px-1 py-0.5 text-[10px] text-white outline-none"
                />
              )}
            </div>
            {attributes.map(attr => {
              const isSelected = (pinConfig.displayAttributes || ['state']).includes(attr);
              return (
                <div key={attr} className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 overflow-hidden">
                    <input type="checkbox" checked={isSelected} onChange={() => handleAttributeToggle(attr)} className="rounded bg-neutral-700 border-neutral-600 accent-blue-500 shrink-0" />
                    <span className="text-xs text-neutral-300 truncate" title={attr}>{attr}</span>
                  </label>
                  {isSelected && (
                    <input 
                      type="text" 
                      value={pinConfig.attributeUnits?.[attr] || ''}
                      onChange={(e) => updateConfig('attributeUnits', { ...pinConfig.attributeUnits, [attr]: e.target.value })}
                      placeholder="Unit" 
                      className="w-16 bg-neutral-900 border border-neutral-700 rounded px-1 py-0.5 text-[10px] text-white outline-none shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Value Map (JSON)</label>
          <textarea 
            value={pinConfig.valueMapJson || ''}
            onChange={(e) => updateConfig('valueMapJson', e.target.value)}
            placeholder='{"state": {"off": "Closed", "on": "Open"}}'
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white font-mono h-16 custom-scrollbar resize-y"
          />
        </div>

        <hr className="border-neutral-700/50" />

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pinConfig.showLabel !== false} onChange={(e) => updateConfig('showLabel', e.target.checked)} className="rounded bg-neutral-800 border-neutral-600 accent-blue-500" />
            <span className="text-[10px] text-neutral-300 font-bold">Show Label</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pinConfig.showAnchor !== false} onChange={(e) => updateConfig('showAnchor', e.target.checked)} className="rounded bg-neutral-800 border-neutral-600 accent-blue-500" />
            <span className="text-[10px] text-neutral-300 font-bold">Show Anchor</span>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Base Offset (X / Y)</label>
          <div className="flex gap-2">
            <input type="text" value={pinConfig.xOffset ?? 0} onChange={(e) => updateConfig('xOffset', e.target.value)} className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white" placeholder="X" />
            <input type="text" value={pinConfig.yOffset ?? 0} onChange={(e) => updateConfig('yOffset', e.target.value)} className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white" placeholder="Y" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Bubble Offset (X / Y)</label>
          <div className="flex gap-2">
            <input type="text" value={pinConfig.bubbleXOffset ?? 0} onChange={(e) => updateConfig('bubbleXOffset', e.target.value)} className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white" placeholder="X" />
            <input type="text" value={pinConfig.bubbleYOffset ?? -20} onChange={(e) => updateConfig('bubbleYOffset', e.target.value)} className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white" placeholder="Y" />
          </div>
        </div>

        <hr className="border-neutral-700/50" />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Background</label>
            <input type="color" value={pinConfig.backgroundColor || '#0f172a'} onChange={(e) => updateConfig('backgroundColor', e.target.value)} className="w-6 h-6 rounded bg-transparent border-0 p-0 cursor-pointer" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 w-14">Opacity</span>
            <input type="range" min="0" max="1" step="0.05" value={pinConfig.backgroundOpacity ?? 0.65} onChange={(e) => updateConfig('backgroundOpacity', parseFloat(e.target.value))} className="flex-1 accent-blue-500" />
            <input type="number" step="0.05" value={pinConfig.backgroundOpacity ?? 0.65} onChange={(e) => updateConfig('backgroundOpacity', parseFloat(e.target.value))} className="w-12 bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-[10px] text-white text-right outline-none focus:border-blue-500" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 w-14">Glass Blur</span>
            <input type="range" min="0" max="30" step="1" value={pinConfig.backdropBlur ?? 12} onChange={(e) => updateConfig('backdropBlur', parseInt(e.target.value))} className="flex-1 accent-blue-500" />
            <input type="number" step="1" value={pinConfig.backdropBlur ?? 12} onChange={(e) => updateConfig('backdropBlur', parseInt(e.target.value))} className="w-12 bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-[10px] text-white text-right outline-none focus:border-blue-500" />
          </div>

          <div className="flex items-center justify-between mt-2">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Text Color</label>
            <input type="color" value={pinConfig.textColor || '#ffffff'} onChange={(e) => updateConfig('textColor', e.target.value)} className="w-6 h-6 rounded bg-transparent border-0 p-0 cursor-pointer" />
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Border Color</label>
            <input type="color" value={pinConfig.borderColor || '#ffffff'} onChange={(e) => updateConfig('borderColor', e.target.value)} className="w-6 h-6 rounded bg-transparent border-0 p-0 cursor-pointer" />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-neutral-500 w-14">Border Op.</span>
            <input type="range" min="0" max="1" step="0.05" value={pinConfig.borderOpacity ?? 0.15} onChange={(e) => updateConfig('borderOpacity', parseFloat(e.target.value))} className="flex-1 accent-blue-500" />
            <input type="number" step="0.05" value={pinConfig.borderOpacity ?? 0.15} onChange={(e) => updateConfig('borderOpacity', parseFloat(e.target.value))} className="w-12 bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-[10px] text-white text-right outline-none focus:border-blue-500" />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-neutral-500 w-14">Border W.</span>
            <input type="range" min="0" max="10" step="1" value={pinConfig.borderWidth ?? 1} onChange={(e) => updateConfig('borderWidth', parseInt(e.target.value))} className="flex-1 accent-blue-500" />
            <input type="number" step="1" value={pinConfig.borderWidth ?? 1} onChange={(e) => updateConfig('borderWidth', parseInt(e.target.value))} className="w-12 bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-[10px] text-white text-right outline-none focus:border-blue-500" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 w-14">Radius</span>
            <input type="range" min="0" max="100" step="1" value={pinConfig.borderRadius ?? 16} onChange={(e) => updateConfig('borderRadius', parseInt(e.target.value))} className="flex-1 accent-blue-500" />
            <input type="number" step="1" value={pinConfig.borderRadius ?? 16} onChange={(e) => updateConfig('borderRadius', parseInt(e.target.value))} className="w-12 bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-[10px] text-white text-right outline-none focus:border-blue-500" />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-neutral-500 w-14">Scale</span>
            <input type="range" min="0.1" max="2.0" step="0.1" value={pinConfig.scale ?? 1} onChange={(e) => updateConfig('scale', parseFloat(e.target.value))} className="flex-1 accent-blue-500" />
            <input type="number" step="0.1" value={pinConfig.scale ?? 1} onChange={(e) => updateConfig('scale', parseFloat(e.target.value))} className="w-12 bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-[10px] text-white text-right outline-none focus:border-blue-500" />
          </div>
        </div>

      </div>
    </div>
  );
}