import { Session } from '../../../shared/types';

interface SessionIconProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
}

export function SessionIcon({ session, isSelected, onClick }: SessionIconProps) {
  const firstLetter = session.folderName.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      title={session.folderPath}
      className={`
        w-10 h-10 rounded-lg flex items-center justify-center
        text-lg font-semibold transition-all duration-150
        hover:scale-105 hover:ring-2 hover:ring-accent-primary/50
        ${isSelected ? 'ring-2 ring-accent-primary scale-105' : ''}
      `}
      style={{
        backgroundColor: session.backgroundColor,
        color: session.textColor,
      }}
    >
      {firstLetter}
    </button>
  );
}
