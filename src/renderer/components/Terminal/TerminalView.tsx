import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { InteractivePrompt } from '../../../shared/terminalTypes';
import { PromptDetector } from '../../services/PromptDetector';
import { InteractiveMenu } from './InteractiveMenu';

interface TerminalViewProps {
  sessionId: string;
  folderPath: string;
  isVisible: boolean;
}

/**
 * Safely fit the terminal, checking that container has dimensions
 */
function safeFit(fitAddon: FitAddon | null, container: HTMLDivElement | null): boolean {
  if (!fitAddon || !container) return false;

  // Check container has actual dimensions
  const { clientWidth, clientHeight } = container;
  if (clientWidth === 0 || clientHeight === 0) return false;

  try {
    fitAddon.fit();
    return true;
  } catch (e) {
    console.warn('Failed to fit terminal:', e);
    return false;
  }
}

export function TerminalView({ sessionId, folderPath, isVisible }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const spawnedRef = useRef(false);
  const initializedRef = useRef(false);

  const [activePrompt, setActivePrompt] = useState<InteractivePrompt | null>(null);
  const lastPromptRawRef = useRef<string | null>(null);
  const detectorRef = useRef(new PromptDetector());

  const handleOptionSelect = useCallback((value: string, index: number) => {
    console.log('[TerminalView] Option selected:', value, 'index:', index);
    // Send value followed by Enter to the PTY
    window.electronAPI.terminal.write(sessionId, value + '\r');
    setActivePrompt(null);
  }, [sessionId]);

  const dismissPrompt = useCallback(() => {
    setActivePrompt(null);
  }, []);

  // Initialize terminal once on mount
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    // Wait for container to have dimensions
    const container = containerRef.current;
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      // Container not ready, will retry via ResizeObserver
      return;
    }

    initializedRef.current = true;

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: '#3b5070',
        black: '#0d1117',
        red: '#f85149',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#c9d1d9',
        brightBlack: '#6e7681',
        brightRed: '#ff7b72',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Delay initial fit to ensure DOM is ready
    requestAnimationFrame(() => {
      if (safeFit(fitAddon, container) && terminalRef.current) {
        window.electronAPI.terminal.resize(
          sessionId,
          terminalRef.current.cols,
          terminalRef.current.rows
        );
      }
    });

    // Handle incoming data from PTY
    const unsubData = window.electronAPI.terminal.onData((data) => {
      if (data.sessionId === sessionId) {
        terminal.write(data.data);

        // Run prompt detection after a short delay
        setTimeout(() => {
          const buffer = terminal.buffer.active;
          const lines: string[] = [];

          // Get last 20 lines from the buffer
          for (let i = Math.max(0, buffer.length - 20); i < buffer.length; i++) {
            const line = buffer.getLine(i);
            if (line) {
              lines.push(line.translateToString(true));
            }
          }

          const bufferText = lines.join('\n');
          // Mock OutputLine objects for the detector (it mostly cares about the text)
          const mockLines = lines.map((text, idx) => ({
            id: `line-${idx}`,
            timestamp: Date.now(),
            spans: [{ text, style: {} }],
            raw: text
          }));

          const detected = detectorRef.current.detectPrompt(mockLines, '');

          if (detected?.raw !== lastPromptRawRef.current) {
            lastPromptRawRef.current = detected?.raw || null;
            setActivePrompt(detected || null);
          }
        }, 100);
      }
    });

    // Handle user input - send to PTY
    terminal.onData((data) => {
      window.electronAPI.terminal.write(sessionId, data);
    });

    // Spawn PTY process once
    if (!spawnedRef.current) {
      window.electronAPI.terminal.spawn(sessionId, folderPath);
      spawnedRef.current = true;
    }

    // Cleanup only disposes terminal UI, does NOT kill PTY (keeps running in background)
    return () => {
      unsubData();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      initializedRef.current = false;
    };
  }, [sessionId, folderPath]);

  // Handle resize with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // If terminal not initialized yet, try to initialize it now
      if (!initializedRef.current && container.clientWidth > 0 && container.clientHeight > 0) {
        // Trigger re-render to initialize
        return;
      }

      if (safeFit(fitAddonRef.current, container) && terminalRef.current) {
        window.electronAPI.terminal.resize(
          sessionId,
          terminalRef.current.cols,
          terminalRef.current.rows
        );
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [sessionId]);

  // Refit when visibility changes
  useEffect(() => {
    if (isVisible) {
      // Delay to allow layout to settle after visibility change
      const timer = setTimeout(() => {
        if (safeFit(fitAddonRef.current, containerRef.current) && terminalRef.current) {
          window.electronAPI.terminal.resize(
            sessionId,
            terminalRef.current.cols,
            terminalRef.current.rows
          );
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible, sessionId]);

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      {activePrompt && (
        <InteractiveMenu
          prompt={activePrompt}
          onSelect={handleOptionSelect}
          onDismiss={dismissPrompt}
        />
      )}
    </div>
  );
}
