import { useEffect, useRef, useCallback } from 'react';
import { OutputArea } from './OutputArea';
import { InputArea } from './InputArea';
import { InteractiveMenu } from './InteractiveMenu';
import { useTerminalOutput } from './hooks/useTerminalOutput';
import { usePromptDetection } from './hooks/usePromptDetection';

interface CustomTerminalProps {
  sessionId: string;
  folderPath: string;
  isVisible: boolean;
}

export function CustomTerminal({
  sessionId,
  folderPath,
  isVisible,
}: CustomTerminalProps) {
  const outputAreaRef = useRef<HTMLDivElement>(null);
  const spawnedRef = useRef(false);

  const { lines, bufferSpans, addData, getBufferText, clear } = useTerminalOutput();
  const { activePrompt, dismissPrompt } = usePromptDetection(lines, getBufferText);

  // Clear lines when session changes
  useEffect(() => {
    clear();
  }, [sessionId, clear]);

  // Handle incoming PTY data
  useEffect(() => {
    const unsubscribe = window.electronAPI.terminal.onData((data) => {
      if (data.sessionId === sessionId) {
        addData(data.data);
      }
    });
    return unsubscribe;
  }, [sessionId, addData]);

  // Handle terminal exit
  useEffect(() => {
    const unsubscribe = window.electronAPI.terminal.onExit((exitSessionId, code) => {
      if (exitSessionId === sessionId) {
        // Could show exit message or restart prompt
        console.log(`Terminal ${sessionId} exited with code ${code}`);
      }
    });
    return unsubscribe;
  }, [sessionId]);

  // Spawn PTY on mount
  useEffect(() => {
    if (!spawnedRef.current) {
      window.electronAPI.terminal.spawn(sessionId, folderPath);
      spawnedRef.current = true;
    }
  }, [sessionId, folderPath]);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (outputAreaRef.current && isVisible) {
      outputAreaRef.current.scrollTop = outputAreaRef.current.scrollHeight;
    }
  }, [lines, bufferSpans, isVisible]);

  // Focus output area when terminal becomes visible
  useEffect(() => {
    if (isVisible && outputAreaRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        outputAreaRef.current?.scrollTo({
          top: outputAreaRef.current.scrollHeight,
          behavior: 'instant',
        });
      }, 50);
    }
  }, [isVisible]);

  const sendInput = useCallback(
    (text: string) => {
      window.electronAPI.terminal.write(sessionId, text + '\r');
      dismissPrompt();
    },
    [sessionId, dismissPrompt]
  );

  const sendInterrupt = useCallback(() => {
    window.electronAPI.terminal.write(sessionId, '\x03');
    dismissPrompt();
  }, [sessionId, dismissPrompt]);

  const handleOptionSelect = useCallback(
    (value: string, optionIndex: number) => {
      console.log('[CustomTerminal] Option selected, index:', optionIndex, 'value:', value, 'type:', activePrompt?.type);

      if (!activePrompt) return;

      // In an interactive terminal application like Claude CLI, 
      // sending the absolute value (like the number '2') followed by Enter
      // is generally more robust than simulating relative arrow-key movements.
      window.electronAPI.terminal.write(sessionId, value + '\r');

      dismissPrompt();
    },
    [sessionId, dismissPrompt, activePrompt]
  );

  return (
    <div className="flex flex-col h-full bg-bg-base relative">
      {/* Scrollable output area */}
      <OutputArea
        ref={outputAreaRef}
        lines={lines}
        bufferSpans={bufferSpans}
        className="flex-1 overflow-y-auto"
      />

      {/* Interactive menu (floating popup) */}
      {activePrompt && (
        <InteractiveMenu
          prompt={activePrompt}
          onSelect={handleOptionSelect}
          onDismiss={dismissPrompt}
        />
      )}

      {/* Fixed input at bottom */}
      <InputArea
        onSubmit={sendInput}
        onInterrupt={sendInterrupt}
        placeholder="Type a message..."
      />
    </div>
  );
}
