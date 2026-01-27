import { useState, useEffect } from 'react';
import { X, Command, Keyboard, Plus, Trash2, Save } from 'lucide-react';

interface KeyboardShortcut {
    id: string;
    name: string;
    keys: string[];
}

interface Settings {
    initialCommand: string;
    keyboardShortcuts: KeyboardShortcut[];
    imageShortcut: string[];
}

interface SettingsModalProps {
    onClose: () => void;
    directoryId?: string;
    workspaceName?: string;
}

export function SettingsModal({ onClose, directoryId, workspaceName }: SettingsModalProps) {
    const [settings, setSettings] = useState<Settings>({
        initialCommand: 'claude',
        keyboardShortcuts: [],
        imageShortcut: ['Alt', 'V']
    });
    const [isLoading, setIsLoading] = useState(true);
    const [recordingId, setRecordingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const storedSettings = await window.electronAPI.settings.get(directoryId);
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
            await window.electronAPI.settings.set(settings, directoryId);
            // Broadcast settings to connected mobile devices
            if (directoryId) {
                window.electronAPI.remote.broadcastSettings(directoryId);
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

                <div className="p-6 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-6 shrink-0">
                        <h2 className="text-xl font-header text-fg-primary flex items-center gap-2">
                            <Command size={20} className="text-accent-primary" />
                            {directoryId ? `Workspace Settings: ${workspaceName}` : 'Global Settings'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-bg-hover text-fg-muted hover:text-fg-primary transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col space-y-8 pr-2 overflow-hidden">
                        {/* Initial Command Section */}
                        <section className="shrink-0">
                            <h3 className="text-[10px] text-fg-muted uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                                <Command size={14} />
                                Terminal Startup
                            </h3>
                            <div className="space-y-2">
                                <label className="text-[12px] text-fg-muted">Default Startup Command</label>
                                <input
                                    type="text"
                                    value={settings.initialCommand}
                                    onChange={(e) => setSettings({ ...settings, initialCommand: e.target.value })}
                                    className="w-full bg-bg-elevated border border-border text-fg-primary text-[13px] px-3 py-2 rounded outline-none focus:border-accent-primary transition-colors"
                                    placeholder="e.g. claude"
                                />
                                <p className="text-[11px] text-fg-faint">This command runs automatically when a new terminal session is created.</p>
                            </div>
                        </section>

                        {/* Keyboard Shortcuts Section */}
                        <section className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-3 shrink-0">
                                <h3 className="text-[10px] text-fg-muted uppercase tracking-wider font-bold flex items-center gap-2">
                                    <Keyboard size={14} />
                                    Remote Key Combinations
                                </h3>
                                <button
                                    onClick={addShortcut}
                                    className="p-1 hover:bg-bg-hover text-accent-primary transition-colors flex items-center gap-1 text-[11px]"
                                >
                                    <Plus size={14} /> Add New
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2 bg-bg-elevated/10 p-2 rounded-lg border border-border/50">
                                {/* System shortcut - Send Image - always present, not deletable but recordable */}
                                <div className={`p-2 bg-bg-base/50 border rounded flex items-center gap-3 transition-all ${recordingId === 'image-shortcut' ? 'border-accent-primary ring-1 ring-accent-primary' : 'border-border/50'}`}>
                                    <span className="text-fg-muted text-[12px] font-medium w-36 truncate">Send Image</span>
                                    <div className="flex-1 flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={settings.imageShortcut.join(' + ')}
                                            className={`flex-1 bg-bg-surface border border-border text-fg-muted text-[11px] px-2 py-1 rounded outline-none transition-colors ${recordingId === 'image-shortcut' ? 'bg-accent-primary/5 text-accent-primary border-accent-primary' : ''}`}
                                            placeholder={recordingId === 'image-shortcut' ? 'Press keys...' : 'e.g. Alt + V'}
                                            readOnly
                                        />
                                        <button
                                            onClick={() => recordingId === 'image-shortcut' ? setRecordingId(null) : startRecording('image-shortcut')}
                                            className={`p-1.5 rounded transition-all flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold ${recordingId === 'image-shortcut'
                                                ? 'bg-status-error text-white animate-pulse'
                                                : 'bg-bg-surface border border-border text-fg-muted hover:text-accent-primary hover:border-accent-primary'
                                                }`}
                                            title={recordingId === 'image-shortcut' ? 'Stop Recording' : 'Record Shortcut'}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${recordingId === 'image-shortcut' ? 'bg-white' : 'bg-status-error'}`} />
                                            {recordingId === 'image-shortcut' ? 'Stop' : 'Record'}
                                        </button>
                                    </div>
                                    <div className="w-[14px]" />
                                </div>

                                {settings.keyboardShortcuts.length === 0 ? (
                                    <p className="text-[12px] text-fg-faint italic text-center py-4 bg-bg-elevated/30 border border-dashed border-border rounded">No custom shortcuts defined yet.</p>
                                ) : (
                                    settings.keyboardShortcuts.map((shortcut) => (
                                        <div key={shortcut.id} className={`p-2 bg-bg-elevated border rounded flex items-center gap-3 relative group transition-all ${recordingId === shortcut.id ? 'border-accent-primary ring-1 ring-accent-primary' : 'border-border hover:border-accent-primary/50'}`}>
                                            <input
                                                type="text"
                                                value={shortcut.name}
                                                onChange={(e) => updateShortcut(shortcut.id, { name: e.target.value })}
                                                className="bg-transparent border-none text-fg-primary text-[12px] font-medium w-36 focus:outline-none placeholder:text-fg-faint truncate"
                                                placeholder="Shortcut Name"
                                            />
                                            <div className="flex-1 flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={shortcut.keys.join(' + ')}
                                                    onChange={(e) => updateShortcut(shortcut.id, { keys: e.target.value.split('+').map(k => k.trim()).filter(k => k !== '') })}
                                                    className={`flex-1 bg-bg-surface border border-border text-fg-muted text-[11px] px-2 py-1 rounded focus:border-accent-primary focus:text-fg-primary outline-none transition-colors ${recordingId === shortcut.id ? 'bg-accent-primary/5 text-accent-primary border-accent-primary' : ''}`}
                                                    placeholder={recordingId === shortcut.id ? 'Press keys...' : 'e.g. Ctrl + Shift + P'}
                                                    readOnly={recordingId === shortcut.id}
                                                />
                                                <button
                                                    onClick={() => recordingId === shortcut.id ? setRecordingId(null) : startRecording(shortcut.id)}
                                                    className={`p-1.5 rounded transition-all flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold ${recordingId === shortcut.id
                                                        ? 'bg-status-error text-white animate-pulse'
                                                        : 'bg-bg-surface border border-border text-fg-muted hover:text-accent-primary hover:border-accent-primary'
                                                        }`}
                                                    title={recordingId === shortcut.id ? 'Stop Recording' : 'Record Shortcut'}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${recordingId === shortcut.id ? 'bg-white' : 'bg-status-error'}`} />
                                                    {recordingId === shortcut.id ? 'Stop' : 'Record'}
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeShortcut(shortcut.id)}
                                                className="p-1 text-fg-faint hover:text-status-error opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                                                title="Delete Shortcut"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border flex justify-end gap-3 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-[13px] text-fg-muted hover:text-fg-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 text-white text-[13px] font-medium rounded flex items-center gap-2 transition-all"
                        >
                            <Save size={16} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
