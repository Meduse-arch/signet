import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';

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
              height: '100%',         // each page = full container height
              padding: isPopup ? '4px' : '6px',
              gap: isPopup ? '3px' : '5px',
              justifyContent: 'space-evenly',
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
  const session = useSessionStore(state =>
    state.sessions.find(s => s.id === sessionId)
  );

  const character = characters.find(c => c.user_id === user?.id);

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

  const { name, stats, bars, image_url } = character;
  const statDefs = session?.settings?.stats || DEFAULT_STATS;
  const barDefs = session?.settings?.bars || DEFAULT_BARS;

  const isPopup = variant === 'popup';

  // ── how many items visible per page per mode ──
  const ITEMS_PER_PAGE = 3;

  // ── renderers ──────────────────────────────────
  const renderStat = (stat: unknown) => {
    const s = stat as { id: string; name: string };
    return (
      <div
        key={s.id}
        className="flex items-center justify-between flex-shrink-0 rounded-lg"
        style={{
          padding: isPopup ? '5px 8px' : '7px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e =>
          ((e.currentTarget as HTMLDivElement).style.borderColor =
            'rgba(212,175,55,0.3)')
        }
        onMouseLeave={e =>
          ((e.currentTarget as HTMLDivElement).style.borderColor =
            'rgba(255,255,255,0.07)')
        }
      >
        <span
          className="font-cinzel uppercase tracking-widest truncate mr-2 flex-1 min-w-0"
          style={{
            fontSize: isPopup ? '8px' : '10px',
            color: 'rgba(255,255,255,0.75)',
          }}
          title={s.name}
        >
          {s.name}
        </span>
        <span
          className="font-cinzel font-black flex-shrink-0"
          style={{
            fontSize: isPopup ? '10px' : '13px',
            color: '#d4af37',
          }}
        >
          {stats[s.id] || 0}
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
        className="flex flex-col justify-center flex-shrink-0 rounded-lg"
        style={{
          padding: isPopup ? '5px 8px' : '8px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          gap: isPopup ? 4 : 6,
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e =>
          ((e.currentTarget as HTMLDivElement).style.borderColor =
            'rgba(212,175,55,0.3)')
        }
        onMouseLeave={e =>
          ((e.currentTarget as HTMLDivElement).style.borderColor =
            'rgba(255,255,255,0.07)')
        }
      >
        <div className="flex items-center justify-between">
          <span
            className="font-cinzel uppercase tracking-widest truncate mr-2 flex-1 min-w-0"
            style={{
              fontSize: isPopup ? '8px' : '10px',
              color: b.color,
              textShadow: `0 0 8px ${b.color}66`,
            }}
            title={b.name}
          >
            {b.name}
          </span>
          <span
            className="font-mono font-black flex-shrink-0"
            style={{
              fontSize: isPopup ? '8px' : '11px',
              color: b.color,
            }}
          >
            {Math.floor(currentVal)}/{Math.floor(maxVal)}
          </span>
        </div>
        <LiquidBar
          percent={percent}
          color={b.color}
          height={isPopup ? 5 : 8}
        />
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

        <div
          className="flex flex-col"
          style={{ width: '100%', height: '100%', overflow: 'hidden' }}
        >
          {/* ── Header compact ── */}
          <div
            className="flex-shrink-0 flex items-center gap-2 p-2"
            style={{
              background: 'rgba(0,0,0,0.35)',
              borderBottom: '1px solid rgba(212,175,55,0.15)',
            }}
          >
            <div
              className="flex-shrink-0 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                width: 32,
                height: 32,
                background: 'rgba(30,22,10,0.8)',
                border: '1px solid rgba(212,175,55,0.4)',
                boxShadow: '0 0 10px rgba(212,175,55,0.1)',
              }}
            >
              {image_url ? (
                <img src={image_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span
                  className="font-cinzel font-black"
                  style={{ fontSize: 13, color: '#d4af37' }}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h2
              className="font-cinzel font-black uppercase tracking-widest truncate flex-1 min-w-0"
              style={{ fontSize: 13, color: '#d4af37' }}
            >
              {name}
            </h2>
          </div>

          {/* ── Two independent snap columns ── */}
          <div className="flex-1 min-h-0 flex gap-2 p-2">
            <SnapColumn
              items={statDefs}
              itemsPerPage={ITEMS_PER_PAGE}
              renderItem={renderStat}
              label="Attributs"
              variant="popup"
            />
            <SnapColumn
              items={barDefs}
              itemsPerPage={ITEMS_PER_PAGE}
              renderItem={renderBar}
              label="Ressources"
              variant="popup"
            />
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

      <div
        className="flex flex-col"
        style={{ width: '100%', height: '100%', overflow: 'hidden', padding: '16px' }}
      >
        {/* ── Header large ── */}
        <div
          className="flex-shrink-0 flex items-center gap-4 mb-4 p-3 rounded-xl"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(212,175,55,0.15)',
          }}
        >
          <div
            className="flex-shrink-0 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              width: 56,
              height: 56,
              background: 'rgba(30,22,10,0.8)',
              border: '1.5px solid rgba(212,175,55,0.45)',
              boxShadow: '0 0 20px rgba(212,175,55,0.15)',
            }}
          >
            {image_url ? (
              <img src={image_url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span
                className="font-cinzel font-black"
                style={{ fontSize: 22, color: '#d4af37' }}
              >
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h1
            className="font-cinzel font-black uppercase tracking-widest truncate flex-1 min-w-0"
            style={{ fontSize: 22, color: '#d4af37' }}
          >
            {name}
          </h1>
        </div>

        {/* ── Two independent snap columns, fill remaining height ── */}
        <div className="flex-1 min-h-0 flex gap-4">
          <SnapColumn
            items={statDefs}
            itemsPerPage={ITEMS_PER_PAGE}
            renderItem={renderStat}
            label="Attributs"
            variant="window"
          />
          <SnapColumn
            items={barDefs}
            itemsPerPage={ITEMS_PER_PAGE}
            renderItem={renderBar}
            label="Ressources"
            variant="window"
          />
        </div>
      </div>
    </>
  );
}