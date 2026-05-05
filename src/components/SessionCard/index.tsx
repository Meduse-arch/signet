import { Session, formatRelativeDate } from '../../services/session.service';
import { Pencil, Trash2 } from 'lucide-react';

interface SessionCardProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  canEdit?: boolean;
}

export function SessionCard({ session, isActive, onClick, onEdit, onDelete, canEdit }: SessionCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500
        bg-surface-card border border-gold-border
        hover:-translate-y-2 hover:shadow-rune-gold-bright hover:border-gold-DEFAULT/50
        ${isActive ? 'border-gold-DEFAULT shadow-rune-gold' : ''}
      `}
    >
      {/* Texture de fond interne */}
      <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none" />
      
      {/* Overlay de lueur au hover */}
      <div className="absolute inset-0 bg-rune-glow opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none" />

      <div className="h-28 w-full bg-surface relative overflow-hidden">
        {session.imageUrl ? (
          <img src={session.imageUrl} alt={session.name} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a24] to-[#0D0D0F] flex items-center justify-center opacity-40">
            <span className="text-4xl filter sepia opacity-50">📜</span>
          </div>
        )}

        {/* Boutons d'action */}
        {canEdit && (
          <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity translate-y-[-10px] group-hover:translate-y-0 duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(e);
              }}
              className="p-2 rounded-lg bg-black/80 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all"
              title="Modifier"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(e);
              }}
              className="p-2 rounded-lg bg-black/80 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-4 bg-surface-card/80 backdrop-blur-sm border-t border-gold-border relative z-10">
        <h3 className="text-xs font-cinzel text-gold-bright tracking-widest truncate mb-2 group-hover:text-white transition-colors">
          {session.name}
        </h3>
        <div className="flex justify-between items-center text-[10px] font-medium tracking-wider">
          <span className="text-gold-dim uppercase">{session.system || 'Arcane Inconnue'}</span>
          <span className="text-gold-muted italic font-serif opacity-70">
            {formatRelativeDate(session.lastPlayed)}
          </span>
        </div>
      </div>

      {/* Coins décoratifs (Style Alchemy) */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-gold-DEFAULT/20 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-gold-DEFAULT/20 pointer-events-none" />
    </div>
  );
}