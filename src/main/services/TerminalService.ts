import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';

class TerminalService {
  private terminals: Map<string, pty.IPty> = new Map();
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Spawn a new PTY process for a session
   */
  spawn(sessionId: string, folderPath: string): boolean {
    // Don't spawn if already exists
    if (this.terminals.has(sessionId)) {
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

      // Store reference
      this.terminals.set(sessionId, ptyProcess);

      // Forward data to renderer
      ptyProcess.onData((data: string) => {
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
    }
  }

  /**
   * Kill all terminals (for app shutdown)
   */
  killAll(): void {
    for (const [sessionId, terminal] of this.terminals) {
      terminal.kill();
      this.terminals.delete(sessionId);
    }
  }
}

export const terminalService = new TerminalService();
