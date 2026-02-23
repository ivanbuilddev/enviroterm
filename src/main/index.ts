import { app, BrowserWindow, ipcMain, shell, clipboard, nativeImage } from 'electron';
import path from 'path';
import { registerWorkspaceHandlers } from './ipc/workspaceHandlers';
import { registerTerminalHandlers } from './ipc/terminalHandlers';
import { registerFileSystemHandlers } from './ipc/fileSystemHandlers';
import { registerUpdaterHandlers } from './ipc/updaterHandlers';
import { terminalService } from './services/TerminalService';
import { remoteService } from './services/RemoteService';
import { SettingsStore } from './services/SettingsStore';
import { UiStateStore } from './services/UiStateStore';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const windowState = UiStateStore.getWindowState();

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../../src/renderer/assets/icons/EnviroTERM.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  const saveWindowState = () => {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    UiStateStore.setWindowState({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized()
    });
  };

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);
  mainWindow.on('close', saveWindowState);

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

  // Settings handlers
  ipcMain.handle('settings:get', (_, directoryId?: string) => {
    return SettingsStore.getAll(directoryId);
  });

  ipcMain.handle('settings:set', (_, settings: { initialCommand?: string; keyboardShortcuts?: any[] }, directoryId?: string) => {
    SettingsStore.setAll(settings, directoryId);
    return SettingsStore.getAll(directoryId);
  });

  ipcMain.handle('settings:getInitialCommand', (_, directoryId?: string) => {
    return SettingsStore.getInitialCommand(directoryId);
  });

  ipcMain.handle('ui-state:get', () => {
    return UiStateStore.getAppState();
  });

  ipcMain.handle('ui-state:save', (_, state) => {
    UiStateStore.setAppState(state);
    return true;
  });
}

app.whenReady().then(() => {
  registerWorkspaceHandlers();
  registerFileSystemHandlers();
  createWindow();

  // Register updater handlers after window creation
  registerUpdaterHandlers(mainWindow);

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
