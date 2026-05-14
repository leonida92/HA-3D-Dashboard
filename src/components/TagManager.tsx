import { useState } from 'react';
import { useStore } from '../store/useStore';

export function TagManager({ onClose }: { onClose: () => void }) {
  const { tags, addTag, removeTag, updateTag } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#03a9f4');
  const [newBehavior, setNewBehavior] = useState<'default' | 'static' | 'occluder'>('default');

  const handleAdd = () => {
    if (!newName.trim()) return;
    addTag({
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      color: newColor,
      behavior: newBehavior
    });
    setNewName('');
    setIsAdding(false);
  };

  return (
    <div className="absolute top-0 left-full ml-2 bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-2xl w-64 z-[200]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Edit Tags</span>
        <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300">✕</button>
      </div>

      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto mb-3 pr-1" style={{ scrollbarWidth: 'thin' }}>
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center gap-2 group p-1 rounded hover:bg-neutral-800 transition-colors">
            <input 
              type="color" 
              value={tag.color}
              onChange={(e) => updateTag(tag.id, { color: e.target.value })}
              className="w-4 h-4 rounded bg-transparent border-0 cursor-pointer p-0"
            />
            <input 
              type="text"
              value={tag.name}
              onChange={(e) => updateTag(tag.id, { name: e.target.value })}
              className="flex-1 bg-transparent border-0 text-[11px] text-neutral-300 outline-none focus:bg-neutral-800 px-1 rounded"
            />
            {!tag.id.startsWith('sys-') && (
              <button 
                onClick={() => removeTag(tag.id)}
                className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition p-1"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {!isAdding ? (
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full py-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 border border-blue-900/30 rounded"
        >
          + CREATE NEW TAG
        </button>
      ) : (
        <div className="flex flex-col gap-2 p-2 bg-neutral-800 rounded border border-neutral-700">
          <input 
            type="text" 
            placeholder="Tag Name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-[10px] outline-none"
          />
          <div className="flex gap-2 items-center">
            <input 
              type="color" 
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
            />
            <select 
              value={newBehavior}
              onChange={(e) => setNewBehavior(e.target.value as any)}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-1 py-1 text-[10px] outline-none"
            >
              <option value="default">Normal</option>
              <option value="static">Static</option>
              <option value="occluder">Occluder</option>
            </select>
          </div>
          <div className="flex gap-1">
            <button onClick={handleAdd} className="flex-1 bg-blue-600 py-1 rounded text-[10px] font-bold">CREATE</button>
            <button onClick={() => setIsAdding(false)} className="flex-1 bg-neutral-700 py-1 rounded text-[10px] font-bold">CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}
