// Directory data structure (Sidebar items)
export interface Directory {
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
  directoryId: string;
  name: string;             // Editable title
  lastAccessedAt: number;
  createdAt: number;
}

// Result from creating a directory via folder picker
export interface CreateDirectoryResult {
  success: boolean;
  directory?: Directory;
  error?: string;
  cancelled?: boolean;
}

// Terminal data received from PTY process
export interface TerminalData {
  sessionId: string;
  data: string;
}

// Electron API interface exposed to renderer
export interface ElectronAPI {
  clipboard: {
    writeImage: (base64DataUrl: string) => Promise<boolean>;
  };
  directories: {
    getAll: () => Promise<Directory[]>;
    create: () => Promise<CreateDirectoryResult>;
    updateLastAccessed: (id: string) => Promise<void>;
    rename: (id: string, name: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
    reorder: (ids: string[]) => Promise<void>;
    openInVSCode: (path: string) => Promise<void>;
  };
  sessions: {
    getByDirectory: (directoryId: string) => Promise<Session[]>;
    create: (directoryId: string, name?: string) => Promise<Session>;
    rename: (id: string, name: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
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
    generateToken: (directoryId: string) => Promise<string>;
  };
  settings: {
    get: (directoryId?: string) => Promise<any>;
    set: (settings: any, directoryId?: string) => Promise<any>;
    getInitialCommand: (directoryId?: string) => Promise<string>;
  };
  getWebviewPreloadPath: () => Promise<string>;
}

// Augment window object for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
