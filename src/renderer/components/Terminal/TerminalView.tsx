import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

interface TerminalViewProps {
  sessionId: string;
  sessionName: string;
  folderPath: string;
  isVisible: boolean;
  isFocused?: boolean;
  runInitialCommand?: boolean;
  initialCommand?: string;
  isReadOnlyResize?: boolean;
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

export function TerminalView({ sessionId, sessionName, folderPath, isFocused, runInitialCommand = false, initialCommand, isReadOnlyResize = false }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const [term, setTerm] = useState<Terminal | null>(null);
  const [isOpened, setIsOpened] = useState(false);
  const [scale, setScale] = useState(1);
  const [pixelWidth, setPixelWidth] = useState(1000);
  const [pixelHeight, setPixelHeight] = useState(1000);
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
        setIsOpened(false);
      }, 100);
      return () => clearTimeout(timer);
    }

    try {
      term.open(container);
      setIsOpened(true);

      // Initial fit after opening (Desktop only)
      if (!isReadOnlyResize) {
        setTimeout(() => {
          const result = manualFit(term, container);
          if (result) {
            term.resize(result.cols, result.rows);
            window.electronAPI.terminal.resize(sessionId, result.cols, result.rows);
          }
        }, 150);
      }
    } catch (e) {
      console.warn('Deferred terminal open failed', e);
    }
  }, [term, isOpened, sessionId, isReadOnlyResize]);

  // Handle scaling and pixel-perfect dimensions (Mobile only)
  useEffect(() => {
    if (!isReadOnlyResize || !term || !containerRef.current || !isOpened) return;

    const updateScaleAndPixels = () => {
      const container = containerRef.current;
      const parent = container?.parentElement;
      if (!container || !parent) return;

      const termAny = term as any;
      const core = termAny._core;
      const cellWidth = core._renderService?.dimensions?.css?.cell?.width;
      const cellHeight = core._renderService?.dimensions?.css?.cell?.height;

      if (!cellWidth || term.cols === 0) return;

      // Force pixel dimensions to match the actual terminal layout
      const calculatedWidth = term.cols * cellWidth;
      const calculatedHeight = term.rows * cellHeight;
      setPixelWidth(calculatedWidth);
      setPixelHeight(calculatedHeight);

      // Scale to fit the mobile screen width
      const availableWidth = parent.clientWidth - 16; // 16px padding
      if (calculatedWidth > availableWidth) {
        setScale(availableWidth / calculatedWidth);
      } else {
        setScale(1);
      }
    };

    const resizeObserver = new ResizeObserver(updateScaleAndPixels);
    resizeObserver.observe(containerRef.current.parentElement!);

    // Also listen for remote dimension updates
    const handleRemoteDimensions = (event: any) => {
      if (event.detail.sessionId === sessionId) {
        term.resize(event.detail.cols, event.detail.rows);
        updateScaleAndPixels();
      }
    };

    const handleReset = (event: any) => {
      if (event.detail.sessionId === sessionId) {
        term.reset();
      }
    };

    window.addEventListener('terminal:dimensions' as any, handleRemoteDimensions);
    window.addEventListener('terminal:reset' as any, handleReset);

    // Initial calculation
    setTimeout(updateScaleAndPixels, 200);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('terminal:dimensions' as any, handleRemoteDimensions);
      window.removeEventListener('terminal:reset' as any, handleReset);
    };
  }, [term, isOpened, isReadOnlyResize, sessionId]);

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

    const spawnTerminal = async () => {
      if (!spawnedRef.current) {
        let cmd = initialCommand || '';
        if (runInitialCommand && !initialCommand) {
          try {
            cmd = await window.electronAPI.settings.getInitialCommand();
          } catch (err) {
            console.error('Failed to get initial command from settings:', err);
            cmd = 'claude'; // Fallback
          }
        }

        window.electronAPI.terminal.spawn(sessionId, folderPath, sessionName, cmd);
        spawnedRef.current = true;
      }
    };

    spawnTerminal();

    return () => unsubData();
  }, [term, isOpened, sessionId, folderPath, initialCommand, runInitialCommand]);

  // 4. Handle remote paste (Image from mobile)
  useEffect(() => {
    if (!term || !isOpened) return;

    const handleImagePaste = async (imageData: any) => {
      console.log('[TerminalView] handleImagePaste called with:', { name: imageData?.name, type: imageData?.type, hasBase64: !!imageData?.base64 });
      const { name, type, base64 } = imageData;
      try {
        // Focus the terminal first
        term.focus();

        // For images, use Electron's clipboard API to write the image
        // Then simulate Alt+V which is Claude CLI's paste command
        if (type.startsWith('image/') && (window.electronAPI as any).clipboard?.writeImage) {
          const success = await (window.electronAPI as any).clipboard.writeImage(base64);
          if (success) {
            console.log('[TerminalView] Image written to clipboard, triggering Alt+V paste');

            // Send Alt+V keystroke to the terminal (Claude CLI paste command)
            // We need to write the escape sequence for Alt+V to the PTY
            // Alt+V in terminal is typically sent as ESC followed by 'v' or as \x1bv
            window.electronAPI.terminal.write(sessionId, '\x1bv');

            console.log('[TerminalView] Sent Alt+V (\\x1bv) to terminal');
            return;
          }
        }

        // Fallback: Dispatch ClipboardEvent with file data
        const response = await fetch(base64);
        const blob = await response.blob();
        const file = new File([blob], name, { type });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer,
        });

        const target = containerRef.current?.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement | null;
        if (target) {
          target.focus();
          target.dispatchEvent(pasteEvent);
        } else {
          document.dispatchEvent(pasteEvent);
        }

        console.log('[TerminalView] Paste event dispatched');
      } catch (err) {
        console.error('[TerminalView] Remote paste failed:', err);
      }
    };

    const unsubPaste = (window.electronAPI.terminal as any).onRemotePaste((data: any) => {
      console.log('[TerminalView] onRemotePaste received:', { sessionId: data.sessionId, mySessionId: sessionId });
      if (data.sessionId === sessionId) {
        handleImagePaste(data.data);
      }
    });

    return () => unsubPaste();
  }, [term, isOpened, sessionId]);

  // 4. Handle programmatic focus
  useEffect(() => {
    if (term && isFocused) {
      term.focus();
    }
  }, [term, isFocused]);

  // 4. Handle resize (Desktop only)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !term || !isOpened || isReadOnlyResize) return;

    const resizeObserver = new ResizeObserver(() => {
      const result = manualFit(term, container);
      if (result) {
        term.resize(result.cols, result.rows);
        window.electronAPI.terminal.resize(sessionId, result.cols, result.rows);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [term, isOpened, sessionId, isReadOnlyResize]);

  return (
    <div className="w-full h-full bg-[#0d1117] overflow-hidden relative p-2">
      <div
        ref={containerRef}
        className="overflow-hidden origin-top-left transition-transform duration-200"
        style={{
          transform: `scale(${scale})`,
          width: isReadOnlyResize ? `${pixelWidth}px` : '100%',
          height: isReadOnlyResize ? `${pixelHeight}px` : '100%',
          position: isReadOnlyResize ? 'absolute' : 'relative',
          top: 0,
          left: isReadOnlyResize ? '8px' : 0
        }}
      />
    </div>
  );
}
