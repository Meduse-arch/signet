import { useState, useEffect } from 'react';
import { X, Save, Shield, Zap, Heart, Activity, Dices } from 'lucide-react';
import { StatDefinition, BarDefinition, DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';

interface CreateCharacterModalProps {
  onClose: () => void;
  onSave: (characterData: {
    name: string;
    image_url?: string;
    stats: Record<string, number>;
    bars: Record<string, number>;
  }) => void;
  initialStats?: Record<string, number>;
  initialName?: string;
  initialImageUrl?: string;
  title?: string;
  settings?: {
    stats?: StatDefinition[];
    bars?: BarDefinition[];
    sheetMode?: 'manual' | 'roll';
    manualPoints?: number;
    rollFormula?: { diceCount: number; diceSides: number; rerolls?: number };
    rerollAllAllowed?: boolean;
  };
}

export function CreateCharacterModal({ 
  onClose, 
  onSave, 
  initialStats, 
  initialName = '',
  initialImageUrl = '',
  title = "Éveiller un Voyageur",
  settings 
}: CreateCharacterModalProps) {
  const [name, setName] = useState(initialName);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const isEditing = !!initialStats;
  
  // Utiliser les stats définies dans les paramètres ou les stats par défaut
  const availableStats = settings?.stats || DEFAULT_STATS;

  const [stats, setStats] = useState<Record<string, number>>(() => {
    if (initialStats) return initialStats;
    const initial: Record<string, number> = {};
    availableStats.forEach(s => {
      initial[s.id] = 0;
    });
    return initial;
  });

  const [pointsLeft, setPointsLeft] = useState(settings?.manualPoints || 0);
  const [rerollsLeft, setRerollsLeft] = useState(settings?.rollFormula?.rerolls || 0);
  const [hasInitialRoll, setHasInitialRoll] = useState(false);

  // Auto-roll une fois si on est en mode roll et pas en édition
  useEffect(() => {
    if (settings?.sheetMode === 'roll' && !isEditing && !hasInitialRoll) {
      handleRollAll();
      setHasInitialRoll(true);
    }
  }, [settings?.sheetMode, isEditing, hasInitialRoll]);

  useEffect(() => {
    if (settings?.sheetMode === 'manual') {
      const used = Object.values(stats).reduce((a, b) => a + b, 0);
      setPointsLeft((settings.manualPoints || 0) - used);
    }
  }, [stats, settings, availableStats]);

  const handleStatChange = (statId: string, val: number) => {
    if (isEditing || settings?.sheetMode === 'roll') return;
    
    const currentVal = stats[statId] || 0;
    const diff = val - currentVal;
    
    if (settings?.sheetMode === 'manual' && diff > 0 && pointsLeft < diff) {
      // Si on essaie de mettre plus que ce qu'il reste, on met le max possible
      const maxPossible = currentVal + pointsLeft;
      setStats(prev => ({ ...prev, [statId]: maxPossible }));
      return;
    }
    
    setStats(prev => ({ ...prev, [statId]: Math.max(0, val) }));
  };

  const rollStat = (statId: string) => {
    if (isEditing || !settings?.rollFormula) return;
    const { diceCount, diceSides } = settings.rollFormula;
    let roll = 0;
    for (let i = 0; i < diceCount; i++) {
      roll += Math.floor(Math.random() * diceSides) + 1;
    }
    setStats(prev => ({ ...prev, [statId]: roll }));
  };

  const handleRerollStat = (statId: string) => {
    if (isEditing || (rerollsLeft <= 0 && settings?.sheetMode === 'roll')) return;
    rollStat(statId);
    if (settings?.sheetMode === 'roll') {
      setRerollsLeft(prev => prev - 1);
    }
  };

  const handleRollAll = () => {
    if (isEditing) return;
    const newStats = { ...stats };
    availableStats.forEach(s => {
      if (!settings?.rollFormula) return;
      const { diceCount, diceSides } = settings.rollFormula;
      let roll = 0;
      for (let i = 0; i < diceCount; i++) {
        roll += Math.floor(Math.random() * diceSides) + 1;
      }
      newStats[s.id] = roll;
    });
    setStats(newStats);
    setRerollsLeft(settings?.rollFormula?.rerolls || 0);
  };

  // Calcul dynamique des barres basé sur les formules
  const calculateBars = () => {
    const results: Record<string, number> = {};
    const barDefs = settings?.bars || DEFAULT_BARS;

    barDefs.forEach(bar => {
      try {
        // Remplacement basique des IDs par leurs valeurs
        let expr = bar.formula.toLowerCase();
        availableStats.forEach(s => {
          const regex = new RegExp(`\\b${s.id.toLowerCase()}\\b`, 'g');
          expr = expr.replace(regex, stats[s.id].toString());
        });
        
        // Évaluation sécurisée (limitée aux maths de base)
        // eslint-disable-next-line no-eval
        const val = eval(expr); 
        results[bar.id] = Math.floor(val);
        results[`max${bar.id.charAt(0).toUpperCase()}${bar.id.slice(1)}`] = Math.floor(val);
      } catch (e) {
        results[bar.id] = 0;
      }
    });
    return results;
  };

  const derivedBars = calculateBars();

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name,
      image_url: imageUrl,
      stats,
      bars: derivedBars
    });
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-2 sm:p-6 pointer-events-auto"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="relative w-full max-w-4xl bg-[#0D0D0F]/95 backdrop-blur-2xl border border-gold-DEFAULT/30 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Golden Corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold-DEFAULT/50 rounded-tl-[1.5rem] sm:rounded-tl-[2.5rem] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold-DEFAULT/50 rounded-br-[1.5rem] sm:rounded-br-[2.5rem] pointer-events-none" />
        
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-8 border-b border-gold-DEFAULT/10 gap-4 shrink-0">
          <div className="flex-1">
            <h2 className="text-lg sm:text-2xl font-cinzel font-black text-gold-bright tracking-[0.2em] uppercase drop-shadow-md">
              {title}
            </h2>
            <div className="flex items-center gap-4 mt-1">
              {settings?.sheetMode === 'manual' ? (
                <p className="text-[9px] sm:text-[10px] font-cinzel text-gold-DEFAULT/60 tracking-widest uppercase">
                  Points restants: <span className="text-gold-bright font-black">{pointsLeft}</span>
                </p>
              ) : (
                <p className="text-[9px] sm:text-[10px] font-cinzel text-gold-DEFAULT/60 tracking-widest uppercase">
                  Faveurs (Rerolls): <span className="text-gold-bright font-black">{rerollsLeft}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {!isEditing && settings?.sheetMode === 'roll' && (settings?.rerollAllAllowed || !stats[availableStats[0].id]) && (
              <button 
                onClick={handleRollAll}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-[8px] sm:text-[9px] font-cinzel font-black text-gold-bright hover:bg-gold-DEFAULT/20 transition-all tracking-widest uppercase flex items-center justify-center gap-2"
              >
                <Dices size={14} />
                {stats[availableStats[0].id] ? "Purifier la Fiche" : "Invoquer le Sort"}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gold-dim hover:text-gold-bright transition-colors">
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            {/* Colonne Gauche: Identité & Stats */}
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT tracking-widest uppercase ml-1">Nom du Personnage</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isEditing}
                    placeholder="Ex: Kaelen l'Errant"
                    className="w-full bg-white/5 border border-gold-DEFAULT/20 rounded-xl px-4 py-2 sm:py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-serif italic text-sm sm:text-base disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT tracking-widest uppercase ml-1">Image du Voyageur (URL)</label>
                  <input 
                    type="text" 
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-gold-DEFAULT/20 rounded-xl px-4 py-2 sm:py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-serif italic text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 tracking-[0.2em] uppercase border-b border-gold-DEFAULT/10 pb-2">Attributs Primordiaux</h3>
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {availableStats.map(stat => (
                    <div key={stat.id} className="flex items-center justify-between bg-white/[0.02] p-2 rounded-lg border border-white/5 hover:border-gold-DEFAULT/20 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-[11px] font-cinzel text-white/80 uppercase tracking-widest">{stat.name}</span>
                        <span className="text-[7px] sm:text-[8px] font-mono text-white/20 uppercase tracking-tighter">{stat.id}</span>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4">
                        {settings?.sheetMode === 'manual' ? (
                          <>
                            {!isEditing && <button onClick={() => handleStatChange(stat.id, stats[stat.id] - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-colors">-</button>}
                            <input
                              type="number"
                              value={stats[stat.id]}
                              onChange={(e) => handleStatChange(stat.id, parseInt(e.target.value) || 0)}
                              disabled={isEditing}
                              className="w-10 bg-transparent border-b border-gold-DEFAULT/30 text-center font-mono font-bold text-sm text-gold-bright focus:outline-none focus:border-gold-bright transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:border-none"
                            />
                            {!isEditing && <button onClick={() => handleStatChange(stat.id, stats[stat.id] + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-colors">+</button>}
                          </>
                        ) : (
                          <>
                            <span className="w-10 text-center font-cinzel font-black text-lg text-gold-bright drop-shadow-md">
                              {stats[stat.id] || '?'}
                            </span>
                            {!isEditing && (
                              <button 
                                onClick={() => handleRerollStat(stat.id)} 
                                disabled={rerollsLeft <= 0}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 disabled:opacity-20 transition-all border border-gold-DEFAULT/20"
                                title="Relancer cet attribut"
                              >
                                <Dices size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Colonne Droite: Prévisualisation des Vitalités */}
            <div className="space-y-6 sm:space-y-8">
               <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 tracking-[0.2em] uppercase border-b border-gold-DEFAULT/10 pb-2 text-center">Énergie Vitale Dérivée</h3>
               
               <div className="space-y-4 sm:space-y-6 bg-black/40 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-gold-DEFAULT/10 shadow-inner">
                  {(settings?.bars || DEFAULT_BARS).map(bar => (
                    <div key={bar.id} className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-cinzel uppercase tracking-widest" style={{ color: bar.color }}>
                        <span className="flex items-center gap-2"><Activity className="w-3 h-3" /> {bar.name}</span>
                        <span className="font-mono font-black">{derivedBars[bar.id]}</span>
                      </div>
                      <div className="h-1.5 sm:h-2 w-full bg-black/60 rounded-full border border-white/5 overflow-hidden">
                        <div className="h-full transition-all duration-500" style={{ width: '100%', backgroundColor: bar.color, boxShadow: `0 0 15px ${bar.color}66` }} />
                      </div>
                      <p className="text-[7px] sm:text-[8px] text-white/30 italic text-right">{bar.formula}</p>
                    </div>
                  ))}
               </div>

               <div className="p-4 bg-gold-DEFAULT/5 border border-dashed border-gold-DEFAULT/20 rounded-2xl hidden sm:block">
                 <p className="text-[10px] text-gold-DEFAULT/50 font-serif italic leading-relaxed text-center">
                    "Les fils du destin se tissent à travers vos choix. Chaque attribut définit l'écho de votre âme dans l'Archive."
                 </p>
               </div>
            </div>
          </div>
        </div>

        <footer className="p-4 sm:p-8 border-t border-gold-DEFAULT/10 flex justify-end shrink-0">
          <button 
            onClick={handleSave}
            disabled={!name.trim() || (settings?.sheetMode === 'manual' && pointsLeft < 0) || (settings?.sheetMode === 'roll' && Object.values(stats).some(v => v === 0))}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/40 text-gold-bright hover:bg-gold-DEFAULT/20 hover:border-gold-DEFAULT disabled:opacity-30 disabled:pointer-events-none transition-all shadow-[0_0_30px_rgba(212,175,55,0.1)] hover:shadow-[0_0_40px_rgba(212,175,55,0.3)] group"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-cinzel font-black uppercase tracking-[0.2em] pt-0.5">Sceau du Destin</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
