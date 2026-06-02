import React from 'react';
import { useAudioStore } from '../../store/audio';

interface TrackItemProps {
  trackHash: string;
  name: string;
  onPlay: (hash: string) => void;
  onDelete?: (hash: string) => void;
}

export const TrackItem: React.FC<TrackItemProps> = ({ trackHash, name, onPlay, onDelete }) => {
  const status = useAudioStore(state => state.trackStatuses[trackHash] || 'missing');

  const getStatusColor = () => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'transferring': return 'bg-orange-500 animate-pulse';
      case 'missing':
      default:
        return 'bg-red-500';
    }
  };

  return (
    <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors group">
      <div className="flex items-center space-x-3">
        {/* Status LED */}
        <div className={`w-3 h-3 rounded-full shadow-sm ${getStatusColor()} shadow-[0_0_8px_currentColor] transition-colors duration-300`} />
        
        <span className="text-gray-200 text-sm font-medium truncate max-w-[150px]" title={name}>
          {name}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPlay(trackHash)}
          disabled={status !== 'ready'}
          className={`p-1.5 rounded-full transition-all ${
            status === 'ready' 
              ? 'text-green-400 hover:bg-green-400/20 hover:scale-110 cursor-pointer' 
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title={status === 'ready' ? 'Jouer la piste' : 'En attente de synchronisation...'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
          </svg>
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(trackHash)}
            className="p-1.5 rounded-full text-red-500/50 hover:bg-red-500/20 hover:text-red-500 hover:scale-110 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
            title="Supprimer la piste"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
