import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder for future IPC methods
  ping: () => ipcRenderer.invoke('ping'),
});
