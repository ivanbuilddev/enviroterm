// Session data structure
export interface Session {
  id: string;
  folderPath: string;
  folderName: string;
  backgroundColor: string;  // HSL color string
  textColor: string;        // Derived text color for contrast
  lastAccessedAt: number;   // Unix timestamp (ms) for sorting
  createdAt: number;        // Unix timestamp (ms)
}

// Result from creating a session via folder picker
export interface CreateSessionResult {
  success: boolean;
  session?: Session;
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
  sessions: {
    getAll: () => Promise<Session[]>;
    create: () => Promise<CreateSessionResult>;
    updateLastAccessed: (id: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
  terminal: {
    spawn: (sessionId: string, folderPath: string) => Promise<boolean>;
    write: (sessionId: string, data: string) => void;
    resize: (sessionId: string, cols: number, rows: number) => void;
    kill: (sessionId: string) => void;
    onData: (callback: (data: TerminalData) => void) => () => void;
    onExit: (callback: (sessionId: string, code: number) => void) => () => void;
  };
}

// Augment window object for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
