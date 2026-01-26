import { ipcMain, BrowserWindow } from 'electron';
import { terminalService } from '../services/TerminalService';

export function registerTerminalHandlers(mainWindow: BrowserWindow): void {
  terminalService.setMainWindow(mainWindow);

  // Spawn a new terminal for a session
  ipcMain.handle('terminal:spawn', (_, sessionId: string, folderPath: string, sessionName?: string, autoRunClaude: boolean = true) => {
    return terminalService.spawn(sessionId, folderPath, sessionName, autoRunClaude);
  });

  // Write data to a terminal
  ipcMain.on('terminal:write', (_, sessionId: string, data: string) => {
    terminalService.write(sessionId, data);
  });

  // Resize a terminal
  ipcMain.on('terminal:resize', (_, sessionId: string, cols: number, rows: number) => {
    terminalService.resize(sessionId, cols, rows);
  });

  // Kill a terminal
  ipcMain.on('terminal:kill', (_, sessionId: string) => {
    terminalService.kill(sessionId);
  });
}
