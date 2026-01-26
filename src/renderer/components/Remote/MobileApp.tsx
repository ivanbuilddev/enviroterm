import { useState, useEffect, useRef } from 'react';
import { Menu, ChevronLeft, Image as ImageIcon, Keyboard, Move, ChevronDown } from 'lucide-react';
import { TerminalView } from '../Terminal/TerminalView';
import { Session } from '../../../shared/types';

interface KeyboardShortcut {
    id: string;
    name: string;
    keys: string[];
}

interface Settings {
    initialCommand: string;
    keyboardShortcuts: KeyboardShortcut[];
}

export function MobileApp() {
    const [status, setStatus] = useState('Connecting...');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isShortcutsMenuOpen, setIsShortcutsMenuOpen] = useState(false);
    const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const [keyboardOffset, setKeyboardOffset] = useState(0);

    const handleExecuteShortcut = (keys: string[]) => {
        if (!activeSessionId) return;

        // Map common keys to ANSI sequences
        const keyMap: Record<string, string> = {
            'Ctrl+C': '\x03',
            'Ctrl+D': '\x04',
            'Ctrl+Z': '\x1a',
            'Ctrl+L': '\x0c',
            'Tab': '\t',
            'Escape': '\x1b',
            'Enter': '\r',
            'Backspace': '\x7f',
            'Shift+Tab': '\x1b[Z',
        };

        const shortcutStr = keys.join('+');
        let sequence = keyMap[shortcutStr];

        if (!sequence) {
            // Try automatic conversion for Ctrl+[Key]
            if (keys.length === 2 && keys[0] === 'Ctrl' && keys[1].length === 1) {
                const charCode = keys[1].toUpperCase().charCodeAt(0);
                if (charCode >= 64 && charCode <= 95) {
                    sequence = String.fromCharCode(charCode - 64);
                }
            } else if (keys.length === 1) {
                const singleMap: Record<string, string> = {
                    'Enter': '\r',
                    'Tab': '\t',
                    'Escape': '\x1b',
                    'Space': ' ',
                    'Backspace': '\x7f'
                };
                sequence = singleMap[keys[0]] || keys[0];
            }
        }

        if (sequence && (window as any).electronAPI) {
            (window as any).electronAPI.terminal.write(activeSessionId, sequence);
        }
    };

    const handleExecuteNav = (direction: string) => {
        if (!activeSessionId) return;

        const navMap: Record<string, string> = {
            'Up': '\x1b[A',
            'Down': '\x1b[B',
            'Left': '\x1b[D',
            'Right': '\x1b[C',
        };

        const sequence = navMap[direction];
        if (sequence && (window as any).electronAPI) {
            (window as any).electronAPI.terminal.write(activeSessionId, sequence);
        }
    };

    // Keyboard detection logic
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const handleResize = () => {
            // Calculate how much the viewport has shrunk (keyboard height)
            const offset = window.innerHeight - viewport.height;
            // Only set if offset is positive (keyboard is open)
            setKeyboardOffset(offset > 0 ? offset : 0);
        };

        viewport.addEventListener('resize', handleResize);
        viewport.addEventListener('scroll', handleResize);

        // Initial check
        handleResize();

        return () => {
            viewport.removeEventListener('resize', handleResize);
            viewport.removeEventListener('scroll', handleResize);
        };
    }, []);

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

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const directoryId = urlParams.get('directoryId');
        const wsPort = urlParams.get('wsPort') || '3001';

        if (!token || !directoryId) {
            setStatus('Invalid connection URL');
            return;
        }

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}/remote?token=${token}&directoryId=${directoryId}`;

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        let isActive = true;

        (window as any).electronAPI = {
            terminal: {
                onData: (callback: any) => {
                    const handler = (event: any) => callback(event.detail);
                    window.addEventListener('terminal:data', handler);
                    return () => window.removeEventListener('terminal:data', handler);
                },
                onExit: () => () => { },
                onRemotePaste: () => () => { },
                write: (sessionId: string, data: string) => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'input', sessionId, data }));
                    }
                },
                spawn: (sessionId: string) => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'syncSession', sessionId }));
                    }
                    return Promise.resolve(true);
                },
                resize: () => { }
            }
        };

        socket.onopen = () => {
            if (isActive) setStatus('Connected');
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'connected') {
                    socket.send(JSON.stringify({ type: 'getSessions', directoryId }));
                    socket.send(JSON.stringify({ type: 'getSettings', directoryId }));
                } else if (data.type === 'settings') {
                    if (isActive) setSettings(data.settings);
                } else if (data.type === 'data') {
                    window.dispatchEvent(new CustomEvent('terminal:data', {
                        detail: { sessionId: data.sessionId, data: data.data }
                    }));
                } else if (data.type === 'history') {
                    window.dispatchEvent(new CustomEvent('terminal:reset', { detail: { sessionId: data.sessionId } }));
                    if (data.dims) {
                        window.dispatchEvent(new CustomEvent('terminal:dimensions', {
                            detail: { sessionId: data.sessionId, cols: data.dims.cols, rows: data.dims.rows }
                        }));
                    }
                    if (Array.isArray(data.data)) {
                        data.data.forEach((chunk: string) => {
                            window.dispatchEvent(new CustomEvent('terminal:data', { detail: { sessionId: data.sessionId, data: chunk } }));
                        });
                    }
                } else if (data.type === 'sessions') {
                    if (isActive) {
                        setSessions(data.sessions);
                        if (data.sessions.length > 0 && !activeSessionId) {
                            setActiveSessionId(data.sessions[0].id);
                        }
                    }
                }
            } catch (e) {
                console.error('[MobileApp] Failed to parse message:', e);
            }
        };

        socket.onclose = () => {
            if (isActive) setStatus('Disconnected');
        };

        return () => {
            isActive = false;
            if (socket.readyState === WebSocket.CONNECTING) socket.close();
        };
    }, []);

    const activeSession = sessions.find(s => s.id === activeSessionId);

    return (
        <div className="fixed inset-0 bg-[#0d1117] text-fg-primary flex flex-col overflow-hidden select-none">
            {/* Mobile Header - Ultra Simple */}
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
                            {activeSession?.name || 'Remote'}
                        </h1>
                        <p className={`text-[10px] ${status === 'Connected' ? 'text-status-success' : 'text-fg-muted'}`}>
                            {status}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Terminal Area */}
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
                                runInitialCommand={false}
                                isReadOnlyResize={true}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
                            <p className="text-fg-muted text-[14px]">
                                {status === 'Connected' ? `No active sessions found.` : `Status: ${status}`}
                            </p>
                        </div>
                    )}
                </div>

                {/* Floating controls - Bottom Right Area */}
                <div
                    className="absolute right-4 z-[200] flex flex-col items-end gap-3 pointer-events-none transition-all duration-300 ease-out"
                    style={{ bottom: `calc(1rem + ${keyboardOffset}px)` }}
                >

                    {/* Shortcuts (Keys) Strip */}
                    {isShortcutsMenuOpen && (
                        <div className="flex flex-col gap-2 pointer-events-auto animate-in slide-in-from-bottom-4 duration-200 mb-1">
                            <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto pr-1">
                                {settings?.keyboardShortcuts?.map(shortcut => (
                                    <button
                                        key={shortcut.id}
                                        onClick={() => handleExecuteShortcut(shortcut.keys)}
                                        className="px-4 py-2 bg-[#161b22] border border-border rounded shadow-xl text-[12px] font-bold text-fg-primary active:bg-accent-primary transition-colors whitespace-nowrap"
                                    >
                                        {shortcut.name}
                                    </button>
                                ))}
                                {(!settings?.keyboardShortcuts || settings.keyboardShortcuts.length === 0) && (
                                    <div className="bg-[#161b22]/80 px-3 py-1 rounded text-[10px] text-fg-muted italic">No keys</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation D-Pad */}
                    {isNavMenuOpen && (
                        <div className="grid grid-cols-3 gap-1 p-2 bg-transparent pointer-events-auto animate-in scale-in duration-200 mb-1">
                            <div />
                            <button
                                onClick={() => handleExecuteNav('Up')}
                                className="w-12 h-12 bg-[#161b22] border border-border rounded-full flex items-center justify-center active:bg-accent-primary shadow-2xl"
                            >
                                <ChevronDown size={24} className="rotate-180 opacity-50" />
                            </button>
                            <div />
                            <button
                                onClick={() => handleExecuteNav('Left')}
                                className="w-12 h-12 bg-[#161b22] border border-border rounded-full flex items-center justify-center active:bg-accent-primary shadow-2xl"
                            >
                                <ChevronLeft size={24} className="opacity-50" />
                            </button>
                            <div />
                            <button
                                onClick={() => handleExecuteNav('Right')}
                                className="w-12 h-12 bg-[#161b22] border border-border rounded-full flex items-center justify-center active:bg-accent-primary shadow-2xl"
                            >
                                <ChevronLeft size={24} className="rotate-180 opacity-50" />
                            </button>
                            <div />
                            <button
                                onClick={() => handleExecuteNav('Down')}
                                className="w-12 h-12 bg-[#161b22] border border-border rounded-full flex items-center justify-center active:bg-accent-primary shadow-2xl"
                            >
                                <ChevronDown size={24} className="opacity-50" />
                            </button>
                            <div />
                        </div>
                    )}

                    {/* Persistent Control Toggles - FAB style */}
                    <div className="flex gap-2 pointer-events-auto">
                        <button
                            onClick={handleAddImage}
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all bg-[#161b22] text-fg-muted`}
                        >
                            <ImageIcon size={20} className={isProcessingImage ? 'animate-pulse' : 'opacity-50'} />
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
                            onClick={() => {
                                setIsShortcutsMenuOpen(!isShortcutsMenuOpen);
                                if (!isShortcutsMenuOpen) setIsNavMenuOpen(false);
                            }}
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all ${isShortcutsMenuOpen ? 'bg-accent-primary text-white scale-110' : 'bg-[#161b22] text-fg-muted'}`}
                        >
                            <Keyboard size={20} className={isShortcutsMenuOpen ? 'opacity-100' : 'opacity-50'} />
                        </button>
                        <button
                            onClick={() => {
                                setIsNavMenuOpen(!isNavMenuOpen);
                                if (!isNavMenuOpen) setIsShortcutsMenuOpen(false);
                            }}
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all ${isNavMenuOpen ? 'bg-accent-primary text-white scale-110' : 'bg-[#161b22] text-fg-muted'}`}
                        >
                            <Move size={20} className={isNavMenuOpen ? 'opacity-100' : 'opacity-50'} />
                        </button>
                    </div>
                </div>
            </main>

            {/* Sidebar / Drawer */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-[300] flex">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
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
                                    className={`w-full text-left px-4 py-3 rounded text-[13px] transition-colors ${activeSessionId === session.id ? 'bg-accent-primary/20 text-accent-primary font-bold' : 'hover:bg-bg-hover text-fg-secondary'}`}
                                >
                                    {session.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className="fixed bottom-0 left-0 right-0 bg-status-error text-white p-2 text-[10px] z-[400] text-center">
                    {error}
                </div>
            )}
        </div>
    );
}
