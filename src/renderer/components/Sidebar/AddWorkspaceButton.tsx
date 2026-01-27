interface AddWorkspaceButtonProps {
  onClick: () => void;
}

export function AddWorkspaceButton({ onClick }: AddWorkspaceButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        w-10 h-10 flex items-center justify-center
        bg-bg-surface border-2 border-dashed border-border
        text-fg-muted hover:text-fg-primary hover:border-accent-primary
        text-lg font-header font-medium transition-all duration-150
        text-2xl font-header font-light
      "
    >
      +
    </button>
  );
}
