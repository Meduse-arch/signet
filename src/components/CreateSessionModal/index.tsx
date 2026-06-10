import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../ui/Icons';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useAssetUpload } from '../../hooks/useAssetUpload';
import SealSystem from '../../systems/seal';
import type { GameSystem } from '../../systems/core/types';

// ── Registry of systems available in the session creation modal ──────────────
const SYSTEM_REGISTRY: GameSystem[] = [
  SealSystem,
  // Add new systems here, e.g.: Srd5System
];

interface SessionModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSubmit: (name: string, system: string, imageUrl?: string, settings?: Record<string, any>) => void;
 initialData?: { name: string; system?: string; imageUrl?: string; settings?: Record<string, any> };
 title?: string;
 submitLabel?: string;
}

const SYSTEM_OPTIONS = SYSTEM_REGISTRY.map((s) => ({ value: s.id, label: s.name }));

export function CreateSessionModal({
 isOpen,
 onClose,
 onSubmit,
 initialData,
 title,
 submitLabel,
}: SessionModalProps) {
 const { t } = useTranslation();
 const [name, setName] = useState('');
 const [system, setSystem] = useState('');
 const [imageUrl, setImageUrl] = useState('');
 const [settings, setSettings] = useState<Record<string, any>>({});
 const [isSettingsOpen, setIsSettingsOpen] = useState(false);

 const { isUploading, fileInputRef, handleFileUpload } = useAssetUpload(
 imageUrl,
 (url) => setImageUrl(url)
 );

 useEffect(() => {
 if (isOpen) {
 setName(initialData?.name || '');
 setSystem(initialData?.system || '');
 setImageUrl(initialData?.imageUrl || '');
 setSettings(initialData?.settings || {});
 }
 }, [isOpen, initialData]);

  const handleSelectSystem = (sysId: string) => {
  setSystem(sysId);
  const found = SYSTEM_REGISTRY.find(s => s.id === sysId);
  if (found && Object.keys(settings).length === 0) {
    setSettings(found.defaultSettings);
  } else if (sysId !== system) {
    setSettings({});
    const newFound = SYSTEM_REGISTRY.find(s => s.id === sysId);
    if (newFound) setSettings(newFound.defaultSettings);
  }
  };

 const isValid = name.trim() && system.trim();

 const footerContent = (
 <>
 <Button
 variant="secondary"
 size="md"
 fullWidth
 onClick={onClose}
 >
 {t('session.cancel')}
 </Button>
 <Button
 variant="primary"
 size="md"
 fullWidth
 disabled={!isValid}
 onClick={() => onSubmit(
 name || t('session.unnamed'),
 system || t('session.unknownSystem'),
 imageUrl,
 settings
 )}
 >
 {submitLabel ?? t('hub.createSubmitLabel')}
 </Button>
 </>
 );

 return (
 <>
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={title ?? t('hub.newSessionTitle')}
 footer={footerContent}
 maxWidth="sm"
 >
 <div className="space-y-6 py-2">
 {/* Description contextuelle */}
 <p className="text-xs font-inter italic text-silver-bright/80 leading-relaxed">
 {initialData
 ? t('session.editDescription')
 : t('session.createDescription')}
 </p>

 {/* Nom de l'archive */}
 <Input
 label={t('session.archiveTitle')}
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder={t('session.archivePlaceholder')}
 />

 {/* Sélection du système */}
 <Select
 label={t('session.arcaneSystem')}
 value={system}
 onChange={handleSelectSystem}
 options={SYSTEM_OPTIONS}
 placeholder={t('session.systemPlaceholder')}
 emptyMessage={t('session.noRitualFound')}
 searchable
 />

  {/* Bouton paramètres du système */}
  {(() => {
    const activeSystem = SYSTEM_REGISTRY.find(s => s.id === system);
    if (!activeSystem) return null;
    const SystemSettingsModal = activeSystem.components.SettingsModal;
    return (
      <>
        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            leftIcon={<Icons.Settings2 className="w-3.5 h-3.5" />}
            onClick={() => setIsSettingsOpen(true)}
          >
            {t('session.arcaneSettings')}
          </Button>
        </div>
        <SystemSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={setSettings}
        />
      </>
    );
  })()}

 {/* URL de l'image */}
 <div className="flex gap-2 items-end">
 <Input
 label={t('session.imageLabel')}
 value={imageUrl}
 onChange={(e) => setImageUrl(e.target.value)}
 placeholder={t('session.imagePlaceholder')}
 mono
 wrapperClassName="flex-1 min-w-0"
 />
 <button 
 type="button"
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploading}
 className="p-3 rounded-xl bg-[#0D0D0F]/80 border border-silver-DEFAULT/30 text-glacier-bright hover:bg-glacier-DEFAULT/20 transition-all flex items-center justify-center min-w-[48px] h-[46px]"
 title="Importer un fichier local"
 >
 {isUploading ? <Icons.Loader2 size={18} className="animate-spin" /> : <Icons.Upload size={18} />}
 </button>
 <input 
 type="file" 
 ref={fileInputRef} 
 className="hidden" 
 accept="image/*"
 onChange={handleFileUpload}
 />
 </div>
 </div>
 </Modal>
 </>
 );
}
