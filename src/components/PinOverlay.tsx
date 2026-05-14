import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Pin } from './Pin';
import { callService } from '../ha/connection';

export function PinOverlay() {
  const staticPinPositions = useStore(state => state.staticPinPositions);
  const mappings = useStore(state => state.mappings);
  const fadeState = useStore(state => state.fadeState);

  // Derive the entity IDs we care about from visible pins
  const visibleEids = staticPinPositions
    .map(pos => mappings[pos.name]?.eid)
    .filter(Boolean);

  // Subscribe ONLY to the entities we need, with a shallow equality check
  const entities = useStore(useShallow(state => {
    const result: Record<string, any> = {};
    for (const eid of visibleEids) {
      if (state.entities[eid]) result[eid] = state.entities[eid];
    }
    return result;
  }));

  if (staticPinPositions.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {staticPinPositions.map(pos => {
        const mapping = mappings[pos.name];
        if (!mapping || !mapping.eid) return null;
        
        const ent = entities[mapping.eid];
        if (!ent) return null;

        const pinConfig = mapping.pinConfig;
        const selectedAttrs = pinConfig?.displayAttributes || ['state'];
        let valueMap: Record<string, Record<string, string>> = {};
        if (pinConfig?.valueMapJson) {
          try { valueMap = JSON.parse(pinConfig.valueMapJson); } catch (_e) { /* ignore */ }
        }

        const points: { label: string; value: string | number; unit?: string }[] = [];
        selectedAttrs.forEach((attr: string) => {
          if (attr === 'state') {
            const mapped = valueMap['state']?.[ent.state] ?? ent.state;
            const unit = pinConfig?.attributeUnits?.['state'];
            points.push({ label: 'State', value: mapped, unit: unit !== '' ? unit : undefined });
          } else {
            const val = ent.attributes?.[attr];
            if (val !== undefined) {
              const stringVal = String(val);
              const mapped = valueMap[attr]?.[stringVal] ?? val;
              let unit = pinConfig?.attributeUnits?.[attr];
              
              if (unit === undefined) {
                // Fallback to hardcoded defaults only if custom unit is undefined
                if (mapped === val) {
                  if (attr === 'temperature') unit = '°C';
                  if (attr === 'humidity') unit = '%';
                  if (attr === 'current_power_w') unit = 'W';
                  if (attr === 'brightness') unit = '/255';
                }
              }
              
              points.push({ label: attr.replace(/_/g, ' '), value: mapped, unit: unit !== '' ? unit : undefined });
            }
          }
        });

        const label = pinConfig?.customLabel || ent.attributes?.friendly_name || mapping.eid;

        return (
          <Pin
            key={pos.name}
            x={pos.x}
            y={pos.y}
            visible={pos.visible && fadeState === 'idle'}
            label={label}
            points={points}
            styleConfig={pinConfig}
            onUpdateConfig={(updates) => {
              const currentMapping = useStore.getState().mappings[pos.name] || {};
              useStore.getState().setMapping(pos.name, {
                ...currentMapping,
                pinConfig: {
                  ...(currentMapping.pinConfig || {}),
                  ...updates
                }
              });
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const action = pinConfig?.clickAction || 'toggle';
              if (action === 'toggle') {
                const domain = mapping.eid.split('.')[0];
                if (domain) callService(domain, 'toggle', { entity_id: mapping.eid });
              } else if (action === 'more-info') {
                const event = new CustomEvent('hass-more-info', { detail: { entityId: mapping.eid }, bubbles: true, composed: true });
                document.dispatchEvent(event);
              }
            }}
            onContextMenu={(e) => {
              e.stopPropagation();
              e.preventDefault();
              useStore.getState().setEditingPinForMesh(pos.name);
            }}
          />
        );
      })}
    </div>
  );
}
