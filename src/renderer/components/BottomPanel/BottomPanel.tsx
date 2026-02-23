import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { X, Plus } from 'lucide-react';
import { TerminalView } from '../Terminal/TerminalView';

export interface BottomPanelTab {
  id: string;
  name: string;
  initialCommand?: string;
  cwd?: string;
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
      // Allow creation if cwd is provided OR currentWorkspace exists
      if (!currentWorkspace && !cwd) return;

      const newTab: BottomPanelTab = {
        id: `panel-tab-${Date.now()}`,
        name: name || `Terminal ${tabs.length + 1}`,
        initialCommand,
        cwd,
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }, [tabs.length, currentWorkspace]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      createNewTab
    }), [createNewTab]);

    // Create initial tab when panel opens and no tabs exist
    useEffect(() => {
      if (isVisible && tabs.length === 0 && currentWorkspace) {
        createNewTab();
      }
    }, [isVisible, currentWorkspace, tabs.length, createNewTab]);

    const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
      e.stopPropagation();

      // Kill the terminal process
      window.electronAPI.terminal.kill(tabId);

      setTabs(prev => {
        const newTabs = prev.filter(t => t.id !== tabId);

        // If we closed the active tab, switch to another
        if (activeTabId === tabId && newTabs.length > 0) {
          const closedIndex = prev.findIndex(t => t.id === tabId);
          const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
          setActiveTabId(newTabs[newActiveIndex].id);
        } else if (newTabs.length === 0) {
          setActiveTabId(null);
          onClose(); // Close panel when no tabs left
        }

        return newTabs;
      });
    }, [activeTabId, onClose]);

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

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [handleMouseMove, handleMouseUp]);

    if (!isVisible) return null;

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
            {tabs.map(tab => (
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
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`absolute inset-0 ${activeTabId === tab.id ? 'visible' : 'invisible'}`}
            >
              {(currentWorkspace || tab.cwd) && (
                <TerminalView
                  sessionId={tab.id}
                  sessionName={tab.name}
                  folderPath={tab.cwd || currentWorkspace!}
                  isVisible={activeTabId === tab.id}
                  isFocused={activeTabId === tab.id}
                  runInitialCommand={!!tab.initialCommand}
                  initialCommand={tab.initialCommand}
                  workspaceId={currentWorkspaceId}
                />
              )}
            </div>
          ))}

          {tabs.length === 0 && (
            <div className="flex items-center justify-center h-full text-fg-muted text-sm">
              {currentWorkspace ? 'No terminals open' : 'Select a workspace to open a terminal'}
            </div>
          )}
        </div>
      </div>
    );
  }
);

