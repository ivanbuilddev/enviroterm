import { useState, useEffect, useRef } from 'react';
import { Menu, ChevronLeft, Image as ImageIcon, RefreshCcw, Octagon } from 'lucide-react';
import { TerminalView } from '../Terminal/TerminalView';
import { Session } from '../../../shared/types';

export function MobileApp() {
    const [status, setStatus] = useState('Connecting...');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    // Global error handler for mobile debugging
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.error('[MobileApp] Global error:', event.message);
            setError(`Error: ${event.message}`);
        };
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            console.error('[MobileApp] Unhandled rejection:', event.reason);
            setError(`Unhandled: ${event.reason}`);
        };
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    const handleShiftTab = () => {
        if (activeSessionId && (window as any).electronAPI) {
            // \x1b[Z is the standard ANSI escape sequence for Backtab (Shift+Tab)
            (window as any).electronAPI.terminal.write(activeSessionId, '\x1b[Z');
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);

    const handleAddImage = () => {
        fileInputRef.current?.click();
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeSessionId || !socketRef.current) return;

        setIsProcessingImage(true);
        try {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({
                        type: 'paste',
                        sessionId: activeSessionId,
                        data: {
                            name: file.name,
                            type: file.type,
                            size: `${(file.size / 1024).toFixed(2)} KB`,
                            base64: base64
                        }
                    }));
                }
                setIsProcessingImage(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Failed to process image:', err);
            setIsProcessingImage(false);
        }

        // Reset input
        e.target.value = '';
    };


    const handleInterrupt = () => {
        if (activeSessionId && (window as any).electronAPI) {
            (window as any).electronAPI.terminal.write(activeSessionId, '\x03'); // Ctrl+C
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const directoryId = urlParams.get('directoryId');
        const wsPort = urlParams.get('wsPort') || '3001';

        if (!token || !directoryId) {
            setStatus('Invalid connection URL');
            return;
        }

        // Prevent duplicate connections (React StrictMode double-mount)
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            console.log('[MobileApp] Socket already connected, skipping');
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}/remote?token=${token}&directoryId=${directoryId}`;

        console.log(`[MobileApp] Connecting to WebSocket: ${wsUrl}`);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        // Track if this effect instance is still active
        let isActive = true;

        // Mock Electron API to match TerminalView's expectations
        (window as any).electronAPI = {
            terminal: {
                onData: (callback: any) => {
                    const handler = (event: any) => {
                        // Forward to TerminalView's listener
                        callback(event.detail);
                    };
                    window.addEventListener('terminal:data', handler);
                    return () => window.removeEventListener('terminal:data', handler);
                },
                onExit: () => () => { },
                onRemotePaste: () => () => { }, // No-op for mobile (mobile IS the remote)
                write: (sessionId: string, data: string) => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'input', sessionId, data }));
                    }
                },
                spawn: (sessionId: string, _folderPath: string, _sessionName?: string) => {
                    // Mobile should NOT spawn new terminals - just sync with existing ones
                    // Request sync instead of spawning
                    if (socket.readyState === WebSocket.OPEN) {
                        console.log('[MobileApp] Syncing session instead of spawning:', sessionId);
                        socket.send(JSON.stringify({ type: 'syncSession', sessionId }));
                    }
                    return Promise.resolve(true);
                },
                resize: (_sessionId: string, _cols: number, _rows: number) => {
                    // Mobile is read-only for resize, don't send resize commands
                }
            }
        };

        socket.onopen = () => {
            console.log('[MobileApp] WebSocket connected, waiting for server confirmation...');
            if (isActive) {
                setStatus('Connected');
            }
            // Don't send getSessions here - wait for 'connected' message from server
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log(`[MobileApp] Received message type: ${data.type}`);

                if (data.type === 'connected') {
                    console.log('[MobileApp] Server confirmed connection');
                    // Request sessions after connection is confirmed
                    socket.send(JSON.stringify({ type: 'getSessions', directoryId }));
                } else if (data.type === 'data') {
                    // Dispatch event that TerminalView.tsx's onData listener is waiting for
                    window.dispatchEvent(new CustomEvent('terminal:data', {
                        detail: { sessionId: data.sessionId, data: data.data }
                    }));
                } else if (data.type === 'history') {
                    console.log(`[MobileApp] Received history for session: ${data.sessionId}, chunks: ${data.data?.length || 0}`);
                    // Dispatch reset to clear terminal before writing history chunks
                    window.dispatchEvent(new CustomEvent('terminal:reset', {
                        detail: { sessionId: data.sessionId }
                    }));

                    // Dispatch dimensions if available in history sync
                    if (data.dims) {
                        window.dispatchEvent(new CustomEvent('terminal:dimensions', {
                            detail: { sessionId: data.sessionId, cols: data.dims.cols, rows: data.dims.rows }
                        }));
                    }

                    // For xterm.js, we just write the history chunks exactly like real-time data
                    if (Array.isArray(data.data)) {
                        data.data.forEach((chunk: string) => {
                            window.dispatchEvent(new CustomEvent('terminal:data', {
                                detail: { sessionId: data.sessionId, data: chunk }
                            }));
                        });
                    }
                } else if (data.type === 'dimensions') {
                    window.dispatchEvent(new CustomEvent('terminal:dimensions', {
                        detail: { sessionId: data.sessionId, cols: data.cols, rows: data.rows }
                    }));
                } else if (data.type === 'sessions') {
                    console.log(`[MobileApp] Received ${data.sessions.length} sessions`);
                    if (isActive) {
                        setSessions(data.sessions);
                        if (data.sessions.length > 0) {
                            setActiveSessionId(data.sessions[0].id);
                        }
                    }
                }
            } catch (e) {
                console.error('[MobileApp] Failed to parse message:', e);
            }
        };

        socket.onclose = (event) => {
            console.log(`[MobileApp] WebSocket closed. Code: ${event.code}, Reason: ${event.reason}, isActive: ${isActive}`);
            if (!isActive) return; // Ignore close events from stale effects
            if (event.code === 4001) {
                setStatus(`Auth failed: ${event.reason || 'Invalid token'}`);
            } else {
                setStatus('Disconnected');
            }
        };

        socket.onerror = (error) => {
            console.error('[MobileApp] WebSocket error:', error);
            if (isActive) {
                setStatus('Connection error');
            }
        };

        return () => {
            console.log('[MobileApp] Cleanup called, isActive:', isActive);
            isActive = false;
            // Don't close socket on cleanup in dev mode - it causes issues with StrictMode
            // The socket will close naturally when the page unloads
            // Only close if we're actually navigating away (socket still connecting)
            if (socket.readyState === WebSocket.CONNECTING) {
                console.log('[MobileApp] Closing connecting socket');
                socket.close();
            }
        };
    }, []);

    // Note: History sync is handled by the mock spawn() function in TerminalView
    // which sends syncSession when the terminal mounts

    const activeSession = sessions.find(s => s.id === activeSessionId);

    return (
        <div className="fixed inset-0 bg-[#0d1117] text-fg-primary flex flex-col overflow-hidden select-none">
            {/* Mobile Header */}
            <header className="h-14 bg-[#161b22] border-b border-border flex items-center justify-between px-4 shrink-0 z-[100]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 hover:bg-bg-hover text-fg-muted"
                    >
                        <Menu size={20} />
                    </button>
                    <div>
                        <h1 className="text-[13px] font-header font-bold leading-none truncate max-w-[150px]">
                            {activeSession?.name || 'Remote Terminal'}
                        </h1>
                        <p className={`text-[10px] ${status === 'Connected' ? 'text-status-success' : 'text-fg-muted'}`}>
                            {status} {sessions.length > 0 ? `(${sessions.length} sessions)` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={handleAddImage}
                        className="flex flex-col items-center p-1.5 hover:bg-bg-hover text-fg-muted transition-colors rounded"
                    >
                        <ImageIcon size={18} className={isProcessingImage ? 'animate-pulse' : ''} />
                        <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter">
                            {isProcessingImage ? 'Sending...' : 'Image'}
                        </span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={onFileChange}
                    />
                    <button
                        onClick={handleShiftTab}
                        className="flex flex-col items-center p-1.5 hover:bg-bg-hover text-fg-muted transition-colors rounded"
                    >
                        <RefreshCcw size={18} />
                        <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter">Shift+Tab</span>
                    </button>
                    <button
                        onClick={handleInterrupt}
                        className="flex flex-col items-center p-1.5 hover:bg-bg-hover text-status-error transition-colors rounded"
                    >
                        <Octagon size={18} />
                        <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter">Ctrl+C</span>
                    </button>
                </div>
            </header>

            {/* Terminal Sidebar / Drawer */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-[200] flex">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <div className="relative w-72 bg-bg-surface h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <span className="text-[11px] font-bold text-fg-muted uppercase tracking-widest">Sessions</span>
                            <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-bg-hover text-fg-muted">
                                <ChevronLeft size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {sessions.map(session => (
                                <button
                                    key={session.id}
                                    onClick={() => {
                                        setActiveSessionId(session.id);
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded text-[13px] transition-colors ${activeSessionId === session.id
                                        ? 'bg-accent-primary/20 text-accent-primary font-bold'
                                        : 'hover:bg-bg-hover text-fg-secondary'
                                        }`}
                                >
                                    {session.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Error display for debugging */}
            {error && (
                <div className="bg-status-error text-white p-2 text-xs">
                    {error}
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col relative">
                <div className="flex-1 relative overflow-hidden">
                    {activeSessionId ? (
                        <div className="absolute inset-0" key={activeSessionId}>
                            <TerminalView
                                sessionId={activeSessionId}
                                sessionName={activeSession?.name || ''}
                                folderPath=""
                                isVisible={true}
                                isFocused={true}
                                autoRunClaude={false}
                                isReadOnlyResize={true}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
                            <p className="text-fg-muted text-[14px]">
                                {status === 'Connected' ? `No active sessions found. (${sessions.length} sessions loaded)` : `Status: ${status}`}
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
