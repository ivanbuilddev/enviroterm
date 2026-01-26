import { ipcMain, dialog, BrowserWindow } from 'electron';
import { WorkspaceStore } from '../services/WorkspaceStore';
import { CreateDirectoryResult } from '../../shared/types';

export function registerWorkspaceHandlers(): void {
  // --- DIRECTORY HANDLERS ---

  ipcMain.handle('directories:getAll', () => {
    return WorkspaceStore.getDirectories();
  });

  ipcMain.handle('directories:create', async (event): Promise<CreateDirectoryResult> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openDirectory'],
      title: 'Select Workspace Folder'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    try {
      const directory = WorkspaceStore.createDirectory(result.filePaths[0]);
      return { success: true, directory };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('directories:updateLastAccessed', (_, id: string) => {
    WorkspaceStore.updateDirectoryLastAccessed(id);
  });

  ipcMain.handle('directories:rename', (_, id: string, name: string) => {
    WorkspaceStore.renameDirectory(id, name);
  });

  ipcMain.handle('directories:delete', (_, id: string) => WorkspaceStore.deleteDirectory(id));
  ipcMain.handle('directories:reorder', (_, ids: string[]) => WorkspaceStore.reorderDirectories(ids));
  ipcMain.handle('directories:openInVSCode', (_, folderPath: string) => {
    const { exec } = require('child_process');
    exec(`code "${folderPath}"`);
  });

  // --- SESSION HANDLERS ---

  ipcMain.handle('sessions:getByDirectory', (_, directoryId: string) => {
    return WorkspaceStore.getSessionsByDirectory(directoryId);
  });

  ipcMain.handle('sessions:create', (_, directoryId: string, name?: string) => {
    return WorkspaceStore.createSession(directoryId, name);
  });

  ipcMain.handle('sessions:rename', (_, id: string, name: string) => {
    WorkspaceStore.renameSession(id, name);
  });

  ipcMain.handle('sessions:delete', (_, id: string) => {
    WorkspaceStore.deleteSession(id);
  });
}
