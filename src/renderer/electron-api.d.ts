export interface IElectronAPI {
    clipboard: {
        writeImage: (base64DataUrl: string) => Promise<boolean>;
    };
    directories: {
        getAll: () => Promise<any[]>;
        create: () => Promise<{ success: boolean; directory?: any; error?: string }>;
        updateLastAccessed: (id: string) => Promise<void>;
        rename: (id: string, name: string) => Promise<void>;
        delete: (id: string) => Promise<void>;
        reorder: (ids: string[]) => Promise<void>;
        openInVSCode: (path: string) => Promise<void>;
    };
    sessions: {
        getByDirectory: (directoryId: string) => Promise<any[]>;
        create: (directoryId: string, name?: string) => Promise<any>;
        rename: (id: string, name: string) => Promise<void>;
        delete: (id: string) => Promise<void>;
    };
    terminal: {
        spawn: (sessionId: string, folderPath: string, sessionName?: string, initialCommand?: string) => Promise<void>;
        write: (sessionId: string, data: string) => void;
        resize: (sessionId: string, cols: number, rows: number) => void;
        kill: (sessionId: string) => void;
        onData: (callback: (data: { sessionId: string; data: string }) => void) => () => void;
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
    getWebviewPreloadPath: () => Promise<string>;
    remote: {
        getDetails: () => Promise<any>;
        generateToken: (directoryId: string) => Promise<string>;
    };
    settings: {
        get: (directoryId?: string) => Promise<any>;
        set: (settings: { initialCommand?: string; keyboardShortcuts?: any[] }, directoryId?: string) => Promise<any>;
        getInitialCommand: (directoryId?: string) => Promise<string>;
    };
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
