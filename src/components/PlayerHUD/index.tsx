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
    <div className={className || "absolute top-4 right-4 flex flex-col gap-3 z-10 pointer-events-none"}>
      {/* Self (Moi) */}
      <div className="flex items-center gap-3 bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/30 p-1.5 pr-4 rounded-full shadow-2xl pointer-events-auto hover:border-gold-DEFAULT transition-colors group">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a2800] to-[#1a1400] border-2 border-gold-DEFAULT flex items-center justify-center text-gold-bright text-sm font-bold shadow-[0_0_15px_rgba(212,160,23,0.2)] group-hover:shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-all">
            {user?.pseudo.substring(0, 2).toUpperCase() || 'ME'}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#0D0D0F] flex items-center justify-center border border-gold-DEFAULT/20">
            <div className="w-2 h-2 rounded-full bg-[#8ab040] shadow-[0_0_5px_#8ab040]" />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#e8d5a0] font-bold tracking-wide">{user?.pseudo}</span>
            {isHost && (
              <span className="text-[8px] bg-gold-DEFAULT text-[#0D0D0F] px-1.5 py-0.5 rounded font-black uppercase">MJ</span>
            )}
          </div>
          <span className="text-[9px] text-gold-dim/70 font-mono tracking-tighter">
            {peerId?.split('-').slice(-1)[0] || 'Initialisation...'}
          </span>
        </div>
      </div>

      {/* Other Players (Voyageurs) */}
      {otherPlayers.map((p) => {
        const initial = p.pseudo.substring(0, 2).toUpperCase();
        return (
          <div key={p.peer_id} className="flex items-center gap-3 bg-[#0D0D0F]/60 backdrop-blur-lg border border-border-dark p-1.5 pr-4 rounded-full pointer-events-auto hover:border-silver-DEFAULT transition-all">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1e1e24] to-[#0D0D0F] border border-silver-dim flex items-center justify-center text-silver-bright text-xs font-bold">
                {initial}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#0D0D0F] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8ab040]" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-silver-dim font-medium italic">{p.pseudo}</span>
                {p.pseudo === 'MJ' && (
                  <span className="text-[7px] bg-silver-DEFAULT text-[#0D0D0F] px-1 py-0.5 rounded font-black uppercase">MJ</span>
                )}
              </div>
              <span className="text-[9px] text-silver-dim/40 font-mono italic">
                {p.peer_id.split('-').slice(-1)[0]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}