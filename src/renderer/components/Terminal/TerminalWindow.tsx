import { useState, useRef, useEffect, ReactNode } from 'react';

interface WindowGeometry {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface TerminalWindowProps {
    title: string;
    id: string;
    children: ReactNode;
    initialX?: number;
    initialY?: number;
    initialWidth?: number;
    initialHeight?: number;
    zIndex: number;
    onFocus: (id: string) => void;
    onClose?: (id: string) => void;
    onRename?: (id: string, name: string) => void;
    onGeometryChange?: (id: string, geometry: WindowGeometry) => void;
}

export function TerminalWindow({
    title,
    id,
    children,
    initialX = 100,
    initialY = 100,
    initialWidth = 600,
    initialHeight = 400,
    zIndex,
    onFocus,
    onClose,
    onRename,
    onGeometryChange
}: TerminalWindowProps) {
    const [position, setPosition] = useState({ x: initialX, y: initialY });
    const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [preMaximizeState, setPreMaximizeState] = useState<{ pos: typeof position, size: typeof size } | null>(null);
    const [ghostSize, setGhostSize] = useState({ width: initialWidth, height: initialHeight });
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const windowRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only drag from the header and if NOT maximized
        if (!isMaximized && (e.target as HTMLElement).closest('.window-header')) {
            setIsDragging(true);
            dragStartPos.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
            };
            onFocus(id);
        } else {
            onFocus(id);
        }
    };

    const toggleMaximize = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isMaximized) {
            if (preMaximizeState) {
                setPosition(preMaximizeState.pos);
                setSize(preMaximizeState.size);
            }
            setIsMaximized(false);
        } else {
            setPreMaximizeState({ pos: position, size: size });
            setIsMaximized(true);
        }
    };

    const toggleMinimize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMinimized(!isMinimized);
    };

    // Report geometry changes to parent
    useEffect(() => {
        onGeometryChange?.(id, {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height
        });
    }, [position.x, position.y, size.width, size.height, id, onGeometryChange]);

    useEffect(() => {
        if (!isDragging || isMaximized) return;

        let frameId: number;
        const latestPos = { x: 0, y: 0 };

        const updatePosition = () => {
            setPosition({
                x: latestPos.x - dragStartPos.current.x,
                y: latestPos.y - dragStartPos.current.y
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            latestPos.x = e.clientX;
            latestPos.y = e.clientY;
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(updatePosition);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            cancelAnimationFrame(frameId);
        };
    }, [isDragging, isMaximized]);

    const windowStyles = isMaximized
        ? {
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            zIndex: zIndex + 1000, // Ensure maximized window is on top
            borderRadius: 0,
        }
        : {
            left: position.x,
            top: position.y,
            width: size.width,
            height: isMinimized ? 'auto' : size.height,
            zIndex: zIndex,
        };

    return (
        <>
            <div
                ref={windowRef}
                className={`
                    absolute bg-bg-surface border border-border shadow-2xl flex flex-col overflow-hidden
                    ${isDragging ? 'opacity-90 scale-[1.02] transition-none' : 'transition-all duration-300'}
                    ${isMaximized ? 'w-full h-full top-0 left-0 translate-x-0 translate-y-0 scale-100 shadow-none border-none' : ''}
                    ${isMinimized ? 'h-10 w-64 translate-y-[calc(100vh-120px)] opacity-60' : ''}
                `}
                style={{
                    ...windowStyles,
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(22, 27, 34, 0.8)'
                }}
                onMouseDown={handleMouseDown}
            >
                <div className="window-header bg-bg-elevated/50 px-4 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-border select-none">
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <input
                                autoFocus
                                className="bg-transparent text-[11px] px-0 py-0 border-none outline-none text-fg-primary font-header w-[200px] selection:bg-accent-primary/30"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onBlur={() => {
                                    if (editedTitle.trim() && editedTitle !== title) {
                                        onRename?.(id, editedTitle.trim());
                                    }
                                    setIsEditing(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (editedTitle.trim() && editedTitle !== title) {
                                            onRename?.(id, editedTitle.trim());
                                        }
                                        setIsEditing(false);
                                    } else if (e.key === 'Escape') {
                                        setEditedTitle(title);
                                        setIsEditing(false);
                                    }
                                }}
                                onMouseDown={(e) => e.stopPropagation()} // Prevent drag while editing
                            />
                        ) : (
                            <span
                                className="text-[11px] font-header text-fg-secondary truncate max-w-[200px] opacity-80 hover:opacity-100 hover:text-fg-primary cursor-text transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                    setEditedTitle(title);
                                }}
                            >
                                {title}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 no-drag">
                        <button
                            onClick={toggleMinimize}
                            className="p-1.5 hover:bg-white/10 transition-colors text-fg-muted hover:text-fg-primary"
                            title="Minimize"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                            </svg>
                        </button>
                        <button
                            onClick={toggleMaximize}
                            className="p-1.5 hover:bg-white/10 transition-colors text-fg-muted hover:text-fg-primary"
                            title={isMaximized ? "Restore" : "Maximize"}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="5" y="5" width="14" height="14" rx="1.5" strokeWidth={2.5} stroke="currentColor" fill="none" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose?.(id); }}
                            className="p-1.5 hover:bg-status-error/20 transition-colors text-fg-muted hover:bg-status-error hover:text-white"
                            title="Close"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className={`flex-1 overflow-hidden relative ${isMinimized ? 'hidden' : 'block'}`}>
                    {children}
                </div>

                {/* Resize Handle */}
                {!isMaximized && !isMinimized && (
                    <div
                        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize select-none flex items-end justify-end p-0.5"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setIsResizing(true);
                            setGhostSize(size);
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startWidth = size.width;
                            const startHeight = size.height;

                            const currentGhostRef = { width: startWidth, height: startHeight };

                            const handleResize = (re: MouseEvent) => {
                                const newWidth = Math.max(300, startWidth + (re.clientX - startX));
                                const newHeight = Math.max(200, startHeight + (re.clientY - startY));
                                currentGhostRef.width = newWidth;
                                currentGhostRef.height = newHeight;
                                setGhostSize({ width: newWidth, height: newHeight });
                            };

                            const stopResize = () => {
                                window.removeEventListener('mousemove', handleResize);
                                window.removeEventListener('mouseup', stopResize);
                                setIsResizing(false);
                                // Apply the final dimensions from the ghost
                                setSize({ width: currentGhostRef.width, height: currentGhostRef.height });
                            };

                            window.addEventListener('mousemove', handleResize);
                            window.addEventListener('mouseup', stopResize);
                        }}
                    >
                        <svg className="w-4 h-4 text-border-strong opacity-40 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22 22L12 22L22 12L22 22Z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Ghost Resize Indicator */}
            {isResizing && (
                <div
                    className="absolute pointer-events-none border-2 border-accent-primary z-[99999]"
                    style={{
                        left: position.x,
                        top: position.y,
                        width: ghostSize.width,
                        height: ghostSize.height,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)'
                    }}
                />
            )}
        </>
    );
}
