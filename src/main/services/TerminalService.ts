import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';

interface TerminalState {
  pty: pty.IPty;
  name: string;
  isExecuting: boolean;
}

class TerminalService {
  private terminals: Map<string, TerminalState> = new Map();
  private buffers: Map<string, string[]> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private readonly MAX_BUFFER_LINES = 1000;

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
   * @param autoRunClaude - If true, automatically runs 'claude' command after shell starts
   */
  spawn(sessionId: string, folderPath: string, sessionName: string = 'Unknown', autoRunClaude: boolean = true): boolean {
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
      this.terminals.set(sessionId, {
        pty: ptyProcess,
        name: sessionName,
        isExecuting: false
      });
      this.buffers.set(sessionId, []);

      // Forward data to renderer and buffer it
      ptyProcess.onData((data: string) => {
        const buffer = this.buffers.get(sessionId) || [];
        buffer.push(data);
        if (buffer.length > this.MAX_BUFFER_LINES) {
          buffer.shift();
        }
        this.buffers.set(sessionId, buffer);

        // Check if command finished (prompt detected)
        const termState = this.terminals.get(sessionId);
        if (termState && termState.isExecuting && this.isPromptOutput(data)) {
          termState.isExecuting = false;
          console.log(`[Terminal] Process FINISHED in "${termState.name}"`);
        }

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('terminal:data', { sessionId, data });
        }
      });

      // Handle exit
      ptyProcess.onExit(({ exitCode }) => {
        const termState = this.terminals.get(sessionId);
        if (termState) {
          console.log(`[Terminal] Shell EXITED in "${termState.name}" with code ${exitCode}`);
        }
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('terminal:exit', sessionId, exitCode);
        }
        this.terminals.delete(sessionId);
      });

      // Execute claude command after shell starts (if enabled)
      if (autoRunClaude) {
        setTimeout(() => {
          ptyProcess.write('claude\r');
        }, 500);
      }

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
    const termState = this.terminals.get(sessionId);
    if (termState) {
      // Detect Enter key press (carriage return) - command is starting
      if (data === '\r' || data === '\n' || data.includes('\r')) {
        if (!termState.isExecuting) {
          termState.isExecuting = true;
          console.log(`[Terminal] Process STARTED in "${termState.name}"`);
        }
      }
      termState.pty.write(data);
    }
  }

  /**
   * Resize a terminal
   */
  resize(sessionId: string, cols: number, rows: number): void {
    const termState = this.terminals.get(sessionId);
    if (termState) {
      termState.pty.resize(cols, rows);
    }
  }

  /**
   * Kill a specific terminal
   */
  kill(sessionId: string): void {
    const termState = this.terminals.get(sessionId);
    if (termState) {
      console.log(`[Terminal] Killing terminal "${termState.name}"`);
      termState.pty.kill();
      this.terminals.delete(sessionId);
      this.buffers.delete(sessionId);
    }
  }

  /**
   * Kill all terminals (for app shutdown)
   */
  killAll(): void {
    for (const [sessionId, termState] of this.terminals) {
      console.log(`[Terminal] Killing terminal "${termState.name}" (shutdown)`);
      termState.pty.kill();
    }
    this.terminals.clear();
    this.buffers.clear();
  }
}

export const terminalService = new TerminalService();
