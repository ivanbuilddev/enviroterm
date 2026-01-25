import { Session } from '../../../shared/types';
import { SessionIcon } from './SessionIcon';
import { AddSessionButton } from './AddSessionButton';

interface SidebarProps {
  sessions: Session[];
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onAddSession: () => void;
}

export function Sidebar({
  sessions,
  selectedSessionId,
  onSelectSession,
  onAddSession
}: SidebarProps) {
  return (
    <aside className="w-16 bg-bg-elevated border-r border-border flex flex-col items-center py-3 gap-2">
      {sessions.map(session => (
        <SessionIcon
          key={session.id}
          session={session}
          isSelected={session.id === selectedSessionId}
          onClick={() => onSelectSession(session.id)}
        />
      ))}
      <AddSessionButton onClick={onAddSession} />
    </aside>
  );
}
