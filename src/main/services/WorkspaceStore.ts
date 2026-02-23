import { randomUUID } from 'crypto';
import { Workspace, Session } from '../../shared/types';
import { JsonStore } from './JsonStore';

interface StoreSchema {
  workspaces: Workspace[];
  sessions: Session[];
}

const store = new JsonStore<StoreSchema>('workspaces_data.json', {
  workspaces: [],
  sessions: []
});

// Migration logic: Handle legacy "directories" key
const legacyData = (store as any).get('directories');
if (legacyData && legacyData.length > 0) {
  const existingWorkspaces = store.get('workspaces');
  if (existingWorkspaces.length === 0) {
    console.log('[WorkspaceStore] Migrating legacy directory data to workspaces');
    store.set('workspaces', legacyData);
    (store as any).delete('directories');

    // Also migrate session directoryId to workspaceId
    const sessions = store.get('sessions');
    const migratedSessions = sessions.map((s: any) => {
      if (s.directoryId && !s.workspaceId) {
        const { directoryId, ...rest } = s;
        return { ...rest, workspaceId: directoryId };
      }
      return s;
    });
    store.set('sessions', migratedSessions);
  }
}

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
  // --- WORKSPACE METHODS ---
  getWorkspaces(): Workspace[] {
    return store.get('workspaces');
  },

  getWorkspaceById(id: string): Workspace | undefined {
    return store.get('workspaces').find(w => w.id === id);
  },

  createWorkspace(folderPath: string): Workspace {
    const now = Date.now();
    const folderName = folderPath; // The name is the full path
    const backgroundColor = generateRandomColor();

    const workspace: Workspace = {
      id: randomUUID(),
      path: folderPath,
      name: folderName,
      backgroundColor,
      textColor: getContrastTextColor(backgroundColor),
      lastAccessedAt: now,
      createdAt: now
    };

    const workspaces = store.get('workspaces');
    workspaces.push(workspace);
    store.set('workspaces', workspaces);

    // Create an initial session for this workspace
    this.createSession(workspace.id, folderName);

    return workspace;
  },

  updateWorkspaceLastAccessed(id: string): void {
    const workspaces = store.get('workspaces');
    const index = workspaces.findIndex(w => w.id === id);
    if (index !== -1) {
      workspaces[index].lastAccessedAt = Date.now();
      store.set('workspaces', workspaces);
    }
  },

  renameWorkspace(id: string, newName: string): void {
    const workspaces = store.get('workspaces');
    const index = workspaces.findIndex(w => w.id === id);
    if (index !== -1) {
      workspaces[index].name = newName;
      store.set('workspaces', workspaces);
    }
  },

  deleteWorkspace(id: string): void {
    const workspaces = store.get('workspaces').filter(w => w.id !== id);
    store.set('workspaces', workspaces);
    // Also delete associated sessions
    const sessions = store.get('sessions').filter(s => s.workspaceId !== id);
    store.set('sessions', sessions);
    // New: Cleanup workspace-specific settings
    import('./SettingsStore').then(({ SettingsStore }) => {
      SettingsStore.deleteForWorkspace(id);
    });
  },

  reorderWorkspaces(ids: string[]): void {
    const workspaces = store.get('workspaces');
    const reordered = ids.map(id => workspaces.find(w => w.id === id)).filter(Boolean) as Workspace[];

    // Add any workspaces that might have been missing from the IDs list (safety)
    const missing = workspaces.filter(w => !ids.includes(w.id));
    store.set('workspaces', [...reordered, ...missing]);
  },

  // --- SESSION METHODS ---
  getSessionsByWorkspace(workspaceId: string): Session[] {
    return store.get('sessions').filter(s => s.workspaceId === workspaceId);
  },

  createSession(workspaceId: string, name?: string, initialCommand?: string): Session {
    const now = Date.now();
    const session: Session = {
      id: randomUUID(),
      workspaceId,
      name: name || 'Terminal',
      initialCommand,
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
    const workspaces = store.get('workspaces');
    const newSessions: Session[] = [];

    workspaces.forEach(ws => {
      newSessions.push({
        id: randomUUID(),
        workspaceId: ws.id,
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
