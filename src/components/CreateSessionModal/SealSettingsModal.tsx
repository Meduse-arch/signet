import { useState } from 'react';
import { StatDefinition, BarDefinition, DEFAULT_SEAL_SETTINGS } from '../../systems/seal/constants';
import { Icons } from '../ui/Icons';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

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
  rerollAllAllowed?: boolean;
}

interface SealSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SealSettings;
  onSave: (settings: SealSettings) => void;
}

export function SealSettingsModal({ isOpen, onClose, settings, onSave }: SealSettingsModalProps) {
  const { t } = useTranslation();
  const [localSettings, setLocalSettings] = useState<SealSettings>({
    sheetMode: settings.sheetMode || DEFAULT_SEAL_SETTINGS.sheetMode,
    manualPoints: settings.manualPoints ?? DEFAULT_SEAL_SETTINGS.manualPoints,
    rollFormula: settings.rollFormula || DEFAULT_SEAL_SETTINGS.rollFormula,
    stats: settings.stats || DEFAULT_SEAL_SETTINGS.stats,
    bars: settings.bars || DEFAULT_SEAL_SETTINGS.bars,
    rerollAllAllowed: settings.rerollAllAllowed ?? DEFAULT_SEAL_SETTINGS.rerollAllAllowed,
  });

  const [activeTab, setActiveTab] = useState<'creation' | 'stats' | 'bars'>('creation');

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

  const handleAddBar = () => {
    const id = Math.random().toString(36).substring(2, 9);
    const newBar: BarDefinition = { id, name: 'Nouvelle Ressource', color: '#ffffff', formula: '10' };
    setLocalSettings({ ...localSettings, bars: [...(localSettings.bars || []), newBar] });
  };

  const handleRemoveBar = (id: string) => {
    setLocalSettings({ ...localSettings, bars: localSettings.bars?.filter(b => b.id !== id) });
  };

  const footer = (
    <>
      <Button variant="secondary" fullWidth onClick={onClose}>
        {t('session.cancel')}
      </Button>
      <Button
        variant="primary"
        fullWidth
        leftIcon={<Icons.Save className="w-4 h-4" />}
        onClick={() => { onSave(localSettings); onClose(); }}
      >
        {t('common.save', 'Enregistrer')}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paramètres Seal"
      footer={footer}
      maxWidth="2xl"
    >
      <div className="-mx-6 border-b border-gold-DEFAULT/10 mb-4 px-6 flex overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('creation')}
          className={`px-4 py-3 text-[11px] font-cinzel font-black tracking-widest uppercase transition-all border-b-2 whitespace-nowrap ${activeTab === 'creation' ? 'border-gold-DEFAULT text-gold-bright' : 'border-transparent text-gold-muted hover:text-gold-DEFAULT'}`}
        >
          Création
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-3 text-[11px] font-cinzel font-black tracking-widest uppercase transition-all border-b-2 whitespace-nowrap ${activeTab === 'stats' ? 'border-gold-DEFAULT text-gold-bright' : 'border-transparent text-gold-muted hover:text-gold-DEFAULT'}`}
        >
          Attributs
        </button>
        <button 
          onClick={() => setActiveTab('bars')}
          className={`px-4 py-3 text-[11px] font-cinzel font-black tracking-widest uppercase transition-all border-b-2 whitespace-nowrap ${activeTab === 'bars' ? 'border-gold-DEFAULT text-gold-bright' : 'border-transparent text-gold-muted hover:text-gold-DEFAULT'}`}
        >
          Ressources
        </button>
      </div>

      <div className="py-2">
        {activeTab === 'creation' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 mb-2">
                <Icons.ScrollText className="w-4 h-4 text-gold-muted" />
                <h3 className="text-xs font-cinzel font-black text-gold-muted tracking-widest uppercase">Méthode de Genèse</h3>
              </div>

              <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-gold-DEFAULT/20 w-fit">
                <button
                  onClick={() => setLocalSettings({ ...localSettings, sheetMode: 'manual' })}
                  className={`px-6 py-2 rounded-lg text-[11px] font-cinzel font-black tracking-widest uppercase transition-all ${
                    localSettings.sheetMode === 'manual'
                      ? 'bg-gold-DEFAULT text-black shadow-rune-gold'
                      : 'text-gold-muted hover:text-gold-DEFAULT'
                  }`}
                >
                  Manuel
                </button>
                <button
                  onClick={() => setLocalSettings({ ...localSettings, sheetMode: 'roll' })}
                  className={`px-6 py-2 rounded-lg text-[11px] font-cinzel font-black tracking-widest uppercase transition-all ${
                    localSettings.sheetMode === 'roll'
                      ? 'bg-gold-DEFAULT text-black shadow-rune-gold'
                      : 'text-gold-muted hover:text-gold-DEFAULT'
                  }`}
                >
                  Tirage
                </button>
              </div>
              
              <div className="p-8 bg-[#0D0D0F]/80 border border-gold-DEFAULT/30 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gold-DEFAULT/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                {localSettings.sheetMode === 'manual' ? (
                  <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
                    <div className="flex flex-col items-center gap-4">
                      <Icons.UserCog className="w-8 h-8 text-gold-bright opacity-50" />
                      <div className="text-center">
                        <label className="block text-xs font-cinzel font-black text-gold-muted tracking-widest uppercase mb-4">Réserve de Points de Destin</label>
                        <div className="flex items-center justify-center gap-6">
                          <button 
                            onClick={() => setLocalSettings({ ...localSettings, manualPoints: Math.max(0, (localSettings.manualPoints || 0) - 5) })}
                            className="w-10 h-10 rounded-full border border-gold-DEFAULT/30 flex items-center justify-center text-gold-DEFAULT hover:bg-gold-DEFAULT/10 transition-all"
                          >
                            -5
                          </button>
                          <Input
                            type="number"
                            value={localSettings.manualPoints}
                            onChange={(e) => setLocalSettings({ ...localSettings, manualPoints: parseInt(e.target.value) || 0 })}
                            className="text-center font-cinzel font-black text-2xl !px-1"
                            wrapperClassName="w-24"
                          />
                          <button 
                            onClick={() => setLocalSettings({ ...localSettings, manualPoints: (localSettings.manualPoints || 0) + 5 })}
                            className="w-10 h-10 rounded-full border border-gold-DEFAULT/30 flex items-center justify-center text-gold-DEFAULT hover:bg-gold-DEFAULT/10 transition-all"
                          >
                            +5
                          </button>
                        </div>
                        <p className="mt-4 text-[11px] text-gold-muted/50 font-serif italic leading-relaxed">
                          Les points que les joueurs pourront répartir librement entre leurs attributs.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex flex-col items-center gap-4">
                      <Icons.Dices className="w-8 h-8 text-gold-bright opacity-50" />
                      <div className="text-center w-full">
                        <label className="block text-xs font-cinzel font-black text-gold-muted tracking-widest uppercase mb-6 text-center">Formule de Manifestation</label>
                        
                        <div className="flex items-center justify-center gap-6 text-gold-bright font-cinzel font-black">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-xs text-gold-muted uppercase tracking-tighter">Nombre</span>
                            <Input
                              type="number"
                              value={localSettings.rollFormula?.diceCount}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                rollFormula: { ...localSettings.rollFormula!, diceCount: parseInt(e.target.value) || 1 }
                              })}
                              className="text-center text-xl font-cinzel !px-1"
                              wrapperClassName="w-16"
                            />
                          </div>
                          <span className="text-4xl mt-4 opacity-30">D</span>
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-xs text-gold-muted uppercase tracking-tighter">Faces</span>
                            <Input
                              type="number"
                              value={localSettings.rollFormula?.diceSides}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                rollFormula: { ...localSettings.rollFormula!, diceSides: parseInt(e.target.value) || 2 }
                              })}
                              className="text-center text-xl font-cinzel !px-1"
                              wrapperClassName="w-16"
                            />
                          </div>
                          <div className="w-px h-8 bg-gold-DEFAULT/20 mx-2 self-end mb-4" />
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-xs text-gold-muted uppercase tracking-tighter">Relances</span>
                            <Input
                              type="number"
                              value={localSettings.rollFormula?.rerolls}
                              onChange={(e) => setLocalSettings({
                                ...localSettings,
                                rollFormula: { ...localSettings.rollFormula!, rerolls: parseInt(e.target.value) || 0 }
                              })}
                              className="text-center text-xl font-cinzel !px-1"
                              wrapperClassName="w-16"
                            />
                          </div>
                        </div>

                        <p className="mt-8 text-[11px] text-gold-muted/50 font-serif italic leading-relaxed max-w-sm mx-auto">
                          Définit le jet de dés automatique lors de la création d'un voyageur.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gold-DEFAULT/10 flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-xs font-cinzel font-black text-gold-bright tracking-widest uppercase">Rite de Purification</h4>
                        <p className="text-xs text-gold-muted font-serif italic">Permettre de relancer toute la fiche d'un coup.</p>
                      </div>
                      <button
                        onClick={() => setLocalSettings({ ...localSettings, rerollAllAllowed: !localSettings.rerollAllAllowed })}
                        className={`w-12 h-6 rounded-full transition-all relative border ${
                          localSettings.rerollAllAllowed 
                            ? 'bg-gold-DEFAULT/20 border-gold-DEFAULT' 
                            : 'bg-black/40 border-gold-DEFAULT/20'
                        }`}
                      >
                        <div className={`absolute top-1 w-3.5 h-3.5 rounded-full transition-all ${
                          localSettings.rerollAllAllowed 
                            ? 'right-1 bg-gold-bright shadow-rune-gold' 
                            : 'left-1 bg-gold-muted'
                        }`} />
                      </button>
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
              <h3 className="text-xs font-cinzel font-black text-gold-muted tracking-widest uppercase">Attributs Personnalisés</h3>
              <Button 
                size="sm"
                variant="ghost"
                leftIcon={<Icons.Plus size={14} />}
                onClick={handleAddStat}
              >
                AJOUTER
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {localSettings.stats?.map((stat) => (
                <div key={stat.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group">
                  <Input 
                    value={stat.name}
                    onChange={(e) => handleUpdateStat(stat.id, e.target.value)}
                    wrapperClassName="flex-1"
                  />
                  <span className="text-[11px] font-mono text-white/60 uppercase px-2">{stat.id}</span>
                  <button 
                    onClick={() => handleRemoveStat(stat.id)}
                    className="text-white/60 hover:text-red-400 transition-colors p-2"
                  >
                    <Icons.Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bars' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-cinzel font-black text-gold-muted tracking-widest uppercase">Formules de Calcul (Runes)</h3>
              <Button 
                size="sm"
                variant="ghost"
                leftIcon={<Icons.Plus size={14} />}
                onClick={handleAddBar}
              >
                AJOUTER
              </Button>
            </div>
            
            {localSettings.bars?.map((bar) => (
              <div key={bar.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4 relative group">
                <button 
                  onClick={() => handleRemoveBar(bar.id)}
                  className="absolute top-4 right-4 text-white/60 hover:text-red-400 transition-colors opacity-30 group-hover:opacity-100"
                >
                  <Icons.Trash2 size={14} />
                </button>
                <div className="flex items-center justify-between pr-8">
                  <div className="flex items-center gap-3 w-1/2">
                    <Icons.Activity className="w-5 h-5" style={{ color: bar.color }} />
                    <Input 
                      value={bar.name}
                      onChange={(e) => handleUpdateBar(bar.id, 'name', e.target.value)}
                      wrapperClassName="w-full"
                    />
                  </div>
                  <input 
                    type="color" 
                    value={bar.color} 
                    onChange={(e) => handleUpdateBar(bar.id, 'color', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                  />
                </div>
                
                <div className="space-y-1">
                  <Input 
                    label="Équation de calcul"
                    value={bar.formula}
                    onChange={(e) => handleUpdateBar(bar.id, 'formula', e.target.value)}
                    mono
                  />
                </div>
              </div>
            ))}

            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <p className="text-[11px] text-blue-300/70 font-serif italic leading-relaxed">
                Utilisez les IDs des attributs (ex: force, intelligence) pour créer vos formules.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
