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
    isAnchored?: boolean;
    onToggleAnchor?: () => void;
    canvasOffset?: { x: number; y: number };
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
    onGeometryChange,
    isAnchored,
    onToggleAnchor,
    canvasOffset
}: TerminalWindowProps) {
    const [position, setPosition] = useState({ x: initialX, y: initialY });
    const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [preMaximizeState, setPreMaximizeState] = useState<{ pos: typeof position, size: typeof size } | null>(null);
    const [ghostSize, setGhostSize] = useState({ width: initialWidth, height: initialHeight });
    const [ghostPosition, setGhostPosition] = useState({ x: initialX, y: initialY });
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, windowWidth: number, windowHeight: number } | null>(null);
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

    const handleResizeStart = (direction: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        setGhostSize(size);
        setGhostPosition(position);
        onFocus(id);

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = size.width;
        const startHeight = size.height;
        const startPosX = position.x;
        const startPosY = position.y;

        const currentState = {
            width: startWidth,
            height: startHeight,
            x: startPosX,
            y: startPosY
        };

        const handleResize = (re: MouseEvent) => {
            const dx = re.clientX - startX;
            const dy = re.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newX = startPosX;
            let newY = startPosY;

            if (direction.includes('right')) {
                newWidth = Math.max(300, startWidth + dx);
            }
            if (direction.includes('left')) {
                newWidth = Math.max(300, startWidth - dx);
                if (newWidth > 300) {
                    newX = startPosX + dx;
                } else {
                    newX = startPosX + (startWidth - 300);
                }
            }
            if (direction.includes('bottom')) {
                newHeight = Math.max(200, startHeight + dy);
            }
            if (direction.includes('top')) {
                newHeight = Math.max(200, startHeight - dy);
                if (newHeight > 200) {
                    newY = startPosY + dy;
                } else {
                    newY = startPosY + (startHeight - 200);
                }
            }

            currentState.width = newWidth;
            currentState.height = newHeight;
            currentState.x = newX;
            currentState.y = newY;

            setGhostSize({ width: newWidth, height: newHeight });
            setGhostPosition({ x: newX, y: newY });
        };

        const stopResize = () => {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('mouseup', stopResize);
            setIsResizing(false);
            setSize({ width: currentState.width, height: currentState.height });
            setPosition({ x: currentState.x, y: currentState.y });
        };

        window.addEventListener('mousemove', handleResize);
        window.addEventListener('mouseup', stopResize);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (windowRef.current) {
            const rect = windowRef.current.getBoundingClientRect();
            setContextMenu({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                windowWidth: rect.width,
                windowHeight: rect.height
            });
        }
    };

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    // Close context menu when clicking anywhere else
    useEffect(() => {
        if (!contextMenu) return;

        const handleClickOutside = () => closeContextMenu();
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [contextMenu]);

    const windowStyles = isMaximized
        ? {
            left: canvasOffset ? -canvasOffset.x : 0,
            top: canvasOffset ? -canvasOffset.y : 0,
            width: '100%',
            height: '100%',
            zIndex: zIndex + 1000, // Ensure maximized window is on top
            borderRadius: 0,
        }
        : {
            left: position.x,
            top: position.y,
            width: size.width,
            height: size.height,
            zIndex: zIndex,
        };

    const resizeHandles = [
        { dir: 'top', cursor: 'ns-resize', className: 'h-2 top-0 left-0 right-0' },
        { dir: 'bottom', cursor: 'ns-resize', className: 'h-2 bottom-0 left-0 right-0' },
        { dir: 'left', cursor: 'ew-resize', className: 'w-2 top-0 bottom-0 left-0' },
        { dir: 'right', cursor: 'ew-resize', className: 'w-2 top-0 bottom-0 right-0' },
        { dir: 'top-left', cursor: 'nwse-resize', className: 'w-3 h-3 top-0 left-0 z-10' },
        { dir: 'top-right', cursor: 'nesw-resize', className: 'w-3 h-3 top-0 right-0 z-10' },
        { dir: 'bottom-left', cursor: 'nesw-resize', className: 'w-3 h-3 bottom-0 left-0 z-10' },
        { dir: 'bottom-right', cursor: 'nwse-resize', className: 'w-3 h-3 bottom-0 right-0 z-10' },
    ];

    return (
        <>
            <div
                ref={windowRef}
                className={`
                    absolute bg-bg-surface border border-border shadow-2xl flex flex-col overflow-hidden
                    ${isDragging ? 'opacity-90 scale-[1.02] transition-none' : 'transition-all duration-300'}
                    ${isMaximized ? 'w-full h-full scale-100 shadow-none border-none' : ''}
                `}
                style={{
                    ...windowStyles,
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(22, 27, 34, 0.8)'
                }}
                onMouseDown={handleMouseDown}
                onContextMenu={handleContextMenu}
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
                        {onToggleAnchor && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleAnchor(); }}
                                className={`p-1.5 transition-colors ${isAnchored ? 'text-accent-primary hover:text-accent-primary/80' : 'text-fg-muted hover:bg-white/10 hover:text-fg-primary'}`}
                                title={isAnchored ? "Remove Anchor" : "Anchor Terminal"}
                            >
                                {isAnchored ? (
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C10.8954 2 10 2.89543 10 4V7H14V4C14 2.89543 13.1046 2 12 2ZM13.8284 10.1716L15 9V17C15 18.6569 13.6569 20 12 20C10.3431 20 9 18.6569 9 17V9L10.1716 10.1716C10.5621 10.5621 11.1953 10.5621 11.5858 10.1716C11.9763 9.78105 11.9763 9.14788 11.5858 8.75736L9.46447 6.63604C9.07394 6.24551 8.44078 6.24551 8.05025 6.63604L5.92893 8.75736C5.53841 9.14788 5.53841 9.78105 5.92893 10.1716C6.31946 10.5621 6.95262 10.5621 7.34315 10.1716L8.51472 9H9.00001L9 17C9 18.6569 10.3431 20 12 20C13.6569 20 15 18.6569 15 17V9H15.4853L16.6569 10.1716C17.0474 10.5621 17.6806 10.5621 18.0711 10.1716C18.4616 9.78105 18.4616 9.14788 18.0711 8.75736L15.9497 6.63604C15.5592 6.24551 14.9261 6.24551 14.5355 6.63604L12.4142 8.75736C12.0237 9.14788 12.0237 9.78105 12.4142 10.1716C12.8047 10.5621 13.4379 10.5621 13.8284 10.1716Z" />
                                    </svg>
                                ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                )}
                            </button>
                        )}
                        <button
                            onClick={toggleMaximize}
                            className="p-1.5 hover:bg-white/10 transition-colors text-fg-muted hover:text-fg-primary"
                            title={isMaximized ? "Restore" : "Maximize"}
                        >
                            {isMaximized ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h12v12H4z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 4h12v12" />
                                </svg>
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect x="5" y="5" width="14" height="14" rx="1.5" strokeWidth={2.5} stroke="currentColor" fill="none" />
                                </svg>
                            )}
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
                <div className="flex-1 overflow-hidden relative block">
                    {children}
                </div>

                {/* Invisible Resize Handles - Rendered last to be on top of everything */}
                {!isMaximized && resizeHandles.map(handle => (
                    <div
                        key={handle.dir}
                        className={`absolute ${handle.className} select-none z-[100]`}
                        style={{ cursor: handle.cursor }}
                        onMouseDown={(e) => handleResizeStart(handle.dir, e)}
                    />
                ))}

                {/* Terminal Context Menu (Moved INSIDE window container for proper positioning relative to panned canvas) */}
                {contextMenu && (
                    <div
                        className="absolute z-[999999] bg-bg-elevated border border-border shadow-2xl rounded-md py-1 min-w-[160px] text-[12px] font-medium text-fg-primary"
                        style={{
                            left: contextMenu.x,
                            top: contextMenu.y,
                            ...(contextMenu.x > contextMenu.windowWidth - 170 ? { left: 'auto', right: contextMenu.windowWidth - contextMenu.x } : {}),
                            ...(contextMenu.y > contextMenu.windowHeight - 160 ? { top: 'auto', bottom: contextMenu.windowHeight - contextMenu.y } : {})
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent bubbling up to close handler immediately
                    >
                        {onToggleAnchor && (
                            <button
                                className="w-full text-left px-3 py-1.5 hover:bg-accent-primary/20 hover:text-accent-primary flex items-center gap-2 transition-colors"
                                onClick={() => { onToggleAnchor(); closeContextMenu(); }}
                            >
                                <svg className="w-3.5 h-3.5" fill={isAnchored ? "currentColor" : "none"} stroke={isAnchored ? "none" : "currentColor"} viewBox="0 0 24 24">
                                    {isAnchored ? (
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C10.8954 2 10 2.89543 10 4V7H14V4C14 2.89543 13.1046 2 12 2ZM13.8284 10.1716L15 9V17C15 18.6569 13.6569 20 12 20C10.3431 20 9 18.6569 9 17V9L10.1716 10.1716C10.5621 10.5621 11.1953 10.5621 11.5858 10.1716C11.9763 9.78105 11.9763 9.14788 11.5858 8.75736L9.46447 6.63604C9.07394 6.24551 8.44078 6.24551 8.05025 6.63604L5.92893 8.75736C5.53841 9.14788 5.53841 9.78105 5.92893 10.1716C6.31946 10.5621 6.95262 10.5621 7.34315 10.1716L8.51472 9H9.00001L9 17C9 18.6569 10.3431 20 12 20C13.6569 20 15 18.6569 15 17V9H15.4853L16.6569 10.1716C17.0474 10.5621 17.6806 10.5621 18.0711 10.1716C18.4616 9.78105 18.4616 9.14788 18.0711 8.75736L15.9497 6.63604C15.5592 6.24551 14.9261 6.24551 14.5355 6.63604L12.4142 8.75736C12.0237 9.14788 12.0237 9.78105 12.4142 10.1716C12.8047 10.5621 13.4379 10.5621 13.8284 10.1716Z" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    )}
                                </svg>
                                {isAnchored ? 'Unanchor' : 'Anchor'}
                            </button>
                        )}
                        <button
                            className="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 transition-colors"
                            onClick={(e) => { toggleMaximize(e); closeContextMenu(); }}
                        >
                            {isMaximized ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h12v12H4z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 4h12v12" />
                                </svg>
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect x="5" y="5" width="14" height="14" rx="1.5" strokeWidth={2.5} stroke="currentColor" fill="none" />
                                </svg>
                            )}
                            {isMaximized ? 'Restore Down' : 'Maximize'}
                        </button>
                        <button
                            className="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 transition-colors"
                            onClick={() => {
                                setIsEditing(true);
                                setEditedTitle(title);
                                closeContextMenu();
                            }}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Rename
                        </button>
                        <div className="h-px bg-border my-1 mx-2" />
                        <button
                            className="w-full text-left px-3 py-1.5 hover:bg-status-error/20 text-status-error flex items-center gap-2 transition-colors"
                            onClick={(e) => { e.stopPropagation(); onClose?.(id); closeContextMenu(); }}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Close Terminal
                        </button>
                    </div>
                )}
            </div>

            {/* Ghost Resize Indicator */}
            {isResizing && (
                <div
                    className="absolute pointer-events-none border-2 border-accent-primary z-[99999]"
                    style={{
                        left: ghostPosition.x,
                        top: ghostPosition.y,
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
