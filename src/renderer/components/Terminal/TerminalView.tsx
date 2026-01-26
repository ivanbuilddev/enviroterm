import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

interface TerminalViewProps {
  sessionId: string;
  folderPath: string;
  isVisible: boolean;
  isFocused?: boolean;
}

/**
 * Robust manual fit logic that doesn't rely on FitAddon
 */
function manualFit(terminal: Terminal | null, container: HTMLDivElement | null): { cols: number, rows: number } | null {
  if (!terminal || !container || !terminal.element) return null;

  const termAny = terminal as any;
  const renderer = termAny.renderer || (termAny._core && termAny._core.renderer);
  if (!renderer || !renderer.dimensions) return null;

  const dims = renderer.dimensions;
  if (!dims.device || dims.device.cell.width === 0 || dims.device.cell.height === 0) return null;

  const { clientWidth, clientHeight } = container;
  if (clientWidth === 0 || clientHeight === 0) return null;

  // Use the internal character measurements to calculate cols/rows
  const cols = Math.floor(clientWidth / (dims.device.cell.width / window.devicePixelRatio));
  const rows = Math.floor(clientHeight / (dims.device.cell.height / window.devicePixelRatio));

  if (cols <= 0 || rows <= 0) return null;

  return { cols, rows };
}

export function TerminalView({ sessionId, folderPath, isVisible, isFocused }: TerminalViewProps) {
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
      window.electronAPI.terminal.spawn(sessionId, folderPath);
      spawnedRef.current = true;
    }

    return () => unsubData();
  }, [term, isOpened, sessionId, folderPath]);

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
    <div className="w-full h-full bg-[#0d1117] p-4">
      <div className="w-full h-full overflow-hidden" ref={containerRef} />
    </div>
  );
}
