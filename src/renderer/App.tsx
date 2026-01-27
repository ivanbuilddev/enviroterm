import { useState, useRef } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TerminalManager } from './components/Terminal/TerminalManager';
import { BottomPanel, BottomPanelHandle } from './components/BottomPanel/BottomPanel';
import { BrowserPanel } from './components/BrowserPanel/BrowserPanel';
import { useWorkspace } from './hooks/useWorkspace';
import { MobileApp } from './components/Remote/MobileApp';
import { SettingsModal } from './components/Settings/SettingsModal';

function App() {
  if (!window.electronAPI) {
    return <MobileApp />;
  }

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
  const [isBottomPanelVisible, setIsBottomPanelVisible] = useState(false);
  const [isBrowserPanelVisible, setIsBrowserPanelVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [workspaceSettings, setWorkspaceSettings] = useState<{ id: string; name: string } | null>(null);

  const bottomPanelRef = useRef<BottomPanelHandle>(null);

  const handleSelectSession = (directoryId: string, sessionId: string) => {
    selectDirectory(directoryId);
    setFocusedSessionId(sessionId);
    // Reset focus after a bit so it can be re-triggered
    setTimeout(() => setFocusedSessionId(null), 500);
  };

  const handleOpenWorkspaceSettings = (id: string, name: string) => {
    setWorkspaceSettings({ id, name });
  };

  const handleRunCommand = (command: string) => {
    setIsBottomPanelVisible(true);
    // Give it a tick to ensure it's visible if it wasn't
    setTimeout(() => {
      bottomPanelRef.current?.createNewTab('External Cmd', command);
    }, 50);
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
          <div className="w-16 h-full">
            <Sidebar
              directories={directories}
              activeDirectoryId={activeDirectoryId}
              onSelectDirectory={selectDirectory}
              onAddDirectory={createDirectory}
              onReorderDirectories={reorderDirectories}
              onDeleteDirectory={deleteDirectory}
              onOpenInVSCode={openInVSCode}
              onSelectSession={handleSelectSession}
              onCreateSession={() => createSession(`Terminal ${sessions.length + 1}`)}
              onToggleBottomPanel={() => setIsBottomPanelVisible(!isBottomPanelVisible)}
              isBottomPanelVisible={isBottomPanelVisible}
              onToggleBrowserPanel={() => setIsBrowserPanelVisible(!isBrowserPanelVisible)}
              isBrowserPanelVisible={isBrowserPanelVisible}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenWorkspaceSettings={handleOpenWorkspaceSettings}
            />
          </div>
        </div>

        <main className="flex-1 flex overflow-hidden">
          {/* Center content area (canvas + bottom panel) */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Canvas area */}
            <div className="flex-1 flex overflow-hidden">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center h-full">
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
            </div>
            {/* Bottom panel - between sidebar and browser panel */}
            <BottomPanel
              isVisible={isBottomPanelVisible}
              onClose={() => setIsBottomPanelVisible(false)}
              currentDirectory={activeDirectory?.path ?? null}
              currentDirectoryId={activeDirectoryId ?? undefined}
              ref={bottomPanelRef}
            />
          </div>
          {/* Browser panel on the right */}
          <BrowserPanel
            isVisible={isBrowserPanelVisible}
            onClose={() => setIsBrowserPanelVisible(false)}
            onRunCommand={handleRunCommand}
          />
        </main>
      </div>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

      {workspaceSettings && (
        <SettingsModal
          directoryId={workspaceSettings.id}
          workspaceName={workspaceSettings.name}
          onClose={() => setWorkspaceSettings(null)}
        />
      )}

      {/* Status Bar */}
      <footer className="bg-bg-base border-t border-border px-4 py-1 text-[9px] text-fg-faint flex justify-between uppercase tracking-[0.2em]">
        <span>
          {directories.length} Directories | {sessions.length} Active Sessions
        </span>
        <span>EnviroTerm v1.0</span>
      </footer>
    </div>
  )
}

export default App

