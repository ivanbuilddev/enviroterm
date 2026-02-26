import { useState, useRef, useEffect } from 'react';
import { X, RotateCw, ExternalLink } from 'lucide-react';

interface BrowserPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onRunCommand?: (command: string) => void;
}

const MIN_WIDTH = 300;
const MAX_WIDTH_RATIO = 0.8; // 80% of available space
const DEFAULT_WIDTH = 400;
const DEFAULT_URL = 'https://skills.sh';

export function BrowserPanel({ isVisible, onClose, onRunCommand }: BrowserPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadPath, setPreloadPath] = useState<string>('');
  const panelRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<HTMLWebViewElement>(null);

  // Use refs for resize state to avoid stale closures
  const resizeStateRef = useRef({
    startX: 0,
    startWidth: DEFAULT_WIDTH,
    isResizing: false
  });

  // Resize handlers - drag from left edge (since panel is on right)
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    resizeStateRef.current = {
      startX: e.clientX,
      startWidth: width,
      isResizing: true
    };
    setIsResizing(true);

    // Add listeners immediately on mousedown
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizeStateRef.current.isResizing) return;

    e.preventDefault();

    // Negative delta because dragging left increases width
    const delta = resizeStateRef.current.startX - e.clientX;
    const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
    const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, resizeStateRef.current.startWidth + delta));
    setWidth(newWidth);
  };

  const handleMouseUp = () => {
    resizeStateRef.current.isResizing = false;
    setIsResizing(false);

    // Clean up listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Cleanup on unmount
  useEffect(() => {
    // Get the preload path from main process
    const getPreloadPath = async () => {
      try {
        const path = await (window as any).electronAPI.getWebviewPreloadPath();
        // Convert backslashes to forward slashes for URL and ensure file:// protocol
        const normalizedPath = path.replace(/\\/g, '/');
        setPreloadPath(`file:///${normalizedPath}`);
      } catch (err) {
        console.error('Failed to get webview preload path:', err);
      }
    };
    getPreloadPath();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Handle webview events - need to wait for element to be ready
  useEffect(() => {
    if (!isVisible) return;

    const setupWebviewListeners = () => {
      const webview = webviewRef.current as any;
      if (!webview) return;

      const handleStartLoading = () => setIsLoading(true);
      const handleStopLoading = () => setIsLoading(false);
      const handleDidFinishLoad = () => {
        setIsLoading(false);
        // Inject custom script
        webview.executeJavaScript(`
          (function() {
            let timeout = null;
            
            function injectButtons() {
              // Target code blocks starting with $
              const codeBlocks = document.querySelectorAll('pre code, code');
              codeBlocks.forEach(code => {
                const text = code.textContent.trim();
                if (text.startsWith('$') && !code.nextElementSibling?.classList.contains('antigravity-injected')) {
                  // Button: Execute (Runs in terminal)
                  const btnExec = document.createElement('button');
                  btnExec.textContent = 'Execute';
                  btnExec.className = 'antigravity-injected';
                  btnExec.title = 'Run this command in EnviroTerm';
                  btnExec.style.cssText = 'background: hsl(190, 35%, 52%); color: white; border: none; padding: 4px 10px; border-radius: 0; font-size: 11px; font-weight: 500; cursor: pointer; margin-left: 10px; vertical-align: middle; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative; z-index: 9999;';
                  
                  btnExec.onmouseenter = () => {
                    btnExec.style.background = 'hsl(190, 38%, 58%)';
                    btnExec.style.transform = 'translateY(-1px)';
                    btnExec.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                  };
                  btnExec.onmouseleave = () => {
                    btnExec.style.background = 'hsl(190, 35%, 52%)';
                    btnExec.style.transform = 'translateY(0)';
                    btnExec.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  };

                  btnExec.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const cmd = text.replace(/^\\$\\s*/, "").trim();
                    window.electronHost.send('run-command', cmd);
                  };

                  // Try to find the outermost container (like a pre or a div wrapper)
                  const targetParent = code.closest('pre') || code.parentElement;
                  targetParent.parentNode.insertBefore(btnExec, targetParent.nextSibling);
                }
              });

              // Target specific elements that might contain "Copy to clipboard"
              const clipboardButtons = Array.from(document.querySelectorAll('button, span, div')).filter(el => 
                el.children.length === 0 && 
                el.textContent.includes('Copy to clipboard') && 
                !el.nextElementSibling?.classList.contains('antigravity-injected')
              );

              clipboardButtons.forEach(el => {
                const btnExec = document.createElement('button');
                btnExec.textContent = 'Execute';
                btnExec.className = 'antigravity-injected';
                btnExec.title = 'Run referenced command in EnviroTerm';
                btnExec.style.cssText = 'background: hsl(190, 35%, 52%); color: white; border: none; padding: 4px 10px; border-radius: 0; font-size: 11px; font-weight: 500; cursor: pointer; margin-left: 10px; vertical-align: middle; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative; z-index: 9999;';
                
                btnExec.onmouseenter = () => {
                  btnExec.style.background = 'hsl(190, 38%, 58%)';
                  btnExec.style.transform = 'translateY(-1px)';
                  btnExec.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                };
                btnExec.onmouseleave = () => {
                  btnExec.style.background = 'hsl(190, 35%, 52%)';
                  btnExec.style.transform = 'translateY(0)';
                  btnExec.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                };

                btnExec.onclick = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.electronHost.send('run-command', el.textContent.trim());
                };

                // For clipboard buttons, they are often inside a small wrapper. 
                // Let's go up one level to be "outside"
                const targetParent = el.parentElement;
                targetParent.parentNode.insertBefore(btnExec, targetParent.nextSibling);
              });
            }

            // Run once
            injectButtons();

            // Observe for changes with debounce, ignoring our own additions
            const observer = new MutationObserver((mutations) => {
              const hasNewRelevantNodes = mutations.some(m => 
                Array.from(m.addedNodes).some(node => 
                  node.nodeType === 1 && !node.classList?.contains('antigravity-injected')
                )
              );
              
              if (hasNewRelevantNodes) {
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(injectButtons, 300);
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
          })();
        `);
      };

      const handleIpcMessage = (event: any) => {
        if (event.channel === 'callback') {
          console.log('[Webview Callback]:', event.args[0]);
        } else if (event.channel === 'run-command') {
          onRunCommand?.(event.args[0]);
        }
      };

      webview.addEventListener('did-start-loading', handleStartLoading);
      webview.addEventListener('did-stop-loading', handleStopLoading);
      webview.addEventListener('did-finish-load', handleDidFinishLoad);
      webview.addEventListener('ipc-message', handleIpcMessage);

      return () => {
        webview.removeEventListener('did-start-loading', handleStartLoading);
        webview.removeEventListener('did-stop-loading', handleStopLoading);
        webview.removeEventListener('did-finish-load', handleDidFinishLoad);
        webview.removeEventListener('ipc-message', handleIpcMessage);
      };
    };

    // Delay to ensure webview is mounted
    const timer = setTimeout(setupWebviewListeners, 100);
    return () => clearTimeout(timer);
  }, [isVisible]);

  const handleRefresh = () => {
    const webview = webviewRef.current as any;
    webview?.reload();
  };

  const handleOpenExternal = () => {
    window.electronAPI.shell.openExternal(DEFAULT_URL);
  };

  const handleGoHome = () => {
    const webview = webviewRef.current as any;
    if (webview?.loadURL) {
      webview.loadURL(DEFAULT_URL);
    }
  };

  return (
    <div
      ref={panelRef}
      className="h-full bg-bg-surface border-l border-border flex flex-col flex-shrink-0 relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize handle - left edge (wider for easier grabbing) */}
      <div
        className={`absolute top-0 -left-1 bottom-0 w-2 cursor-ew-resize z-20 group`}
        onMouseDown={handleResizeStart}
      >
        <div className={`absolute top-0 left-1 bottom-0 w-[2px] transition-colors ${isResizing ? 'bg-accent-primary' : 'bg-transparent group-hover:bg-accent-primary'}`} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between bg-bg-elevated border-b border-border px-3 py-2 select-none">
        <button
          onClick={handleGoHome}
          className="text-xs text-fg-secondary font-medium truncate hover:text-accent-primary transition-colors"
          title="Go to skills.sh"
        >
          skills.sh
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className={`p-1 text-fg-muted hover:text-fg-primary hover:bg-bg-hover rounded transition-colors ${isLoading ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1 text-fg-muted hover:text-fg-primary hover:bg-bg-hover rounded transition-colors"
            title="Open in browser"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-fg-muted hover:text-status-error hover:bg-status-error/20 rounded transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Webview content */}
      <div className="flex-1 overflow-hidden bg-white relative">
        {preloadPath && (
          <webview
            ref={webviewRef}
            src={DEFAULT_URL}
            partition="persist:skillsbrowser"
            preload={preloadPath}
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: isResizing ? 'none' : 'auto',
            }}
          />
        )}
        {/* Overlay to capture mouse events during resize */}
        {isResizing && (
          <div className="absolute inset-0 z-10" />
        )}
      </div>
    </div>
  );
}
