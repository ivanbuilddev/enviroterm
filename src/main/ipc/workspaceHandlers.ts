import { ipcMain, dialog, BrowserWindow } from 'electron';
import { WorkspaceStore } from '../services/WorkspaceStore';
import { CreateWorkspaceResult } from '../../shared/types';

export function registerWorkspaceHandlers(): void {
  // --- WORKSPACE HANDLERS ---

  ipcMain.handle('workspaces:getAll', () => {
    return WorkspaceStore.getWorkspaces();
  });

  ipcMain.handle('workspaces:create', async (event): Promise<CreateWorkspaceResult> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openDirectory'],
      title: 'Select Workspace Folder'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    try {
      const workspace = WorkspaceStore.createWorkspace(result.filePaths[0]);
      return { success: true, workspace };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('workspaces:updateLastAccessed', (_, id: string) => {
    WorkspaceStore.updateWorkspaceLastAccessed(id);
  });

  ipcMain.handle('workspaces:rename', (_, id: string, name: string) => {
    WorkspaceStore.renameWorkspace(id, name);
  });

  ipcMain.handle('workspaces:delete', (_, id: string) => WorkspaceStore.deleteWorkspace(id));
  ipcMain.handle('workspaces:reorder', (_, ids: string[]) => WorkspaceStore.reorderWorkspaces(ids));
  ipcMain.handle('workspaces:openInVSCode', (_, folderPath: string) => {
    const { exec } = require('child_process');
    exec(`code "${folderPath}"`);
  });

  // --- SESSION HANDLERS ---

  ipcMain.handle('sessions:getByWorkspace', (_, workspaceId: string) => {
    return WorkspaceStore.getSessionsByWorkspace(workspaceId);
  });

  ipcMain.handle('sessions:create', (_, workspaceId: string, name?: string) => {
    return WorkspaceStore.createSession(workspaceId, name);
  });

  ipcMain.handle('sessions:rename', (_, id: string, name: string) => {
    WorkspaceStore.renameSession(id, name);
  });

  ipcMain.handle('sessions:delete', (_, id: string) => {
    WorkspaceStore.deleteSession(id);
  });
}
