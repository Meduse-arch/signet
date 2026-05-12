import { useState } from 'react';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { Shield, Zap, Heart, User, ChevronRight } from 'lucide-react';

interface Player {
  peer_id: string;
  pseudo: string;
  role?: number;
}

interface PlayerWindowContentProps {
  players: Player[];
}

export function PlayerWindowContent({ players }: PlayerWindowContentProps) {
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const getRoleLabel = (role?: number) => {
    if (role === SecurityLevel.ADMIN) return 'ADMINISTRATEUR';
    if (role === SecurityLevel.MJ) return 'MAÎTRE DE JEU';
    return 'INITIÉ';
  };

  // Vue Fiche de Personnage
  const renderCharacterSheet = (player: Player | null) => {
    const pseudo = player ? player.pseudo : user?.pseudo || 'Inconnu';
    const isMe = !player || player.pseudo === user?.pseudo;

    return (
      <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Header Fiche */}
        <div className="flex items-center gap-4 border-b border-gold-DEFAULT/20 pb-4">
          <div className="w-14 h-14 rounded-full bg-black/60 border border-gold-DEFAULT/40 flex items-center justify-center shadow-[inset_0_0_15px_rgba(212,175,55,0.2)]">
            <span className="text-2xl font-cinzel text-gold-bright drop-shadow-md">
              {pseudo.substring(0, 1).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-cinzel font-black text-gold-DEFAULT tracking-widest drop-shadow-md uppercase">
              {pseudo}
            </h2>
            <p className="text-[10px] text-white/50 font-serif italic">
              {isMe ? "Votre personnage" : "Voyageur de l'Archive"}
            </p>
          </div>
        </div>

        {/* Stats de base */}
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-white/70">
              <span className="flex items-center gap-2"><Heart className="w-3 h-3 text-red-500" /> Vitalité</span>
              <span>45 / 50</span>
            </div>
            <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-red-500/20">
              <div className="h-full bg-red-500 w-[90%] shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-white/70">
              <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-blue-400" /> Mana / Ether</span>
              <span>12 / 20</span>
            </div>
            <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-blue-400/20">
              <div className="h-full bg-blue-400 w-[60%] shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-white/70">
              <span className="flex items-center gap-2"><Shield className="w-3 h-3 text-green-400" /> Endurance</span>
              <span>80 / 100</span>
            </div>
            <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-green-400/20">
              <div className="h-full bg-green-400 w-[80%] shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
            </div>
          </div>
        </div>

        {/* Section Infos */}
        <div className="p-4 rounded-xl bg-gold-DEFAULT/5 border border-gold-DEFAULT/20 min-h-[100px]">
          <p className="text-xs text-center text-gold-DEFAULT/60 font-serif italic mt-4">
            Inventaire et compétences scellés...
          </p>
        </div>
      </div>
    );
  };

  // Si on est joueur, on voit direct sa propre fiche
  if (!isMJ) {
    return renderCharacterSheet(null);
  }

  // Si on est MJ et qu'on a cliqué sur un joueur
  if (isMJ && selectedPlayer) {
    return (
      <div className="flex flex-col h-full">
        <button 
          onClick={() => setSelectedPlayer(null)}
          className="self-start mb-4 text-[10px] font-cinzel text-gold-DEFAULT hover:text-gold-bright transition-colors uppercase tracking-widest flex items-center"
        >
          <ChevronRight className="w-3 h-3 rotate-180" />
          Retour à la liste
        </button>
        {renderCharacterSheet(selectedPlayer)}
      </div>
    );
  }

  // Si on est MJ et qu'on regarde la liste
  return (
    <div className="flex flex-col gap-2">
      {players.map((p) => (
        <button
          key={p.peer_id}
          onClick={() => setSelectedPlayer(p)}
          className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-gold-DEFAULT/20 hover:bg-gold-DEFAULT/10 hover:border-gold-DEFAULT/40 transition-all group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-black/60 border border-gold-DEFAULT/30 flex items-center justify-center group-hover:border-gold-bright transition-colors">
              <User className="w-4 h-4 text-gold-DEFAULT group-hover:text-gold-bright" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-cinzel font-bold text-white/90 group-hover:text-white drop-shadow-md">
                {p.pseudo}
              </span>
              <span className="text-[9px] text-white/40 font-mono">
                {getRoleLabel(p.role)}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gold-DEFAULT/50 group-hover:text-gold-bright transition-colors" />
        </button>
      ))}
      {players.length === 0 && (
        <p className="text-xs text-center text-gold-DEFAULT/50 font-serif italic py-8">
          Aucun voyageur connecté...
        </p>
      )}
    </div>
  );
}
