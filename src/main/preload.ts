import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  clipboard: {
    writeImage: (base64DataUrl: string) => ipcRenderer.invoke('clipboard:writeImage', base64DataUrl),
  },
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
    onCreated: (callback: (session: { id: string; directoryId: string; name: string; lastAccessedAt: number; createdAt: number }) => void) => {
      const handler = (_event: IpcRendererEvent, session: { id: string; directoryId: string; name: string; lastAccessedAt: number; createdAt: number }) => callback(session);
      ipcRenderer.on('sessions:created', handler);
      return () => {
        ipcRenderer.removeListener('sessions:created', handler);
      };
    },
  },
  terminal: {
    spawn: (sessionId: string, folderPath: string, sessionName?: string, initialCommand: string = '') =>
      ipcRenderer.invoke('terminal:spawn', sessionId, folderPath, sessionName, initialCommand),
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
    onRemotePaste: (callback: (data: { sessionId: string; data: any }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { sessionId: string; data: any }) => callback(data);
      ipcRenderer.on('terminal:remote-paste', handler);
      return () => {
        ipcRenderer.removeListener('terminal:remote-paste', handler);
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
  remote: {
    getDetails: () => ipcRenderer.invoke('remote:getDetails'),
    generateToken: (directoryId: string) => ipcRenderer.invoke('remote:generateToken', directoryId),
    broadcastSettings: (directoryId: string) => ipcRenderer.send('remote:broadcastSettings', directoryId),
  },
  settings: {
    get: (directoryId?: string) => ipcRenderer.invoke('settings:get', directoryId),
    set: (settings: { initialCommand?: string; keyboardShortcuts?: any[] }, directoryId?: string) =>
      ipcRenderer.invoke('settings:set', settings, directoryId),
    getInitialCommand: (directoryId?: string) => ipcRenderer.invoke('settings:getInitialCommand', directoryId),
  }
});
