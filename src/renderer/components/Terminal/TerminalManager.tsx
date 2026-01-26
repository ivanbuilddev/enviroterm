import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Session, Directory } from '../../../shared/types';
import { TerminalView } from './TerminalView';
import { TerminalWindow } from './TerminalWindow';

interface TerminalManagerProps {
  sessions: Session[];
  activeDirectory: Directory | null;
  focusedSessionId?: string | null;
  onRenameSession: (id: string, name: string) => Promise<void>;
  onCreateSession: (name?: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
}

export function TerminalManager({
  sessions,
  activeDirectory,
  focusedSessionId,
  onRenameSession,
  onCreateSession,
  onDeleteSession
}: TerminalManagerProps) {
  const [zIndices, setZIndices] = useState<Record<string, number>>({});
  const maxZRef = useRef(10);

  const bringToFront = useCallback((id: string) => {
    setZIndices(prev => {
      maxZRef.current += 1;
      return { ...prev, [id]: maxZRef.current };
    });
  }, []);

  useEffect(() => {
    if (focusedSessionId) {
      bringToFront(focusedSessionId);
    }
  }, [focusedSessionId, bringToFront]);

  const windowOffsets = useMemo(() => {
    const offsets: Record<string, { x: number, y: number }> = {};
    sessions.forEach((s, i) => {
      offsets[s.id] = {
        x: 60 + (i * 40) % 200,
        y: 60 + (i * 40) % 200
      };
    });
    return offsets;
  }, [sessions.length]);

  if (!activeDirectory) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-base/50">
        <div className="text-center p-8 border border-dashed border-border bg-bg-surface/30 backdrop-blur-sm">
          <h2 className="text-xl font-header text-fg-primary mb-2">No Directory Selected</h2>
          <p className="text-fg-muted max-w-xs mx-auto">
            Select a directory from the sidebar to start working.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-bg-surface/20 via-bg-base to-bg-base">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(var(--color-fg-muted) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Action Bar for Sessions */}
      <div className="absolute bottom-6 right-6 z-[5000]">
        <button
          onClick={() => onCreateSession(`Terminal ${sessions.length + 1}`)}
          className="bg-accent-primary hover:bg-accent-secondary text-white px-4 py-2 shadow-xl flex items-center gap-2 font-semibold text-sm"
        >
          <span className="text-lg">+</span> New Terminal
        </button>
      </div>

      {sessions.map(session => (
        <TerminalWindow
          key={session.id}
          id={session.id}
          title={session.name}
          onFocus={bringToFront}
          onRename={onRenameSession}
          onClose={() => onDeleteSession(session.id)}
          zIndex={zIndices[session.id] || 10}
          initialX={windowOffsets[session.id]?.x}
          initialY={windowOffsets[session.id]?.y}
        >
          <TerminalView
            sessionId={session.id}
            folderPath={activeDirectory.path}
            isVisible={true}
            isFocused={session.id === focusedSessionId}
          />
        </TerminalWindow>
      ))}
    </div>
  );
}
