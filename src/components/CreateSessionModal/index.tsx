import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Search, Check, Settings2 } from 'lucide-react';
import { SealSettingsModal } from './SealSettingsModal';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, system: string, imageUrl?: string, settings?: Record<string, any>) => void;
  initialData?: { name: string; system?: string; imageUrl?: string; settings?: Record<string, any> };
  title?: string;
  submitLabel?: string;
}

const AVAILABLE_SYSTEMS = ['Seal'];

export function CreateSessionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData,
  title = "Nouvelle Archive",
  submitLabel = "Invoquer"
}: SessionModalProps) {
  const [name, setName] = useState('');
  const [system, setSystem] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setSystem(initialData?.system || '');
      setSearchQuery(initialData?.system || '');
      setImageUrl(initialData?.imageUrl || '');
      setSettings(initialData?.settings || {});
    }
  }, [isOpen, initialData]);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const filteredSystems = AVAILABLE_SYSTEMS.filter(s => 
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSystem = (sys: string) => {
    setSystem(sys);
    setSearchQuery(sys);
    setIsDropdownOpen(false);
    
    // Appliquer les paramètres par défaut pour Seal s'ils n'existent pas encore
    if (sys.toLowerCase() === 'seal' && Object.keys(settings).length === 0) {
      setSettings({
        sheetMode: 'roll',
        manualPoints: 60,
        rollFormula: { diceCount: 4, diceSides: 5, rerolls: 6 },
      });
    } else if (sys.toLowerCase() !== system.toLowerCase()) {
      setSettings({});
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-md p-4">
      <div className="bg-[#111115] border border-gold-DEFAULT/20 rounded-[2rem] p-8 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden group">
        {/* Texture Grimoire */}
        <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none" />
        
        {/* Décorations de coins */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-gold-DEFAULT/30 rounded-tl-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-gold-DEFAULT/30 rounded-br-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-gold-bright tracking-[0.2em] uppercase text-glow-gold">
              {title}
            </h2>
            <button onClick={onClose} className="text-gold-dim hover:text-gold-bright transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-xs font-serif italic text-gold-dim/80 mb-8 leading-relaxed">
            {initialData 
              ? "Altérez les runes de cette archive pour modifier le cours du destin." 
              : "Inscrivez les premiers mots de cette nouvelle épopée dans le grand grimoire."}
          </p>
          
          <div className="space-y-6 mb-10">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase ml-1">Titre de l'Archive</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Le Tombeau des Anciens"
                className="w-full bg-black/40 border border-gold-DEFAULT/10 rounded-xl py-3 px-4 text-sm text-gold-bright focus:outline-none focus:border-gold-DEFAULT/50 focus:ring-1 focus:ring-gold-DEFAULT/30 transition-all placeholder:text-gold-dim/30 font-serif italic"
              />
            </div>

            {/* SYSTÈME DROPDOWN */}
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase ml-1">Arcane / Système</label>
              <div className="relative group">
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSystem(e.target.value); // Permet aussi la saisie libre
                    setIsDropdownOpen(true);
                  }}
                  placeholder="Choisissez ou cherchez..."
                  className="w-full bg-black/40 border border-gold-DEFAULT/10 rounded-xl py-3 pl-4 pr-10 text-sm text-gold-bright focus:outline-none focus:border-gold-DEFAULT/50 focus:ring-1 focus:ring-gold-DEFAULT/30 transition-all placeholder:text-gold-dim/30 font-serif italic"
                />
                <div 
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gold-muted hover:text-gold-bright transition-colors"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Menu Déroulant */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[#16161C] border border-gold-DEFAULT/20 rounded-xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-40 overflow-y-auto custom-scrollbar">
                    {filteredSystems.length > 0 ? (
                      filteredSystems.map((sys) => (
                        <div
                          key={sys}
                          onClick={() => handleSelectSystem(sys)}
                          className="flex items-center justify-between px-4 py-3 text-xs font-cinzel text-gold-dim hover:text-gold-bright hover:bg-gold-DEFAULT/5 cursor-pointer transition-all border-b border-white/5 last:border-0"
                        >
                          <span className="tracking-widest uppercase font-bold">{sys}</span>
                          {system === sys && <Check className="w-3.5 h-3.5 text-gold-bright" />}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-[10px] italic font-serif text-gold-muted/50 text-center">
                        Aucun rituel ne porte ce nom...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {system.toLowerCase() === 'seal' && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gold-DEFAULT/5 border border-gold-DEFAULT/20 rounded-xl text-[10px] font-cinzel font-black text-gold-bright hover:bg-gold-DEFAULT/10 transition-all tracking-widest uppercase"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Paramètres de l'Arcane
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase ml-1">Vision / URL Image</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.ritual..."
                className="w-full bg-black/40 border border-gold-DEFAULT/10 rounded-xl py-3 px-4 text-sm text-gold-bright focus:outline-none focus:border-gold-DEFAULT/50 focus:ring-1 focus:ring-gold-DEFAULT/30 transition-all placeholder:text-gold-dim/30 font-mono text-[10px]"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-[10px] font-cinzel font-black tracking-widest border border-gold-DEFAULT/10 rounded-xl text-gold-dim hover:text-gold-bright hover:bg-white/5 transition-all"
            >
              ANNULER
            </button>
            <button
              onClick={() => onSubmit(name || 'Chronique sans nom', system || 'Arcane Inconnue', imageUrl, settings)}
              disabled={!name.trim() || !system.trim()}
              className="flex-1 py-3 text-[10px] font-cinzel font-black tracking-widest bg-gold-DEFAULT/10 hover:bg-gold-DEFAULT/20 text-gold-bright rounded-xl border border-gold-DEFAULT/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-rune-gold"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>

      {system.toLowerCase() === 'seal' && (
        <SealSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={setSettings}
        />
      )}
    </div>
  );
}