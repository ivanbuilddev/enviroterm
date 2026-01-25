import { Sidebar } from './components/Sidebar/Sidebar';
import { TerminalManager } from './components/Terminal/TerminalManager';
import { useSessions } from './hooks/useSessions';

function App() {
  const {
    sessions,
    selectedSessionId,
    isLoading,
    createSession,
    selectSession
  } = useSessions();

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className="min-h-screen bg-bg-base text-fg-primary flex flex-col">
      {/* Header */}
      <header className="bg-bg-elevated border-b border-border px-4 py-3">
        <h1 className="text-xl font-semibold">Claude Terminal Manager</h1>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={selectSession}
          onAddSession={createSession}
        />

        <main className="flex-1 flex overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-fg-muted">Loading sessions...</p>
            </div>
          ) : (
            <TerminalManager
              sessions={sessions}
              activeSessionId={selectedSessionId}
            />
          )}
        </main>
      </div>

      {/* Status Bar */}
      <footer className="bg-bg-elevated border-t border-border px-4 py-2 text-sm text-fg-muted">
        {sessions.length > 0
          ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''} - ${selectedSession?.folderName ?? 'None selected'}`
          : 'Ready - No active sessions'
        }
      </footer>
    </div>
  )
}

export default App
