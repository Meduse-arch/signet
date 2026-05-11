import { useState, useEffect } from 'react';
import { X, Save, Shield, Zap, Heart, Activity } from 'lucide-react';

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

interface CreateCharacterModalProps {
  onClose: () => void;
  onSave: (characterData: {
    name: string;
    stats: Record<string, number>;
    bars: Record<string, number>;
  }) => void;
  initialStats?: Record<string, number>;
  title?: string;
  settings?: {
    stats?: StatDefinition[];
    bars?: BarDefinition[];
    sheetMode?: 'manual' | 'roll';
    manualPoints?: number;
    rollFormula?: { diceCount: number; diceSides: number };
  };
}

export function CreateCharacterModal({ 
  onClose, 
  onSave, 
  initialStats, 
  title = "Éveiller un Voyageur",
  settings 
}: CreateCharacterModalProps) {
  const [name, setName] = useState('');
  
  // Utiliser les stats définies dans les paramètres ou les stats par défaut
  const availableStats = settings?.stats || [
    { id: 'force', name: 'Force' },
    { id: 'dexterity', name: 'Dextérité' },
    { id: 'constitution', name: 'Constitution' },
    { id: 'intelligence', name: 'Intelligence' },
    { id: 'wisdom', name: 'Sagesse' },
    { id: 'charisma', name: 'Charisme' },
    { id: 'perception', name: 'Perception' },
  ];

  const [stats, setStats] = useState<Record<string, number>>(() => {
    if (initialStats) return initialStats;
    const initial: Record<string, number> = {};
    availableStats.forEach(s => {
      initial[s.id] = 10;
    });
    return initial;
  });

  const [pointsLeft, setPointsLeft] = useState(settings?.manualPoints || 0);

  useEffect(() => {
    if (settings?.sheetMode === 'manual') {
      const used = Object.values(stats).reduce((a, b) => a + b, 0);
      const base = availableStats.length * 10;
      setPointsLeft((settings.manualPoints || 0) - (used - base));
    }
  }, [stats, settings, availableStats]);

  const handleStatChange = (statId: string, val: number) => {
    const currentVal = stats[statId] || 0;
    const diff = val - currentVal;
    
    if (settings?.sheetMode === 'manual' && diff > 0 && pointsLeft <= 0) return;
    
    setStats(prev => ({ ...prev, [statId]: Math.max(0, val) }));
  };

  const handleRollAll = () => {
    if (!settings?.rollFormula) return;
    const { diceCount, diceSides } = settings.rollFormula;
    const newStats = { ...stats };
    availableStats.forEach(s => {
      let roll = 0;
      for (let i = 0; i < diceCount; i++) {
        roll += Math.floor(Math.random() * diceSides) + 1;
      }
      newStats[s.id] = roll;
    });
    setStats(newStats);
  };

  // Calcul dynamique des barres basé sur les formules
  const calculateBars = () => {
    const results: Record<string, number> = {};
    const barDefs = settings?.bars || [
      { id: 'hp', name: 'Vitalité', color: '#ef4444', formula: 'constitution * 4' },
      { id: 'mana', name: 'Ether', color: '#3b82f6', formula: '(intelligence + wisdom) / 2 * 10' },
      { id: 'stam', name: 'Endurance', color: '#22c55e', formula: '(force + dexterity + constitution) / 3 * 10' },
    ];

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
      stats,
      bars: derivedBars
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 p-6">
      <div className="relative w-full max-w-4xl bg-[#0D0D0F]/90 backdrop-blur-2xl border border-gold-DEFAULT/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Golden Corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold-DEFAULT/50 rounded-tl-[2.5rem] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold-DEFAULT/50 rounded-br-[2.5rem] pointer-events-none" />
        
        <header className="flex items-center justify-between p-8 border-b border-gold-DEFAULT/10">
          <div>
            <h2 className="text-2xl font-cinzel font-black text-gold-bright tracking-[0.2em] uppercase drop-shadow-md">
              {title}
            </h2>
            {settings?.sheetMode === 'manual' && (
              <p className="text-[10px] font-cinzel text-gold-DEFAULT/60 tracking-widest uppercase mt-1">
                Points restants: <span className="text-gold-bright font-black">{pointsLeft}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {settings?.sheetMode === 'roll' && (
              <button 
                onClick={handleRollAll}
                className="px-4 py-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-[9px] font-cinzel font-black text-gold-bright hover:bg-gold-DEFAULT/20 transition-all tracking-widest uppercase"
              >
                Invoquer le Sort (Roll)
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gold-dim hover:text-gold-bright transition-colors">
              <X size={24} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Colonne Gauche: Identité & Stats */}
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT tracking-widest uppercase ml-1">Nom du Personnage</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Kaelen l'Errant"
                  className="w-full bg-white/5 border border-gold-DEFAULT/20 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-serif italic"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 tracking-[0.2em] uppercase border-b border-gold-DEFAULT/10 pb-2">Attributs Primordiaux</h3>
                <div className="grid grid-cols-1 gap-3">
                  {availableStats.map(stat => (
                    <div key={stat.id} className="flex items-center justify-between bg-white/[0.02] p-2 rounded-lg border border-white/5 hover:border-gold-DEFAULT/20 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-cinzel text-white/80 uppercase tracking-widest">{stat.name}</span>
                        <span className="text-[8px] font-mono text-white/20 uppercase tracking-tighter">{stat.id}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={() => handleStatChange(stat.id, stats[stat.id] - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-colors">-</button>
                        <span className="w-6 text-center font-mono font-bold text-gold-bright">{stats[stat.id]}</span>
                        <button onClick={() => handleStatChange(stat.id, stats[stat.id] + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-colors">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Colonne Droite: Prévisualisation des Vitalités */}
            <div className="space-y-8">
               <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 tracking-[0.2em] uppercase border-b border-gold-DEFAULT/10 pb-2 text-center">Énergie Vitale Dérivée</h3>
               
               <div className="space-y-6 bg-black/40 p-6 rounded-[2rem] border border-gold-DEFAULT/10 shadow-inner">
                  {(settings?.bars || [
                    { id: 'hp', name: 'Vitalité', color: '#ef4444', formula: 'constitution * 4' },
                    { id: 'mana', name: 'Ether', color: '#3b82f6', formula: '(intelligence + wisdom) / 2 * 10' },
                    { id: 'stam', name: 'Endurance', color: '#22c55e', formula: '(force + dexterity + constitution) / 3 * 10' },
                  ]).map(bar => (
                    <div key={bar.id} className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-cinzel uppercase tracking-widest" style={{ color: bar.color }}>
                        <span className="flex items-center gap-2"><Activity className="w-3 h-3" /> {bar.name}</span>
                        <span className="font-mono font-black">{derivedBars[bar.id]}</span>
                      </div>
                      <div className="h-2 w-full bg-black/60 rounded-full border border-white/5 overflow-hidden">
                        <div className="h-full transition-all duration-500" style={{ width: '100%', backgroundColor: bar.color, boxShadow: `0 0 15px ${bar.color}66` }} />
                      </div>
                      <p className="text-[8px] text-white/30 italic text-right">{bar.formula}</p>
                    </div>
                  ))}
               </div>

               <div className="p-4 bg-gold-DEFAULT/5 border border-dashed border-gold-DEFAULT/20 rounded-2xl">
                 <p className="text-[10px] text-gold-DEFAULT/50 font-serif italic leading-relaxed text-center">
                    "Les fils du destin se tissent à travers vos choix. Chaque attribut définit l'écho de votre âme dans l'Archive."
                 </p>
               </div>
            </div>
          </div>
        </div>

        <footer className="p-8 border-t border-gold-DEFAULT/10 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={!name.trim() || (settings?.sheetMode === 'manual' && pointsLeft < 0)}
            className="flex items-center gap-3 px-10 py-3 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/40 text-gold-bright hover:bg-gold-DEFAULT/20 hover:border-gold-DEFAULT disabled:opacity-30 disabled:pointer-events-none transition-all shadow-[0_0_30px_rgba(212,175,55,0.1)] hover:shadow-[0_0_40px_rgba(212,175,55,0.3)] group"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-cinzel font-black uppercase tracking-[0.2em] pt-0.5">Sceau du Destin</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
