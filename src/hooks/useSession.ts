import { useEffect } from 'react';
import { useSessionStore } from '../store/session';
import { getAllSessions, addSession, removeSession as dbRemoveSession } from '../services/db.service';
import { Session } from '../services/session.service';

export function useSession() {
  const { sessions, isLoading, setSessions, addSession: storeAdd, removeSession: storeRemove, setLoading } = useSessionStore();

  useEffect(() => {
    let mounted = true;
    
    async function fetchSessions() {
      setLoading(true);
      try {
        // Sessions SQLite (pour l'hôte/Electron)
        const dbSessions = await getAllSessions();
        
        // Sessions invoquées (pour le joueur/Web)
        const summonedSessions = JSON.parse(localStorage.getItem('summoned_sessions') || '[]');
        
        if (mounted) {
          // Fusionner les deux listes en évitant les doublons
          const allSessions = [...dbSessions];
          summonedSessions.forEach((s: Session) => {
            if (!allSessions.find(exist => exist.id === s.id || exist.hostPeerId === s.hostPeerId)) {
              allSessions.push(s);
            }
          });
          
          setSessions(allSessions.sort((a, b) => b.lastPlayed - a.lastPlayed));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSessions();

    return () => { mounted = false; };
  }, [setSessions, setLoading]);

  const add = async (session: Session) => {
    storeAdd(session); // Optimistic update
    try {
      if (session.isSummoned) {
        // Sauvegarder dans le localStorage pour les joueurs
        const summonedSessions = JSON.parse(localStorage.getItem('summoned_sessions') || '[]');
        const existsIndex = summonedSessions.findIndex((s: Session) => s.id === session.id);
        
        let updated;
        if (existsIndex >= 0) {
          updated = summonedSessions.map((s: Session, i: number) => i === existsIndex ? session : s);
        } else {
          updated = [session, ...summonedSessions];
        }
        localStorage.setItem('summoned_sessions', JSON.stringify(updated));
      } else {
        // Sauvegarder dans SQLite pour l'hôte
        await addSession(session);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const remove = async (id: string) => {
    const sessionToRemove = sessions.find(s => s.id === id);
    storeRemove(id); // Optimistic update
    
    try {
      if (sessionToRemove?.isSummoned) {
        // Supprimer du localStorage
        const summonedSessions = JSON.parse(localStorage.getItem('summoned_sessions') || '[]');
        const updated = summonedSessions.filter((s: Session) => s.id !== id);
        localStorage.setItem('summoned_sessions', JSON.stringify(updated));
      } else {
        // Supprimer de SQLite
        await dbRemoveSession(id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return { sessions, addSession: add, removeSession: remove, isLoading };
}