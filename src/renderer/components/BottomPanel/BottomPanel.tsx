import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { X, Plus } from 'lucide-react';
import { TerminalView } from '../Terminal/TerminalView';

export interface BottomPanelTab {
  id: string;
  name: string;
  initialCommand?: string;
  cwd?: string;
  workspacePath: string;
}

interface BottomPanelProps {
  isVisible: boolean;
  onClose: () => void;
  currentWorkspace: string | null;
  currentWorkspaceId?: string;
}

export interface BottomPanelHandle {
  createNewTab: (name?: string, initialCommand?: string, cwd?: string) => void;
}

const MIN_HEIGHT = 150;
const MAX_HEIGHT_RATIO = 0.8; // 80% of available space
const DEFAULT_HEIGHT = 300;

export const BottomPanel = forwardRef<BottomPanelHandle, BottomPanelProps>(
  ({ isVisible, onClose, currentWorkspace, currentWorkspaceId }, ref) => {
    const [tabs, setTabs] = useState<BottomPanelTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Use refs for resize state to avoid stale closures
    const resizeStateRef = useRef({
      startY: 0,
      startHeight: DEFAULT_HEIGHT,
      isResizing: false
    });

    const createNewTab = useCallback((name?: string, initialCommand?: string, cwd?: string) => {
      if (!currentWorkspace && !cwd) return;

      const workspaceTabs = tabs.filter(t => t.workspacePath === (cwd || currentWorkspace!));
      const newTab: BottomPanelTab = {
        id: `panel-tab-${crypto.randomUUID()}`,
        name: name || `Terminal ${workspaceTabs.length + 1}`,
        initialCommand,
        cwd,
        workspacePath: cwd || currentWorkspace!,
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }, [currentWorkspace, tabs]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      createNewTab
    }), [createNewTab]);

    // Create initial tab when panel opens and no tabs exist for current workspace
    const initialTabCreatedRef = useRef(false);
    useEffect(() => {
      const workspaceTabs = tabs.filter(t => t.workspacePath === currentWorkspace);
      if (isVisible && workspaceTabs.length === 0 && currentWorkspace && !initialTabCreatedRef.current) {
        initialTabCreatedRef.current = true;
        createNewTab();
      }
      if (workspaceTabs.length > 0) {
        initialTabCreatedRef.current = false;
      }
    }, [isVisible, currentWorkspace, tabs, createNewTab]);

    // Handle workspace switch - preserve terminal state, just switch active tab
    const prevWorkspaceRef = useRef<string | null>(null);
    const tabsRef = useRef<BottomPanelTab[]>([]);
    tabsRef.current = tabs;

    useEffect(() => {
      if (currentWorkspace && currentWorkspace !== prevWorkspaceRef.current) {
        // Workspace changed - switch to tabs for this workspace
        // Don't kill terminals - preserve their state
        const workspaceTabs = tabsRef.current.filter(t => t.workspacePath === currentWorkspace);
        
        if (workspaceTabs.length > 0) {
          // Switch to the first tab of the new workspace
          setActiveTabId(workspaceTabs[0].id);
        } else {
          // No tabs for this workspace yet - create one if panel is visible
          setActiveTabId(null);
          if (isVisible) {
            // Small delay to ensure container has proper dimensions
            setTimeout(() => {
              createNewTab();
            }, 50);
          }
        }
      }
      prevWorkspaceRef.current = currentWorkspace;
    }, [currentWorkspace, isVisible, createNewTab]);

    const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
      e.stopPropagation();

      const wasActiveTab = activeTabId === tabId;

      // Kill the terminal process
      window.electronAPI.terminal.kill(tabId);

      setTabs(prev => {
        const newTabs = prev.filter(t => t.id !== tabId);

        // If we closed the active tab, switch to another tab of the same workspace
        if (wasActiveTab && newTabs.length > 0 && currentWorkspace) {
          const workspaceTabs = newTabs.filter(t => t.workspacePath === currentWorkspace);
          if (workspaceTabs.length > 0) {
            setActiveTabId(workspaceTabs[0].id);
          } else {
            // No more tabs for current workspace
            setActiveTabId(null);
          }
        } else if (newTabs.length === 0) {
          setActiveTabId(null);
          onClose();
        }

        return newTabs;
      });
    }, [activeTabId, currentWorkspace, onClose, tabs]);

    // Resize handlers
    const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!resizeStateRef.current.isResizing) return;
      e.preventDefault();

      const delta = resizeStateRef.current.startY - e.clientY;
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
      const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, resizeStateRef.current.startHeight + delta));
      setHeight(newHeight);
    }, []);

    const handleMouseUp = useCallback(() => {
      resizeStateRef.current.isResizing = false;
      setIsResizing(false);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      resizeStateRef.current = {
        startY: e.clientY,
        startHeight: height,
        isResizing: true
      };
      setIsResizing(true);

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }, [height, handleMouseMove, handleMouseUp]);

    // Cleanup on unmount - kill all terminal processes
    useEffect(() => {
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // Kill all terminal processes when unmounting
        tabsRef.current.forEach(tab => {
          window.electronAPI.terminal.kill(tab.id);
        });
      };
    }, [handleMouseMove, handleMouseUp]);

    return (
      <div
        ref={panelRef}
        className="bg-bg-surface border-t border-border flex flex-col flex-shrink-0 relative"
        style={{ height: `${height}px` }}
      >
        {/* Resize handle (taller for easier grabbing) */}
        <div
          className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize z-20 group"
          onMouseDown={handleResizeStart}
        >
          <div className={`absolute bottom-0 left-0 right-0 h-[2px] transition-colors ${isResizing ? 'bg-accent-primary' : 'bg-transparent group-hover:bg-accent-primary'}`} />
        </div>
        {/* Overlay to block pointer events during resize */}
        {isResizing && <div className="absolute inset-0 z-10" />}

        {/* Tab bar */}
        <div className="flex items-center bg-bg-elevated border-b border-border min-h-[32px] select-none">
          <div className="flex items-center flex-1 overflow-x-auto">
            {tabs.filter(t => t.workspacePath === currentWorkspace).map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border-r border-border transition-colors group ${activeTabId === tab.id
                  ? 'bg-bg-surface text-fg-primary'
                  : 'bg-bg-elevated text-fg-muted hover:text-fg-secondary hover:bg-bg-hover'
                  }`}
              >
                <span className="text-xs whitespace-nowrap">{tab.name}</span>
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="p-0.5 rounded hover:bg-status-error/20 hover:text-status-error opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {/* Add tab button - next to last tab */}
            <button
              onClick={() => createNewTab()}
              disabled={!currentWorkspace}
              className="p-1.5 text-fg-muted hover:text-fg-primary hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={currentWorkspace ? "New Terminal" : "Select a workspace first"}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Terminal content area */}
        <div className="flex-1 overflow-hidden relative">
          {tabs.filter(t => t.workspacePath === currentWorkspace).map(tab => (
            <div
              key={tab.id}
              className={`absolute inset-0 ${activeTabId === tab.id ? 'visible' : 'invisible'}`}
            >
              {(currentWorkspace || tab.cwd) && (
                <TerminalView
                  sessionId={tab.id}
                  sessionName={tab.name}
                  folderPath={tab.cwd || currentWorkspace!}
                  isFocused={activeTabId === tab.id}
                  runInitialCommand={!!tab.initialCommand}
                  initialCommand={tab.initialCommand}
                  workspaceId={currentWorkspaceId}
                />
              )}
            </div>
          ))}

          {tabs.filter(t => t.workspacePath === currentWorkspace).length === 0 && (
            <div className="flex items-center justify-center h-full text-fg-muted text-sm">
              {currentWorkspace ? 'No terminals open' : 'Select a workspace to open a terminal'}
            </div>
          )}
        </div>
      </div>
    );
  }
);

