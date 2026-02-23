import { useState, useEffect } from 'react';
import { X, Command, Keyboard, Plus, Trash2, Terminal } from 'lucide-react';

interface KeyboardShortcut {
    id: string;
    name: string;
    keys: string[];
}

interface CustomCommand {
    id: string;
    name: string;
    command: string;
}

interface Settings {
    initialCommand: string;
    keyboardShortcuts: KeyboardShortcut[];
    imageShortcut: string[];
    customCommands: CustomCommand[];
}

interface SettingsModalProps {
    onClose: () => void;
    workspaceId?: string;
    workspaceName?: string;
}

export function SettingsModal({ onClose, workspaceId, workspaceName }: SettingsModalProps) {
    const [settings, setSettings] = useState<Settings>({
        initialCommand: 'claude',
        keyboardShortcuts: [],
        imageShortcut: ['Alt', 'V'],
        customCommands: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'commands' | 'shortcuts'>('general');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const storedSettings = await window.electronAPI.settings.get(workspaceId);
                setSettings(storedSettings);
            } catch (err) {
                console.error('Failed to fetch settings:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    // Global Key Listener for Shortcut Recording
    useEffect(() => {
        if (!recordingId) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (e.key === 'Escape') {
                setRecordingId(null);
                return;
            }

            // Map common modifier keys to their display names
            const modifiers: Record<string, string> = {
                'Control': 'Ctrl',
                'Shift': 'Shift',
                'Alt': 'Alt',
                'Meta': 'Meta'
            };

            let keyToAdd = modifiers[e.key] || e.key;
            if (keyToAdd === ' ') keyToAdd = 'Space';
            if (keyToAdd.length === 1) keyToAdd = keyToAdd.toUpperCase();

            // Handle image shortcut recording
            if (recordingId === 'image-shortcut') {
                const newKeys = [...settings.imageShortcut];
                if (!newKeys.includes(keyToAdd)) {
                    newKeys.push(keyToAdd);
                    setSettings(prev => ({ ...prev, imageShortcut: newKeys }));
                }
                return;
            }

            // Handle regular shortcuts
            const activeShortcut = settings.keyboardShortcuts.find(s => s.id === recordingId);
            if (!activeShortcut) return;

            const newKeys = [...activeShortcut.keys];

            // Only add if not already in the sequence (to avoid repeats from holding down)
            if (!newKeys.includes(keyToAdd)) {
                newKeys.push(keyToAdd);
                updateShortcut(recordingId, { keys: newKeys });
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [recordingId, settings.keyboardShortcuts, settings.imageShortcut]);

    const handleSave = async () => {
        try {
            await window.electronAPI.settings.set(settings, workspaceId);
            // Broadcast settings to connected mobile devices
            if (workspaceId) {
                window.electronAPI.remote.broadcastSettings(workspaceId);
            }
            onClose();
        } catch (err) {
            console.error('Failed to save settings:', err);
        }
    };

    const addShortcut = () => {
        const newShortcut: KeyboardShortcut = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'New Shortcut',
            keys: []
        };
        setSettings({
            ...settings,
            keyboardShortcuts: [...settings.keyboardShortcuts, newShortcut]
        });
    };

    const removeShortcut = (id: string) => {
        setSettings({
            ...settings,
            keyboardShortcuts: settings.keyboardShortcuts.filter(s => s.id !== id)
        });
    };

    const updateShortcut = (id: string, updates: Partial<KeyboardShortcut>) => {
        setSettings(prev => ({
            ...prev,
            keyboardShortcuts: prev.keyboardShortcuts.map(s =>
                s.id === id ? { ...s, ...updates } : s
            )
        }));
    };

    const addCommand = () => {
        const newCommand: CustomCommand = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'New Command',
            command: ''
        };
        setSettings({
            ...settings,
            customCommands: [...(settings.customCommands || []), newCommand]
        });
    };

    const removeCommand = (id: string) => {
        setSettings({
            ...settings,
            customCommands: settings.customCommands.filter(c => c.id !== id)
        });
    };

    const updateCommand = (id: string, updates: Partial<CustomCommand>) => {
        setSettings(prev => ({
            ...prev,
            customCommands: prev.customCommands.map(c =>
                c.id === id ? { ...c, ...updates } : c
            )
        }));
    };

    const startRecording = (id: string) => {
        if (id === 'image-shortcut') {
            setSettings(prev => ({ ...prev, imageShortcut: [] }));
        } else {
            updateShortcut(id, { keys: [] });
        }
        setRecordingId(id);
    };

    if (isLoading) return null;

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-bg-surface border border-border-strong w-[650px] h-[650px] flex flex-col shadow-2xl relative overflow-hidden"
            >
                {/* Header decor */}
                <div className="h-1 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary shrink-0" />

                <div className="flex h-full overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-48 bg-bg-base border-r border-border flex flex-col pt-6 pb-4">
                        <div className="px-4 mb-6">
                            <h2 className="text-[11px] font-header text-fg-muted uppercase tracking-wider mb-1">
                                {workspaceId ? 'Workspace' : 'Global'}
                            </h2>
                            <div className="text-fg-primary font-medium truncate" title={workspaceName || 'Settings'}>
                                {workspaceId ? workspaceName : 'Settings'}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-0.5 px-2">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`flex items-center gap-2 px-3 py-2 text-[12px] rounded transition-colors ${activeTab === 'general' ? 'bg-accent-primary/10 text-accent-primary' : 'text-fg-muted hover:bg-bg-hover hover:text-fg-primary'}`}
                            >
                                <Command size={14} />
                                Startup
                            </button>
                            <button
                                onClick={() => setActiveTab('commands')}
                                className={`flex items-center gap-2 px-3 py-2 text-[12px] rounded transition-colors ${activeTab === 'commands' ? 'bg-accent-primary/10 text-accent-primary' : 'text-fg-muted hover:bg-bg-hover hover:text-fg-primary'}`}
                            >
                                <Terminal size={14} />
                                Custom Commands
                            </button>
                            <button
                                onClick={() => setActiveTab('shortcuts')}
                                className={`flex items-center gap-2 px-3 py-2 text-[12px] rounded transition-colors ${activeTab === 'shortcuts' ? 'bg-accent-primary/10 text-accent-primary' : 'text-fg-muted hover:bg-bg-hover hover:text-fg-primary'}`}
                            >
                                <Keyboard size={14} />
                                Shortcuts
                            </button>
                        </div>

                        <div className="mt-auto px-4 pt-4 border-t border-border">
                            <button
                                onClick={onClose}
                                className="w-full py-1.5 text-[11px] text-fg-muted hover:text-fg-primary transition-colors mb-2"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleSave}
                                className="w-full py-1.5 bg-accent-primary hover:bg-accent-primary/80 text-white text-[11px] font-medium rounded transition-all shadow-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-surface relative">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1 hover:bg-bg-hover text-fg-muted hover:text-fg-primary transition-colors cursor-pointer z-10"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                            {activeTab === 'general' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                                    <div className="border-b border-border pb-4">
                                        <h2 className="text-xl font-header text-fg-primary">Startup Configuration</h2>
                                        <p className="text-[13px] text-fg-muted mt-1">Configure how terminal sessions start.</p>
                                    </div>

                                    {/* Initial Command Section */}
                                    <section>
                                        <h3 className="text-[13px] font-medium text-fg-primary mb-3">Default Command</h3>
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={settings.initialCommand}
                                                onChange={(e) => setSettings({ ...settings, initialCommand: e.target.value })}
                                                className="w-full bg-bg-elevated border border-border text-fg-primary text-[13px] px-3 py-2.5 rounded outline-none focus:border-accent-primary transition-colors shadow-sm"
                                                placeholder="e.g. claude"
                                            />
                                            <p className="text-[12px] text-fg-faint">
                                                This command runs automatically when a new terminal session is created.
                                                Use this to start your preferred shell or CLI tool.
                                            </p>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'commands' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200 h-full flex flex-col">
                                    <div className="border-b border-border pb-4 shrink-0">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-xl font-header text-fg-primary">Custom Commands</h2>
                                                <p className="text-[13px] text-fg-muted mt-1">Manage global commands available in all workspaces.</p>
                                            </div>
                                            <button
                                                onClick={addCommand}
                                                className="px-3 py-1.5 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-[12px] font-medium rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <Plus size={14} /> Add Command
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                                        {(!settings.customCommands || settings.customCommands.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-fg-faint border border-dashed border-border rounded-lg bg-bg-elevated/30">
                                                <Terminal size={32} className="mb-3 opacity-20" />
                                                <p className="text-[13px]">No custom commands defined yet.</p>
                                                <button onClick={addCommand} className="text-[12px] text-accent-primary hover:underline mt-2">Create your first command</button>
                                            </div>
                                        ) : (
                                            settings.customCommands.map((cmd) => (
                                                <div key={cmd.id} className="p-3 bg-bg-elevated border border-border rounded-lg flex items-center gap-4 group hover:border-accent-primary/30 transition-all shadow-sm">
                                                    <div className="w-1/3 min-w-[120px]">
                                                        <label className="text-[10px] text-fg-faint uppercase tracking-wider font-bold mb-1 block">Name</label>
                                                        <input
                                                            type="text"
                                                            value={cmd.name}
                                                            onChange={(e) => updateCommand(cmd.id, { name: e.target.value })}
                                                            className="w-full bg-bg-base border-b border-transparent hover:border-border focus:border-accent-primary text-fg-primary text-[13px] px-2 py-1 outline-none transition-colors placeholder:text-fg-faint/50"
                                                            placeholder="Command Name"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] text-fg-faint uppercase tracking-wider font-bold mb-1 block">Command</label>
                                                        <input
                                                            type="text"
                                                            value={cmd.command}
                                                            onChange={(e) => updateCommand(cmd.id, { command: e.target.value })}
                                                            className="w-full bg-bg-base border-b border-transparent hover:border-border focus:border-accent-primary text-fg-muted text-[13px] px-2 py-1 font-mono outline-none transition-colors placeholder:text-fg-faint/50"
                                                            placeholder="e.g. npm install"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => removeCommand(cmd.id)}
                                                        className="p-2 text-fg-faint hover:text-status-error hover:bg-status-error/10 rounded transition-all opacity-0 group-hover:opacity-100 self-end"
                                                        title="Delete Command"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'shortcuts' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200 h-full flex flex-col">
                                    <div className="border-b border-border pb-4 shrink-0">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-xl font-header text-fg-primary">Keyboard Shortcuts</h2>
                                                <p className="text-[13px] text-fg-muted mt-1">Customize shortcuts for the mobile remote control.</p>
                                            </div>
                                            <button
                                                onClick={addShortcut}
                                                className="px-3 py-1.5 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-[12px] font-medium rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <Plus size={14} /> Add Shortcut
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                                        {/* System shortcut - Send Image */}
                                        <div className={`p-4 bg-bg-elevated/50 border rounded-lg flex items-center justify-between transition-all ${recordingId === 'image-shortcut' ? 'border-accent-primary ring-1 ring-accent-primary' : 'border-border/50'}`}>
                                            <div>
                                                <h4 className="text-[13px] font-medium text-fg-primary mb-1">Send Image</h4>
                                                <p className="text-[11px] text-fg-faint">Shortcut to trigger image paste from phone.</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className={`px-3 py-1.5 bg-bg-base border rounded text-[12px] font-mono min-w-[80px] text-center ${recordingId === 'image-shortcut' ? 'border-accent-primary text-accent-primary' : 'border-border text-fg-muted'}`}>
                                                    {recordingId === 'image-shortcut' ? 'Press keys...' : settings.imageShortcut.join(' + ')}
                                                </div>
                                                <button
                                                    onClick={() => recordingId === 'image-shortcut' ? setRecordingId(null) : startRecording('image-shortcut')}
                                                    className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${recordingId === 'image-shortcut'
                                                        ? 'bg-status-error text-white hover:bg-status-error/90'
                                                        : 'bg-bg-surface border border-border text-fg-primary hover:border-accent-primary'
                                                        }`}
                                                >
                                                    {recordingId === 'image-shortcut' ? 'Stop' : 'Rebind'}
                                                </button>
                                            </div>
                                        </div>

                                        {settings.keyboardShortcuts.length === 0 && (
                                            <p className="text-[12px] text-fg-faint italic text-center py-8">No custom shortcuts defined yet.</p>
                                        )}

                                        {settings.keyboardShortcuts.map((shortcut) => (
                                            <div key={shortcut.id} className={`p-3 bg-bg-elevated border rounded-lg flex items-center gap-4 group transition-all ${recordingId === shortcut.id ? 'border-accent-primary ring-1 ring-accent-primary' : 'border-border hover:border-accent-primary/30'}`}>
                                                <div className="w-1/3 min-w-[120px]">
                                                    <input
                                                        type="text"
                                                        value={shortcut.name}
                                                        onChange={(e) => updateShortcut(shortcut.id, { name: e.target.value })}
                                                        className="w-full bg-transparent border-none text-fg-primary text-[13px] font-medium focus:outline-none placeholder:text-fg-faint/50"
                                                        placeholder="Shortcut Name"
                                                    />
                                                </div>
                                                <div className="flex-1 flex items-center justify-end gap-3">
                                                    <div className={`px-3 py-1.5 bg-bg-base border rounded text-[12px] font-mono min-w-[80px] text-center ${recordingId === shortcut.id ? 'border-accent-primary text-accent-primary' : 'border-border text-fg-muted'}`}>
                                                        {recordingId === shortcut.id ? 'Press keys...' : shortcut.keys.join(' + ')}
                                                    </div>
                                                    <button
                                                        onClick={() => recordingId === shortcut.id ? setRecordingId(null) : startRecording(shortcut.id)}
                                                        className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${recordingId === shortcut.id
                                                            ? 'bg-status-error text-white hover:bg-status-error/90'
                                                            : 'bg-bg-surface border border-border text-fg-primary hover:border-accent-primary'
                                                            }`}
                                                    >
                                                        {recordingId === shortcut.id ? 'Stop' : 'Record'}
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeShortcut(shortcut.id)}
                                                    className="p-2 text-fg-faint hover:text-status-error hover:bg-status-error/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                                    title="Delete Shortcut"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
