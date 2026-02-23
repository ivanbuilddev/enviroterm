// Workspace data structure (Sidebar items)
export interface Workspace {
  id: string;
  path: string;
  name: string;
  backgroundColor: string;  // HSL color string
  textColor: string;        // Derived text color for contrast
  lastAccessedAt: number;   // Unix timestamp (ms) for sorting
  createdAt: number;        // Unix timestamp (ms)
}

// Session data structure (Terminal windows)
export interface Session {
  id: string;
  workspaceId: string;
  name: string;             // Editable title
  initialCommand?: string;
  lastAccessedAt: number;
  createdAt: number;
}

// Result from creating a workspace via folder picker
export interface CreateWorkspaceResult {
  success: boolean;
  workspace?: Workspace;
  error?: string;
  cancelled?: boolean;
}

// Terminal data received from PTY process
export interface TerminalData {
  sessionId: string;
  data: string;
}

// File system entry
export interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

// Electron API interface exposed to renderer
export interface ElectronAPI {
  files: {
    readDir: (path: string) => Promise<FileEntry[]>;
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<boolean>;
    search: (rootPath: string, query: string) => Promise<FileEntry[]>;
  };
  clipboard: {
    writeImage: (base64DataUrl: string) => Promise<boolean>;
  };
  workspaces: {
    getAll: () => Promise<Workspace[]>;
    create: () => Promise<CreateWorkspaceResult>;
    updateLastAccessed: (id: string) => Promise<void>;
    rename: (id: string, name: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
    reorder: (ids: string[]) => Promise<void>;
    openInVSCode: (path: string) => Promise<void>;
    openInExplorer: (path: string) => Promise<void>;
  };
  sessions: {
    getByWorkspace: (workspaceId: string) => Promise<Session[]>;
    create: (workspaceId: string, name?: string, initialCommand?: string) => Promise<Session>;
    rename: (id: string, name: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
    onCreated: (callback: (session: Session) => void) => () => void;
  };
  terminal: {
    spawn: (sessionId: string, folderPath: string, sessionName?: string, initialCommand?: string) => Promise<boolean>;
    write: (sessionId: string, data: string) => void;
    resize: (sessionId: string, cols: number, rows: number) => void;
    kill: (sessionId: string) => void;
    onData: (callback: (data: TerminalData) => void) => () => void;
    onExit: (callback: (sessionId: string, code: number) => void) => () => void;
    onRemotePaste: (callback: (data: { sessionId: string; data: any }) => void) => () => void;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  remote: {
    getDetails: () => Promise<{ port: number; ips: string[]; rendererUrl: string }>;
    generateToken: (workspaceId: string) => Promise<string>;
    broadcastSettings: (workspaceId: string) => void;
  };
  settings: {
    get: (workspaceId?: string) => Promise<any>;
    set: (settings: any, workspaceId?: string) => Promise<any>;
    getInitialCommand: (workspaceId?: string) => Promise<string>;
  };
  getWebviewPreloadPath: () => Promise<string>;
  updater: {
    check: () => Promise<boolean>;
    install: () => void;
    onStatusChange: (callback: (status: string) => void) => () => void;
    onProgress: (callback: (progress: any) => void) => () => void;
    onError: (callback: (error: string) => void) => () => void;
  };
}

// Augment window object for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
