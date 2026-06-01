import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tag as TagIcon, Plus, X, Trash2, Palette } from 'lucide-react';
import { useTagsStore } from '../../store/tags';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';

interface TagManagementModalProps {
  sessionId: string;
  onClose: () => void;
}

export function TagManagementModal({ sessionId, onClose }: TagManagementModalProps) {
  const { tags, addTag, removeTag } = useTagsStore();
  const { user } = useAuthStore();
  const { broadcast } = usePeer();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#d4af37');

  if (!isMJ) return null;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const tag = {
      id: crypto.randomUUID(),
      name: newName,
      color: newColor
    };
    await addTag(sessionId, tag);
    broadcast({ type: 'TAG_UPDATE', payload: tag });
    setNewName('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce signe des archives ?")) return;
    await removeTag(sessionId, id);
    broadcast({ type: 'TAG_DELETE', payload: { id } });
  };

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        <header className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xs font-cinzel font-black text-gold-bright uppercase tracking-widest flex items-center gap-2">
            <Palette size={14} /> ARCHIVES DES SIGNES
          </h3>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </header>

        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="Nom du signe..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/60 focus:border-gold-DEFAULT/50 outline-none transition-all"
              />
            </div>
            <input 
              type="color" 
              value={newColor} 
              onChange={e => setNewColor(e.target.value)}
              className="w-10 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
            />
            <button 
              onClick={handleAdd}
              className="px-3 rounded-lg bg-gold-DEFAULT text-black hover:shadow-[0_0_10px_rgba(212,175,55,0.3)] transition-all"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 group">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: tag.color, color: tag.color }} />
                  <span className="text-xs font-cinzel font-black uppercase text-white/80 tracking-widest">{tag.name}</span>
                </div>
                <button 
                  onClick={() => handleDelete(tag.id)}
                  className="p-1 text-white/60 hover:text-red-500 opacity-30 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {tags.length === 0 && (
              <p className="text-xs font-garamond italic text-white/60 text-center py-4">Aucun signe gravé...</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
