import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Shield, Zap, Heart, Activity, Dices } from 'lucide-react';
import { StatDefinition, SkillDefinition, BarDefinition, DEFAULT_STATS, DEFAULT_SKILLS, DEFAULT_BARS } from '../../systems/seal/constants';
import { useAuthStore, SecurityLevel } from '../../store/auth';

interface CreateCharacterModalProps {
  onClose: () => void;
  onSave: (characterData: {
    name: string;
    image_url?: string;
    stats: Record<string, number>;
    skills: Record<string, number>;
    bars: Record<string, number>;
    type?: 'Joueur' | 'PNJ' | 'Monstre' | 'Boss';
    is_template?: boolean;
    quantity?: number;
  }) => void;
  initialStats?: Record<string, number>;
  initialSkills?: Record<string, number>;
  initialName?: string;
  initialImageUrl?: string;
  initialType?: 'Joueur' | 'PNJ' | 'Monstre' | 'Boss';
  initialIsTemplate?: boolean;
  initialMode?: 'manual' | 'roll';
  title?: string;
  settings?: {
    stats?: StatDefinition[];
    skills?: SkillDefinition[];
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
  initialSkills,
  initialName = '',
  initialImageUrl = '',
  initialType,
  initialIsTemplate = false,
  initialMode,
  title = "Éveiller un Joueur",
  settings 
}: CreateCharacterModalProps) {
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const [name, setName] = useState(initialName);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [type, setType] = useState<'Joueur' | 'PNJ' | 'Monstre' | 'Boss'>(initialType || (isMJ ? 'PNJ' : 'Joueur'));
  const [isTemplate, setIsTemplate] = useState(initialIsTemplate);
  const [quantity, setQuantity] = useState(1);
  const isEditing = !!initialStats;
  
  // Utiliser les stats définies dans les paramètres ou les stats par défaut
  const availableStats = settings?.stats || DEFAULT_STATS;

  const [mode, setMode] = useState<'manual' | 'roll'>(initialMode || settings?.sheetMode || 'roll');

  const [stats, setStats] = useState<Record<string, number>>(() => {
    if (initialStats) return initialStats;
    const initial: Record<string, number> = {};
    const currentMode = initialMode || settings?.sheetMode || 'roll';
    
    // Si on est en mode tirage, on pré-génère les stats aléatoirement dès l'initialisation
    if (currentMode === 'roll' && !isEditing && settings?.rollFormula) {
      const { diceCount, diceSides } = settings.rollFormula;
      availableStats.forEach(s => {
        let roll = 0;
        for (let i = 0; i < diceCount; i++) {
          roll += Math.floor(Math.random() * diceSides) + 1;
        }
        initial[s.id] = roll;
      });
      return initial;
    }

    availableStats.forEach(s => {
      initial[s.id] = 0;
    });
    return initial;
  });

  const [pointsLeft, setPointsLeft] = useState(settings?.manualPoints || 0);
  const [rerollsLeft, setRerollsLeft] = useState(settings?.rollFormula?.rerolls || 0);
  // On considère qu'on a déjà fait le jet initial si on a pré-rempli dans le useState
  const [hasInitialRoll, setHasInitialRoll] = useState(() => {
    const currentMode = initialMode || settings?.sheetMode || 'roll';
    return currentMode === 'roll' && !isEditing;
  });

  // Auto-roll une fois si on est en mode roll et pas en édition
  useEffect(() => {
    if (mode === 'roll' && !isEditing && !hasInitialRoll) {
      handleRollAll();
      setHasInitialRoll(true);
    }
  }, [mode, isEditing, hasInitialRoll]);

  useEffect(() => {
    if (mode === 'manual') {
      const used = Object.values(stats).reduce((a, b) => a + b, 0);
      setPointsLeft((settings?.manualPoints || 0) - used);
    }
  }, [stats, mode, settings, availableStats]);

  const handleStatChange = (statId: string, val: number) => {
    const currentVal = stats[statId] || 0;
    const diff = val - currentVal;
    
    if (!isEditing && !isMJ && mode === 'manual' && diff > 0 && pointsLeft < diff) {
      // Si on essaie de mettre plus que ce qu'il reste, on met le max possible
      const maxPossible = currentVal + pointsLeft;
      setStats(prev => ({ ...prev, [statId]: maxPossible }));
      return;
    }
    
    setStats(prev => ({ ...prev, [statId]: Math.max(0, val) }));
  };

  const rollStat = (statId: string) => {
    if (!settings?.rollFormula) return;
    const { diceCount, diceSides } = settings.rollFormula;
    let roll = 0;
    for (let i = 0; i < diceCount; i++) {
      roll += Math.floor(Math.random() * diceSides) + 1;
    }
    setStats(prev => ({ ...prev, [statId]: roll }));
  };

  const handleRerollStat = (statId: string) => {
    if (!isMJ && (isEditing || (rerollsLeft <= 0 && mode === 'roll'))) return;
    rollStat(statId);
    if (!isMJ && mode === 'roll') {
      setRerollsLeft(prev => prev - 1);
    }
  };

  const handleRollAll = () => {
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
    if (!isMJ) setRerollsLeft(settings?.rollFormula?.rerolls || 0);
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
      skills: {}, // On vide les compétences car elles ne sont plus utilisées
      bars: derivedBars,
      type,
      is_template: isTemplate,
      quantity
    });
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-2 sm:p-6 pointer-events-auto"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="relative w-full max-w-5xl bg-[#0D0D0F]/95 backdrop-blur-2xl border border-gold-DEFAULT/30 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Golden Corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold-DEFAULT/50 rounded-tl-[1.5rem] sm:rounded-tl-[2.5rem] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold-DEFAULT/50 rounded-br-[1.5rem] sm:rounded-br-[2.5rem] pointer-events-none" />
        
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gold-DEFAULT/10 gap-4 shrink-0">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-cinzel font-black text-gold-bright tracking-[0.2em] uppercase drop-shadow-md">
              {title}
            </h2>
            <div className="mt-1">
              {!isMJ && (
                mode === 'manual' ? (
                  <p className="text-[9px] sm:text-[10px] font-cinzel text-gold-DEFAULT/60 tracking-widest uppercase">
                    Points restants: <span className="text-gold-bright font-black">{pointsLeft}</span>
                  </p>
                ) : (
                  <p className="text-[9px] sm:text-[10px] font-cinzel text-gold-DEFAULT/60 tracking-widest uppercase">
                    Faveurs (Rerolls): <span className="text-gold-bright font-black">{rerollsLeft}</span>
                  </p>
                )
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {(isMJ || (!isEditing && mode === 'roll' && (settings?.rerollAllAllowed || !stats[availableStats[0].id]))) && (
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

        {isMJ && (
          <div className="bg-black/20 border-b border-gold-DEFAULT/10 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-gold-DEFAULT/20 shadow-inner">
              <button 
                onClick={() => setMode('manual')}
                className={`px-4 py-1.5 text-[9px] font-cinzel font-black rounded-md transition-all uppercase tracking-widest ${mode === 'manual' ? 'bg-gold-DEFAULT text-black shadow-md' : 'text-gold-DEFAULT/40 hover:text-gold-DEFAULT'}`}
              >
                Manuel
              </button>
              <button 
                onClick={() => setMode('roll')}
                className={`px-4 py-1.5 text-[9px] font-cinzel font-black rounded-md transition-all uppercase tracking-widest ${mode === 'roll' ? 'bg-gold-DEFAULT text-black shadow-md' : 'text-gold-DEFAULT/40 hover:text-gold-DEFAULT'}`}
              >
                Tirage
              </button>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group bg-white/5 px-4 py-2 rounded-lg border border-gold-DEFAULT/20 hover:border-gold-DEFAULT/40 transition-all">
              <input 
                type="checkbox" 
                checked={isTemplate} 
                onChange={(e) => setIsTemplate(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-8 h-4 rounded-full border border-gold-DEFAULT/30 transition-all flex items-center p-0.5 ${isTemplate ? 'bg-purple-500/20 border-purple-500/50' : 'bg-black/40'}`}>
                <div className={`w-3 h-3 rounded-full transition-all ${isTemplate ? 'translate-x-3.5 bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'translate-x-0 bg-gold-DEFAULT/40'}`} />
              </div>
              <span className={`text-[10px] font-cinzel font-black uppercase tracking-widest ${isTemplate ? 'text-purple-400' : 'text-gold-DEFAULT/60'}`}>
                Modèle Neutre
              </span>
            </label>

            {!isTemplate && (
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-gold-DEFAULT/20 ml-auto">
                {(['Joueur', 'PNJ', 'Monstre', 'Boss'] as const).map(t => (
                  <button 
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-3 py-1.5 text-[9px] font-cinzel font-black rounded-md transition-all uppercase tracking-widest ${
                      type === t 
                        ? (t === 'Boss' ? 'bg-red-500 text-white shadow-md' : t === 'Monstre' ? 'bg-orange-500 text-white shadow-md' : 'bg-blue-500 text-white shadow-md') 
                        : 'text-gold-DEFAULT/40 hover:text-gold-DEFAULT'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Colonne Gauche: Identité & Stats */}
            <div className="space-y-6 flex flex-col">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT tracking-widest uppercase ml-1">Nom de l'Entité</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isEditing && !isMJ}
                      placeholder="Ex: Kaelen l'Errant"
                      className="flex-1 bg-white/5 border border-gold-DEFAULT/20 rounded-xl px-4 py-2 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-serif italic text-sm disabled:opacity-50 w-full"
                    />
                    {!isEditing && !isTemplate && isMJ && (
                      <input 
                        type="number"
                        min="1"
                        max="20"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 shrink-0 bg-white/5 border border-gold-DEFAULT/20 rounded-xl px-2 py-2 text-center text-white focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        title="Nombre d'entités à créer"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT tracking-widest uppercase ml-1">Image de l'Entité (URL)</label>
                  <input 
                    type="text" 
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-gold-DEFAULT/20 rounded-xl px-4 py-2 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-serif italic text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 tracking-[0.2em] uppercase border-b border-gold-DEFAULT/10 pb-2">Attributs Primordiaux</h3>
                <div className="grid grid-cols-1 gap-2">
                  {availableStats.map(stat => (
                    <div key={stat.id} className="flex items-center justify-between bg-white/[0.02] p-2 rounded-lg border border-white/5 hover:border-gold-DEFAULT/20 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-cinzel text-white/80 uppercase tracking-widest">{stat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {mode === 'manual' ? (
                          <>
                            {(isMJ || !isEditing) && <button onClick={() => handleStatChange(stat.id, stats[stat.id] - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-colors">-</button>}
                            <input
                              type="number"
                              value={stats[stat.id]}
                              onChange={(e) => handleStatChange(stat.id, parseInt(e.target.value) || 0)}
                              className="w-8 bg-transparent border-b border-gold-DEFAULT/30 text-center font-mono font-bold text-sm text-gold-bright focus:outline-none focus:border-gold-bright transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:border-none"
                            />
                            {(isMJ || !isEditing) && <button onClick={() => handleStatChange(stat.id, stats[stat.id] + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-colors">+</button>}
                          </>
                        ) : (
                          <>
                            {isEditing && !isMJ ? (
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleStatChange(stat.id, stats[stat.id] - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-colors">-</button>
                                <span className="w-8 text-center font-cinzel font-black text-lg text-gold-bright drop-shadow-md">{stats[stat.id]}</span>
                                <button onClick={() => handleStatChange(stat.id, stats[stat.id] + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-colors">+</button>
                              </div>
                            ) : (
                              <>
                                <span className="w-8 text-center font-cinzel font-black text-lg text-gold-bright drop-shadow-md">
                                  {stats[stat.id] || '?'}
                                </span>
                                <button 
                                  onClick={() => handleRerollStat(stat.id)} 
                                  disabled={!isMJ && rerollsLeft <= 0}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 disabled:opacity-20 transition-all border border-gold-DEFAULT/20"
                                  title="Relancer cet attribut"
                                >
                                  <Dices size={14} />
                                </button>
                              </>
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
            <div className="space-y-6">
               <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 tracking-[0.2em] uppercase border-b border-gold-DEFAULT/10 pb-2 text-center">Énergie Vitale Dérivée</h3>
               
               <div className="space-y-4 bg-black/40 p-6 rounded-[2rem] border border-gold-DEFAULT/10 shadow-inner">
                  {(settings?.bars || DEFAULT_BARS).map(bar => (
                    <div key={bar.id} className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-cinzel uppercase tracking-widest min-w-0" style={{ color: bar.color }}>
                        <span className="flex items-center gap-2 truncate pr-2"><Activity className="w-3 h-3 shrink-0" /> <span className="truncate" title={bar.name}>{bar.name}</span></span>
                        <span className="font-mono font-black shrink-0" title={`${derivedBars[bar.id]}`}>{derivedBars[bar.id]}</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/60 rounded-full border border-white/5 overflow-hidden">
                        <div className="h-full transition-all duration-500" style={{ width: '100%', backgroundColor: bar.color, boxShadow: `0 0 15px ${bar.color}66` }} />
                      </div>
                      <p className="text-[7px] text-white/30 italic text-right truncate" title={bar.formula}>{bar.formula}</p>
                    </div>
                  ))}
               </div>

               <div className="p-4 bg-gold-DEFAULT/5 border border-dashed border-gold-DEFAULT/20 rounded-2xl hidden sm:block">
                 <p className="text-[10px] text-gold-DEFAULT/50 font-serif italic leading-relaxed text-center">
                    "Chaque rune que vous maîtrisez résonne avec votre essence. Définissez votre chemin à travers l'Archive."
                 </p>
               </div>
            </div>
          </div>
        </div>

        <footer className="p-4 sm:p-6 border-t border-gold-DEFAULT/10 flex justify-end shrink-0">
          <button 
            onClick={handleSave}
            disabled={!name.trim() || (settings?.sheetMode === 'manual' && pointsLeft < 0) || (settings?.sheetMode === 'roll' && Object.values(stats).some(v => v === 0))}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-3 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/40 text-gold-bright hover:bg-gold-DEFAULT/20 hover:border-gold-DEFAULT disabled:opacity-30 disabled:pointer-events-none transition-all shadow-[0_0_30px_rgba(212,175,55,0.1)] hover:shadow-[0_0_40px_rgba(212,175,55,0.3)] group"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-cinzel font-black uppercase tracking-[0.2em] pt-0.5">Graver dans le Destin</span>
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}