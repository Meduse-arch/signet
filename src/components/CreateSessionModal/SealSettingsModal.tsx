import { useState } from 'react';
import { X, Settings2, Save, ScrollText, Dices, UserCog } from 'lucide-react';

interface SealSettings {
  sheetMode?: 'manual' | 'roll';
  manualPoints?: number;
  rollFormula?: {
    diceCount: number;
    diceSides: number;
    rerolls: number;
  };
}

interface SealSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SealSettings;
  onSave: (settings: SealSettings) => void;
}

export function SealSettingsModal({ isOpen, onClose, settings, onSave }: SealSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<SealSettings>({
    sheetMode: settings.sheetMode || 'roll',
    manualPoints: settings.manualPoints ?? 60,
    rollFormula: settings.rollFormula || { diceCount: 4, diceSides: 5, rerolls: 6 },
  });

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-xl p-4">
      <div className="bg-[#111115] border border-gold-DEFAULT/30 rounded-[2rem] p-8 w-full max-w-md shadow-[0_0_60px_rgba(212,175,55,0.1)] relative overflow-hidden">
        <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-gold-bright" />
              <h2 className="text-lg font-black text-gold-bright tracking-[0.2em] uppercase text-glow-gold">
                Paramètres Seal
              </h2>
            </div>
            <button onClick={onClose} className="text-gold-DEFAULT drop-shadow-md hover:text-gold-bright transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-8 mb-10">
            {/* Mode de Fiche */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ScrollText className="w-4 h-4 text-gold-muted" />
                <h3 className="text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase">Configuration des Fiches</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLocalSettings({ ...localSettings, sheetMode: 'manual' })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    localSettings.sheetMode === 'manual'
                      ? 'bg-gold-DEFAULT/10 border-gold-DEFAULT text-gold-bright shadow-rune-gold'
                      : 'bg-[#0D0D0F]/80 border-gold-DEFAULT/30 text-gold-DEFAULT drop-shadow-md hover:border-gold-DEFAULT/30'
                  }`}
                >
                  <UserCog className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-cinzel font-black tracking-widest uppercase">Manuel</span>
                </button>
                <button
                  onClick={() => setLocalSettings({ ...localSettings, sheetMode: 'roll' })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    localSettings.sheetMode === 'roll'
                      ? 'bg-gold-DEFAULT/10 border-gold-DEFAULT text-gold-bright shadow-rune-gold'
                      : 'bg-[#0D0D0F]/80 border-gold-DEFAULT/30 text-gold-DEFAULT drop-shadow-md hover:border-gold-DEFAULT/30'
                  }`}
                >
                  <Dices className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-cinzel font-black tracking-widest uppercase">Tirage (Roll)</span>
                </button>
              </div>
            </div>

            {/* Paramètres selon le mode */}
            <div className="p-6 bg-[#0D0D0F]/80 border border-gold-DEFAULT/30 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
              {localSettings.sheetMode === 'manual' ? (
                <div className="space-y-4">
                  <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase text-center mb-2">Points de Caractéristiques</label>
                  <div className="flex justify-center">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={localSettings.manualPoints}
                      onChange={(e) => setLocalSettings({ ...localSettings, manualPoints: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-[#0D0D0F]/80 border border-gold-DEFAULT/40 rounded-lg py-3 text-center text-gold-bright font-cinzel font-black text-lg focus:outline-none focus:border-gold-DEFAULT transition-all"
                    />
                  </div>
                  <p className="text-[9px] font-serif italic text-gold-DEFAULT drop-shadow-md/60 text-center">Les joueurs devront répartir ces points entre leurs attributs.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase text-center">Formule de Tirage</label>
                  
                  <div className="flex items-center justify-center gap-4 text-gold-bright font-cinzel font-black">
                    <div className="flex flex-col items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={localSettings.rollFormula?.diceCount}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          rollFormula: { ...localSettings.rollFormula!, diceCount: parseInt(e.target.value) || 1 }
                        })}
                        className="w-12 bg-[#0D0D0F]/80 border border-gold-DEFAULT/40 rounded-lg py-2 text-center text-xs focus:outline-none focus:border-gold-DEFAULT"
                      />
                      <span className="text-[8px] text-gold-DEFAULT drop-shadow-md uppercase tracking-tighter">Dés</span>
                    </div>
                    
                    <span className="text-xl">D</span>
                    
                    <div className="flex flex-col items-center gap-2">
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={localSettings.rollFormula?.diceSides}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          rollFormula: { ...localSettings.rollFormula!, diceSides: parseInt(e.target.value) || 2 }
                        })}
                        className="w-12 bg-[#0D0D0F]/80 border border-gold-DEFAULT/40 rounded-lg py-2 text-center text-xs focus:outline-none focus:border-gold-DEFAULT"
                      />
                      <span className="text-[8px] text-gold-DEFAULT drop-shadow-md uppercase tracking-tighter">Faces</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase text-center">Nombre de Relances (Reroll)</label>
                    <div className="flex justify-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={localSettings.rollFormula?.rerolls}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          rollFormula: { ...localSettings.rollFormula!, rerolls: parseInt(e.target.value) || 0 }
                        })}
                        className="w-16 bg-[#0D0D0F]/80 border border-gold-DEFAULT/40 rounded-lg py-2 text-center text-gold-bright font-cinzel font-black text-sm focus:outline-none focus:border-gold-DEFAULT transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => { onSave(localSettings); onClose(); }}
            className="w-full py-4 flex items-center justify-center gap-3 bg-gold-DEFAULT/10 hover:bg-gold-DEFAULT/20 text-gold-bright rounded-2xl border border-gold-DEFAULT/30 transition-all group"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-cinzel font-black tracking-[0.2em] uppercase">Sauvegarder les Runes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
