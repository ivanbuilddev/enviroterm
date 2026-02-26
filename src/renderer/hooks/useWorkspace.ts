import { useState, useEffect, useCallback, useMemo } from 'react';
import { Workspace, Session } from '../../shared/types';

interface UseWorkspaceReturn {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  sessionsByWorkspace: Record<string, Session[]>;
  isLoading: boolean;
  error: string | null;
  // Workspace methods
  createWorkspace: () => Promise<void>;
  selectWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  reorderWorkspaces: (ids: string[]) => Promise<void>;
  setExplorerOpen: (workspaceId: string, isOpen: boolean) => Promise<void>;
  setBottomPanelOpen: (workspaceId: string, isOpen: boolean) => Promise<void>;
  setBrowserPanelOpen: (workspaceId: string, isOpen: boolean) => Promise<void>;
  setEditorWidth: (workspaceId: string, width: number) => Promise<void>;
  setWorkspaceActiveFilePath: (workspaceId: string, path: string | null) => Promise<void>;
  openInVSCode: (path: string) => Promise<void>;
  openInExplorer: (path: string) => Promise<void>;
  // Session methods
  createSession: (name?: string, initialCommand?: string) => Promise<Session | undefined>;
  createSessionForWorkspace: (workspaceId: string, name: string, initialCommand: string) => Promise<Session>;
  renameSession: (id: string, name: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export function useWorkspace(): UseWorkspaceReturn {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [sessionsByWorkspace, setSessionsByWorkspace] = useState<Record<string, Session[]>>({});
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

  // Load sessions for ALL workspaces when workspaces change
  useEffect(() => {
    if (workspaces.length === 0) {
      setSessionsByWorkspace({});
      return;
    }
    async function loadAllSessions() {
      try {
        const fetchPromises = workspaces.map(w => window.electronAPI.sessions.getByWorkspace(w.id));
        const allSessionsList = await Promise.all(fetchPromises);

        const newSessionsDict: Record<string, Session[]> = {};
        workspaces.forEach((w, index) => {
          newSessionsDict[w.id] = allSessionsList[index];
        });
        setSessionsByWorkspace(newSessionsDict);
      } catch (err) {
        console.error('Failed to load all sessions:', err);
      }
    }
    loadAllSessions();
  }, [workspaces.map(w => w.id).join(',')]); // Only run when the list of workspace IDs changes

  // Listen for sessions created remotely (from phone)
  useEffect(() => {
    const unsubscribe = window.electronAPI.sessions.onCreated((session) => {
      setSessionsByWorkspace(prev => {
        const workspaceSessions = prev[session.workspaceId] || [];
        if (workspaceSessions.some(s => s.id === session.id)) return prev;

        return {
          ...prev,
          [session.workspaceId]: [...workspaceSessions, session]
        };
      });
    });
    return unsubscribe;
  }, []);

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

  const setExplorerOpen = useCallback(async (workspaceId: string, isOpen: boolean) => {
    await window.electronAPI.workspaces.setExplorerOpen(workspaceId, isOpen);
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, isExplorerOpen: isOpen } : w));
  }, []);

  const setBottomPanelOpen = useCallback(async (workspaceId: string, isOpen: boolean) => {
    await window.electronAPI.workspaces.setBottomPanelOpen(workspaceId, isOpen);
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, isBottomPanelOpen: isOpen } : w));
  }, []);

  const setBrowserPanelOpen = useCallback(async (workspaceId: string, isOpen: boolean) => {
    await window.electronAPI.workspaces.setBrowserPanelOpen(workspaceId, isOpen);
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, isBrowserPanelOpen: isOpen } : w));
  }, []);

  const setEditorWidth = useCallback(async (workspaceId: string, width: number) => {
    await window.electronAPI.workspaces.setEditorWidth(workspaceId, width);
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, editorWidth: width } : w));
  }, []);

  const setWorkspaceActiveFilePath = useCallback(async (workspaceId: string, path: string | null) => {
    await window.electronAPI.workspaces.setActiveFilePath(workspaceId, path);
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, activeFilePath: path } : w));
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
    if (!activeWorkspaceId) return undefined;
    const session = await window.electronAPI.sessions.create(activeWorkspaceId, name, initialCommand);
    setSessionsByWorkspace(prev => ({
      ...prev,
      [activeWorkspaceId]: [...(prev[activeWorkspaceId] || []), session]
    }));
    return session;
  }, [activeWorkspaceId]);

  const createSessionForWorkspace = useCallback(async (workspaceId: string, name: string, initialCommand: string) => {
    const session = await window.electronAPI.sessions.create(workspaceId, name, initialCommand);
    setSessionsByWorkspace(prev => ({
      ...prev,
      [workspaceId]: [...(prev[workspaceId] || []), session]
    }));
    return session;
  }, []);

  const renameSession = useCallback(async (id: string, name: string) => {
    await window.electronAPI.sessions.rename(id, name);
    setSessionsByWorkspace(prev => {
      const next = { ...prev };
      for (const workspaceId in next) {
        const sessions = next[workspaceId];
        const index = sessions.findIndex(s => s.id === id);
        if (index !== -1) {
          next[workspaceId] = [
            ...sessions.slice(0, index),
            { ...sessions[index], name },
            ...sessions.slice(index + 1)
          ];
          break;
        }
      }
      return next;
    });
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await window.electronAPI.sessions.delete(id);

    // Also instruct terminal service to kill the PTY
    window.electronAPI.terminal.kill(id);

    setSessionsByWorkspace(prev => {
      const next = { ...prev };
      for (const workspaceId in next) {
        const sessions = next[workspaceId];
        if (sessions.some(s => s.id === id)) {
          next[workspaceId] = sessions.filter(s => s.id !== id);
          break;
        }
      }
      return next;
    });
  }, []);

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    sessionsByWorkspace,
    isLoading,
    error,
    createWorkspace,
    selectWorkspace,
    renameWorkspace,
    deleteWorkspace,
    reorderWorkspaces,
    setExplorerOpen,
    setBottomPanelOpen,
    setBrowserPanelOpen,
    setEditorWidth,
    setWorkspaceActiveFilePath,
    openInVSCode,
    openInExplorer,
    createSession,
    createSessionForWorkspace,
    renameSession,
    deleteSession,
  };
}
