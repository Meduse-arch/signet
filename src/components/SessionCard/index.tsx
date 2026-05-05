import { Session, formatRelativeDate } from '../../services/session.service';

interface SessionCardProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
}

export function SessionCard({ session, isActive, onClick }: SessionCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300
        bg-[rgba(255,255,255,0.04)] backdrop-blur-[12px] saturate-[1.4]
        border border-[rgba(212,160,23,0.18)]
        shadow-[inset_0_1px_0_rgba(212,160,23,0.15),inset_0_-1px_0_rgba(0,0,0,0.3),0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(212,160,23,0.06)]
        hover:-translate-y-1 hover:scale-[1.02] hover:border-[rgba(212,160,23,0.45)]
        ${isActive ? '!border-[rgba(212,160,23,0.6)] shadow-[0_0_20px_rgba(212,160,23,0.3)]' : ''}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-DEFAULT/20 to-transparent pointer-events-none" />
      
      <div className="h-24 w-full bg-surface-card relative">
        {session.imageUrl ? (
          <img src={session.imageUrl} alt={session.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a24] to-[#0D0D0F] flex items-center justify-center opacity-50">
            <span className="text-3xl">🎲</span>
          </div>
        )}
      </div>

      <div className="p-[10px_12px_12px] bg-[rgba(255,255,255,0.02)] border-t border-[rgba(212,160,23,0.08)]">
        <h3 className="text-[12px] text-[#d4c5a0] font-medium truncate mb-1">
          {session.name}
        </h3>
        <div className="flex justify-between items-center text-[11px] text-gold-dim">
          <span>{session.system || 'Système inconnu'}</span>
          <span>{formatRelativeDate(session.lastPlayed)}</span>
        </div>
      </div>
    </div>
  );
}