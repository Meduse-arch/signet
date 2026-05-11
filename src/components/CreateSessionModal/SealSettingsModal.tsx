import { useState } from 'react';
import { X, Settings2, Save, ScrollText, Dices, UserCog, Plus, Trash2, Activity } from 'lucide-react';

export interface StatDefinition {
  id: string;
  name: string;
}

export interface BarDefinition {
  id: string;
  name: string;
  color: string;
  formula: string;
}

interface SealSettings {
  sheetMode?: 'manual' | 'roll';
  manualPoints?: number;
  rollFormula?: {
    diceCount: number;
    diceSides: number;
    rerolls: number;
  };
  stats?: StatDefinition[];
  bars?: BarDefinition[];
}

interface SealSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SealSettings;
  onSave: (settings: SealSettings) => void;
}

const DEFAULT_STATS: StatDefinition[] = [
  { id: 'force', name: 'Force' },
  { id: 'dexterity', name: 'Dextérité' },
  { id: 'constitution', name: 'Constitution' },
  { id: 'intelligence', name: 'Intelligence' },
  { id: 'wisdom', name: 'Sagesse' },
  { id: 'charisma', name: 'Charisme' },
  { id: 'perception', name: 'Perception' },
];

const DEFAULT_BARS: BarDefinition[] = [
  { id: 'hp', name: 'Vitalité', color: '#ef4444', formula: 'constitution * 4' },
  { id: 'mana', name: 'Ether', color: '#3b82f6', formula: '(intelligence + wisdom) / 2 * 10' },
  { id: 'stam', name: 'Endurance', color: '#22c55e', formula: '(force + dexterity + constitution) / 3 * 10' },
];

export function SealSettingsModal({ isOpen, onClose, settings, onSave }: SealSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<SealSettings>({
    sheetMode: settings.sheetMode || 'roll',
    manualPoints: settings.manualPoints ?? 60,
    rollFormula: settings.rollFormula || { diceCount: 4, diceSides: 5, rerolls: 6 },
    stats: settings.stats || DEFAULT_STATS,
    bars: settings.bars || DEFAULT_BARS,
  });

  const [activeTab, setActiveTab] = useState<'creation' | 'stats' | 'bars'>('creation');

  if (!isOpen) return null;

  const handleAddStat = () => {
    const id = Math.random().toString(36).substring(2, 9);
    const newStat: StatDefinition = { id, name: 'Nouvelle Stat' };
    setLocalSettings({ ...localSettings, stats: [...(localSettings.stats || []), newStat] });
  };

  const handleRemoveStat = (id: string) => {
    setLocalSettings({ ...localSettings, stats: localSettings.stats?.filter(s => s.id !== id) });
  };

  const handleUpdateStat = (id: string, name: string) => {
    setLocalSettings({
      ...localSettings,
      stats: localSettings.stats?.map(s => s.id === id ? { ...s, name } : s)
    });
  };

  const handleUpdateBar = (id: string, field: keyof BarDefinition, value: string) => {
    setLocalSettings({
      ...localSettings,
      bars: localSettings.bars?.map(b => b.id === id ? { ...b, [field]: value } : b)
    });
  };

  return (
    <div className="absolute inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-xl p-4">
      <div 
        className="bg-[#111115] border border-gold-DEFAULT/30 rounded-[2rem] w-full max-w-2xl shadow-[0_0_60px_rgba(212,175,55,0.1)] relative overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full">
          <header className="flex justify-between items-center p-8 border-b border-gold-DEFAULT/10">
            <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-gold-bright" />
              <h2 className="text-lg font-black text-gold-bright tracking-[0.2em] uppercase text-glow-gold">
                Paramètres Seal
              </h2>
            </div>
            <button onClick={onClose} className="text-gold-DEFAULT drop-shadow-md hover:text-gold-bright transition-colors">
              <X className="w-5 h-5" />
            </button>
          </header>

          {/* Navigation des Onglets */}
          <div className="flex border-b border-gold-DEFAULT/10 px-8">
            <button 
              onClick={() => setActiveTab('creation')}
              className={`px-4 py-3 text-[9px] font-cinzel font-black tracking-widest uppercase transition-all border-b-2 ${activeTab === 'creation' ? 'border-gold-DEFAULT text-gold-bright' : 'border-transparent text-gold-muted hover:text-gold-DEFAULT'}`}
            >
              Création
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-3 text-[9px] font-cinzel font-black tracking-widest uppercase transition-all border-b-2 ${activeTab === 'stats' ? 'border-gold-DEFAULT text-gold-bright' : 'border-transparent text-gold-muted hover:text-gold-DEFAULT'}`}
            >
              Attributs
            </button>
            <button 
              onClick={() => setActiveTab('bars')}
              className={`px-4 py-3 text-[9px] font-cinzel font-black tracking-widest uppercase transition-all border-b-2 ${activeTab === 'bars' ? 'border-gold-DEFAULT text-gold-bright' : 'border-transparent text-gold-muted hover:text-gold-DEFAULT'}`}
            >
              Énergies
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'creation' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Sous-menu Mode de Création */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ScrollText className="w-4 h-4 text-gold-muted" />
                    <h3 className="text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase">Méthode de Genèse</h3>
                  </div>

                  {/* Onglets secondaires (Sous-menu) */}
                  <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-gold-DEFAULT/20 w-fit">
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, sheetMode: 'manual' })}
                      className={`px-6 py-2 rounded-lg text-[9px] font-cinzel font-black tracking-widest uppercase transition-all ${
                        localSettings.sheetMode === 'manual'
                          ? 'bg-gold-DEFAULT text-black shadow-rune-gold'
                          : 'text-gold-muted hover:text-gold-DEFAULT'
                      }`}
                    >
                      Manuel
                    </button>
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, sheetMode: 'roll' })}
                      className={`px-6 py-2 rounded-lg text-[9px] font-cinzel font-black tracking-widest uppercase transition-all ${
                        localSettings.sheetMode === 'roll'
                          ? 'bg-gold-DEFAULT text-black shadow-rune-gold'
                          : 'text-gold-muted hover:text-gold-DEFAULT'
                      }`}
                    >
                      Tirage (Roll)
                    </button>
                  </div>
                  
                  <div className="p-8 bg-[#0D0D0F]/80 border border-gold-DEFAULT/30 rounded-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gold-DEFAULT/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    {localSettings.sheetMode === 'manual' ? (
                      <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
                        <div className="flex flex-col items-center gap-4">
                          <UserCog className="w-8 h-8 text-gold-bright opacity-50" />
                          <div className="text-center">
                            <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase mb-4">Réserve de Points de Destin</label>
                            <div className="flex items-center justify-center gap-6">
                              <button 
                                onClick={() => setLocalSettings({ ...localSettings, manualPoints: Math.max(0, (localSettings.manualPoints || 0) - 5) })}
                                className="w-10 h-10 rounded-full border border-gold-DEFAULT/30 flex items-center justify-center text-gold-DEFAULT hover:bg-gold-DEFAULT/10 transition-all"
                              >
                                -5
                              </button>
                              <input
                                type="number"
                                value={localSettings.manualPoints}
                                onChange={(e) => setLocalSettings({ ...localSettings, manualPoints: parseInt(e.target.value) || 0 })}
                                className="w-24 bg-transparent border-b-2 border-gold-DEFAULT/40 py-2 text-center text-gold-bright font-cinzel font-black text-3xl focus:outline-none focus:border-gold-bright transition-all"
                              />
                              <button 
                                onClick={() => setLocalSettings({ ...localSettings, manualPoints: (localSettings.manualPoints || 0) + 5 })}
                                className="w-10 h-10 rounded-full border border-gold-DEFAULT/30 flex items-center justify-center text-gold-DEFAULT hover:bg-gold-DEFAULT/10 transition-all"
                              >
                                +5
                              </button>
                            </div>
                            <p className="mt-4 text-[9px] text-gold-muted/50 font-serif italic italic leading-relaxed">
                              Les points que les joueurs pourront répartir librement entre leurs attributs.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="flex flex-col items-center gap-4">
                          <Dices className="w-8 h-8 text-gold-bright opacity-50" />
                          <div className="text-center w-full">
                            <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase mb-6 text-center">Formule de Manifestation</label>
                            
                            <div className="flex items-center justify-center gap-6 text-gold-bright font-cinzel font-black">
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-[8px] text-gold-muted uppercase tracking-tighter">Nombre</span>
                                <input
                                  type="number"
                                  value={localSettings.rollFormula?.diceCount}
                                  onChange={(e) => setLocalSettings({
                                    ...localSettings,
                                    rollFormula: { ...localSettings.rollFormula!, diceCount: parseInt(e.target.value) || 1 }
                                  })}
                                  className="w-16 bg-black/40 border border-gold-DEFAULT/30 rounded-xl py-3 text-center text-xl focus:outline-none focus:border-gold-DEFAULT transition-all"
                                />
                              </div>
                              <span className="text-4xl mt-4 opacity-30">D</span>
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-[8px] text-gold-muted uppercase tracking-tighter">Faces</span>
                                <input
                                  type="number"
                                  value={localSettings.rollFormula?.diceSides}
                                  onChange={(e) => setLocalSettings({
                                    ...localSettings,
                                    rollFormula: { ...localSettings.rollFormula!, diceSides: parseInt(e.target.value) || 2 }
                                  })}
                                  className="w-16 bg-black/40 border border-gold-DEFAULT/30 rounded-xl py-3 text-center text-xl focus:outline-none focus:border-gold-DEFAULT transition-all"
                                />
                              </div>
                            </div>

                            <p className="mt-8 text-[9px] text-gold-muted/50 font-serif italic italic leading-relaxed max-w-sm mx-auto">
                              Définit le jet de dés automatique lors de la création d'un voyageur pour déterminer ses attributs.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase">Attributs Personnalisés</h3>
                  <button 
                    onClick={handleAddStat}
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-[8px] font-cinzel font-black text-gold-bright hover:bg-gold-DEFAULT/20 transition-all"
                  >
                    <Plus size={10} /> AJOUTER
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {localSettings.stats?.map((stat) => (
                    <div key={stat.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group">
                      <input 
                        type="text"
                        value={stat.name}
                        onChange={(e) => handleUpdateStat(stat.id, e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white font-serif italic text-sm"
                      />
                      <span className="text-[9px] font-mono text-white/20 uppercase px-2">{stat.id}</span>
                      <button 
                        onClick={() => handleRemoveStat(stat.id)}
                        className="text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'bars' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase mb-4">Formules de Calcul (Runes)</h3>
                
                {localSettings.bars?.map((bar) => (
                  <div key={bar.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4" style={{ color: bar.color }} />
                        <input 
                          type="text"
                          value={bar.name}
                          onChange={(e) => handleUpdateBar(bar.id, 'name', e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-gold-bright font-cinzel font-black tracking-widest text-xs uppercase"
                        />
                      </div>
                      <input 
                        type="color" 
                        value={bar.color} 
                        onChange={(e) => handleUpdateBar(bar.id, 'color', e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono text-white/30 uppercase tracking-tighter">Équation de calcul</label>
                      <input 
                        type="text"
                        value={bar.formula}
                        onChange={(e) => handleUpdateBar(bar.id, 'formula', e.target.value)}
                        className="w-full bg-black/40 border border-gold-DEFAULT/20 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-gold-DEFAULT/50"
                      />
                    </div>
                  </div>
                ))}

                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <p className="text-[9px] text-blue-300/70 font-serif italic leading-relaxed">
                    Utilisez les IDs des attributs (ex: force, intelligence) pour créer vos formules. Les opérateurs supportés sont +, -, *, / et les parenthèses ().
                  </p>
                </div>
              </div>
            )}
          </div>

          <footer className="p-8 border-t border-gold-DEFAULT/10">
            <button
              onClick={() => { onSave(localSettings); onClose(); }}
              className="w-full py-4 flex items-center justify-center gap-3 bg-gold-DEFAULT/10 hover:bg-gold-DEFAULT/20 text-gold-bright rounded-2xl border border-gold-DEFAULT/30 transition-all group shadow-[0_0_30px_rgba(212,175,55,0.1)] hover:shadow-[0_0_40px_rgba(212,175,55,0.3)]"
            >
              <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-cinzel font-black tracking-[0.2em] uppercase">Graver dans l'Archive</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

