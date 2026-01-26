import { Directory } from '../../../shared/types';

interface DirectoryIconProps {
  directory: Directory;
  isSelected: boolean;
  onClick: () => void;
}

export function DirectoryIcon({ directory, isSelected, onClick }: DirectoryIconProps) {
  // Always use the basename of the path for the icon letter
  const folderName = directory.path.split(/[/\\]/).filter(Boolean).pop() || '';
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
        backgroundColor: directory.backgroundColor,
        color: directory.textColor,
      }}
    >
      {firstLetter}
    </button>
  );
}
