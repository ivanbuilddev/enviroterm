import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File as FileIcon, FileCode } from 'lucide-react';
import { FileEntry } from '../../../../shared/types';

interface FileTreeItemProps {
  entry: FileEntry;
  depth?: number;
  onFileClick: (entry: FileEntry) => void;
  activeFilePath?: string | null;
  showFullPath?: boolean;
}

export function FileTreeItem({ entry, depth = 0, onFileClick, activeFilePath, showFullPath = false }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entry.isDirectory) {
      onFileClick(entry);
      return;
    }

    if (!isOpen && !hasLoaded) {
      setIsLoading(true);
      try {
        const items = await window.electronAPI.files.readDir(entry.path);
        setChildren(items);
        setHasLoaded(true);
      } catch (err) {
        console.error('Failed to load directory:', err);
      } finally {
        setIsLoading(false);
      }
    }

    setIsOpen(!isOpen);
  };

  const isSelected = activeFilePath === entry.path;

  // Determine icon
  const Icon = entry.isDirectory
    ? (isOpen ? FolderOpen : Folder)
    : (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.json') ? FileCode : FileIcon);

  // Extract directory name for display if showFullPath is true
  const dirName = showFullPath ? entry.path.replace(entry.name, '').split(/[/\\]/).filter(Boolean).pop() : '';

  return (
    <div className="select-none" title={entry.path}>
      <div
        className={`flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-bg-hover transition-colors ${isSelected ? 'bg-accent-primary/20 text-accent-primary' : 'text-fg-muted'}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleToggle}
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {entry.isDirectory && !showFullPath && (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </span>
        
        <Icon size={16} className={`shrink-0 ${entry.isDirectory ? 'text-accent-secondary' : 'text-fg-muted'}`} />
        
        <div className="flex flex-col min-w-0 flex-1 ml-1">
          <span className="truncate text-sm">{entry.name}</span>
          {showFullPath && dirName && (
             <span className="truncate text-[10px] text-fg-faint">{dirName}</span>
          )}
        </div>
      </div>

      {entry.isDirectory && isOpen && (
        <div>
          {isLoading ? (
            <div className="pl-8 py-1 text-xs text-fg-faint">Loading...</div>
          ) : children.length === 0 ? (
            <div className="pl-8 py-1 text-xs text-fg-faint">Empty</div>
          ) : (
            children.map((child) => (
              <FileTreeItem 
                key={child.path} 
                entry={child} 
                depth={depth + 1} 
                onFileClick={onFileClick}
                activeFilePath={activeFilePath}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
