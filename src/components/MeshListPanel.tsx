import { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { TagManager } from './TagManager';

export function MeshListPanel() {
  const allMeshes = useStore(state => state.allMeshes);
  const selectedMesh = useStore(state => state.selectedMesh);
  const setSelectedMesh = useStore(state => state.setSelectedMesh);
  const mappings = useStore(state => state.mappings);
  const tags = useStore(state => state.tags);
  const meshTags = useStore(state => state.meshTags);
  const assignTagToMesh = useStore(state => state.assignTagToMesh);
  const removeTagFromMesh = useStore(state => state.removeTagFromMesh);
  const hiddenTags = useStore(state => state.hiddenTags);
  const toggleTagHidden = useStore(state => state.toggleTagHidden);
  const isolatedTag = useStore(state => state.isolatedTag);
  const setIsolatedTag = useStore(state => state.setIsolatedTag);
  const [search, setSearch] = useState('');
  const [activeFilterTags, setActiveFilterTags] = useState<string[]>([]);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const selectedRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let result = allMeshes;
    
    // 1. Search text filter
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(m => {
        if (m.toLowerCase().includes(lower)) return true;
        const activeTagIds = meshTags[m] || [];
        const activeTags = tags.filter(t => activeTagIds.includes(t.id));
        return activeTags.some(t => t.name.toLowerCase().includes(lower));
      });
    }

    // 2. Multi-tag filter (MUST have ALL selected tags)
    if (activeFilterTags.length > 0) {
      result = result.filter(m => {
        const meshTagIds = meshTags[m] || [];
        return activeFilterTags.every(filterTagId => meshTagIds.includes(filterTagId));
      });
    }

    return result;
  }, [allMeshes, search, tags, meshTags, activeFilterTags]);

  // Scroll the selected mesh into view whenever it changes
  useEffect(() => {
    if (selectedMesh && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedMesh]);

  return (
    <div className="relative bg-neutral-900/90 backdrop-blur rounded-lg p-4 text-sm flex flex-col gap-3 shadow-lg border border-neutral-700 w-80 pointer-events-auto max-h-[70vh]">
      <div className="flex justify-between items-center">
        <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">All Meshes ({allMeshes.length})</span>
        <button 
          onClick={() => setShowTagEditor(!showTagEditor)}
          className={`p-1.5 rounded transition ${showTagEditor ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-neutral-800'}`}
          title="Manage Global Tags"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.1a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      {showTagEditor && <TagManager onClose={() => setShowTagEditor(false)} />}
      
      <div className="flex flex-wrap gap-1 bg-neutral-800/50 p-2 rounded border border-neutral-700/50">
        <span className="w-full text-[10px] text-neutral-500 font-bold uppercase mb-1">Visibility Controls</span>
        {tags.map(tag => {
          const isHidden = hiddenTags.includes(tag.id);
          const isIsolated = isolatedTag === tag.id;
          return (
            <div key={`vis-${tag.id}`} className="flex items-center gap-1 bg-neutral-800 rounded px-1 py-0.5 border border-neutral-700">
              <span className="text-[10px] text-neutral-300 w-16 truncate" title={tag.name}>{tag.name}</span>
              <button 
                onClick={() => toggleTagHidden(tag.id)}
                className={`p-0.5 rounded ${isHidden ? 'text-neutral-600' : 'text-blue-400 hover:bg-neutral-700'}`}
                title={isHidden ? "Show Tag" : "Hide Tag"}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button 
                onClick={() => setIsolatedTag(isIsolated ? null : tag.id)}
                className={`p-0.5 rounded ${isIsolated ? 'text-green-400 bg-green-400/20' : 'text-neutral-500 hover:bg-neutral-700'}`}
                title={isIsolated ? "Remove Isolation" : "Isolate Tag"}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <input 
          type="text" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
          placeholder="Search meshes..."
        />
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => {
            const isActive = activeFilterTags.includes(tag.id);
            return (
              <button
                key={`filter-${tag.id}`}
                onClick={() => {
                  setActiveFilterTags(prev => 
                    prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                  );
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                  isActive 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
                }`}
                style={{ borderColor: isActive ? tag.color : undefined }}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {filtered.map(mesh => {
          const isSelected = selectedMesh === mesh;
          const hasMapping = !!mappings[mesh];
          const activeTagIds = meshTags[mesh] || [];
          
          return (
            <div 
              key={mesh}
              ref={isSelected ? selectedRef : null}
              className={`p-2 rounded flex flex-col gap-2 transition-colors border ${
                isSelected 
                  ? 'bg-blue-600/20 border-blue-500/50' 
                  : 'hover:bg-neutral-800/50 border-transparent'
              }`}
            >
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setSelectedMesh(mesh)}
              >
                <span className={`text-xs truncate pr-2 ${isSelected ? 'text-blue-400 font-bold' : 'text-neutral-300'}`}>
                  {mesh}
                </span>
                <div className="flex gap-1.5 items-center">
                   {hasMapping && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Entity Assigned" />
                   )}
                </div>
              </div>

              {/* Tags in Explorer */}
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => {
                  const isActive = activeTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => isActive ? removeTagFromMesh(mesh, tag.id) : assignTagToMesh(mesh, tag.id)}
                      className={`px-1.5 py-0.5 rounded-full text-[8px] border transition-all ${
                        isActive 
                          ? 'text-white border-transparent' 
                          : 'text-neutral-600 border-neutral-800 hover:border-neutral-700'
                      }`}
                      style={{ backgroundColor: isActive ? tag.color : 'transparent' }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <span className="text-xs text-neutral-500 italic py-2 text-center">No meshes found.</span>
        )}
      </div>
    </div>
  );
}
