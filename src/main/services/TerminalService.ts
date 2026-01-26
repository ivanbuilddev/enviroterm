import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';
import { remoteService } from './RemoteService';

interface TerminalState {
  pty: pty.IPty;
  name: string;
  isExecuting: boolean;
}

class TerminalService {
  private terminals: Map<string, TerminalState> = new Map();
  private buffers: Map<string, string[]> = new Map();
  private dimensions: Map<string, { cols: number, rows: number }> = new Map();
  private listeners: Map<string, boolean> = new Map(); // sessionId -> hasListener
  private mainWindow: BrowserWindow | null = null;
  private readonly MAX_BUFFER_LINES = 5000;

  // Prompt patterns to detect when command finishes
  // These patterns indicate the shell is waiting for input
  private readonly PROMPT_PATTERNS = [
    /PS [A-Z]:\\.*>\s*$/,          // PowerShell prompt: PS C:\path>
    /\$\s*$/,                       // Bash/Zsh prompt ending with $
    />\s*$/,                        // Generic prompt ending with >
    /λ\s*$/,                        // Lambda prompt
    /❯\s*$/,                        // Fish/custom prompt
    /\n%\s*$/,                      // Zsh prompt ending with %
  ];

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Check if output matches a prompt pattern (indicating command finished)
   */
  private isPromptOutput(data: string): boolean {
    return this.PROMPT_PATTERNS.some(pattern => pattern.test(data));
  }

  /**
   * Spawn a new PTY process for a session
   * @param initialCommand - Command to automatically run after shell starts
   */
  spawn(sessionId: string, folderPath: string, sessionName: string = 'Unknown', initialCommand: string = ''): boolean {
    if (this.terminals.has(sessionId)) {
      return true;
    }

    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';

    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: folderPath,
        env: process.env as Record<string, string>,
      });

      this.terminals.set(sessionId, {
        pty: ptyProcess,
        name: sessionName,
        isExecuting: false
      });
      this.buffers.set(sessionId, []);
      this.dimensions.set(sessionId, { cols: 80, rows: 24 });

      if (!this.listeners.has(sessionId)) {
        this.listeners.set(sessionId, true);
        ptyProcess.onData((data: string) => {
          const buffer = this.buffers.get(sessionId) || [];
          buffer.push(data);
          if (buffer.length > this.MAX_BUFFER_LINES) {
            buffer.shift();
          }
          this.buffers.set(sessionId, buffer);

          const termState = this.terminals.get(sessionId);
          if (termState && termState.isExecuting && this.isPromptOutput(data)) {
            termState.isExecuting = false;
          }

          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('terminal:data', { sessionId, data });
          }
          remoteService.broadcast(sessionId, data);
        });

        ptyProcess.onExit(({ exitCode }) => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('terminal:exit', sessionId, exitCode);
          }
          this.terminals.delete(sessionId);
          this.buffers.delete(sessionId);
          this.listeners.delete(sessionId);
        });
      }

      if (initialCommand && initialCommand.trim() !== '') {
        setTimeout(() => {
          ptyProcess.write(`${initialCommand}\r`);
        }, 500);
      }

      return true;
    } catch (error) {
      console.error('Failed to spawn terminal:', error);
      return false;
    }
  }

  write(sessionId: string, data: string): void {
    const termState = this.terminals.get(sessionId);
    if (termState) {
      if (data === '\r' || data === '\n' || data.includes('\r')) {
        if (!termState.isExecuting) {
          termState.isExecuting = true;
        }
      }
      termState.pty.write(data);
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const termState = this.terminals.get(sessionId);
    if (termState) {
      termState.pty.resize(cols, rows);
      this.dimensions.set(sessionId, { cols, rows });
      remoteService.broadcastDimensions(sessionId, cols, rows);
    }
  }

  kill(sessionId: string): void {
    const termState = this.terminals.get(sessionId);
    if (termState) {
      termState.pty.kill();
      this.terminals.delete(sessionId);
      this.buffers.delete(sessionId);
      this.listeners.delete(sessionId);
    }
  }

  killAll(): void {
    for (const [sessionId, termState] of this.terminals) {
      termState.pty.kill();
    }
    this.terminals.clear();
    this.buffers.clear();
    this.listeners.clear();
  }

  getBuffer(sessionId: string): string[] {
    return this.buffers.get(sessionId) || [];
  }

  getDimensions(sessionId: string): { cols: number, rows: number } | null {
    return this.dimensions.get(sessionId) || null;
  }
}

export const terminalService = new TerminalService();
