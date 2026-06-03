import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../ui/Icons';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { SealSettingsModal } from './SealSettingsModal';
import { DEFAULT_SEAL_SETTINGS } from '../../systems/seal/constants';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, system: string, imageUrl?: string, settings?: Record<string, any>) => void;
  initialData?: { name: string; system?: string; imageUrl?: string; settings?: Record<string, any> };
  title?: string;
  submitLabel?: string;
}

const AVAILABLE_SYSTEMS = ['Seal'];

const SYSTEM_OPTIONS = AVAILABLE_SYSTEMS.map((s) => ({ value: s, label: s }));

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

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setSystem(initialData?.system || '');
      setImageUrl(initialData?.imageUrl || '');
      setSettings(initialData?.settings || {});
    }
  }, [isOpen, initialData]);

  const handleSelectSystem = (sys: string) => {
    setSystem(sys);
    if (sys.toLowerCase() === 'seal' && Object.keys(settings).length === 0) {
      setSettings(DEFAULT_SEAL_SETTINGS);
    } else if (sys.toLowerCase() !== system.toLowerCase()) {
      setSettings({});
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
          <p className="text-xs font-serif italic text-gold-DEFAULT/80 leading-relaxed">
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
          {system.toLowerCase() === 'seal' && (
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
          )}

          {/* URL de l'image */}
          <Input
            label={t('session.imageLabel')}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder={t('session.imagePlaceholder')}
            mono
          />
        </div>
      </Modal>

      {/* Modale des paramètres Seal */}
      {system.toLowerCase() === 'seal' && (
        <SealSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={setSettings}
        />
      )}
    </>
  );
}