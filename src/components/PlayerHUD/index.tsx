import { usePeersStore } from '../../store/peers';
import { useAuthStore } from '../../store/auth';

interface Player {
  peer_id: string;
  pseudo: string;
}

interface PlayerHUDProps {
  players: Player[];
  className?: string;
}

export function PlayerHUD({ players, className }: PlayerHUDProps) {
  const { peerId, isHost } = usePeersStore();
  const { user } = useAuthStore();

  // On filtre les autres joueurs (ceux qui ne sont pas nous)
  const otherPlayers = players.filter(p => p.peer_id !== peerId);

  return (
    <div className={className || "absolute top-8 left-8 flex flex-col gap-4 z-10 pointer-events-none"}>
      {/* Self (Moi) */}
      <div className="flex items-center gap-4 pointer-events-auto group">
        <div className="relative">
          {/* Anneau rotatif façon Jarvis/HUD */}
          <div className="absolute inset-[-4px] rounded-full border border-gold-DEFAULT/40 group-hover:border-gold-DEFAULT/50 group-hover:rotate-180 transition-all duration-1000 ease-linear" />
          
          <div className="w-12 h-12 rounded-full bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/40 flex items-center justify-center text-gold-bright text-lg font-cinzel font-black shadow-[0_0_20px_rgba(212,175,55,0.15)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all">
            {user?.pseudo.substring(0, 1).toUpperCase() || 'M'}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0D0D0F] flex items-center justify-center border border-gold-DEFAULT/40">
            <div className="w-2 h-2 rounded-full bg-[#8ab040] shadow-[0_0_8px_#8ab040] animate-pulse" />
          </div>
        </div>
        <div className="flex flex-col opacity-90 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gold-DEFAULT font-cinzel tracking-widest uppercase drop-shadow-md">{user?.pseudo}</span>
            {isHost && (
              <span className="text-[9px] bg-gold-DEFAULT text-black px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest shadow-[0_0_10px_rgba(212,175,55,0.4)]">MJ</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-[1px] w-8 bg-gold-DEFAULT/50" />
            <span className="text-[10px] text-white/70 font-sans tracking-widest drop-shadow-md">
              ID: {peerId?.split('-').slice(-1)[0] || 'INIT'}
            </span>
          </div>
        </div>
      </div>

      {/* Ligne séparatrice optionnelle si d'autres joueurs */}
      {otherPlayers.length > 0 && (
        <div className="w-[1px] h-4 bg-white/20 ml-6 drop-shadow-md" />
      )}

      {/* Other Players (Voyageurs) */}
      <div className="flex flex-col gap-3">
        {otherPlayers.map((p) => {
          const initial = p.pseudo.substring(0, 1).toUpperCase();
          return (
            <div key={p.peer_id} className="flex items-center gap-4 pointer-events-auto group opacity-80 hover:opacity-100 transition-all">
              <div className="relative ml-2">
                <div className="w-9 h-9 rounded-full bg-[#0D0D0F]/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 text-sm font-cinzel group-hover:border-white/40 group-hover:text-white transition-all shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  {initial}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#0D0D0F] flex items-center justify-center border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8ab040]" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/90 font-cinzel tracking-wider group-hover:text-white transition-colors drop-shadow-md">{p.pseudo}</span>
                  {p.pseudo === 'MJ' && (
                    <span className="text-[8px] border border-white/30 text-white/80 px-1 py-0.5 rounded-sm font-black uppercase drop-shadow-md">MJ</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}