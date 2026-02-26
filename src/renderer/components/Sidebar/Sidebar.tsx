import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Terminal, PanelBottom, Globe, Settings, FolderTree } from 'lucide-react';
import { Workspace, Session } from '../../../shared/types';
import { WorkspaceIcon } from './WorkspaceIcon';
import { AddWorkspaceButton } from './AddWorkspaceButton';
import { WorkspacePopover } from './WorkspacePopover';
import { RemoteQRCodeModal } from '../Remote/RemoteQRCodeModal';

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace: () => void;
  onReorderWorkspaces: (ids: string[]) => void;
  onDeleteWorkspace: (id: string) => void;
  onOpenInVSCode: (path: string) => void;
  onOpenInExplorer: (path: string) => void;
  onRunCommand: (workspaceId: string, name: string, command: string) => void;
  onSelectSession: (workspaceId: string, sessionId: string) => void;
  onCreateSession: () => void;
  onToggleBottomPanel: () => void;
  isBottomPanelVisible: boolean;
  onToggleBrowserPanel: () => void;
  isBrowserPanelVisible: boolean;
  onToggleExplorer: () => void;
  isExplorerVisible: boolean;
  onOpenSettings: () => void;
  onOpenWorkspaceSettings: (workspaceId: string, workspaceName: string) => void;
  onCreateSessionForWorkspace: (workspaceId: string, name: string) => void;
}

export function Sidebar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onAddWorkspace,
  onReorderWorkspaces,
  onDeleteWorkspace,
  onOpenInVSCode,
  onOpenInExplorer,
  onRunCommand,
  onSelectSession,
  onCreateSession,
  onToggleBottomPanel,
  isBottomPanelVisible,
  onToggleBrowserPanel,
  isBrowserPanelVisible,
  onToggleExplorer,
  isExplorerVisible,
  onOpenSettings,
  onOpenWorkspaceSettings,
  onCreateSessionForWorkspace
}: SidebarProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [popoverId, setPopoverId] = useState<string | null>(null);
  const [hoveredSessions, setHoveredSessions] = useState<Session[]>([]);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [remoteModalData, setRemoteModalData] = useState<{ id: string; path: string } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = workspaces.findIndex(w => w.id === sourceId);
    const targetIndex = workspaces.findIndex(w => w.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newWorkspaces = [...workspaces];
    const [removed] = newWorkspaces.splice(sourceIndex, 1);
    newWorkspaces.splice(targetIndex, 0, removed);

    onReorderWorkspaces(newWorkspaces.map(w => w.id));
    setDraggedId(null);
  };

  const handleContextMenu = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({ top: rect.top, left: rect.right + 8 });
    setPopoverId(id);
    try {
      const sessions = await window.electronAPI.sessions.getByWorkspace(id);
      setHoveredSessions(sessions);
    } catch (err) {
      console.error('Failed to fetch sessions for popover', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverId &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)) {
        setPopoverId(null);
        setHoveredSessions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverId]);

  return (
    <aside
      ref={sidebarRef}
      className="w-16 bg-bg-elevated border-r border-border flex flex-col items-center h-full z-[200] relative"
    >
      {/* Workspaces section - scrollable if needed */}
      <div className="flex flex-col items-center gap-2 w-full overflow-y-auto pt-3 pb-28">
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            draggable
            onDragStart={(e) => handleDragStart(e, workspace.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, workspace.id)}
            onContextMenu={(e) => handleContextMenu(e, workspace.id)}
            className={`relative transition-opacity duration-200 ${draggedId === workspace.id ? 'opacity-40' : 'opacity-100'}`}
          >
            <WorkspaceIcon
              workspace={workspace}
              isSelected={workspace.id === activeWorkspaceId}
              onClick={() => {
                onSelectWorkspace(workspace.id);
                setPopoverId(null);
              }}
            />

            {popoverId === workspace.id && createPortal(
              <div
                ref={popoverRef}
                className="fixed z-[5000]"
                style={{ top: popoverPos.top, left: popoverPos.left }}
              >
                <WorkspacePopover
                  workspace={workspace}
                  sessions={hoveredSessions}
                  onSelectSession={(sessionId) => onSelectSession(workspace.id, sessionId)}
                  onCreateSession={() => onCreateSessionForWorkspace(workspace.id, `Terminal ${hoveredSessions.length + 1}`)}
                  onDeleteWorkspace={() => onDeleteWorkspace(workspace.id)}
                  onOpenInVSCode={() => onOpenInVSCode(workspace.path)}
                  onOpenInExplorer={() => onOpenInExplorer(workspace.path)}
                  onRunCommand={(name, command) => onRunCommand(workspace.id, name, command)}
                  onSendToPhone={() => {
                    setRemoteModalData({ id: workspace.id, path: workspace.path });
                    setPopoverId(null);
                  }}
                  onOpenSettings={() => {
                    onOpenWorkspaceSettings(workspace.id, workspace.name);
                    setPopoverId(null);
                  }}
                />
              </div>,
              document.body
            )}
          </div>
        ))}
        <AddWorkspaceButton onClick={onAddWorkspace} />
      </div>

      {remoteModalData && (
        <RemoteQRCodeModal
          workspaceId={remoteModalData.id}
          workspacePath={remoteModalData.path}
          onClose={() => setRemoteModalData(null)}
        />
      )}

      {/* Action buttons fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 py-3 border-t border-border bg-bg-elevated">
        <button
          onClick={onToggleExplorer}
          className={`w-10 h-10 flex items-center justify-center border transition-all duration-150 ${isExplorerVisible
            ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
            : 'bg-bg-surface border-border text-fg-muted hover:text-fg-primary hover:border-accent-primary hover:bg-bg-hover'
            }`}
          title={isExplorerVisible ? "Close File Explorer" : "Open File Explorer"}
        >
          <FolderTree size={18} />
        </button>
        <button
          onClick={onCreateSession}
          className="w-10 h-10 flex items-center justify-center bg-bg-surface border border-border text-fg-muted hover:text-fg-primary hover:border-accent-primary hover:bg-bg-hover transition-all duration-150"
          title="New Terminal"
        >
          <Terminal size={18} />
        </button>
        <button
          onClick={onToggleBrowserPanel}
          className={`w-10 h-10 flex items-center justify-center border transition-all duration-150 ${isBrowserPanelVisible
            ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
            : 'bg-bg-surface border-border text-fg-muted hover:text-fg-primary hover:border-accent-primary hover:bg-bg-hover'
            }`}
          title={isBrowserPanelVisible ? "Close Skills Browser" : "Open Skills Browser"}
        >
          <Globe size={18} />
        </button>
        <button
          onClick={onToggleBottomPanel}
          className={`w-10 h-10 flex items-center justify-center border transition-all duration-150 ${isBottomPanelVisible
            ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
            : 'bg-bg-surface border-border text-fg-muted hover:text-fg-primary hover:border-accent-primary hover:bg-bg-hover'
            }`}
          title={isBottomPanelVisible ? "Close Terminals Panel" : "Open Terminals Panel"}
        >
          <PanelBottom size={18} />
        </button>
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 flex items-center justify-center bg-bg-surface border border-border text-fg-muted hover:text-fg-primary hover:border-accent-primary hover:bg-bg-hover transition-all duration-150"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
}
