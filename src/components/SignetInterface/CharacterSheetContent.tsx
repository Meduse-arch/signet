import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { useDiceStore } from '../../store/dice';
import { DEFAULT_STATS, DEFAULT_BARS, DEFAULT_SKILLS } from '../../systems/seal/constants';
import { usePeer } from '../../hooks/usePeer';
import { addSessionCharacter } from '../../services/characters.service';
import { lancerDes } from '../../services/des.service';
import { addSessionLog } from '../../services/db.service';

interface CharacterSheetContentProps {
  sessionId: string;
  variant?: 'popup' | 'window';
}

// ─── Liquid Glass panel wrapper ───────────────────────────────────────────────
function GlassPanel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden flex flex-col ${className}`}
      style={{
        background: 'rgba(14, 11, 6, 0.55)',
        backdropFilter: 'blur(24px) saturate(160%)',
        borderTop: '1px solid rgba(212, 175, 55, 0.35)',
        borderLeft: '1px solid rgba(212, 175, 55, 0.25)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.6)',
        borderRight: '1px solid rgba(0, 0, 0, 0.5)',
        boxShadow:
          'inset 0 1px 0 rgba(255,215,0,0.12), inset 0 -1px 0 rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      {/* specular shine layer */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 45%)',
          borderRadius: 'inherit',
        }}
      />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

// ─── Liquid progress bar ──────────────────────────────────────────────────────
function LiquidBar({
  percent,
  color,
  height = 6,
}: {
  percent: number;
  color: string;
  height?: number;
}) {
  return (
    <div
      className="w-full rounded-full overflow-hidden flex-shrink-0"
      style={{
        height,
        background: 'rgba(0,0,0,0.45)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        className="h-full rounded-full relative overflow-hidden transition-all duration-500"
        style={{
          width: `${percent}%`,
          background: `linear-gradient(180deg, ${color}dd 0%, ${color} 50%, ${color}aa 100%)`,
          boxShadow: `inset 0 1px 2px rgba(255,255,255,0.35), inset 0 -1px 2px rgba(0,0,0,0.3), 0 0 8px ${color}66`,
        }}
      >
        {/* shimmer sweep */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%)',
            animation: 'shimmer-sweep 2.8s infinite linear',
          }}
        />
      </div>
    </div>
  );
}

// ─── Snap-scroll column with dots indicator ───────────────────────────────────
function SnapColumn({
  items,
  itemsPerPage,
  renderItem,
  label,
  variant,
}: {
  items: unknown[];
  itemsPerPage: number;
  renderItem: (item: unknown, index: number) => React.ReactNode;
  label: string;
  variant: 'popup' | 'window';
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const needsScroll = items.length > itemsPerPage;

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const page = Math.round(el.scrollTop / el.clientHeight);
    setActivePage(page);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  // Group items into pages of itemsPerPage
  const pages: unknown[][] = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }

  const isPopup = variant === 'popup';

  return (
    <GlassPanel className="flex-1 min-w-0">
      {/* header */}
      <div
        className="flex-shrink-0 text-center py-1.5 border-b"
        style={{
          borderColor: 'rgba(212,175,55,0.2)',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        <span
          className="font-cinzel font-black uppercase tracking-widest"
          style={{
            fontSize: isPopup ? '8px' : '10px',
            color: 'rgba(212,175,55,0.7)',
          }}
        >
          {label}
        </span>
      </div>

      {/* scrollable snap area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          scrollSnapType: needsScroll ? 'y mandatory' : 'none',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {pages.map((pageItems, pageIndex) => (
          <div
            key={pageIndex}
            className="flex flex-col"
            style={{
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              height: needsScroll ? '100%' : 'max-content',
              minHeight: '100%',
              padding: isPopup ? '4px' : '6px',
              gap: isPopup ? '3px' : '5px',
              justifyContent: 'flex-start',
            }}
          >
            {pageItems.map((item, i) => renderItem(item, pageIndex * itemsPerPage + i))}
          </div>
        ))}
      </div>

      {/* dots — only if multiple pages */}
      {needsScroll && (
        <div
          className="flex-shrink-0 flex items-center justify-center gap-1 py-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                scrollRef.current?.scrollTo({
                  top: i * (scrollRef.current.clientHeight),
                  behavior: 'smooth',
                });
              }}
              style={{
                width: i === activePage ? 12 : 5,
                height: 5,
                borderRadius: 3,
                background:
                  i === activePage
                    ? '#d4af37'
                    : 'rgba(212,175,55,0.3)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CharacterSheetContent({
  sessionId,
  variant = 'popup',
}: CharacterSheetContentProps) {
  const user = useAuthStore(state => state.user);
  const characters = useCharactersStore(state => state.characters);
  const addOrUpdateCharacter = useCharactersStore(state => state.addOrUpdateCharacter);
  const session = useSessionStore(state =>
    state.sessions.find(s => s.id === sessionId)
  );
  const { broadcast, onData } = usePeer();
  const { nbDice, modifier, setDiceResult, diceSharingEnabled } = useDiceStore();

  const isPopup = variant === 'popup';

  // ── how many items visible per page per mode ──
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');

  useEffect(() => {
    if (isPopup) {
      setItemsPerPage(3);
    } else {
      setItemsPerPage(999); // En mode fenêtre, on affiche tout sur une seule page déroulante
    }
  }, [isPopup]);

  const { controlledCharacterId } = useCharactersStore();
  const character = useMemo(() => {
    if (controlledCharacterId) {
      return characters.find(c => c.id === controlledCharacterId);
    }
    return characters.find(c => c.user_id === user?.id);
  }, [characters, controlledCharacterId, user?.id]);

  const handleAvatarClick = () => {
    if (!character) return;
    setAvatarUrlInput(character.image_url || '');
    setShowAvatarPrompt(true);
  };

  const submitAvatarChange = async () => {
    if (!character) return;
    const updatedChar = { ...character, image_url: avatarUrlInput };
    
    // Update local store
    addOrUpdateCharacter(updatedChar);
    
    // Persist to DB if in electron
    if (window.electronAPI) {
      await addSessionCharacter(updatedChar);
    }
    
    // Broadcast via P2P
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
    
    // Broadcast local
    const channel = new BroadcastChannel(`signet_char_sync_${sessionId}`);
    channel.postMessage({ type: 'CHAR_UPDATE', payload: updatedChar });
    channel.close();
    
    setShowAvatarPrompt(false);
  };

  // ── MAP TOKENS SYNC ──────────────────────────────
  const [isTokenOnMap, setIsTokenOnMap] = useState(false);

  useEffect(() => {
    if (!character) return;
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    
    const askStatus = () => {
        channel.postMessage({ type: 'GET_TOKEN_STATUS', payload: { id: character.id } });
    };

    askStatus();

    channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'TOKEN_STATUS_RESPONSE' && payload.id === character.id) {
            setIsTokenOnMap(payload.isOnMap);
        } else if (type === 'TOKEN_LIST_UPDATE') {
            setIsTokenOnMap(payload.tokens.includes(character.id));
        }
    };

    // We also need to listen to P2P token events to update the UI
    const unsub = onData((data: any) => {
       if (data.type === 'TOKEN_ADD' && data.payload.id === character.id) setIsTokenOnMap(true);
       if (data.type === 'TOKEN_REMOVE' && data.payload.id === character.id) setIsTokenOnMap(false);
    });

    const interval = setInterval(askStatus, 5000);

    return () => { 
        if (unsub) unsub(); 
        clearInterval(interval);
        channel.close();
    };
  }, [character, sessionId, onData]);

  const toggleTokenPlacement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!character) return;
    
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    channel.postMessage({ type: 'TOGGLE_TOKEN', payload: { id: character.id } });
    channel.close();
  };

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p
          className="font-cinzel text-sm uppercase tracking-widest"
          style={{ color: 'rgba(212,175,55,0.5)' }}
        >
          Aucun personnage lié à cette session
        </p>
      </div>
    );
  }

  const { name = 'Inconnu', stats = {}, skills = {}, bars = {}, image_url } = character;
  const statDefs = session?.settings?.stats || DEFAULT_STATS;
  const skillDefs = session?.settings?.skills || DEFAULT_SKILLS;
  const barDefs = session?.settings?.bars || DEFAULT_BARS;

  const CustomAvatarPrompt = () => {
    if (!showAvatarPrompt) return null;
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#0A0A0C]/90 border border-gold-DEFAULT/40 p-6 rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.2)] w-[90%] max-w-sm flex flex-col gap-4">
          <h3 className="text-gold-bright font-cinzel font-black uppercase tracking-widest text-center text-sm">Portrait du Voyageur</h3>
          <input 
            type="text" 
            value={avatarUrlInput}
            onChange={(e) => setAvatarUrlInput(e.target.value)}
            placeholder="URL de l'image (https://...)"
            className="w-full bg-black/50 border border-gold-DEFAULT/20 rounded-lg px-3 py-2 text-white/90 text-xs font-mono focus:outline-none focus:border-gold-DEFAULT/60 transition-colors"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitAvatarChange();
              if (e.key === 'Escape') setShowAvatarPrompt(false);
            }}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button 
              onClick={() => setShowAvatarPrompt(false)}
              className="px-4 py-1.5 rounded-lg text-white/50 hover:text-white/90 text-xs font-cinzel uppercase tracking-wider transition-colors"
            >
              Annuler
            </button>
            <button 
              onClick={submitAvatarChange}
              className="px-4 py-1.5 rounded-lg bg-gold-DEFAULT/20 border border-gold-DEFAULT/40 text-gold-bright hover:bg-gold-DEFAULT/40 hover:border-gold-bright text-xs font-cinzel font-black uppercase tracking-wider transition-all"
            >
              Graver
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleRollStat = async (statName: string, faces: number) => {
    if (!character) return;
    
    const nb = Math.max(1, nbDice);
    const mod = modifier;
    const res = lancerDes(nb, faces, mod);
    
    const labelPart = `(${statName}=${faces})`;
    const diceString = `${nb}d${labelPart}${mod !== 0 ? (mod > 0 ? '+' : '') + mod : ''}`;
    
    const result = {
      rolls: res.rolls,
      total: res.total,
      bonus: mod,
      diceString,
      label: statName,
      color: '#d4af37',
      secret: !diceSharingEnabled,
      timestamp: Date.now(),
      sender_id: user?.id,
      sender_name: character.name
    };

    setDiceResult([result]);

    const logEntry = {
      id: crypto.randomUUID(),
      type: 'des',
      action: `Lance ${result.label} (${diceString})`,
      details: { rolls: res.rolls, total: res.total, diceString },
      timestamp: Date.now(),
      character_id: character.id,
      character_name: character.name
    };

    if (window.electronAPI) {
      await addSessionLog(sessionId, logEntry as any);
    }

    if (diceSharingEnabled) {
      broadcast({ type: 'DICE_ROLL', payload: result });
    }
  };

  // ── renderers ──────────────────────────────────
  const renderStat = (stat: unknown) => {
    const s = stat as { id: string; name: string };
    const val = stats[s.id] || 20;
    return (
      <div
        key={s.id}
        onClick={() => handleRollStat(s.name, val)}
        className="flex items-center justify-between flex-shrink-0 rounded-lg cursor-pointer group"
        style={{
          padding: isPopup ? '5px 8px' : '7px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.3)';
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(212,175,55,0.08)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
        }}
      >
        <span
          className="font-cinzel uppercase tracking-widest truncate mr-2 flex-1 min-w-0 group-hover:text-gold-bright transition-colors"
          style={{ fontSize: isPopup ? '8px' : '10px', color: 'rgba(255,255,255,0.75)' }}
          title={s.name}
        >
          {s.name}
        </span>
        <span className="font-cinzel font-black" style={{ fontSize: isPopup ? '10px' : '13px', color: '#d4af37' }}>
          D{val}
        </span>
      </div>
    );
  };

  const renderBar = (bar: unknown) => {
    const b = bar as { id: string; name: string; color: string };
    const maxKey = `max${b.id.charAt(0).toUpperCase()}${b.id.slice(1)}`;
    const maxVal = (bars as Record<string, number>)[maxKey] || (bars as Record<string, number>)[b.id] || 1;
    const currentVal = (bars as Record<string, number>)[b.id] || 0;
    const percent = Math.min(100, Math.max(0, (currentVal / maxVal) * 100));

    return (
      <div
        key={b.id}
        className="flex flex-col justify-center flex-shrink-0 rounded-lg p-2"
        style={{
          padding: isPopup ? '5px 8px' : '8px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          gap: isPopup ? 4 : 6,
          transition: 'border-color 0.2s',
        }}
      >
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="font-cinzel uppercase tracking-widest text-[8px] sm:text-[10px] truncate flex-1 min-w-0" title={b.name} style={{ color: b.color }}>{b.name}</span>
          <span className="font-mono font-black text-[8px] sm:text-[10px] truncate shrink-0 max-w-[50%]" title={`${Math.floor(currentVal)}/${Math.floor(maxVal)}`} style={{ color: b.color }}>{Math.floor(currentVal)}/{Math.floor(maxVal)}</span>
        </div>
        <LiquidBar percent={percent} color={b.color} height={isPopup ? 4 : 6} />
      </div>
    );
  };

  // ── POPUP layout ───────────────────────────────
  if (isPopup) {
    return (
      <>
        <style>{`
          @keyframes shimmer-sweep {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
        
        <CustomAvatarPrompt />

        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* ── Header ── */}
          <div className="flex-shrink-0 flex items-center gap-3 p-2 bg-black/40 border-b border-gold-DEFAULT/10">
            <div className="relative">
              <div 
                className="w-8 h-8 shrink-0 rounded-full border border-gold-DEFAULT/30 bg-black/60 overflow-hidden cursor-pointer hover:border-gold-DEFAULT transition-colors"
                onClick={handleAvatarClick}
              >
                {image_url ? <img src={image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gold-DEFAULT font-cinzel font-black">{name.charAt(0)}</div>}
              </div>
              <button 
                onClick={toggleTokenPlacement}
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0D0D0F] shadow-lg transition-all flex items-center justify-center ${
                    isTokenOnMap 
                        ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                        : 'bg-black/80 text-gold-DEFAULT border-gold-DEFAULT/40 hover:border-gold-DEFAULT'
                }`}
                title={isTokenOnMap ? "Retirer de la carte" : "Placer sur la carte"}
              >
                <Plus size={12} className={`transition-transform duration-500 ${isTokenOnMap ? 'rotate-45' : ''}`} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[10px] font-cinzel font-black text-gold-bright truncate uppercase tracking-widest" title={name}>{name}</h2>
            </div>
          </div>

          <div className="flex gap-2 p-2 h-[160px]">
            <SnapColumn items={statDefs} itemsPerPage={itemsPerPage} renderItem={renderStat} label="Attributs" variant="popup" />
            <SnapColumn items={barDefs} itemsPerPage={itemsPerPage} renderItem={renderBar} label="Ressources" variant="popup" />
          </div>
        </div>
      </>
    );
  }

  // ── WINDOW (full-screen) layout ────────────────
  return (
    <>
      <style>{`
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      
      <CustomAvatarPrompt />

      <div className="flex flex-col h-full w-full overflow-hidden p-4">
        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center gap-4 mb-4 p-3 bg-black/40 border border-gold-DEFAULT/15 rounded-xl shadow-lg">
          <div className="relative">
            <div 
              className="w-14 h-14 shrink-0 rounded-full border-2 border-gold-DEFAULT/30 bg-black/60 overflow-hidden cursor-pointer hover:border-gold-DEFAULT transition-colors"
              onClick={handleAvatarClick}
            >
              {image_url ? <img src={image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gold-DEFAULT font-cinzel font-black text-2xl">{name.charAt(0)}</div>}
            </div>
            <button 
              onClick={toggleTokenPlacement}
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0D0D0F] shadow-sm transition-colors ${isTokenOnMap ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'}`}
              title={isTokenOnMap ? "Retirer de la carte" : "Placer sur la carte"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-cinzel font-black text-gold-bright uppercase tracking-[0.2em] truncate" title={name}>{name}</h1>
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          <SnapColumn items={statDefs} itemsPerPage={itemsPerPage} renderItem={renderStat} label="Attributs Primordiaux" variant="window" />
          <SnapColumn items={barDefs} itemsPerPage={itemsPerPage} renderItem={renderBar} label="Essences Vitales" variant="window" />
        </div>
      </div>
    </>
  );
}
