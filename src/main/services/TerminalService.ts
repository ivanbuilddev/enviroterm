import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';

class TerminalService {
  private terminals: Map<string, pty.IPty> = new Map();
  private buffers: Map<string, string[]> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private readonly MAX_BUFFER_LINES = 1000;

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Spawn a new PTY process for a session
   */
  spawn(sessionId: string, folderPath: string): boolean {
    // If already exists, replay the buffer to the new requester
    if (this.terminals.has(sessionId)) {
      const buffer = this.buffers.get(sessionId) || [];
      buffer.forEach(data => {
        this.mainWindow?.webContents.send('terminal:data', { sessionId, data });
      });
      return true;
    }

    // Determine shell based on platform
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';

    try {
      // Spawn PTY with cwd set to folder path
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: folderPath,
        env: process.env as Record<string, string>,
      });

      // Store reference and init buffer
      this.terminals.set(sessionId, ptyProcess);
      this.buffers.set(sessionId, []);

      // Forward data to renderer and buffer it
      ptyProcess.onData((data: string) => {
        const buffer = this.buffers.get(sessionId) || [];
        buffer.push(data);
        if (buffer.length > this.MAX_BUFFER_LINES) {
          buffer.shift();
        }
        this.buffers.set(sessionId, buffer);

        this.mainWindow?.webContents.send('terminal:data', { sessionId, data });
      });

      // Handle exit
      ptyProcess.onExit(({ exitCode }) => {
        this.mainWindow?.webContents.send('terminal:exit', sessionId, exitCode);
        this.terminals.delete(sessionId);
      });

      // Execute claude command after shell starts
      setTimeout(() => {
        ptyProcess.write('claude\r');
      }, 500);

      return true;
    } catch (error) {
      console.error('Failed to spawn terminal:', error);
      return false;
    }
  }

  /**
   * Write data to a terminal
   */
  write(sessionId: string, data: string): void {
    const terminal = this.terminals.get(sessionId);
    console.log(`[TerminalService] Write to ${sessionId}:`, JSON.stringify(data), 'terminal exists:', !!terminal);
    if (terminal) {
      terminal.write(data);
    }
  }

  /**
   * Resize a terminal
   */
  resize(sessionId: string, cols: number, rows: number): void {
    const terminal = this.terminals.get(sessionId);
    if (terminal) {
      terminal.resize(cols, rows);
    }
  }

  /**
   * Kill a specific terminal
   */
  kill(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (terminal) {
      terminal.kill();
      this.terminals.delete(sessionId);
      this.buffers.delete(sessionId);
    }
  }

  /**
   * Kill all terminals (for app shutdown)
   */
  killAll(): void {
    for (const [sessionId, terminal] of this.terminals) {
      terminal.kill();
    }
    this.terminals.clear();
    this.buffers.clear();
  }
}

export const terminalService = new TerminalService();
