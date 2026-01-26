import { useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TerminalManager } from './components/Terminal/TerminalManager';
import { useWorkspace } from './hooks/useWorkspace';

function App() {
  const {
    directories,
    activeDirectoryId,
    activeDirectory,
    sessions,
    isLoading,
    createDirectory,
    selectDirectory,
    deleteDirectory,
    reorderDirectories,
    openInVSCode,
    createSession,
    renameSession,
    deleteSession
  } = useWorkspace();

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);

  const handleSelectSession = (directoryId: string, sessionId: string) => {
    selectDirectory(directoryId);
    setFocusedSessionId(sessionId);
    // Reset focus after a bit so it can be re-triggered
    setTimeout(() => setFocusedSessionId(null), 500);
  };

  return (
    <div className="min-h-screen bg-bg-base text-fg-primary flex flex-col h-screen overflow-hidden">
      {/* Header - Thinner & More Premium */}
      <header className="bg-bg-elevated border-b border-border px-4 flex items-center justify-between drag select-none min-h-[26px]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            className="p-1 hover:bg-bg-hover no-drag transition-colors text-fg-muted hover:text-fg-primary"
            title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none">
          <span className="text-[11px] text-fg-primary font-header tracking-wider">
            {activeDirectory?.path ?? 'Ready'}
          </span>
        </div>

        <div className="flex items-center gap-0.5 no-drag ml-auto">
          <button
            onClick={() => window.electronAPI.window.minimize()}
            className="p-1.5 hover:bg-white/10 transition-colors text-fg-muted hover:text-fg-primary"
            title="Minimize"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={() => window.electronAPI.window.maximize()}
            className="p-1.5 hover:bg-white/10 transition-colors text-fg-muted hover:text-fg-primary"
            title="Maximize"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="5" y="5" width="14" height="14" rx="1.5" strokeWidth={2.5} stroke="currentColor" fill="none" />
            </svg>
          </button>
          <button
            onClick={() => window.electronAPI.window.close()}
            className="p-1.5 hover:bg-status-error/20 transition-colors text-fg-muted hover:bg-status-error hover:text-white"
            title="Close"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          className={`sidebar-transition overflow-hidden border-r border-border bg-bg-surface relative z-[100] ${isSidebarVisible ? 'w-16 opacity-100' : 'w-0 opacity-0 border-none'}`}
        >
          <div className="w-16">
            <Sidebar
              directories={directories}
              activeDirectoryId={activeDirectoryId}
              onSelectDirectory={selectDirectory}
              onAddDirectory={createDirectory}
              onReorderDirectories={reorderDirectories}
              onDeleteDirectory={deleteDirectory}
              onOpenInVSCode={openInVSCode}
              onSelectSession={handleSelectSession}
            />
          </div>
        </div>

        <main className="flex-1 flex overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-fg-muted animate-pulse">Initializing workspace...</p>
            </div>
          ) : (
            <TerminalManager
              sessions={sessions}
              activeDirectory={activeDirectory}
              focusedSessionId={focusedSessionId}
              onRenameSession={renameSession}
              onCreateSession={createSession}
              onDeleteSession={deleteSession}
            />
          )}
        </main>
      </div>

      {/* Status Bar */}
      <footer className="bg-bg-base border-t border-border px-4 py-1 text-[9px] text-fg-faint flex justify-between uppercase tracking-[0.2em]">
        <span>
          {directories.length} Directories | {sessions.length} Active Sessions
        </span>
        <span>Claude Terminal v1.0</span>
      </footer>
    </div>
  )
}

export default App
