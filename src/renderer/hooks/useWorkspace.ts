import { useState, useEffect, useCallback, useMemo } from 'react';
import { Workspace, Session } from '../../shared/types';

interface UseWorkspaceReturn {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  // Workspace methods
  createWorkspace: () => Promise<void>;
  selectWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  reorderWorkspaces: (ids: string[]) => Promise<void>;
  openInVSCode: (path: string) => Promise<void>;
  openInExplorer: (path: string) => Promise<void>;
  // Session methods
  createSession: (name?: string, initialCommand?: string) => Promise<void>;
  createSessionForWorkspace: (workspaceId: string, name: string, initialCommand: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export function useWorkspace(): UseWorkspaceReturn {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeWorkspace = useMemo(() =>
    workspaces.find(w => w.id === activeWorkspaceId) || null
    , [workspaces, activeWorkspaceId]);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const loadedWorkspaces = await window.electronAPI.workspaces.getAll();
        setWorkspaces(loadedWorkspaces);
        if (loadedWorkspaces.length > 0) {
          setActiveWorkspaceId(loadedWorkspaces[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Sync sessions when active workspace changes
  useEffect(() => {
    if (!activeWorkspaceId) {
      setSessions([]);
      return;
    }
    async function loadSessions() {
      try {
        const loadedSessions = await window.electronAPI.sessions.getByWorkspace(activeWorkspaceId!);
        setSessions(loadedSessions);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    }
    loadSessions();
  }, [activeWorkspaceId]);

  // Listen for sessions created remotely (from phone)
  useEffect(() => {
    const unsubscribe = window.electronAPI.sessions.onCreated((session) => {
      // Only add if it belongs to the active workspace
      if (session.workspaceId === activeWorkspaceId) {
        setSessions(prev => {
          // Avoid duplicates
          if (prev.some(s => s.id === session.id)) return prev;
          return [...prev, session];
        });
      }
    });
    return unsubscribe;
  }, [activeWorkspaceId]);

  // --- WORKSPACE METHODS ---

  const createWorkspace = useCallback(async () => {
    const result = await window.electronAPI.workspaces.create();
    if (result.success && result.workspace) {
      setWorkspaces(prev => [...prev, result.workspace!]);
      setActiveWorkspaceId(result.workspace.id);
    } else if (result.error) {
      setError(result.error);
    }
  }, []);

  const selectWorkspace = useCallback((id: string) => {
    setActiveWorkspaceId(id);
    window.electronAPI.workspaces.updateLastAccessed(id);
    setWorkspaces(prev =>
      prev.map(w => w.id === id ? { ...w, lastAccessedAt: Date.now() } : w)
    );
  }, []);

  const reorderWorkspaces = useCallback(async (ids: string[]) => {
    // Optimistic update
    setWorkspaces(prev => {
      const reordered = ids.map(id => prev.find(w => w.id === id)).filter(Boolean) as Workspace[];
      const missing = prev.filter(w => !ids.includes(w.id));
      return [...reordered, ...missing];
    });
    await window.electronAPI.workspaces.reorder(ids);
  }, []);

  const renameWorkspace = useCallback(async (id: string, name: string) => {
    await window.electronAPI.workspaces.rename(id, name);
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name } : w));
  }, []);

  const deleteWorkspace = useCallback(async (id: string) => {
    await window.electronAPI.workspaces.delete(id);
    setWorkspaces(prev => {
      const filtered = prev.filter(w => w.id !== id);
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [activeWorkspaceId]);

  const openInVSCode = useCallback(async (path: string) => {
    await window.electronAPI.workspaces.openInVSCode(path);
  }, []);

  const openInExplorer = useCallback(async (path: string) => {
    await window.electronAPI.workspaces.openInExplorer(path);
  }, []);

  // --- SESSION METHODS ---

  const createSession = useCallback(async (name?: string, initialCommand?: string) => {
    if (!activeWorkspaceId) return;
    const session = await window.electronAPI.sessions.create(activeWorkspaceId, name, initialCommand);
    setSessions(prev => [...prev, session]);
  }, [activeWorkspaceId]);

  const createSessionForWorkspace = useCallback(async (workspaceId: string, name: string, initialCommand: string) => {
    const session = await window.electronAPI.sessions.create(workspaceId, name, initialCommand);
    if (workspaceId === activeWorkspaceId) {
      setSessions(prev => [...prev, session]);
    }
  }, [activeWorkspaceId]);

  const renameSession = useCallback(async (id: string, name: string) => {
    await window.electronAPI.sessions.rename(id, name);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await window.electronAPI.sessions.delete(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    sessions,
    isLoading,
    error,
    createWorkspace,
    selectWorkspace,
    renameWorkspace,
    deleteWorkspace,
    reorderWorkspaces,
    openInVSCode,
    openInExplorer,
    createSession,
    createSessionForWorkspace,
    renameSession,
    deleteSession,
  };
}
