import { ipcMain, dialog, BrowserWindow } from 'electron';
import { SessionStore } from '../services/SessionStore';
import { CreateSessionResult } from '../../shared/types';

export function registerSessionHandlers(): void {
  // Get all sessions
  ipcMain.handle('sessions:getAll', () => {
    return SessionStore.getAll();
  });

  // Create new session via folder picker
  ipcMain.handle('sessions:create', async (event): Promise<CreateSessionResult> => {
    const window = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showOpenDialog(window!, {
      properties: ['openDirectory'],
      title: 'Select Session Folder'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    try {
      const session = SessionStore.create(result.filePaths[0]);
      return { success: true, session };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Update last accessed timestamp
  ipcMain.handle('sessions:updateLastAccessed', (_, id: string) => {
    SessionStore.updateLastAccessed(id);
  });

  // Delete a session
  ipcMain.handle('sessions:delete', (_, id: string) => {
    SessionStore.delete(id);
  });
}
