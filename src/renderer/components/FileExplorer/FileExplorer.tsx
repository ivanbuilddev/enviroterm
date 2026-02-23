import { useState, useEffect, useRef } from 'react';
import { FileEntry } from '../../../../shared/types';
import { FileTreeItem } from './FileTreeItem';
import { RefreshCw, Search, X } from 'lucide-react';

interface FileExplorerProps {
  rootPath: string;
  onFileSelect: (file: FileEntry) => void;
  activeFilePath?: string | null;
}

export function FileExplorer({ rootPath, onFileSelect, activeFilePath }: FileExplorerProps) {
  const [rootFiles, setRootFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadFiles = async () => {
    if (!rootPath) return;
    setIsLoading(true);
    setError(null);
    try {
      const files = await window.electronAPI.files.readDir(rootPath);
      setRootFiles(files);
    } catch (err) {
      console.error('Failed to load root files:', err);
      setError('Failed to load directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    setSearchQuery('');
    setSearchResults([]);
  }, [rootPath]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await window.electronAPI.files.search(rootPath, query);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  if (!rootPath) {
    return <div className="p-4 text-center text-fg-muted">No workspace selected</div>;
  }

  return (
    <div className="h-full flex flex-col bg-bg-surface border-r border-border">
      <div className="flex flex-col border-b border-border bg-bg-elevated">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-bold text-fg-muted uppercase tracking-wider">Explorer</span>
          <button 
            onClick={loadFiles} 
            className="p-1 hover:bg-bg-hover rounded text-fg-muted hover:text-fg-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {/* Search Input */}
        <div className="px-2 pb-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-bg-base border border-border rounded px-7 py-1 text-xs text-fg-primary focus:outline-none focus:border-accent-primary placeholder:text-fg-faint"
            />
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-muted" />
            {searchQuery && (
              <button 
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-primary"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {error ? (
          <div className="p-4 text-center text-status-error text-sm">{error}</div>
        ) : searchQuery ? (
          /* Search Results */
          <div>
            {isSearching ? (
              <div className="px-4 py-2 text-xs text-fg-muted">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-2 text-xs text-fg-muted">No results found</div>
            ) : (
              searchResults.map(file => (
                <FileTreeItem
                  key={file.path}
                  entry={file}
                  onFileClick={onFileSelect}
                  activeFilePath={activeFilePath}
                  showFullPath={true}
                />
              ))
            )}
          </div>
        ) : (
          /* Normal Tree */
          rootFiles.map(file => (
            <FileTreeItem
              key={file.path}
              entry={file}
              onFileClick={onFileSelect}
              activeFilePath={activeFilePath}
            />
          ))
        )}
      </div>
    </div>
  );
}
