import { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TerminalManager } from './components/Terminal/TerminalManager';
import { BottomPanel, BottomPanelHandle } from './components/BottomPanel/BottomPanel';
import { BrowserPanel } from './components/BrowserPanel/BrowserPanel';
import { useWorkspace } from './hooks/useWorkspace';
import { MobileApp } from './components/Remote/MobileApp';
import { SettingsModal } from './components/Settings/SettingsModal';
import { WorkspacePopover } from './components/Sidebar/WorkspacePopover';
import { FileExplorer } from './components/FileExplorer/FileExplorer';
import { CodeEditor } from './components/CodeEditor/CodeEditor';

function App() {
  if (!window.electronAPI) {
    return <MobileApp />;
  }

  const {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    sessions,
    isLoading,
    createWorkspace,
    selectWorkspace,
    deleteWorkspace,
    reorderWorkspaces,
    openInVSCode,
    openInExplorer,
    createSession,
    createSessionForWorkspace,
    renameSession,
    deleteSession
  } = useWorkspace();

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isExplorerVisible, setIsExplorerVisible] = useState(false);
  const [editorWidth, setEditorWidth] = useState(600);
  const [isResizingEditor, setIsResizingEditor] = useState(false);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string>('');
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [isBottomPanelVisible, setIsBottomPanelVisible] = useState(false);
  const [isBrowserPanelVisible, setIsBrowserPanelVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [workspaceSettings, setWorkspaceSettings] = useState<{ id: string; name: string } | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const bottomPanelRef = useRef<BottomPanelHandle>(null);

  const handleSelectSession = (workspaceId: string, sessionId: string) => {
    selectWorkspace(workspaceId);
    setFocusedSessionId(sessionId);
    // Reset focus after a bit so it can be re-triggered
    setTimeout(() => setFocusedSessionId(null), 500);
  };

  const handleOpenWorkspaceSettings = (id: string, name: string) => {
    setWorkspaceSettings({ id, name });
  };

  const handleCreateSessionForWorkspace = (workspaceId: string, name: string) => {
    // Empty initial command relies on backend default
    createSessionForWorkspace(workspaceId, name, '');
  };

  const handleRunWorkspaceCommand = async (workspaceId: string, name: string, command: string) => {
    const targetWorkspace = workspaces.find(w => w.id === workspaceId);
    if (!targetWorkspace) return;

    if (activeWorkspaceId !== workspaceId) {
      selectWorkspace(workspaceId);
    }

    setIsBottomPanelVisible(true);
    // Give it a tick to ensure it's visible if it wasn't
    setTimeout(() => {
      bottomPanelRef.current?.createNewTab(name, command, targetWorkspace.path);
    }, 50);
  };

  const handleRunCommand = (command: string) => {
    setIsBottomPanelVisible(true);
    // Give it a tick to ensure it's visible if it wasn't
    setTimeout(() => {
      bottomPanelRef.current?.createNewTab('External Cmd', command);
    }, 50);
  };

  const handleFileSelect = async (file: any) => {
    if (file.isDirectory) return;
    try {
      const content = await window.electronAPI.files.readFile(file.path);
      setActiveFilePath(file.path);
      setActiveFileContent(content);
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  };

  const handleFileSave = async (path: string, content: string) => {
    try {
      await window.electronAPI.files.writeFile(path, content);
      setActiveFileContent(content);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  };

  const closeEditor = () => {
    setActiveFilePath(null);
    setActiveFileContent('');
  };

  useEffect(() => {
    if (!isResizingEditor) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Editor is now on the left.
      // Width is simply the mouse X position minus the sidebar width (64px) and file explorer (256px if visible)
      // But we are resizing the editor panel itself.
      // The resize handle is on the right edge of the editor.
      // So width = Mouse X - (Sidebar Width + File Explorer Width)
      
      const sidebarWidth = 64;
      const explorerWidth = isExplorerVisible ? 256 : 0; // w-64 is 256px
      
      const newWidth = e.clientX - sidebarWidth - explorerWidth;
      
      setEditorWidth(Math.max(200, Math.min(newWidth, document.body.clientWidth * 0.8)));
    };

    const handleMouseUp = () => {
      setIsResizingEditor(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingEditor, isBrowserPanelVisible]);

  return (
    <div 
      className="min-h-screen bg-bg-base text-fg-primary flex flex-col h-screen overflow-hidden"
      onContextMenu={(e) => {
        // Only open context menu if clicking on the main content area (not sidebar/header if handled there)
        // But the prompt says "anywhere inside the canvas". 
        // We'll let specific components stopPropagation if needed.
        // For now, attach to the root but check target? 
        // Actually, let's attach strictly to the canvas area wrapper.
      }}
    >
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
            {activeWorkspace?.path ?? 'Ready'}
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
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onSelectWorkspace={selectWorkspace}
              onAddWorkspace={createWorkspace}
              onReorderWorkspaces={reorderWorkspaces}
              onDeleteWorkspace={deleteWorkspace}
              onOpenInVSCode={openInVSCode}
              onOpenInExplorer={openInExplorer}
              onRunCommand={handleRunWorkspaceCommand}
              onSelectSession={handleSelectSession}
              onCreateSession={() => createSession(`Terminal ${sessions.length + 1}`)}
              onCreateSessionForWorkspace={handleCreateSessionForWorkspace}
              onToggleBottomPanel={() => setIsBottomPanelVisible(!isBottomPanelVisible)}
              isBottomPanelVisible={isBottomPanelVisible}
              onToggleBrowserPanel={() => setIsBrowserPanelVisible(!isBrowserPanelVisible)}
              isBrowserPanelVisible={isBrowserPanelVisible}
              onToggleExplorer={() => {
                const willBeVisible = !isExplorerVisible;
                setIsExplorerVisible(willBeVisible);
                if (!willBeVisible) {
                  setActiveFilePath(null);
                  setActiveFileContent('');
                }
              }}
              isExplorerVisible={isExplorerVisible}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenWorkspaceSettings={handleOpenWorkspaceSettings}
            />
          </div>
        </div>

        {/* File Explorer Panel */}
        {isExplorerVisible && (
          <div className="w-64 border-r border-border bg-bg-surface flex flex-col overflow-hidden">
             <FileExplorer 
               rootPath={activeWorkspace?.path || ''} 
               onFileSelect={handleFileSelect}
               activeFilePath={activeFilePath}
             />
          </div>
        )}

        <main className="flex-1 flex overflow-hidden">
          {/* Center content area (canvas + bottom panel) */}
          <div 
            className="flex-1 flex flex-col overflow-hidden relative"
            onContextMenu={(e) => {
                e.preventDefault();
                if (activeWorkspace) {
                    setContextMenuPos({ x: e.clientX, y: e.clientY });
                }
            }}
          >
            {/* Canvas area */}
            <div className="flex-1 flex overflow-hidden relative">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <p className="text-fg-muted animate-pulse">Initializing workspace...</p>
                </div>
              ) : (
                <div className="flex-1 flex h-full overflow-hidden">
                  
                  {/* Editor Area - resizable side panel (Now on Left) */}
                  {activeFilePath && (
                    <>
                      {/* Editor Panel */}
                      <div 
                        className="flex flex-col bg-bg-base border-r border-border shrink-0"
                        style={{ width: editorWidth }}
                      >
                        <div className="h-8 bg-bg-elevated border-b border-border flex items-center justify-between px-2 flex-shrink-0">
                             <span className="text-xs text-fg-muted truncate max-w-[calc(100%-60px)]">{activeFilePath}</span>
                             <button onClick={closeEditor} className="text-xs text-fg-muted hover:text-fg-primary px-2 py-1 rounded hover:bg-bg-hover">Close</button>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                           <CodeEditor 
                             filePath={activeFilePath}
                             initialContent={activeFileContent}
                             onSave={handleFileSave}
                           />
                           {/* Overlay during resize to prevent iframe capturing events */}
                           {isResizingEditor && <div className="absolute inset-0 z-50 bg-transparent" />}
                        </div>
                      </div>

                      {/* Resize Handle */}
                      <div
                        className="w-1 bg-border hover:bg-accent-primary cursor-col-resize transition-colors z-10 flex-shrink-0"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsResizingEditor(true);
                        }}
                      />
                    </>
                  )}

                  {/* Terminal Area - always visible, takes remaining space */}
                  <div className="flex-1 h-full flex flex-col min-w-0">
                    <TerminalManager
                      sessions={sessions}
                      activeWorkspace={activeWorkspace}
                      focusedSessionId={focusedSessionId}
                      onRenameSession={renameSession}
                      onCreateSession={createSession}
                      onDeleteSession={deleteSession}
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Bottom panel - between sidebar and browser panel */}
            <BottomPanel
              isVisible={isBottomPanelVisible}
              onClose={() => setIsBottomPanelVisible(false)}
              currentWorkspace={activeWorkspace?.path ?? null}
              currentWorkspaceId={activeWorkspaceId ?? undefined}
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

      {/* Context Menu Overlay */}
      {contextMenuPos && activeWorkspace && (
          <div 
              className="fixed inset-0 z-[9999]" 
              onClick={() => setContextMenuPos(null)}
              onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenuPos(null);
              }}
          >
              <div 
                  className="absolute"
                  style={{ 
                      top: contextMenuPos.y > window.innerHeight / 2 ? 'auto' : contextMenuPos.y, 
                      bottom: contextMenuPos.y > window.innerHeight / 2 ? window.innerHeight - contextMenuPos.y : 'auto',
                      left: contextMenuPos.x 
                  }}
                  onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
              >
                  <WorkspacePopover
                      workspace={activeWorkspace}
                      sessions={sessions}
                      onSelectSession={(sessionId) => {
                          handleSelectSession(activeWorkspace.id, sessionId);
                          setContextMenuPos(null);
                      }}
                      onCreateSession={() => {
                          createSession(`Terminal ${sessions.length + 1}`);
                          setContextMenuPos(null);
                      }}
                      onDeleteWorkspace={() => {
                          deleteWorkspace(activeWorkspace.id);
                          setContextMenuPos(null);
                      }}
                      onOpenInVSCode={() => {
                          openInVSCode(activeWorkspace.path);
                          setContextMenuPos(null);
                      }}
                      onOpenInExplorer={() => {
                          openInExplorer(activeWorkspace.path);
                          setContextMenuPos(null);
                      }}
                      onRunCommand={(name, command) => {
                          handleRunWorkspaceCommand(activeWorkspace.id, name, command);
                          setContextMenuPos(null);
                      }}
                      onSendToPhone={() => {
                          // Handle this if needed, or disable for context menu?
                          // For now, maybe just log or alert, or reuse state?
                          // Sidebar has state for this. App doesn't.
                          // Let's omit or mock for now, or hoist state.
                          console.log('Send to phone from context menu not fully implemented');
                          setContextMenuPos(null);
                      }}
                      onOpenSettings={() => {
                          handleOpenWorkspaceSettings(activeWorkspace.id, activeWorkspace.name);
                          setContextMenuPos(null);
                      }}
                  />
              </div>
          </div>
      )}

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

      {workspaceSettings && (
        <SettingsModal
          workspaceId={workspaceSettings.id}
          workspaceName={workspaceSettings.name}
          onClose={() => setWorkspaceSettings(null)}
        />
      )}

      {/* Status Bar */}
      <footer className="bg-bg-base border-t border-border px-4 py-1 text-[9px] text-fg-faint flex justify-between uppercase tracking-[0.2em]">
        <span>
          {workspaces.length} Workspaces | {sessions.length} Active Sessions
        </span>
        <span>EnviroTerm</span>
      </footer>
    </div>
  )
}

export default App

