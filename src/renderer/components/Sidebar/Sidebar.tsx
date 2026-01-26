import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Directory, Session } from '../../../shared/types';
import { DirectoryIcon } from './DirectoryIcon';
import { AddDirectoryButton } from './AddDirectoryButton';
import { DirectoryPopover } from './DirectoryPopover';

interface SidebarProps {
  directories: Directory[];
  activeDirectoryId: string | null;
  onSelectDirectory: (id: string) => void;
  onAddDirectory: () => void;
  onReorderDirectories: (ids: string[]) => void;
  onDeleteDirectory: (id: string) => void;
  onOpenInVSCode: (path: string) => void;
  onSelectSession: (directoryId: string, sessionId: string) => void;
}

export function Sidebar({
  directories,
  activeDirectoryId,
  onSelectDirectory,
  onAddDirectory,
  onReorderDirectories,
  onDeleteDirectory,
  onOpenInVSCode,
  onSelectSession
}: SidebarProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredSessions, setHoveredSessions] = useState<Session[]>([]);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const popoverTimerRef = useRef<any>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = directories.findIndex(d => d.id === sourceId);
    const targetIndex = directories.findIndex(d => d.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newDirectories = [...directories];
    const [removed] = newDirectories.splice(sourceIndex, 1);
    newDirectories.splice(targetIndex, 0, removed);

    onReorderDirectories(newDirectories.map(d => d.id));
    setDraggedId(null);
  };

  const handleMouseEnter = async (e: React.MouseEvent, id: string) => {
    clearTimeout(popoverTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({ top: rect.top, left: rect.right + 8 });
    setHoveredId(id);
    try {
      const sessions = await window.electronAPI.sessions.getByDirectory(id);
      setHoveredSessions(sessions);
    } catch (err) {
      console.error('Failed to fetch sessions for popover', err);
    }
  };

  const handleMouseLeave = () => {
    popoverTimerRef.current = setTimeout(() => {
      setHoveredId(null);
      setHoveredSessions([]);
    }, 100);
  };

  return (
    <aside className="w-16 bg-bg-elevated border-r border-border flex flex-col items-center py-3 gap-2 h-full z-[200]">
      <div className="flex flex-col items-center gap-2 flex-1 w-full">
        {directories.map(directory => (
          <div
            key={directory.id}
            draggable
            onDragStart={(e) => handleDragStart(e, directory.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, directory.id)}
            onMouseEnter={(e) => handleMouseEnter(e, directory.id)}
            onMouseLeave={handleMouseLeave}
            className={`relative transition-opacity duration-200 ${draggedId === directory.id ? 'opacity-40' : 'opacity-100'}`}
          >
            <DirectoryIcon
              directory={directory}
              isSelected={directory.id === activeDirectoryId}
              onClick={() => onSelectDirectory(directory.id)}
            />

            {hoveredId === directory.id && createPortal(
              <div
                className="fixed z-[5000]"
                style={{ top: popoverPos.top, left: popoverPos.left }}
                onMouseEnter={() => clearTimeout(popoverTimerRef.current)}
                onMouseLeave={handleMouseLeave}
              >
                <DirectoryPopover
                  directory={directory}
                  sessions={hoveredSessions}
                  onSelectSession={(sessionId) => onSelectSession(directory.id, sessionId)}
                  onDeleteDirectory={() => onDeleteDirectory(directory.id)}
                  onOpenInVSCode={() => onOpenInVSCode(directory.path)}
                />
              </div>,
              document.body
            )}
          </div>
        ))}
      </div>
      <AddDirectoryButton onClick={onAddDirectory} />
    </aside>
  );
}
