import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScrollText, Trash2, Filter } from 'lucide-react';
import { activityLogService, ActivityLog, LogType } from '../../services/activity-log.service';

// ─── Types de filtres ─────────────────────────────────────────────────────────

const ALL_FILTERS: { type: LogType | 'all'; label: string }[] = [
 { type: 'all', label: 'Tout' },
 { type: 'des', label: '🎲 Dés' },
 { type: 'skill', label: '⚡ Skills' },
 { type: 'item', label: '🎒 Items' },
 { type: 'quest', label: '📜 Quêtes' },
 { type: 'combat', label: '⚔️ Combat' },
 { type: 'system', label: '⚙️ Système' },
];

// ─── Sous-composant : entrée de log ───────────────────────────────────────────

function LogEntry({ log }: { log: ActivityLog }) {
 const time = new Date(log.timestamp).toLocaleTimeString('fr-FR', {
 hour: '2-digit', minute: '2-digit', second: '2-digit'
 });

 return (
 <motion.div
 initial={{ opacity: 0, x: -10, height: 0 }}
 animate={{ opacity: 1, x: 0, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 transition={{ duration: 0.2 }}
 className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all overflow-hidden"
 >
 {/* Icône */}
 <div
 className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm border"
 style={{
 backgroundColor: `${log.color}15`,
 borderColor: `${log.color}40`,
 }}
 >
 {log.icon}
 </div>

 {/* Contenu */}
 <div className="flex-1 min-w-0 flex flex-col gap-0.5">
 {/* Personnage + heure */}
 <div className="flex items-center justify-between gap-2">
 {log.character_name && (
 <span
 className="text-[10px] font-quantico font-black uppercase tracking-widest truncate"
 style={{ color: log.color }}
 >
 {log.character_name}
 </span>
 )}
 <span className="text-[9px] font-mono text-white/30 shrink-0 ml-auto">{time}</span>
 </div>

 {/* Action principale */}
 <span className="text-xs font-quantico text-white/80 uppercase tracking-wide leading-tight">
 {log.action}
 </span>

 {/* Détails (total dé, nom item...) */}
 {log.type === 'des' && log.details?.total !== undefined && (
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-[10px] font-mono text-white/40 italic">
 {(log.details.rolls || []).join(' + ')}
 </span>
 <span
 className="text-base font-quantico font-black leading-none"
 style={{ color: log.color }}
 >
 = {log.details.total}
 </span>
 </div>
 )}

 {log.type === 'skill' && log.details?.skill_type && (
 <span className="text-[10px] font-mono text-white/30 uppercase">
 {log.details.skill_type}
 </span>
 )}

 {log.type === 'item' && log.details?.item_type && (
 <span className="text-[10px] font-mono text-white/30 uppercase">
 {log.details.item_type}
 </span>
 )}

 {log.type === 'quest' && log.details?.status && (
 <span className="text-[10px] font-mono uppercase" style={{ color: log.color }}>
 → {log.details.status}
 </span>
 )}
 </div>
 </motion.div>
 );
}

// ─── ActivityLogPanel : Pop-up in-game ───────────────────────────────────────

interface ActivityLogPanelProps {
 sessionId: string;
 onClose: () => void;
}

export function ActivityLogPanel({ sessionId, onClose }: ActivityLogPanelProps) {
 const [logs, setLogs] = useState<ActivityLog[]>([]);
 const [filter, setFilter] = useState<LogType | 'all'>('all');
 const listRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 activityLogService.initialize(sessionId);
 const unsub = activityLogService.subscribe(setLogs);
 return unsub;
 }, [sessionId]);

 // Auto-scroll vers le bas quand un nouveau log arrive
 useEffect(() => {
 if (listRef.current) {
 listRef.current.scrollTop = 0;
 }
 }, [logs.length]);

 const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter);

 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ duration: 0.2 }}
 className="flex flex-col w-[380px] max-h-[560px] bg-[#0D0D0F]/95 border border-silver-DEFAULT/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
 >
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-silver-DEFAULT/20 bg-black/40 shrink-0">
 <div className="flex items-center gap-2">
 <ScrollText size={14} className="text-silver-bright" />
 <span className="text-xs font-quantico font-black text-glacier-bright uppercase tracking-widest">
 Annales de Session
 </span>
 <span className="text-[10px] font-mono text-white/30 ml-1">({filtered.length})</span>
 </div>
 <button
 onClick={onClose}
 className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
 >
 <X size={14} />
 </button>
 </div>

 {/* Filtres */}
 <div className="flex gap-1 px-3 py-2 overflow-x-auto no-scrollbar border-b border-white/5 shrink-0">
 {ALL_FILTERS.map(f => (
 <button
 key={f.type}
 onClick={() => setFilter(f.type as LogType | 'all')}
 className={`px-2.5 py-1 rounded-full text-[10px] font-quantico font-black uppercase tracking-widest border whitespace-nowrap transition-all ${
 filter === f.type
 ? 'bg-glacier-DEFAULT text-black border-silver-DEFAULT'
 : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
 }`}
 >
 {f.label}
 </button>
 ))}
 </div>

 {/* Liste des logs */}
 <div
 ref={listRef}
 className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1.5"
 >
 <AnimatePresence initial={false}>
 {filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 opacity-20 gap-3">
 <ScrollText size={32} className="text-silver-bright" />
 <span className="text-xs font-quantico uppercase tracking-widest">
 Les Annales sont vierges...
 </span>
 </div>
 ) : (
 filtered.map(log => <LogEntry key={log.id} log={log} />)
 )}
 </AnimatePresence>
 </div>

 {/* Footer */}
 {logs.length > 0 && (
 <div className="px-3 py-2 border-t border-white/5 bg-black/20 flex items-center justify-between shrink-0">
 <span className="text-[9px] font-mono text-white/20">
 {logs.length} entrée{logs.length > 1 ? 's' : ''} · Session {sessionId.substring(0, 8)}...
 </span>
 <button
 onClick={() => {
 if (window.electronAPI && 'openWindow' in window.electronAPI) {
 (window.electronAPI as any).openWindow('logs', sessionId);
 }
 }}
 className="text-[9px] font-quantico uppercase tracking-widest text-silver-bright/40 hover:text-silver-bright transition-colors"
 >
 Ouvrir en fenêtre →
 </button>
 </div>
 )}
 </motion.div>
 );
}

// ─── ActivityLogWindowContent : Fenêtre externe ───────────────────────────────

export function ActivityLogWindowContent({ sessionId }: { sessionId: string }) {
 const [logs, setLogs] = useState<ActivityLog[]>([]);
 const [filter, setFilter] = useState<LogType | 'all'>('all');

 useEffect(() => {
 activityLogService.initialize(sessionId);
 const unsub = activityLogService.subscribe(setLogs);
 return unsub;
 }, [sessionId]);

 const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter);

 return (
 <div className="flex flex-col h-full bg-[#0D0D0F] text-white">
 {/* Header */}
 <div className="flex items-center gap-3 px-4 py-3 border-b border-silver-DEFAULT/20 bg-black/40 shrink-0">
 <ScrollText size={16} className="text-silver-bright" />
 <span className="text-sm font-quantico font-black text-glacier-bright uppercase tracking-widest">
 Annales de Session
 </span>
 <div className="ml-auto flex items-center gap-2">
 <span className="text-[10px] font-mono text-white/30">{filtered.length} entrées</span>
 {/* Live indicator */}
 <div className="flex items-center gap-1.5">
 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
 <span className="text-[9px] font-quantico uppercase tracking-widest text-white/40">Live</span>
 </div>
 </div>
 </div>

 {/* Filtres */}
 <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto no-scrollbar border-b border-white/5 shrink-0 bg-black/20">
 {ALL_FILTERS.map(f => (
 <button
 key={f.type}
 onClick={() => setFilter(f.type as LogType | 'all')}
 className={`px-3 py-1.5 rounded-full text-[11px] font-quantico font-black uppercase tracking-widest border whitespace-nowrap transition-all ${
 filter === f.type
 ? 'bg-glacier-DEFAULT text-black border-silver-DEFAULT'
 : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
 }`}
 >
 {f.label}
 </button>
 ))}
 </div>

 {/* Logs */}
 <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
 <AnimatePresence initial={false}>
 {filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full opacity-20 gap-4">
 <ScrollText size={48} className="text-silver-bright" />
 <span className="text-sm font-quantico uppercase tracking-widest">
 Les Annales sont vierges...
 </span>
 </div>
 ) : (
 filtered.map(log => <LogEntry key={log.id} log={log} />)
 )}
 </AnimatePresence>
 </div>
 </div>
 );
}
