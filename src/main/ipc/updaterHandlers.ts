import { ipcMain, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

export function registerUpdaterHandlers(mainWindow: BrowserWindow | null) {
    // Configure electron-updater
    autoUpdater.autoDownload = false; // We'll handle download manually via IPC, or change to true if preferred

    // Set the GitHub feed provider (though the package.json publish config usually covers this, it's safer to be explicit)
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'ivanbuilddev',
        repo: 'enviroterm'
    });

    // Events from autoUpdater
    autoUpdater.on('checking-for-update', () => {
        mainWindow?.webContents.send('updater:status', 'checking');
        console.log('[Updater] Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
        mainWindow?.webContents.send('updater:status', 'available');
        console.log('[Updater] Update available:', info);
        // Optionally start download automatically
        autoUpdater.downloadUpdate();
    });

    autoUpdater.on('update-not-available', (info) => {
        mainWindow?.webContents.send('updater:status', 'up-to-date');
        console.log('[Updater] Update not available:', info);
    });

    autoUpdater.on('error', (err) => {
        mainWindow?.webContents.send('updater:error', err?.message || 'Unknown error');
        console.error('[Updater] Error in auto-updater:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
        console.log('[Updater] ' + log_message);
        mainWindow?.webContents.send('updater:progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
        mainWindow?.webContents.send('updater:status', 'downloaded');
        console.log('[Updater] Update downloaded:', info);
    });

    // IPC Handlers
    ipcMain.handle('updater:check', async () => {
        try {
            const result = await autoUpdater.checkForUpdates();
            return result !== null;
        } catch (error) {
            console.error('[Updater] Failed to check for updates', error);
            return false;
        }
    });

    ipcMain.handle('updater:install', () => {
        autoUpdater.quitAndInstall();
    });
}
