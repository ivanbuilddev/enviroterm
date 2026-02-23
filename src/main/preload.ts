import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  clipboard: {
    writeImage: (base64DataUrl: string) => ipcRenderer.invoke('clipboard:writeImage', base64DataUrl),
  },
  workspaces: {
    getAll: () => ipcRenderer.invoke('workspaces:getAll'),
    create: () => ipcRenderer.invoke('workspaces:create'),
    updateLastAccessed: (id: string) => ipcRenderer.invoke('workspaces:updateLastAccessed', id),
    rename: (id: string, name: string) => ipcRenderer.invoke('workspaces:rename', id, name),
    delete: (id: string) => ipcRenderer.invoke('workspaces:delete', id),
    reorder: (ids: string[]) => ipcRenderer.invoke('workspaces:reorder', ids),
    openInVSCode: (path: string) => ipcRenderer.invoke('workspaces:openInVSCode', path),
    openInExplorer: (path: string) => ipcRenderer.invoke('workspaces:openInExplorer', path),
  },
  sessions: {
    getByWorkspace: (workspaceId: string) => ipcRenderer.invoke('sessions:getByWorkspace', workspaceId),
    create: (workspaceId: string, name?: string, initialCommand?: string) => ipcRenderer.invoke('sessions:create', workspaceId, name, initialCommand),
    rename: (id: string, name: string) => ipcRenderer.invoke('sessions:rename', id, name),
    delete: (id: string) => ipcRenderer.invoke('sessions:delete', id),
    onCreated: (callback: (session: { id: string; workspaceId: string; name: string; lastAccessedAt: number; createdAt: number }) => void) => {
      const handler = (_event: IpcRendererEvent, session: { id: string; workspaceId: string; name: string; lastAccessedAt: number; createdAt: number }) => callback(session);
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
    generateToken: (workspaceId: string) => ipcRenderer.invoke('remote:generateToken', workspaceId),
    broadcastSettings: (workspaceId: string) => ipcRenderer.send('remote:broadcastSettings', workspaceId),
  },
  settings: {
    get: (workspaceId?: string) => ipcRenderer.invoke('settings:get', workspaceId),
    set: (settings: { initialCommand?: string; keyboardShortcuts?: any[] }, workspaceId?: string) =>
      ipcRenderer.invoke('settings:set', settings, workspaceId),
    getInitialCommand: (workspaceId?: string) => ipcRenderer.invoke('settings:getInitialCommand', workspaceId),
  },
  files: {
    readDir: (path: string) => ipcRenderer.invoke('files:readDir', path),
    readFile: (path: string) => ipcRenderer.invoke('files:readFile', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('files:writeFile', path, content),
    search: (rootPath: string, query: string) => ipcRenderer.invoke('files:search', rootPath, query),
  },
  uiState: {
    get: () => ipcRenderer.invoke('ui-state:get'),
    save: (state: any) => ipcRenderer.invoke('ui-state:save', state),
  }
});
