import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScrollText, Trash2, Filter } from 'lucide-react';
import { activityLogService, ActivityLog, LogType } from '../../services/activity-log.service';
import { Select } from '../ui/Select';

import { Icons } from '../ui/Icons';

function getLogIcon(type: LogType) {
  switch (type) {
    case 'des': return <Icons.Dices size={14} />;
    case 'skill': return <Icons.Zap size={14} />;
    case 'item': return <Icons.Backpack size={14} />;
    case 'quest': return <Icons.ScrollText size={14} />;
    case 'combat': return <Icons.Swords size={14} />;
    case 'system': return <Icons.Settings size={14} />;
    default: return <Icons.Info size={14} />;
  }
}

// ─── Sous-composant : résultat de dé (intercalaire) ───────────────────────────

function LogDiceResult({ result, color }: { result: any, color?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  
  return (
    <div className="flex flex-col bg-white/5 border border-white/10 rounded-md overflow-hidden shrink-0">
      <div className="flex items-center w-full">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between gap-2 p-1.5 hover:bg-white/10 transition-colors text-left"
        >
          <div className="flex items-center gap-1.5">
            {isOpen ? <Icons.ChevronDown size={10} className="text-white/40 shrink-0" /> : <Icons.ChevronRight size={10} className="text-white/40 shrink-0" />}
            <span className="text-[9px] font-quantico font-black text-white/80 uppercase">
              {result.label}
            </span>
          </div>
          {result.total !== undefined && (
            <span className="text-base font-quantico font-black leading-none shrink-0" style={{ color }}>
              {result.total}
            </span>
          )}
        </button>
        
        {result.description && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowDesc(!showDesc); }}
            className="p-1.5 mr-1 rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors shrink-0"
            title="Description de l'effet"
          >
            <Icons.Info size={12} />
          </button>
        )}
      </div>
      
      <AnimatePresence>
        {(isOpen || showDesc) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col gap-1 px-2.5 pb-2 pt-0.5 overflow-hidden"
          >
            {isOpen && result.rolls && result.rolls.length > 0 && (
              <span className="text-[9px] font-mono text-white/40 italic break-all bg-black/40 p-1.5 rounded-md border border-white/5">
                {result.rolls.join(' + ')}
              </span>
            )}
            {showDesc && result.description && (
              <span className="text-[9px] font-inter text-white/60 italic mt-0.5">
                {result.description}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sous-composant : entrée de log ───────────────────────────────────────────

function LogEntry({ log }: { log: ActivityLog }) {
 const [isExpanded, setIsExpanded] = useState(false);
 const [showDesc, setShowDesc] = useState(false);
 const time = new Date(log.timestamp).toLocaleTimeString('fr-FR', {
 hour: '2-digit', minute: '2-digit', second: '2-digit'
 });

 const hasDetails = !!(
 (log.type === 'des' && log.details?.total !== undefined) ||
 (log.details?.results && log.details.results.length > 0) ||
 (log.type === 'skill' && log.details?.skill_type) ||
 (log.type === 'item' && log.details?.item_type) ||
 (log.type === 'quest' && log.details?.status)
 );

 return (
 <motion.div
 layout
 initial={{ opacity: 0, x: -10, height: 0 }}
 animate={{ opacity: 1, x: 0, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 transition={{ duration: 0.2 }}
 className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors overflow-hidden shrink-0"
 >
 {/* Icône */}
 <div
 className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm border"
 style={{
 backgroundColor: `${log.color}15`,
 borderColor: `${log.color}40`,
 }}
 >
 {getLogIcon(log.type)}
 </div>

 {/* Contenu */}
 <div className="flex-1 min-w-0 flex flex-col gap-1">
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

 {/* Action principale + Bouton Info */}
 <div className="flex items-start justify-between gap-2 w-full">
 <span className="text-xs font-quantico text-white/80 uppercase tracking-wide leading-tight mt-0.5">
 {log.action}
 </span>
 {log.type === 'skill' && log.details?.description && (
 <button 
 onClick={() => setShowDesc(!showDesc)}
 className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors shrink-0"
 title="Description"
 >
 <Icons.Info size={12} />
 </button>
 )}
 </div>

 {/* Description accordéon */}
 <AnimatePresence>
 {showDesc && log.details?.description && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden"
 >
 <div className="text-[10px] font-inter text-white/60 italic mt-1 p-2 bg-black/40 rounded-lg border border-white/5">
 {log.details.description}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Bouton Toggle Détails */}
 {hasDetails && (
 <button
 onClick={() => setIsExpanded(!isExpanded)}
 className="flex items-center gap-1.5 w-fit mt-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-[9px] text-white/50 uppercase font-quantico"
 >
 {isExpanded ? <Icons.ChevronUp size={10} /> : <Icons.ChevronDown size={10} />}
 {isExpanded ? 'Masquer les détails' : 'Afficher les détails'}
 </button>
 )}

 {/* Conteneur des détails */}
 {hasDetails && (
 <AnimatePresence>
 {isExpanded && (
 <motion.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="flex flex-col gap-1.5 overflow-hidden mt-1 p-2 rounded-lg bg-black/20 border border-white/5"
 >
 {/* Détails (total dé, nom item...) */}
 {log.type === 'des' && log.details?.total !== undefined && (
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-mono text-white/40 italic">
 {(log.details.rolls || []).join(' + ')}
 </span>
 <span
 className="text-base font-quantico font-black leading-none ml-auto"
 style={{ color: log.color }}
 >
 = {log.details.total}
 </span>
 </div>
 )}

 {/* Détails des compétences (avec jets de dés multiples) */}
 {log.details?.results && log.details.results.length > 0 && (
 <div className="flex flex-col gap-1 w-full">
 {log.details.results.map((res: any, idx: number) => (
 <LogDiceResult key={idx} result={{...res, label: res.label || log.action}} color={log.color} />
 ))}
 </div>
 )}

 {log.type === 'skill' && log.details?.skill_type && (
 <span className="text-[10px] font-mono text-white/30 uppercase">
 Type: {log.details.skill_type}
 </span>
 )}

 {log.type === 'item' && log.details?.item_type && (
 <span className="text-[10px] font-mono text-white/30 uppercase">
 Type: {log.details.item_type}
 </span>
 )}

 {log.type === 'quest' && log.details?.status && (
 <span className="text-[10px] font-mono uppercase" style={{ color: log.color }}>
 → {log.details.status}
 </span>
 )}
 </motion.div>
 )}
 </AnimatePresence>
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
 const [filterMode, setFilterMode] = useState<'all' | 'entity'>('all');
 const [selectedEntity, setSelectedEntity] = useState<string>('');
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

 const uniqueEntities = Array.from(new Set(logs.map(l => l.character_name).filter(Boolean))) as string[];

 useEffect(() => {
 if (filterMode === 'entity' && !selectedEntity && uniqueEntities.length > 0) {
 setSelectedEntity(uniqueEntities[0]);
 }
 }, [filterMode, uniqueEntities, selectedEntity]);

 const filtered = filterMode === 'all' 
 ? logs 
 : logs.filter(l => l.character_name === selectedEntity);

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
 <div className="flex items-center gap-1">
 <button
 onClick={() => activityLogService.clearLogs()}
 className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
 title="Vider les annales"
 >
 <Trash2 size={14} />
 </button>
 <button
 onClick={onClose}
 className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
 >
 <X size={14} />
 </button>
 </div>
 </div>

 {/* Filtres */}
 <div className="flex flex-col gap-2 px-3 py-2 border-b border-white/5 shrink-0">
 <div className="flex items-center gap-2">
 <Select
 value={filterMode}
 onChange={(val) => setFilterMode(val as 'all' | 'entity')}
 options={[
 { value: 'all', label: 'Global', icon: <Icons.Globe size={14} /> },
 { value: 'entity', label: 'Par Entité', icon: <Icons.User size={14} /> }
 ]}
 className="w-36"
 />
 {filterMode === 'entity' && uniqueEntities.length > 0 && (
 <Select
 value={selectedEntity}
 onChange={setSelectedEntity}
 options={uniqueEntities.map(name => ({ value: name, label: name }))}
 className="flex-1"
 searchable
 placeholder="Choisir l'entité..."
 emptyMessage="Aucune entité"
 />
 )}
 </div>
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
 const [filterMode, setFilterMode] = useState<'all' | 'entity'>('all');
 const [selectedEntity, setSelectedEntity] = useState<string>('');

 const uniqueEntities = Array.from(new Set(logs.map(l => l.character_name).filter(Boolean))) as string[];

 useEffect(() => {
 if (filterMode === 'entity' && !selectedEntity && uniqueEntities.length > 0) {
 setSelectedEntity(uniqueEntities[0]);
 }
 }, [filterMode, uniqueEntities, selectedEntity]);

 useEffect(() => {
 activityLogService.initialize(sessionId);
 const unsub = activityLogService.subscribe(setLogs);
 return unsub;
 }, [sessionId]);

 const filtered = filterMode === 'all' 
 ? logs 
 : logs.filter(l => l.character_name === selectedEntity);

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
 <button
 onClick={() => activityLogService.clearLogs()}
 className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all ml-2"
 title="Vider les annales"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>

 {/* Filtres */}
 <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0 bg-black/20">
 <Select
 value={filterMode}
 onChange={(val) => setFilterMode(val as 'all' | 'entity')}
 options={[
 { value: 'all', label: 'Global', icon: <Icons.Globe size={14} /> },
 { value: 'entity', label: 'Par Entité', icon: <Icons.User size={14} /> }
 ]}
 className="w-48"
 />
 {filterMode === 'entity' && uniqueEntities.length > 0 && (
 <Select
 value={selectedEntity}
 onChange={setSelectedEntity}
 options={uniqueEntities.map(name => ({ value: name, label: name }))}
 className="w-64"
 searchable
 placeholder="Choisir l'entité..."
 emptyMessage="Aucune entité"
 />
 )}
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
