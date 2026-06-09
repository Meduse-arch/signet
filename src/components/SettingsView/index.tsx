import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../ui/Icons';
import { useAuthStore } from '../../store/auth';
import { useSettingsStore, Keybindings } from '../../store/settings';

export const languages = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'pl', label: 'Polski' },
  { code: 'sv', label: 'Svenska' }
];

interface SettingOption<T> {
  id: T;
  label: string;
}

interface SettingRowProps<T> {
  label: string;
  description: string;
  options: SettingOption<T>[];
  currentValue: T;
  onChange: (val: T) => void;
}

function SettingRow<T extends string | boolean>({ label, description, options, currentValue, onChange }: SettingRowProps<T>) {
  const currentIndex = options.findIndex(o => o.id === currentValue);
  
  const handlePrev = () => {
    if (currentIndex > 0) onChange(options[currentIndex - 1].id);
  };
  
  const handleNext = () => {
    if (currentIndex < options.length - 1) onChange(options[currentIndex + 1].id);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-silver-DEFAULT/20 transition-all gap-4">
      <div className="flex-1">
        <h3 className="font-quantico font-bold tracking-widest text-white uppercase">{label}</h3>
        <p className="text-silver-bright/60 text-sm mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-4 bg-black/40 rounded-xl p-1 border border-white/5 shrink-0">
        <button onClick={handlePrev} disabled={currentIndex <= 0} className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
          <Icons.ChevronLeft className="w-5 h-5 text-silver-bright" />
        </button>
        <span className="font-quantico w-32 text-center uppercase tracking-widest text-glacier-bright font-bold text-sm truncate">
          {options[currentIndex]?.label || String(currentValue)}
        </span>
        <button onClick={handleNext} disabled={currentIndex >= options.length - 1} className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
          <Icons.ChevronRight className="w-5 h-5 text-silver-bright" />
        </button>
      </div>
    </div>
  );
}

type SettingsCategory = 'general' | 'graphics' | 'controls' | 'account';

export function SettingsView() {
  const { t, i18n } = useTranslation();
  const { logout, user } = useAuthStore();
  const { keybindings, setKeybinding, visualQuality, setVisualQuality, shadersIntensity, setShadersIntensity, runeTrailEnabled, setRuneTrailEnabled } = useSettingsStore();
  
  let currentPreset = 'custom';
  if (visualQuality === 'low' && shadersIntensity === 'off') currentPreset = 'low';
  else if (visualQuality === 'medium' && shadersIntensity === 'off') currentPreset = 'medium';
  else if (visualQuality === 'medium' && shadersIntensity === 'soft') currentPreset = 'epic';
  else if (visualQuality === 'high' && shadersIntensity === 'soft') currentPreset = 'high';
  else if (visualQuality === 'high' && shadersIntensity === 'normal') currentPreset = 'fabulous';

  const handlePresetChange = (presetId: string) => {
    if (presetId === 'custom') return;
    if (presetId === 'low') { setVisualQuality('low'); setShadersIntensity('off'); }
    if (presetId === 'medium') { setVisualQuality('medium'); setShadersIntensity('off'); }
    if (presetId === 'epic') { setVisualQuality('medium'); setShadersIntensity('soft'); }
    if (presetId === 'high') { setVisualQuality('high'); setShadersIntensity('soft'); }
    if (presetId === 'fabulous') { setVisualQuality('high'); setShadersIntensity('normal'); }
  };
  
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [listeningSlot, setListeningSlot] = useState<{ action: keyof Keybindings, index: 0 | 1 } | null>(null);

  const categories = [
    { id: 'general', icon: Icons.Globe, label: t('settings.general', 'Général') },
    { id: 'graphics', icon: Icons.Layers, label: t('settings.graphics', 'Graphiques') },
    { id: 'controls', icon: Icons.Settings, label: t('settings.controls', 'Contrôles') },
    { id: 'account', icon: Icons.User, label: t('settings.account', 'Compte') }
  ];

  const handleLogout = () => {
    logout();
  };

  // Gestion de l'écoute des touches pour réassigner
  useEffect(() => {
    if (!listeningSlot) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const key = e.key.toLowerCase();
      // On ignore certaines touches systèmes
      if (['escape', 'tab', 'capslock', 'shift', 'control', 'alt', 'meta', 'contextmenu'].includes(key)) {
        if (key === 'escape') {
          // Annuler l'écoute
          setListeningSlot(null);
        }
        return;
      }
      
      setKeybinding(listeningSlot.action, listeningSlot.index, key);
      setListeningSlot(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [listeningSlot, setKeybinding]);

  const renderKeySlot = (action: keyof Keybindings, index: 0 | 1) => {
    const isListening = listeningSlot?.action === action && listeningSlot?.index === index;
    const currentKey = keybindings[action][index];

    return (
      <div className="relative group/slot flex items-center">
        <button
          onClick={() => setListeningSlot({ action, index })}
          className={`px-4 py-1.5 min-w-[3rem] h-8 flex items-center justify-center text-xs font-mono font-bold border rounded-lg shadow-inner transition-all ${
            isListening 
              ? 'bg-glacier-DEFAULT/20 border-glacier-bright text-glacier-bright animate-pulse shadow-[0_0_10px_rgba(79,164,184,0.5)]' 
              : currentKey 
                ? 'bg-black border-silver-DEFAULT/30 text-glacier-bright hover:border-glacier-DEFAULT/50 hover:bg-white/5' 
                : 'bg-black/30 border-silver-DEFAULT/10 text-silver-bright/30 hover:border-silver-DEFAULT/30 border-dashed'
          }`}
        >
          {isListening ? '?' : (currentKey ? currentKey.toUpperCase() : '+')}
        </button>
        {currentKey && !isListening && (
          <button 
            onClick={(e) => { e.stopPropagation(); setKeybinding(action, index, null); }}
            className="absolute -top-2 -right-2 bg-red-500/20 text-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover/slot:opacity-100 hover:bg-red-500 hover:text-white transition-all"
            title={t('settings.removeKey', 'Retirer la touche')}
          >
            <Icons.X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500 bg-[#0D0D0F] relative overflow-hidden z-10">
      <div className="absolute inset-0 bg-grimoire-texture opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-0 bg-vignette pointer-events-none" />

      <header className="px-12 py-8 shrink-0 relative z-10">
        <h1 className="text-4xl font-black text-glacier-bright tracking-[0.3em] uppercase">
          {t('settings.title', 'PARAMÈTRES')}
        </h1>
        <div className="h-px w-32 bg-gradient-to-r from-glacier-DEFAULT to-transparent mt-4" />
      </header>

      <div className="flex flex-1 overflow-hidden px-12 pb-12 gap-12 relative z-10">
        
        {/* Colonne Gauche */}
        <div className="w-64 flex flex-col gap-2 shrink-0">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as SettingsCategory)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group overflow-hidden border ${
                  isActive 
                    ? 'bg-glacier-DEFAULT/10 border-silver-DEFAULT/30 text-glacier-bright shadow-rune-glacier' 
                    : 'border-transparent hover:bg-white/5 text-silver-bright hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-glacier-bright animate-rune-pulse' : 'opacity-60'}`} />
                <span className="font-quantico font-bold tracking-widest uppercase text-sm">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Contenu Droite */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/40 border border-silver-DEFAULT/20 rounded-[2rem] p-10 backdrop-blur-md">
          
          {activeCategory === 'general' && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <Icons.Globe className="w-8 h-8 text-glacier-bright" />
                <h2 className="text-2xl font-black text-white font-quantico uppercase tracking-widest">{t('settings.language', 'Langue')}</h2>
              </div>
              <p className="text-silver-bright/60 font-quantico uppercase tracking-widest text-sm mb-8">
                {t('settings.selectLanguage', 'Sélectionnez la langue de l\'interface')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                {languages.map((lang) => {
                  const isActive = i18n.language.startsWith(lang.code);
                  return (
                    <button
                      key={lang.code}
                      onClick={() => i18n.changeLanguage(lang.code)}
                      className={`relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 group ${
                        isActive 
                          ? 'bg-glacier-DEFAULT/10 border-silver-DEFAULT text-glacier-bright shadow-[0_0_20px_rgba(79,164,184,0.2)]' 
                          : 'bg-black/60 border-silver-DEFAULT/20 text-silver-bright hover:border-silver-DEFAULT/50 hover:bg-white/5'
                      }`}
                    >
                      <span className="font-quantico font-bold tracking-[0.2em] uppercase text-sm">{lang.label}</span>
                      {isActive && <Icons.Check className="w-5 h-5 text-glacier-bright" />}
                      {!isActive && <div className="w-5 h-5 rounded-full border border-silver-DEFAULT/30 group-hover:border-silver-DEFAULT/60 transition-colors" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeCategory === 'graphics' && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 max-w-4xl">
              <div className="flex items-center gap-4 mb-8">
                <Icons.Layers className="w-8 h-8 text-glacier-bright" />
                <h2 className="text-2xl font-black text-white font-quantico uppercase tracking-widest">{t('settings.graphics', 'Graphiques')}</h2>
              </div>

              {/* Preset Selecteur */}
              <SettingRow
                label={t('settings.preset', 'Préréglage')}
                description={t('settings.presetDesc', 'Choisis un réglage global pour ajuster automatiquement toutes les options')}
                currentValue={currentPreset}
                onChange={handlePresetChange}
                options={[
                  { id: 'low', label: t('settings.presetLow', 'Faible') },
                  { id: 'medium', label: t('settings.presetMedium', 'Moyen') },
                  { id: 'epic', label: t('settings.presetEpic', 'Épique') },
                  { id: 'high', label: t('settings.presetHigh', 'Haute') },
                  { id: 'fabulous', label: t('settings.presetFabulous', 'Fabuleux') },
                  { id: 'custom', label: t('settings.presetCustom', 'Personnalisé') }
                ]}
              />

              <div className="w-full h-px bg-silver-DEFAULT/10 my-4" />

              {/* Visual Quality */}
              <SettingRow
                label={t('settings.visualQuality', 'Qualité Visuelle')}
                description={t('settings.visualQualityDesc', 'Ajustez la qualité graphique pour améliorer les performances')}
                currentValue={visualQuality}
                onChange={setVisualQuality as any}
                options={[
                  { id: 'low', label: t('settings.qualityLow', 'Basse') },
                  { id: 'medium', label: t('settings.qualityMedium', 'Moyenne') },
                  { id: 'high', label: t('settings.qualityHigh', 'Haute') }
                ]}
              />

              {/* Shaders */}
              <SettingRow
                label={t('settings.shaders', 'Shaders (Post-Processing)')}
                description={t('settings.shadersDesc', 'Active les effets de lumière avancés (Bloom, Contraste dynamique) sur les cartes')}
                currentValue={shadersIntensity}
                onChange={setShadersIntensity as any}
                options={[
                  { id: 'off', label: t('settings.shadersOff', 'Désactivé') },
                  { id: 'soft', label: t('settings.shadersSoft', 'Léger') },
                  { id: 'normal', label: t('settings.shadersNormal', 'Normal') }
                ]}
              />

              {/* Rune Trail */}
              <SettingRow
                label={t('settings.runeTrail', 'Traînée de Runes')}
                description={t('settings.runeTrailDesc', 'Affiche une traînée magique suivant le curseur dans le Hub')}
                currentValue={runeTrailEnabled}
                onChange={setRuneTrailEnabled as any}
                options={[
                  { id: false, label: t('settings.disabled', 'Désactivé') },
                  { id: true, label: t('settings.enabled', 'Activé') }
                ]}
              />

            </div>
          )}

          {activeCategory === 'controls' && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <Icons.Settings className="w-8 h-8 text-glacier-bright" />
                <h2 className="text-2xl font-black text-white font-quantico uppercase tracking-widest">{t('settings.controls', 'Contrôles')}</h2>
              </div>
              
              <div className="space-y-4 max-w-2xl">
                {/* UP */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-silver-DEFAULT/20 transition-all">
                  <span className="text-sm font-quantico text-silver-bright uppercase tracking-widest">{t('settings.moveUp', 'Haut')}</span>
                  <div className="flex gap-4">
                    {renderKeySlot('moveUp', 0)}
                    {renderKeySlot('moveUp', 1)}
                  </div>
                </div>

                {/* DOWN */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-silver-DEFAULT/20 transition-all">
                  <span className="text-sm font-quantico text-silver-bright uppercase tracking-widest">{t('settings.moveDown', 'Bas')}</span>
                  <div className="flex gap-4">
                    {renderKeySlot('moveDown', 0)}
                    {renderKeySlot('moveDown', 1)}
                  </div>
                </div>

                {/* LEFT */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-silver-DEFAULT/20 transition-all">
                  <span className="text-sm font-quantico text-silver-bright uppercase tracking-widest">{t('settings.moveLeft', 'Gauche')}</span>
                  <div className="flex gap-4">
                    {renderKeySlot('moveLeft', 0)}
                    {renderKeySlot('moveLeft', 1)}
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-silver-DEFAULT/20 transition-all">
                  <span className="text-sm font-quantico text-silver-bright uppercase tracking-widest">{t('settings.moveRight', 'Droite')}</span>
                  <div className="flex gap-4">
                    {renderKeySlot('moveRight', 0)}
                    {renderKeySlot('moveRight', 1)}
                  </div>
                </div>

                {/* ZOOM - NON EDITABLE */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-silver-DEFAULT/20 transition-all">
                  <span className="text-sm font-quantico text-silver-bright uppercase tracking-widest">{t('settings.zoomMap', 'Zoomer / Dézoomer')}</span>
                  <kbd className="px-4 py-1.5 text-xs font-mono font-bold bg-black border border-silver-DEFAULT/30 rounded-lg text-glacier-bright shadow-inner">
                    {t('settings.mouseWheel', 'Molette Souris')}
                  </kbd>
                </div>

                {/* PAN - NON EDITABLE */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-silver-DEFAULT/20 transition-all">
                  <span className="text-sm font-quantico text-silver-bright uppercase tracking-widest">{t('settings.panMap', 'Déplacer la caméra')}</span>
                  <kbd className="px-4 py-1.5 text-xs font-mono font-bold bg-black border border-silver-DEFAULT/30 rounded-lg text-glacier-bright shadow-inner">
                    {t('settings.clickDrag', 'Clic Gauche + Glisser')}
                  </kbd>
                </div>

                {/* FULLSCREEN - NON EDITABLE */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-silver-DEFAULT/20 transition-all">
                  <span className="text-sm font-quantico text-silver-bright uppercase tracking-widest">{t('settings.fullscreen', 'Plein écran')}</span>
                  <kbd className="px-4 py-1.5 text-xs font-mono font-bold bg-black border border-silver-DEFAULT/30 rounded-lg text-glacier-bright shadow-inner">
                    F11
                  </kbd>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'account' && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <Icons.User className="w-8 h-8 text-glacier-bright" />
                <h2 className="text-2xl font-black text-white font-quantico uppercase tracking-widest">{t('settings.account', 'Compte')}</h2>
              </div>
              
              {user && (
                <div className="p-8 rounded-2xl bg-glacier-DEFAULT/5 border border-silver-DEFAULT/20 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-glacier-DEFAULT/10 border border-silver-DEFAULT/30 flex items-center justify-center shadow-inner">
                      <span className="text-2xl font-quantico font-black text-glacier-bright uppercase">{user.pseudo.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-quantico font-black text-white tracking-widest">{user.pseudo}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Icons.Shield className="w-3 h-3 text-silver-bright/60" />
                        <span className="text-xs font-mono text-silver-bright/80 uppercase tracking-widest">
                          {t('sidebar.grade')}: {user.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-8 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col gap-6 items-start">
                <div className="space-y-2">
                  <h3 className="text-sm font-quantico font-bold text-white uppercase tracking-widest">
                    {t('settings.logout', 'Se déconnecter')}
                  </h3>
                  <p className="text-sm font-inter text-silver-bright/60">
                    {t('settings.logoutDesc', 'Fermer la session actuelle et retourner à l\'écran de connexion.')}
                  </p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-8 py-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all group font-quantico font-black text-sm uppercase tracking-widest shadow-lg"
                >
                  <Icons.LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  {t('settings.logout', 'Se déconnecter')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
