import { useState, useEffect, useCallback } from 'react';
import { Session } from '../../shared/types';

interface UseSessionsReturn {
  sessions: Session[];
  selectedSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  createSession: () => Promise<void>;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    async function loadSessions() {
      try {
        const loaded = await window.electronAPI.sessions.getAll();
        setSessions(loaded);
        // Auto-select most recent if exists
        if (loaded.length > 0) {
          setSelectedSessionId(loaded[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, []);

  const createSession = useCallback(async () => {
    const result = await window.electronAPI.sessions.create();
    if (result.success && result.session) {
      // Add new session to beginning (most recent)
      setSessions(prev => [result.session!, ...prev]);
      setSelectedSessionId(result.session.id);
    } else if (result.error) {
      setError(result.error);
    }
    // If cancelled, do nothing
  }, []);

  const selectSession = useCallback(async (id: string) => {
    setSelectedSessionId(id);
    await window.electronAPI.sessions.updateLastAccessed(id);
    // Re-sort sessions after updating timestamp
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === id ? { ...s, lastAccessedAt: Date.now() } : s
      );
      return updated.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    });
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await window.electronAPI.sessions.delete(id);
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      // If deleted session was selected, select next available
      if (selectedSessionId === id) {
        setSelectedSessionId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [selectedSessionId]);

  return {
    sessions,
    selectedSessionId,
    isLoading,
    error,
    createSession,
    selectSession,
    deleteSession,
  };
}
