import { app, BrowserWindow, ipcMain, shell, clipboard, nativeImage } from 'electron';
import path from 'path';
import { registerWorkspaceHandlers } from './ipc/workspaceHandlers';
import { registerTerminalHandlers } from './ipc/terminalHandlers';
import { terminalService } from './services/TerminalService';
import { remoteService } from './services/RemoteService';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  // Register terminal handlers with main window reference
  registerTerminalHandlers(mainWindow);

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    remoteService.setRendererUrl(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Window controls
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  // Shell - open external URLs in system browser
  ipcMain.handle('shell:openExternal', (_, url: string) => {
    return shell.openExternal(url);
  });

  // Get webview preload path
  ipcMain.handle('get-webview-preload-path', () => {
    return path.join(__dirname, '../preload/webview.js');
  });

  // Clipboard - write image
  ipcMain.handle('clipboard:writeImage', (_, base64DataUrl: string) => {
    try {
      const img = nativeImage.createFromDataURL(base64DataUrl);
      clipboard.writeImage(img);
      console.log('[Main] Image written to clipboard');
      return true;
    } catch (err) {
      console.error('[Main] Failed to write image to clipboard:', err);
      return false;
    }
  });
}

app.whenReady().then(() => {
  registerWorkspaceHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up terminals on quit
app.on('before-quit', () => {
  terminalService.killAll();
});
