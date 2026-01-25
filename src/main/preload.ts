import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sessions: {
    getAll: () => ipcRenderer.invoke('sessions:getAll'),
    create: () => ipcRenderer.invoke('sessions:create'),
    updateLastAccessed: (id: string) => ipcRenderer.invoke('sessions:updateLastAccessed', id),
    delete: (id: string) => ipcRenderer.invoke('sessions:delete', id),
  },
  terminal: {
    spawn: (sessionId: string, folderPath: string) =>
      ipcRenderer.invoke('terminal:spawn', sessionId, folderPath),
    write: (sessionId: string, data: string) =>
      ipcRenderer.send('terminal:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.send('terminal:resize', sessionId, cols, rows),
    kill: (sessionId: string) =>
      ipcRenderer.send('terminal:kill', sessionId),
    onData: (callback: (data: { sessionId: string; data: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { sessionId: string; data: string }) => callback(data);
      ipcRenderer.on('terminal:data', handler);
      return () => {
        ipcRenderer.removeListener('terminal:data', handler);
      };
    },
    onExit: (callback: (sessionId: string, code: number) => void) => {
      const handler = (_event: IpcRendererEvent, sessionId: string, code: number) => callback(sessionId, code);
      ipcRenderer.on('terminal:exit', handler);
      return () => {
        ipcRenderer.removeListener('terminal:exit', handler);
      };
    },
  },
});
