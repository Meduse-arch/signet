import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { Icons } from '../ui/Icons';
import { useAudioStore } from '../../store/audio';
import { TrackItem } from './TrackItem';
import { dbStorage } from '../../services/db.storage';
import { useSessionStore } from '../../store/session';
import { audioService } from '../../services/audio.service';
import { transferService } from '../../services/transfer.service';
import { peerService } from '../../services/peer.service';

export const Jukebox: React.FC = () => {
 const fileInputRef = useRef<HTMLInputElement>(null);
 const tracks = useAudioStore(state => state.tracks);
 const addTrack = useAudioStore(state => state.addTrack);
 const [isConverting, setIsConverting] = useState(false);
 const isHost = useSessionStore(state => state.isHost);

 useEffect(() => {
 // Load cached audio tracks from DB
 const loadCache = async () => {
 const hashes = await dbStorage.getAllAudioHashes();
 // For now, we only have hashes. In a real app we'd also store the track name in DB or a master index.
 // We will just populate them with a generic name if missing.
 for (const hash of hashes) {
 if (!tracks.find(t => t.id === hash)) {
 addTrack({ id: hash, name: `Track ${hash.substring(0,6)}`, size: 0 });
 }
 }
 };
 loadCache();
 }, [addTrack, tracks]);

 const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 try {
 setIsConverting(true);
 
 const arrayBuffer = await file.arrayBuffer();
 
 // Generate SHA-256 hash
 const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
 const hashArray = Array.from(new Uint8Array(hashBuffer));
 const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

 // Store in IndexedDB
 await dbStorage.putAudio({
 hash: hashHex,
 data: arrayBuffer,
 size: arrayBuffer.byteLength,
 last_accessed: Date.now(),
 mime: file.type || 'audio/ogg'
 });

 // Add to state
 addTrack({
 id: hashHex,
 name: file.name,
 size: arrayBuffer.byteLength
 });

 // Inform peers that we have a new track
 peerService.broadcast({
 type: 'AUDIO_TRACK_ADDED',
 payload: { hash: hashHex, size: arrayBuffer.byteLength }
 });
 
 } catch (err) {
 console.error("Error uploading audio:", err);
 } finally {
 setIsConverting(false);
 if (fileInputRef.current) fileInputRef.current.value = '';
 }
 };

 const handlePlay = async (hash: string) => {
 // Check if we have it in cache
 const audioRecord = await dbStorage.getAudio(hash);
 if (audioRecord) {
 audioService.playAmbiance(hash, audioRecord.data, 'audio/ogg');
 peerService.broadcast({
 type: 'AUDIO_PLAY',
 payload: { hash, time: 0 }
 });
 }
 };

 return (
 <div className="w-80 bg-[#121216] border-l border-white/10 flex flex-col h-full shadow-2xl z-20">
 <div className="p-4 border-b border-white/10 flex items-center justify-between">
 <h2 className="text-white font-bold text-lg flex items-center gap-2">
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-400">
 <path fillRule="evenodd" d="M19.5 22.5a3 3 0 0 0 3-3v-8.174l-6.879 4.022 3.485 1.876a.75.75 0 0 1-.712 1.321l-5.683-3.06a1.5 1.5 0 0 0-1.422 0l-5.683 3.06a.75.75 0 0 1-.712-1.32l3.485-1.877L1.5 11.326V19.5a3 3 0 0 0 3 3h15Z" clipRule="evenodd" />
 <path d="M1.5 9.589v-.745a3 3 0 0 1 1.578-2.642l7.5-4.038a3 3 0 0 1 2.844 0l7.5 4.038A3 3 0 0 1 22.5 8.844v.745l-8.426 4.926-.652-.351a3 3 0 0 0-2.844 0l-.652.351-8.426-4.926Z" />
 </svg>
 Jukebox
 </h2>
 {isHost && (
 <div>
 <input
 type="file"
 accept="audio/*"
 ref={fileInputRef}
 onChange={handleFileUpload}
 className="hidden"
 />
 <button
 onClick={() => fileInputRef.current?.click()}
 disabled={isConverting}
 className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-lg shadow-purple-900/20 disabled:opacity-50"
 >
 {isConverting ? (
 <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
 ) : (
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
 <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
 </svg>
 )}
 Ajouter
 </button>
 </div>
 )}
 </div>

 <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
 {tracks.length === 0 ? (
 <div className="text-center text-gray-500 text-sm mt-8 italic">
 Aucune piste audio disponible
 </div>
 ) : (
 tracks.map(track => (
 <TrackItem
 key={track.id}
 trackHash={track.id}
 name={track.name}
 onPlay={handlePlay}
 />
 ))
 )}
 </div>
 </div>
 );
};
