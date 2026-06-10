import React from 'react';
import { CoreEngine } from './CoreEngine';
import SealSystem from '../seal';
import type { GameSystem } from './types';

// ── Registry of all available game systems ──────────────────────────────────
// To add a new system, import it and add it to this array.
const SYSTEM_REGISTRY: GameSystem[] = [
  SealSystem,
  // e.g.: Srd5System,
];

interface SystemRouterProps {
  system: string;
  isMJ: boolean;
  isHost: boolean;
  onPause: () => void;
  onLeave?: () => void;
  sessionId: string;
  imageUrl?: string;
  players: { peer_id: string; pseudo: string; role?: number }[];
  lobbyMode?: boolean;
}

export function SystemRouter({ system, isMJ, isHost, onPause, onLeave, sessionId, imageUrl, players, lobbyMode }: SystemRouterProps) {
  const safeSystem = typeof system === 'string' ? system.toLowerCase() : 'unknown';

  const systemConfig = SYSTEM_REGISTRY.find(s => s.id === safeSystem);

  if (!systemConfig) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black text-glacier-bright font-quantico">
        <h2 className="text-xl tracking-widest uppercase mb-4">Système Inconnu: {String(system)}</h2>
        <p className="text-xs italic opacity-50">Aucun moteur n'a été trouvé pour cette arcane.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      <CoreEngine
        sessionId={sessionId}
        systemConfig={systemConfig}
        onPause={onPause}
        onLeave={onLeave}
        players={players}
        imageUrl={imageUrl}
        lobbyMode={lobbyMode}
        isHost={isHost}
      />
    </div>
  );
}
