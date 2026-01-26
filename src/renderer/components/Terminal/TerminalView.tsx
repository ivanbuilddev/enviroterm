import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

interface TerminalViewProps {
  sessionId: string;
  sessionName: string;
  folderPath: string;
  isVisible: boolean;
  isFocused?: boolean;
  autoRunClaude?: boolean;
  initialCommand?: string;
}

/**
 * Robust manual fit logic that doesn't rely on FitAddon
 */
function manualFit(terminal: Terminal | null, container: HTMLDivElement | null): { cols: number, rows: number } | null {
  if (!terminal || !container || !terminal.element) return null;

  const termAny = terminal as any;
  const core = termAny._core;
  if (!core) return null;

  // Get the actual rendered cell dimensions from the core renderer
  const cellWidth = core._renderService?.dimensions?.css?.cell?.width;
  const cellHeight = core._renderService?.dimensions?.css?.cell?.height;

  if (!cellWidth || !cellHeight || cellWidth === 0 || cellHeight === 0) return null;

  const { clientWidth, clientHeight } = container;
  if (clientWidth === 0 || clientHeight === 0) return null;

  // Account for xterm's internal padding/scrollbar (typically ~14px for scrollbar)
  const scrollbarWidth = core.viewport?.scrollBarWidth ?? 14;
  const availableWidth = clientWidth - scrollbarWidth;

  const cols = Math.max(1, Math.floor(availableWidth / cellWidth));
  const rows = Math.max(1, Math.floor(clientHeight / cellHeight));

  return { cols, rows };
}

export function TerminalView({ sessionId, sessionName, folderPath, isFocused, autoRunClaude = true, initialCommand }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const [term, setTerm] = useState<Terminal | null>(null);
  const [isOpened, setIsOpened] = useState(false);
  const spawnedRef = useRef(false);

  // 1. Initialize terminal instance on mount
  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"Source Code Pro", monospace',
      fontSize: 14,
      allowProposedApi: true,
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
      },
    });

    setTerm(terminal);
    terminalRef.current = terminal;

    return () => {
      terminal.dispose();
      terminalRef.current = null;
    };
  }, []);

  // 2. Open and attach terminal when container is ready
  useEffect(() => {
    if (!term || !containerRef.current || isOpened) return;

    const container = containerRef.current;

    // Crucial Guard: Wait until container actually has size
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      const timer = setTimeout(() => {
        // Toggle a state to force re-evaluation if needed
        setIsOpened(false);
      }, 100);
      return () => clearTimeout(timer);
    }

    try {
      term.open(container);
      setIsOpened(true);

      // Initial fit after opening
      setTimeout(() => {
        const result = manualFit(term, container);
        if (result) {
          term.resize(result.cols, result.rows);
          window.electronAPI.terminal.resize(sessionId, result.cols, result.rows);
        }
      }, 150);
    } catch (e) {
      console.warn('Deferred terminal open failed', e);
    }
  }, [term, isOpened, sessionId]);

  // 3. Handle PTY communication
  useEffect(() => {
    if (!term || !isOpened) return;

    const unsubData = window.electronAPI.terminal.onData((data) => {
      if (data.sessionId === sessionId) {
        term.write(data.data);
      }
    });

    term.onData((data) => {
      window.electronAPI.terminal.write(sessionId, data);
    });

    if (!spawnedRef.current) {
      window.electronAPI.terminal.spawn(sessionId, folderPath, sessionName, autoRunClaude);
      spawnedRef.current = true;

      // Handle initial command execution
      if (initialCommand) {
        setTimeout(() => {
          window.electronAPI.terminal.write(sessionId, initialCommand + '\r');
        }, 1000); // Wait for shell to be ready
      }
    }

    return () => unsubData();
  }, [term, isOpened, sessionId, folderPath, initialCommand]);

  // 4. Handle programmatic focus
  useEffect(() => {
    if (term && isFocused) {
      term.focus();
    }
  }, [term, isFocused]);

  // 4. Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !term || !isOpened) return;

    const resizeObserver = new ResizeObserver(() => {
      const result = manualFit(term, container);
      if (result) {
        term.resize(result.cols, result.rows);
        window.electronAPI.terminal.resize(sessionId, result.cols, result.rows);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [term, isOpened, sessionId]);

  return (
    <div className="w-full h-full bg-[#0d1117] p-4 overflow-hidden">
      <div className="w-full h-full overflow-hidden" ref={containerRef} style={{ overflowX: 'hidden' }} />
    </div>
  );
}
