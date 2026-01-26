import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  directories: {
    getAll: () => ipcRenderer.invoke('directories:getAll'),
    create: () => ipcRenderer.invoke('directories:create'),
    updateLastAccessed: (id: string) => ipcRenderer.invoke('directories:updateLastAccessed', id),
    rename: (id: string, name: string) => ipcRenderer.invoke('directories:rename', id, name),
    delete: (id: string) => ipcRenderer.invoke('directories:delete', id),
    reorder: (ids: string[]) => ipcRenderer.invoke('directories:reorder', ids),
    openInVSCode: (path: string) => ipcRenderer.invoke('directories:openInVSCode', path),
  },
  sessions: {
    getByDirectory: (directoryId: string) => ipcRenderer.invoke('sessions:getByDirectory', directoryId),
    create: (directoryId: string, name?: string) => ipcRenderer.invoke('sessions:create', directoryId, name),
    rename: (id: string, name: string) => ipcRenderer.invoke('sessions:rename', id, name),
    delete: (id: string) => ipcRenderer.invoke('sessions:delete', id),
  },
  terminal: {
    spawn: (sessionId: string, folderPath: string, sessionName?: string, autoRunClaude: boolean = true) =>
      ipcRenderer.invoke('terminal:spawn', sessionId, folderPath, sessionName, autoRunClaude),
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
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },
  getWebviewPreloadPath: () => ipcRenderer.invoke('get-webview-preload-path'),
});
