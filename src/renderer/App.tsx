import { useState, useRef, useEffect, Activity } from 'react';
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
import { Download } from 'lucide-react';
import { Toast, ToastType } from './components/UI/Toast';

function App() {
  if (!window.electronAPI) {
    return <MobileApp />;
  }

  const {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    sessionsByWorkspace,
    isLoading,
    createWorkspace,
    selectWorkspace,
    deleteWorkspace,
    reorderWorkspaces,
    setExplorerOpen,
    setBottomPanelOpen,
    setBrowserPanelOpen,
    setEditorWidth,
    setWorkspaceActiveFilePath,
    openInVSCode,
    openInExplorer,
    createSession,
    createSessionForWorkspace,
    renameSession,
    deleteSession
  } = useWorkspace();

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isExplorerVisible, setIsExplorerVisible] = useState(false);
  const [editorWidth, setEditorWidthState] = useState(600);
  const [isResizingEditor, setIsResizingEditor] = useState(false);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string>('');
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [isBottomPanelVisible, setIsBottomPanelVisible] = useState(false);
  const [isBrowserPanelVisible, setIsBrowserPanelVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [workspaceSettings, setWorkspaceSettings] = useState<{ id: string; name: string } | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'none' | 'checking' | 'available' | 'downloaded'>('none');
  const [toastMessage, setToastMessage] = useState<{ message: string; type?: ToastType; id: number } | null>(null);

  const bottomPanelRefs = useRef<Record<string, BottomPanelHandle | null>>({});

  const handleSelectSession = (workspaceId: string, sessionId: string) => {
    selectWorkspace(workspaceId);
    setFocusedSessionId(sessionId);
    // Reset focus after a bit so it can be re-triggered
    setTimeout(() => setFocusedSessionId(null), 500);
  };

  const handleOpenWorkspaceSettings = (id: string, name: string) => {
    setWorkspaceSettings({ id, name });
  };

  const handleCreateSession = async (name?: string, initialCommand?: string) => {
    const newSession = await createSession(name, initialCommand);
    if (newSession) {
      setFocusedSessionId(newSession.id);
      setTimeout(() => setFocusedSessionId(null), 500);
    }
    return newSession;
  };

  const handleCreateSessionForWorkspace = async (workspaceId: string, name: string) => {
    // Empty initial command relies on backend default
    const newSession = await createSessionForWorkspace(workspaceId, name, '');
    if (newSession && activeWorkspaceId === workspaceId) {
      setFocusedSessionId(newSession.id);
      setTimeout(() => setFocusedSessionId(null), 500);
    }
  };

  const handleRunWorkspaceCommand = async (workspaceId: string, name: string, command: string) => {
    const targetWorkspace = workspaces.find(w => w.id === workspaceId);
    if (!targetWorkspace) return;

    if (activeWorkspaceId !== workspaceId) {
      selectWorkspace(workspaceId);
    }

    setIsBottomPanelVisible(true);
    if (activeWorkspaceId) {
      setBottomPanelOpen(activeWorkspaceId, true);
    }
    // Give it a tick to ensure it's visible if it wasn't
    setTimeout(() => {
      bottomPanelRefs.current[workspaceId]?.createNewTab(name, command, targetWorkspace.path);
    }, 50);
  };

  const handleRunCommand = (command: string) => {
    setIsBottomPanelVisible(true);
    if (activeWorkspaceId) {
      setBottomPanelOpen(activeWorkspaceId, true);
      // Give it a tick to ensure it's visible if it wasn't
      setTimeout(() => {
        bottomPanelRefs.current[activeWorkspaceId]?.createNewTab('External Cmd', command);
      }, 50);
    }
  };

  const handleFileSelect = async (file: any) => {
    if (file.isDirectory) return;
    try {
      const content = await window.electronAPI.files.readFile(file.path);
      setActiveFilePath(file.path);
      setActiveFileContent(content);
      if (activeWorkspaceId) {
        setWorkspaceActiveFilePath(activeWorkspaceId, file.path);
      }
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
    if (activeWorkspaceId) {
      setWorkspaceActiveFilePath(activeWorkspaceId, null);
    }
  };

  useEffect(() => {
    if (!window.electronAPI?.updater) return;

    // Check for updates on startup
    window.electronAPI.updater.check();

    const unsubs = [
      window.electronAPI.updater.onStatusChange((status: string) => {
        setUpdateStatus(status as any);
        if (status === 'up-to-date') {
          setToastMessage({ message: 'You are using the latest version', type: 'success', id: Date.now() });
          setTimeout(() => setUpdateStatus('none'), 3000);
        } else if (status === 'available') {
          setToastMessage({ message: 'Update available. Downloading...', type: 'info', id: Date.now() });
        } else if (status === 'downloaded') {
          setToastMessage({ message: 'Update downloaded. Ready to install.', type: 'info', id: Date.now() });
        }
      }),
      window.electronAPI.updater.onError((err: string) => {
        console.error('Updater error:', err);
        setUpdateStatus('none');
        setToastMessage({ message: `Update error: ${err}`, type: 'error', id: Date.now() });
      })
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const previousWorkspaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;

    if (activeWorkspace.id !== previousWorkspaceIdRef.current) {
      // Workspace changed, apply its saved state
      setIsExplorerVisible(activeWorkspace.isExplorerOpen ?? false);
      setIsBottomPanelVisible(activeWorkspace.isBottomPanelOpen ?? false);
      setIsBrowserPanelVisible(activeWorkspace.isBrowserPanelOpen ?? false);
      setEditorWidthState(activeWorkspace.editorWidth ?? 600);

      // Handle file loading if there's an active file path
      const path = activeWorkspace.activeFilePath;
      setActiveFilePath(path ?? null);
      if (path) {
        window.electronAPI.files.readFile(path)
          .then(content => {
            setActiveFileContent(content);
          })
          .catch(err => {
            console.error('Failed to restore active file for workspace:', err);
            setActiveFilePath(null);
            setActiveFileContent('');
          });
      } else {
        setActiveFileContent('');
      }

      previousWorkspaceIdRef.current = activeWorkspace.id;
    }
  }, [activeWorkspace]);

  // Local setter that also saves to workspace
  const handleSetEditorWidth = (width: number) => {
    setEditorWidthState(width);
    if (activeWorkspaceId) {
      setEditorWidth(activeWorkspaceId, width);
    }
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

      handleSetEditorWidth(Math.max(200, Math.min(newWidth, document.body.clientWidth * 0.8)));
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
      onContextMenu={() => {
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
          <div className="flex items-center mr-2">
            <button
              onClick={() => {
                if (updateStatus === 'downloaded') {
                  window.electronAPI.updater.install();
                } else if (updateStatus !== 'checking' && updateStatus !== 'available') {
                  window.electronAPI.updater.check();
                  setUpdateStatus('checking');
                }
              }}
              className={`p-1.5 transition-colors rounded ${updateStatus === 'downloaded' ? 'text-accent-primary hover:bg-accent-primary/10 cursor-pointer' :
                updateStatus === 'available' ? 'text-accent-primary hover:bg-accent-primary/10 cursor-wait' :
                  updateStatus === 'checking' ? 'text-fg-muted cursor-wait' :
                    'text-fg-muted hover:text-fg-primary hover:bg-white/10 cursor-pointer'
                }`}
              title={
                updateStatus === 'downloaded' ? 'Install Update' :
                  updateStatus === 'checking' ? 'Checking for updates...' :
                    updateStatus === 'available' ? 'Downloading update...' : 'Check for updates'
              }
            >
              <Download className={`w-3.5 h-3.5 ${updateStatus === 'checking' || updateStatus === 'available' ? 'animate-pulse' : ''}`} />
            </button>
          </div>
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
              onCreateSession={() => {
                if (activeWorkspaceId) {
                  const wsSessions = sessionsByWorkspace[activeWorkspaceId] || [];
                  handleCreateSession(`Terminal ${wsSessions.length + 1}`);
                }
              }}
              onCreateSessionForWorkspace={handleCreateSessionForWorkspace}
              onToggleBottomPanel={() => {
                const willBeVisible = !isBottomPanelVisible;
                setIsBottomPanelVisible(willBeVisible);
                if (activeWorkspaceId) {
                  setBottomPanelOpen(activeWorkspaceId, willBeVisible);
                }
              }}
              isBottomPanelVisible={isBottomPanelVisible}
              onToggleBrowserPanel={() => {
                const willBeVisible = !isBrowserPanelVisible;
                setIsBrowserPanelVisible(willBeVisible);
                if (activeWorkspaceId) {
                  setBrowserPanelOpen(activeWorkspaceId, willBeVisible);
                }
              }}
              isBrowserPanelVisible={isBrowserPanelVisible}
              onToggleExplorer={() => {
                const willBeVisible = !isExplorerVisible;
                setIsExplorerVisible(willBeVisible);
                if (!willBeVisible) {
                  setActiveFilePath(null);
                  setActiveFileContent('');
                  if (activeWorkspaceId) {
                    setWorkspaceActiveFilePath(activeWorkspaceId, null);
                  }
                }
                if (activeWorkspaceId) {
                  setExplorerOpen(activeWorkspaceId, willBeVisible);
                }
              }}
              isExplorerVisible={isExplorerVisible}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenWorkspaceSettings={handleOpenWorkspaceSettings}
            />
          </div>
        </div>

        <main className="flex-1 flex overflow-hidden">
          {/* Workspaces Area */}
          {workspaces.map(workspace => (
            <div
              key={workspace.id}
              className="flex-1 flex flex-col overflow-hidden relative w-full h-full"
              style={{ display: activeWorkspaceId === workspace.id ? 'flex' : 'none' }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (activeWorkspace) {
                  setContextMenuPos({ x: e.clientX, y: e.clientY });
                }
              }}
            >
              {/* File Explorer Panel - use Activity to preserve state */}
              <Activity mode={isExplorerVisible ? "visible" : "hidden"}>
                <div style={{ display: isExplorerVisible ? 'flex' : 'none' }} className="w-64 border-r border-border bg-bg-surface flex-col overflow-hidden absolute left-0 top-0 bottom-0 z-40">
                  <FileExplorer
                    rootPath={workspace.path}
                    onFileSelect={handleFileSelect}
                    activeFilePath={workspace.activeFilePath || null}
                  />
                </div>
              </Activity>

              {/* Center content area (canvas + bottom panel) */}
              <div className={`flex-1 flex flex-col overflow-hidden relative ${isExplorerVisible ? 'ml-64' : 'ml-0'}`}>
                {/* Canvas area */}
                <div className="flex-1 flex overflow-hidden relative">
                  {isLoading ? (
                    <div className="flex-1 flex items-center justify-center h-full">
                      <p className="text-fg-muted animate-pulse">Initializing workspace...</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex h-full overflow-hidden">

                      {/* Editor Area - resizable side panel (Now on Left) */}
                      {workspace.activeFilePath && activeFilePath === workspace.activeFilePath && (
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
                          sessions={sessionsByWorkspace[workspace.id] || []}
                          activeWorkspace={workspace}
                          isVisible={activeWorkspaceId === workspace.id}
                          focusedSessionId={focusedSessionId}
                          onRenameSession={renameSession}
                          onCreateSession={handleCreateSession}
                          onDeleteSession={deleteSession}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Bottom panel - specific to this workspace */}
                <div style={{ display: isBottomPanelVisible && activeWorkspaceId === workspace.id ? 'block' : 'none' }}>
                  <BottomPanel
                    isVisible={isBottomPanelVisible && activeWorkspaceId === workspace.id}
                    onClose={() => {
                      setIsBottomPanelVisible(false);
                      setBottomPanelOpen(workspace.id, false);
                    }}
                    currentWorkspace={workspace.path}
                    currentWorkspaceId={workspace.id}
                    ref={(el) => {
                      if (el) bottomPanelRefs.current[workspace.id] = el;
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          {/* Browser panel on the right */}
          <Activity mode={isBrowserPanelVisible ? "visible" : "hidden"}>
            <BrowserPanel
              isVisible={isBrowserPanelVisible}
              onClose={() => {
                setIsBrowserPanelVisible(false);
                if (activeWorkspaceId) {
                  setBrowserPanelOpen(activeWorkspaceId, false);
                }
              }}
              onRunCommand={handleRunCommand}
            />
          </Activity>
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
              sessions={sessionsByWorkspace[activeWorkspace.id] || []}
              onSelectSession={(sessionId) => {
                handleSelectSession(activeWorkspace.id, sessionId);
                setContextMenuPos(null);
              }}
              onCreateSession={() => {
                const wsSessions = sessionsByWorkspace[activeWorkspace.id] || [];
                handleCreateSession(`Terminal ${wsSessions.length + 1}`);
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
          {workspaces.length} Workspaces | {Object.values(sessionsByWorkspace).flat().length} Active Sessions
        </span>
        <span>EnviroTerm</span>
      </footer>

      {/* Global Toast */}
      {toastMessage && (
        <Toast
          key={toastMessage.id}
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  )
}

export default App

