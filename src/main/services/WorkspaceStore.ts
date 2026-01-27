import { randomUUID } from 'crypto';
import { Directory, Session } from '../../shared/types';
import { JsonStore } from './JsonStore';

interface StoreSchema {
  directories: Directory[];
  sessions: Session[];
}

const store = new JsonStore<StoreSchema>('workspaces_data.json', {
  directories: [],
  sessions: []
});



function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.floor(Math.random() * 15);
  const lightness = 45 + Math.floor(Math.random() * 10);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getContrastTextColor(hslColor: string): string {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return 'hsl(0, 0%, 95%)';
  const lightness = parseInt(match[3], 10);
  return lightness > 55 ? 'hsl(0, 0%, 15%)' : 'hsl(0, 0%, 95%)';
}

export const WorkspaceStore = {
  // --- DIRECTORY METHODS ---
  getDirectories(): Directory[] {
    return store.get('directories');
  },

  getDirectoryById(id: string): Directory | undefined {
    return store.get('directories').find(d => d.id === id);
  },

  createDirectory(folderPath: string): Directory {
    const now = Date.now();
    const folderName = folderPath; // The name is the full path
    const backgroundColor = generateRandomColor();

    const directory: Directory = {
      id: randomUUID(),
      path: folderPath,
      name: folderName,
      backgroundColor,
      textColor: getContrastTextColor(backgroundColor),
      lastAccessedAt: now,
      createdAt: now
    };

    const directories = store.get('directories');
    directories.push(directory);
    store.set('directories', directories);

    // Create an initial session for this directory
    this.createSession(directory.id, folderName);

    return directory;
  },

  updateDirectoryLastAccessed(id: string): void {
    const directories = store.get('directories');
    const index = directories.findIndex(d => d.id === id);
    if (index !== -1) {
      directories[index].lastAccessedAt = Date.now();
      store.set('directories', directories);
    }
  },

  renameDirectory(id: string, newName: string): void {
    const directories = store.get('directories');
    const index = directories.findIndex(d => d.id === id);
    if (index !== -1) {
      directories[index].name = newName;
      store.set('directories', directories);
    }
  },

  deleteDirectory(id: string): void {
    const directories = store.get('directories').filter(d => d.id !== id);
    store.set('directories', directories);
    // Also delete associated sessions
    const sessions = store.get('sessions').filter(s => s.directoryId !== id);
    store.set('sessions', sessions);
    // New: Cleanup workspace-specific settings
    import('./SettingsStore').then(({ SettingsStore }) => {
      SettingsStore.deleteForWorkspace(id);
    });
  },

  reorderDirectories(ids: string[]): void {
    const directories = store.get('directories');
    const reordered = ids.map(id => directories.find(d => d.id === id)).filter(Boolean) as Directory[];

    // Add any directories that might have been missing from the IDs list (safety)
    const missing = directories.filter(d => !ids.includes(d.id));
    store.set('directories', [...reordered, ...missing]);
  },

  // --- SESSION METHODS ---
  getSessionsByDirectory(directoryId: string): Session[] {
    return store.get('sessions').filter(s => s.directoryId === directoryId);
  },

  createSession(directoryId: string, name?: string): Session {
    const now = Date.now();
    const session: Session = {
      id: randomUUID(),
      directoryId,
      name: name || 'Terminal',
      lastAccessedAt: now,
      createdAt: now
    };

    const sessions = store.get('sessions');
    sessions.push(session);
    store.set('sessions', sessions);
    return session;
  },

  renameSession(id: string, newName: string): void {
    const sessions = store.get('sessions');
    const index = sessions.findIndex(s => s.id === id);
    if (index !== -1) {
      sessions[index].name = newName;
      store.set('sessions', sessions);
    }
  },

  deleteSession(id: string): void {
    const sessions = store.get('sessions').filter(s => s.id !== id);
    store.set('sessions', sessions);
  },

  resetSessions(): void {
    const directories = store.get('directories');
    const newSessions: Session[] = [];

    directories.forEach(dir => {
      newSessions.push({
        id: randomUUID(),
        directoryId: dir.id,
        name: 'Terminal 1',
        lastAccessedAt: Date.now(),
        createdAt: Date.now()
      });
    });

    store.set('sessions', newSessions);
  }
};

// Reset sessions on startup
WorkspaceStore.resetSessions();
