import { Workspace, Session } from '../../../shared/types';
import { useMemo, useState, useEffect } from 'react';
import vscodeIcon from '../../assets/icons/vscode.svg';
import { Settings, Folder, Play, ChevronRight, ChevronDown, Search, Plus } from 'lucide-react';

interface CustomCommand {
    id: string;
    name: string;
    command: string;
}

interface WorkspacePopoverProps {
    workspace: Workspace;
    sessions: Session[];
    onSelectSession: (sessionId: string) => void;
    onCreateSession: () => void;
    onDeleteWorkspace: () => void;
    onOpenInVSCode: () => void;
    onOpenInExplorer: () => void;
    onRunCommand: (name: string, command: string) => void;
    onSendToPhone: () => void;
    onOpenSettings: () => void;
}

export function WorkspacePopover({
    workspace,
    sessions,
    onSelectSession,
    onCreateSession,
    onDeleteWorkspace,
    onOpenInVSCode,
    onOpenInExplorer,
    onRunCommand,
    onSendToPhone,
    onOpenSettings
}: WorkspacePopoverProps) {
    const createdDate = useMemo(() => {
        return new Date(workspace.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }, [workspace.createdAt]);

    const [customCommands, setCustomCommands] = useState<CustomCommand[]>([]);
    const [isCommandsExpanded, setIsCommandsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await window.electronAPI.settings.get();
                if (settings.customCommands) {
                    setCustomCommands(settings.customCommands);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchSettings();
    }, []);

    const filteredCommands = useMemo(() => {
        if (!searchQuery) return customCommands;
        return customCommands.filter(cmd => 
            cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            cmd.command.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [customCommands, searchQuery]);

    return (
        <div className="w-64 bg-bg-surface border border-border shadow-2xl flex flex-col p-4 animate-in fade-in slide-in-from-left-2 duration-150">
            {/* Header */}
            <div className="mb-4">
                <h3 className="text-[10px] font-header text-fg-muted uppercase tracking-widest mb-1">Workspace Path</h3>
                <p className="text-[12px] font-header text-fg-primary truncate" title={workspace.path}>
                    {workspace.path}
                </p>
                <p className="text-[9px] text-fg-faint mt-1">Created on {createdDate}</p>
            </div>

            {/* Active Sessions */}
            <div className="mb-4 flex-1">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[9px] font-medium text-fg-muted uppercase tracking-wider">Active Sessions</h4>
                    <button 
                        onClick={onCreateSession}
                        className="p-1 hover:bg-bg-hover text-fg-muted hover:text-accent-primary rounded transition-colors"
                        title="New Session"
                    >
                        <Plus size={12} />
                    </button>
                </div>
                {sessions.length === 0 ? (
                    <p className="text-[10px] text-fg-faint italic px-2">No active sessions</p>
                ) : (
                    <div className="flex flex-col gap-1">
                        {sessions.map(session => (
                            <button
                                key={session.id}
                                onClick={() => onSelectSession(session.id)}
                                className="w-full text-left px-2 py-1.5 hover:bg-bg-hover group transition-colors flex items-center justify-between"
                            >
                                <span className="text-[11px] text-fg-secondary group-hover:text-fg-primary truncate">
                                    {session.name}
                                </span>
                                <span className="w-1.5 h-1.5 bg-accent-primary animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Custom Commands */}
            {customCommands.length > 0 && (
                <div className="mb-4">
                    <button
                        onClick={() => setIsCommandsExpanded(!isCommandsExpanded)}
                        className="w-full flex items-center justify-between group mb-2"
                    >
                        <h4 className="text-[9px] font-medium text-fg-muted uppercase tracking-wider group-hover:text-fg-primary transition-colors">Run Command</h4>
                        {isCommandsExpanded ? <ChevronDown size={12} className="text-fg-muted" /> : <ChevronRight size={12} className="text-fg-muted" />}
                    </button>
                    
                    {isCommandsExpanded && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                            {/* Search */}
                            <div className="relative mb-2">
                                <Search className="absolute left-2 top-1.5 w-3 h-3 text-fg-faint" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Filter commands..."
                                    className="w-full bg-bg-elevated border border-border text-fg-primary text-[10px] pl-7 pr-2 py-1 rounded outline-none focus:border-accent-primary transition-colors placeholder:text-fg-faint"
                                    autoFocus
                                />
                            </div>

                            <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                {filteredCommands.length === 0 ? (
                                    <p className="text-[10px] text-fg-faint italic px-2 py-1">No matches found</p>
                                ) : (
                                    filteredCommands.map(cmd => (
                                        <button
                                            key={cmd.id}
                                            onClick={() => onRunCommand(cmd.name, cmd.command)}
                                            className="w-full text-left px-2 py-1.5 hover:bg-bg-hover group transition-colors flex items-center gap-2 rounded shrink-0"
                                            title={cmd.command}
                                        >
                                            <Play className="w-3 h-3 text-accent-primary shrink-0" />
                                            <span className="text-[11px] text-fg-secondary group-hover:text-fg-primary truncate">
                                                {cmd.name}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-1 border-t border-border pt-3">
                <button
                    onClick={onOpenInVSCode}
                    className="w-full text-left px-2 py-1.5 hover:bg-bg-hover hover:text-fg-primary text-[10px] text-fg-secondary flex items-center gap-2 transition-colors"
                >
                    <img src={vscodeIcon} className="w-3.5 h-3.5" alt="VS Code" />
                    Open in VS Code
                </button>
                <button
                    onClick={onOpenInExplorer}
                    className="w-full text-left px-2 py-1.5 hover:bg-bg-hover hover:text-fg-primary text-[10px] text-fg-secondary flex items-center gap-2 transition-colors"
                >
                    <Folder className="w-3.5 h-3.5" />
                    Open in Explorer
                </button>
                <button
                    onClick={onOpenSettings}
                    className="w-full text-left px-2 py-1.5 hover:bg-bg-hover hover:text-accent-primary text-[10px] text-fg-secondary flex items-center gap-2 transition-colors"
                >
                    <Settings className="w-3.5 h-3.5" />
                    Workspace Settings
                </button>
                <button
                    onClick={onSendToPhone}
                    className="w-full text-left px-2 py-1.5 hover:bg-bg-hover hover:text-accent-primary text-[10px] text-fg-secondary flex items-center gap-2 transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Send to Phone
                </button>
                <button
                    onClick={onDeleteWorkspace}
                    className="w-full text-left px-2 py-1.5 hover:bg-status-error/10 hover:text-status-error text-[10px] text-fg-secondary flex items-center gap-2 transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Workspace
                </button>
            </div>
        </div>
    );
}
