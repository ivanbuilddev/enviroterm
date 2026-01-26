import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Session, Directory } from '../../../shared/types';
import { TerminalView } from './TerminalView';
import { TerminalWindow } from './TerminalWindow';

interface TerminalManagerProps {
  sessions: Session[];
  activeDirectory: Directory | null;
  focusedSessionId?: string | null;
  onRenameSession: (id: string, name: string) => Promise<void>;
  onCreateSession: (name?: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
}

interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function TerminalManager({
  sessions,
  activeDirectory,
  focusedSessionId,
  onRenameSession,
  onCreateSession,
  onDeleteSession
}: TerminalManagerProps) {
  const [zIndices, setZIndices] = useState<Record<string, number>>({});
  const maxZRef = useRef(10);

  // Canvas panning state
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Track window geometries for centering
  const windowGeometries = useRef<Record<string, WindowGeometry>>({});

  const bringToFront = useCallback((id: string) => {
    setZIndices(prev => {
      maxZRef.current += 1;
      return { ...prev, [id]: maxZRef.current };
    });
  }, []);

  // Handle geometry updates from windows
  const handleGeometryChange = useCallback((id: string, geometry: WindowGeometry) => {
    windowGeometries.current[id] = geometry;
  }, []);

  // Center canvas on focused session
  const centerOnWindow = useCallback((sessionId: string) => {
    const geometry = windowGeometries.current[sessionId];
    const canvas = canvasRef.current;

    if (!geometry || !canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const canvasCenterX = canvasRect.width / 2;
    const canvasCenterY = canvasRect.height / 2;

    // Calculate window center
    const windowCenterX = geometry.x + geometry.width / 2;
    const windowCenterY = geometry.y + geometry.height / 2;

    // Calculate offset to center the window
    const newOffsetX = canvasCenterX - windowCenterX;
    const newOffsetY = canvasCenterY - windowCenterY;

    // Enable animation for smooth transition
    setIsAnimating(true);
    setCanvasOffset({ x: newOffsetX, y: newOffsetY });

    // Disable animation after transition completes
    setTimeout(() => setIsAnimating(false), 300);
  }, []);

  useEffect(() => {
    if (focusedSessionId) {
      bringToFront(focusedSessionId);
      // Small delay to ensure geometry is updated
      setTimeout(() => {
        centerOnWindow(focusedSessionId);
      }, 50);
    }
  }, [focusedSessionId, bringToFront, centerOnWindow]);

  // Canvas panning handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start panning if clicking directly on the canvas background
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: canvasOffset.x,
        offsetY: canvasOffset.y
      };
      e.preventDefault();
    }
  }, [canvasOffset]);

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setCanvasOffset({
        x: panStartRef.current.offsetX + dx,
        y: panStartRef.current.offsetY + dy
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  const windowOffsets = useMemo(() => {
    const offsets: Record<string, { x: number, y: number }> = {};
    sessions.forEach((s, i) => {
      offsets[s.id] = {
        x: 60 + (i * 40) % 200,
        y: 60 + (i * 40) % 200
      };
    });
    return offsets;
  }, [sessions.length]);

  if (!activeDirectory) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-base/50">
        <div className="text-center p-8 border border-dashed border-border bg-bg-surface/30 backdrop-blur-sm">
          <h2 className="text-xl font-header text-fg-primary mb-2">No Directory Selected</h2>
          <p className="text-fg-muted max-w-xs mx-auto">
            Select a directory from the sidebar to start working.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      className={`flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-bg-surface/20 via-bg-base to-bg-base ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleCanvasMouseDown}
    >
      {/* Background pattern that moves with canvas */}
      <div
        className="canvas-background absolute opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(var(--color-fg-muted) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
          width: '200%',
          height: '200%',
          left: '-50%',
          top: '-50%'
        }}
      />

      {/* Canvas content that pans */}
      <div
        className={`absolute inset-0 pointer-events-none ${isAnimating ? 'transition-transform duration-300 ease-out' : ''}`}
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`
        }}
      >
        {sessions.map(session => (
          <div key={session.id} className="pointer-events-auto">
            <TerminalWindow
              id={session.id}
              title={session.name}
              onFocus={bringToFront}
              onRename={onRenameSession}
              onClose={() => onDeleteSession(session.id)}
              onGeometryChange={handleGeometryChange}
              zIndex={zIndices[session.id] || 10}
              initialX={windowOffsets[session.id]?.x}
              initialY={windowOffsets[session.id]?.y}
            >
              <TerminalView
                sessionId={session.id}
                sessionName={session.name}
                folderPath={activeDirectory.path}
                isVisible={true}
                isFocused={session.id === focusedSessionId}
                runInitialCommand={true}
              />
            </TerminalWindow>
          </div>
        ))}
      </div>
    </div>
  );
}
