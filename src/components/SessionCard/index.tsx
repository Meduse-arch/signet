import { Session, formatRelativeDate } from '../../services/session.service';
import { Icons } from '../ui/Icons';
import { useTranslation } from 'react-i18next';
import { AssetImage } from '../AssetImage';

interface SessionCardProps {
 session: Session;
 isActive: boolean;
 onClick: () => void;
 onEdit?: (e: React.MouseEvent) => void;
 onDelete?: (e: React.MouseEvent) => void;
 canEdit?: boolean;
}

export function SessionCard({ session, isActive, onClick, onEdit, onDelete, canEdit }: SessionCardProps) {
 const { t } = useTranslation();
 return (
 <div
 onClick={onClick}
 className={`
 group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500
 bg-white/[0.03] backdrop-blur-md border border-white/10
 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(212,175,55,0.1)]
 hover:border-silver-DEFAULT/40 hover:bg-white/[0.06]
 ${isActive ? 'border-silver-DEFAULT shadow-rune-gold' : ''}
 `}
 >
 {/* Reflet de vitre interne (Top highlight) */}
 <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none z-[1]" />
 
 {/* Texture de fond interne */}
 <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none z-[2]" />
 
 {/* Overlay de lueur au hover */}
 <div className="absolute inset-0 bg-rune-glow opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none z-[3]" />

 <div className="h-28 w-full bg-black/20 relative overflow-hidden z-[4]">
 {session.imageUrl ? (
 <AssetImage 
 src={session.imageUrl} 
 alt={session.name} 
 className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-110" 
 />
 ) : (
 <div className="w-full h-full bg-gradient-to-br from-[#1a1a24]/40 to-[#0D0D0F]/40 flex items-center justify-center opacity-40">
 <span className="text-4xl filter sepia opacity-50">📜</span>
 </div>
 )}

 {/* Boutons d'action */}
 <div className="absolute top-3 right-3 flex gap-2 z-20 opacity-40 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0 duration-300">
 {onEdit && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 onEdit?.(e);
 }}
 className="p-2 rounded-lg bg-[#0D0D0F]/80 backdrop-blur-md border border-white/10 text-glacier-bright hover:bg-glacier-DEFAULT hover:text-black transition-all"
 title="Modifier"
 >
 <Icons.Pencil className="w-3.5 h-3.5" />
 </button>
 )}
 {onDelete && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 onDelete?.(e);
 }}
 className="p-2 rounded-lg bg-[#0D0D0F]/80 backdrop-blur-md border border-white/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
 title={t('common.delete', 'Supprimer')}
 >
 <Icons.Trash2 className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 </div>

 <div className="p-4 bg-white/[0.02] border-t border-white/5 relative z-[5]">
 <div className="flex items-center gap-2 mb-2">
 {session.isSummoned && (
 <div className="px-1.5 py-0.5 rounded-md bg-glacier-DEFAULT/10 border border-silver-DEFAULT/40">
 <span className="text-[11px] font-black text-glacier-bright uppercase tracking-widest">{t('session.summoned', 'Invoquée')}</span>
 </div>
 )}
 <h3 className="text-xs font-quantico text-white/90 tracking-widest truncate group-hover:text-glacier-bright transition-colors">
 {session.name}
 </h3>
 </div>
 
 <div className="flex justify-between items-center text-[11px] font-medium tracking-wider">
 <span className="text-gold-muted uppercase opacity-70">{session.system || t('common.unknownSystem', 'Arcane Inconnue')}</span>
 <span className="text-white/70 italic font-inter">
 {formatRelativeDate(session.lastPlayed)}
 </span>
 </div>
 </div>

 {/* Coins décoratifs (Subtils) */}
 <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/10 pointer-events-none z-[6]" />
 <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/10 pointer-events-none z-[6]" />
 </div>
 );
}