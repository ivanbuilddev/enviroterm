import { Session } from '../../../shared/types';
import { TerminalView } from './TerminalView';

interface TerminalManagerProps {
  sessions: Session[];
  activeSessionId: string | null;
}

export function TerminalManager({ sessions, activeSessionId }: TerminalManagerProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-accent-primary mb-4">No Sessions</h2>
          <p className="text-fg-secondary">
            Click the + button to create your first session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {sessions.map(session => (
        <div
          key={session.id}
          className={`absolute inset-0 ${session.id === activeSessionId ? 'block' : 'hidden'}`}
        >
          <TerminalView
            sessionId={session.id}
            folderPath={session.folderPath}
            isVisible={session.id === activeSessionId}
          />
        </div>
      ))}
    </div>
  );
}
