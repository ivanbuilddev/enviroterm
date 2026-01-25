import Store from 'electron-store';
import { randomUUID } from 'crypto';
import path from 'path';
import { Session } from '../../shared/types';

interface StoreSchema {
  sessions: Session[];
}

const store = new Store<StoreSchema>({
  name: 'sessions',
  defaults: {
    sessions: []
  }
});

/**
 * Generates a random HSL color with controlled saturation and lightness
 * for visually pleasing, consistent session icons.
 */
function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.floor(Math.random() * 15); // 60-75%
  const lightness = 45 + Math.floor(Math.random() * 10);  // 45-55%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Determines text color (light or dark) based on background lightness.
 */
function getContrastTextColor(hslColor: string): string {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return 'hsl(0, 0%, 95%)';

  const lightness = parseInt(match[3], 10);

  // If background lightness > 55%, use dark text; otherwise light text
  return lightness > 55
    ? 'hsl(0, 0%, 15%)'
    : 'hsl(0, 0%, 95%)';
}

export const SessionStore = {
  /**
   * Get all sessions sorted by last accessed (most recent first)
   */
  getAll(): Session[] {
    const sessions = store.get('sessions');
    return sessions.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
  },

  /**
   * Create a new session for the given folder path
   */
  create(folderPath: string): Session {
    const now = Date.now();
    const folderName = path.basename(folderPath);
    const backgroundColor = generateRandomColor();

    const session: Session = {
      id: randomUUID(),
      folderPath,
      folderName,
      backgroundColor,
      textColor: getContrastTextColor(backgroundColor),
      lastAccessedAt: now,
      createdAt: now
    };

    const sessions = store.get('sessions');
    sessions.push(session);
    store.set('sessions', sessions);

    return session;
  },

  /**
   * Update the last accessed timestamp for a session
   */
  updateLastAccessed(id: string): void {
    const sessions = store.get('sessions');
    const index = sessions.findIndex(s => s.id === id);
    if (index !== -1) {
      sessions[index].lastAccessedAt = Date.now();
      store.set('sessions', sessions);
    }
  },

  /**
   * Delete a session by ID
   */
  delete(id: string): void {
    const sessions = store.get('sessions').filter(s => s.id !== id);
    store.set('sessions', sessions);
  }
};
