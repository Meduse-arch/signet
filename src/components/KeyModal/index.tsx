import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../ui/Icons';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface KeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (key: string) => void;
}

export function KeyModal({ isOpen, onClose, onJoin }: KeyModalProps) {
  const { t } = useTranslation();
  const [keyInput, setKeyInput] = useState('');

  const handleJoin = () => {
    let finalKey = keyInput.trim().toUpperCase();
    if (finalKey && !finalKey.startsWith('SIGNET-')) {
      finalKey = `SIGNET-${finalKey}`;
    }
    onJoin(finalKey);
    setKeyInput('');
  };

  const footer = (
    <>
      <Button variant="secondary" size="sm" fullWidth onClick={onClose}>
        {t('session.cancel')}
      </Button>
      <Button
        variant="primary"
        size="sm"
        fullWidth
        disabled={!keyInput.trim()}
        leftIcon={<Icons.Key className="w-3.5 h-3.5" />}
        onClick={handleJoin}
      >
        {t('sidebar.joinKey')}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('sidebar.joinKey')}
      footer={footer}
      maxWidth="sm"
    >
      <div className="py-2 space-y-4">
        <p className="text-xs font-serif italic text-gold-DEFAULT/70 leading-relaxed">
          {t('keyModal.description', 'Entrez la clé de connexion partagée par votre MJ (ex: SIGNET-1234-ABCD).')}
        </p>
        <Input
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && keyInput.trim() && handleJoin()}
          placeholder="CLÉ-DE-CONNEXION"
          mono
          leftIcon={<Icons.Key className="w-4 h-4" />}
        />
      </div>
    </Modal>
  );
}