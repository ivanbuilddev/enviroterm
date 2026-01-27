import { ipcMain, BrowserWindow } from 'electron';
import { terminalService } from '../services/TerminalService';
import { remoteService } from '../services/RemoteService';

export function registerTerminalHandlers(mainWindow: BrowserWindow): void {
  terminalService.setMainWindow(mainWindow);

  // Spawn a new terminal for a session
  ipcMain.handle('terminal:spawn', (_, sessionId: string, folderPath: string, sessionName?: string, initialCommand: string = '') => {
    return terminalService.spawn(sessionId, folderPath, sessionName, initialCommand);
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

  // Remote access handlers
  ipcMain.handle('remote:getDetails', () => {
    const { port, ips, rendererUrl } = remoteService.start();
    return { port, ips, rendererUrl };
  });

  ipcMain.handle('remote:generateToken', (_, directoryId: string) => {
    return remoteService.generateToken(directoryId);
  });

  ipcMain.on('remote:broadcastSettings', (_, directoryId: string) => {
    remoteService.broadcastSettings(directoryId);
  });
}
