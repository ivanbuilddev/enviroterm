import { Workspace } from '../../../shared/types';

interface WorkspaceIconProps {
  workspace: Workspace;
  isSelected: boolean;
  onClick: () => void;
}

export function WorkspaceIcon({ workspace, isSelected, onClick }: WorkspaceIconProps) {
  // Always use the basename of the path for the icon letter
  const folderName = workspace.path.split(/[/\\]/).filter(Boolean).pop() || '';
  const firstLetter = folderName.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`
        w-10 h-10 flex items-center justify-center
        text-lg font-header font-medium transition-all duration-150
        hover:scale-105 hover:ring-2 hover:ring-accent-primary/50
        ${isSelected ? 'ring-2 ring-accent-primary scale-105' : ''}
      `}
      style={{
        backgroundColor: workspace.backgroundColor,
        color: workspace.textColor,
      }}
    >
      {firstLetter}
    </button>
  );
}
