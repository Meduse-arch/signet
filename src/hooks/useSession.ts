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
        const data = await getAllSessions();
        if (mounted) {
          setSessions(data.sort((a, b) => b.lastPlayed - a.lastPlayed));
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
      await addSession(session);
    } catch (e) {
      console.error(e);
    }
  };

  const remove = async (id: string) => {
    storeRemove(id); // Optimistic update
    try {
      await dbRemoveSession(id);
    } catch (e) {
      console.error(e);
    }
  };

  return { sessions, addSession: add, removeSession: remove, isLoading };
}