import { Directory, Session } from '../../../shared/types';
import { useMemo } from 'react';
import vscodeIcon from '../../assets/icons/vscode.svg';
import { Settings } from 'lucide-react';

interface DirectoryPopoverProps {
    directory: Directory;
    sessions: Session[];
    onSelectSession: (sessionId: string) => void;
    onDeleteDirectory: () => void;
    onOpenInVSCode: () => void;
    onSendToPhone: () => void;
    onOpenSettings: () => void;
}

export function DirectoryPopover({
    directory,
    sessions,
    onSelectSession,
    onDeleteDirectory,
    onOpenInVSCode,
    onSendToPhone,
    onOpenSettings
}: DirectoryPopoverProps) {
    const createdDate = useMemo(() => {
        return new Date(directory.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }, [directory.createdAt]);

    return (
        <div className="w-64 bg-bg-surface border border-border shadow-2xl flex flex-col p-4 animate-in fade-in slide-in-from-left-2 duration-150">
            {/* Header */}
            <div className="mb-4">
                <h3 className="text-[10px] font-header text-fg-muted uppercase tracking-widest mb-1">Directory Output</h3>
                <p className="text-[12px] font-header text-fg-primary truncate" title={directory.path}>
                    {directory.path}
                </p>
                <p className="text-[9px] text-fg-faint mt-1">Created on {createdDate}</p>
            </div>

            {/* Active Sessions */}
            <div className="mb-4 flex-1">
                <h4 className="text-[9px] font-medium text-fg-muted uppercase tracking-wider mb-2">Active Sessions</h4>
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
                    onClick={onDeleteDirectory}
                    className="w-full text-left px-2 py-1.5 hover:bg-status-error/10 hover:text-status-error text-[10px] text-fg-secondary flex items-center gap-2 transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Directory
                </button>
            </div>
        </div>
    );
}
