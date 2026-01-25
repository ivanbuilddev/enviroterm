interface AddSessionButtonProps {
  onClick: () => void;
}

export function AddSessionButton({ onClick }: AddSessionButtonProps) {
  return (
    <button
      onClick={onClick}
      title="New Session"
      className="
        w-10 h-10 rounded-lg flex items-center justify-center
        bg-bg-surface border-2 border-dashed border-border
        text-fg-muted hover:text-fg-primary hover:border-accent-primary
        hover:bg-bg-hover transition-all duration-150
        text-2xl font-light
      "
    >
      +
    </button>
  );
}
