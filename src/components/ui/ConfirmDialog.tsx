import { useConfirmStore } from '../../store/confirm';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ConfirmDialog() {
  const { isOpen, message, onConfirm, onCancel } = useConfirmStore();
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0D0D0F] border border-red-500/30 rounded-2xl max-w-sm w-full p-6 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-500/10 rounded-full text-red-500">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-quantico font-black uppercase tracking-widest text-red-400">Confirmation</h2>
        </div>
        
        <p className="text-sm text-silver-DEFAULT mb-8 leading-relaxed font-mono">{message}</p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-silver-DEFAULT/30 text-silver-bright hover:bg-white/5 transition-colors font-quantico text-xs uppercase tracking-widest"
          >
            {t('common.cancel', 'Annuler')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-500 text-white font-quantico text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
          >
            {t('common.confirm', 'Confirmer')}
          </button>
        </div>
      </div>
    </div>
  );
}
