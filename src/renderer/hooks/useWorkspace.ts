import { useState, useEffect, useCallback, useMemo } from 'react';
import { Directory, Session } from '../../shared/types';

interface UseWorkspaceReturn {
  directories: Directory[];
  activeDirectoryId: string | null;
  activeDirectory: Directory | null;
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  // Directory methods
  createDirectory: () => Promise<void>;
  selectDirectory: (id: string) => void;
  renameDirectory: (id: string, name: string) => Promise<void>;
  deleteDirectory: (id: string) => Promise<void>;
  reorderDirectories: (ids: string[]) => Promise<void>;
  openInVSCode: (path: string) => Promise<void>;
  // Session methods
  createSession: (name?: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export function useWorkspace(): UseWorkspaceReturn {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [activeDirectoryId, setActiveDirectoryId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeDirectory = useMemo(() =>
    directories.find(d => d.id === activeDirectoryId) || null
    , [directories, activeDirectoryId]);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const loadedDirs = await window.electronAPI.directories.getAll();
        setDirectories(loadedDirs);
        if (loadedDirs.length > 0) {
          setActiveDirectoryId(loadedDirs[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Sync sessions when active directory changes
  useEffect(() => {
    if (!activeDirectoryId) {
      setSessions([]);
      return;
    }
    async function loadSessions() {
      try {
        const loadedSessions = await window.electronAPI.sessions.getByDirectory(activeDirectoryId!);
        setSessions(loadedSessions);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    }
    loadSessions();
  }, [activeDirectoryId]);

  // Listen for sessions created remotely (from phone)
  useEffect(() => {
    const unsubscribe = window.electronAPI.sessions.onCreated((session) => {
      // Only add if it belongs to the active directory
      if (session.directoryId === activeDirectoryId) {
        setSessions(prev => {
          // Avoid duplicates
          if (prev.some(s => s.id === session.id)) return prev;
          return [...prev, session];
        });
      }
    });
    return unsubscribe;
  }, [activeDirectoryId]);

  // --- DIRECTORY METHODS ---

  const createDirectory = useCallback(async () => {
    const result = await window.electronAPI.directories.create();
    if (result.success && result.directory) {
      setDirectories(prev => [...prev, result.directory!]);
      setActiveDirectoryId(result.directory.id);
    } else if (result.error) {
      setError(result.error);
    }
  }, []);

  const selectDirectory = useCallback((id: string) => {
    setActiveDirectoryId(id);
    window.electronAPI.directories.updateLastAccessed(id);
    setDirectories(prev =>
      prev.map(d => d.id === id ? { ...d, lastAccessedAt: Date.now() } : d)
    );
  }, []);

  const reorderDirectories = useCallback(async (ids: string[]) => {
    // Optimistic update
    setDirectories(prev => {
      const reordered = ids.map(id => prev.find(d => d.id === id)).filter(Boolean) as Directory[];
      const missing = prev.filter(d => !ids.includes(d.id));
      return [...reordered, ...missing];
    });
    await window.electronAPI.directories.reorder(ids);
  }, []);

  const renameDirectory = useCallback(async (id: string, name: string) => {
    await window.electronAPI.directories.rename(id, name);
    setDirectories(prev => prev.map(d => d.id === id ? { ...d, name } : d));
  }, []);

  const deleteDirectory = useCallback(async (id: string) => {
    await window.electronAPI.directories.delete(id);
    setDirectories(prev => {
      const filtered = prev.filter(d => d.id !== id);
      if (activeDirectoryId === id) {
        setActiveDirectoryId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [activeDirectoryId]);

  const openInVSCode = useCallback(async (path: string) => {
    await window.electronAPI.directories.openInVSCode(path);
  }, []);

  // --- SESSION METHODS ---

  const createSession = useCallback(async (name?: string) => {
    if (!activeDirectoryId) return;
    const session = await window.electronAPI.sessions.create(activeDirectoryId, name);
    setSessions(prev => [...prev, session]);
  }, [activeDirectoryId]);

  const renameSession = useCallback(async (id: string, name: string) => {
    await window.electronAPI.sessions.rename(id, name);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await window.electronAPI.sessions.delete(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  return {
    directories,
    activeDirectoryId,
    activeDirectory,
    sessions,
    isLoading,
    error,
    createDirectory,
    selectDirectory,
    renameDirectory,
    deleteDirectory,
    reorderDirectories,
    openInVSCode,
    createSession,
    renameSession,
    deleteSession,
  };
}
