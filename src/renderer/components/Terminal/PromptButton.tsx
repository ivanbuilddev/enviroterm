import { PromptOption } from '../../../shared/terminalTypes';

interface PromptButtonProps {
  option: PromptOption;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger';
}

export function PromptButton({
  option,
  onClick,
  variant = 'default',
}: PromptButtonProps) {
  const variantClasses = {
    default: 'bg-bg-surface hover:bg-bg-hover border-border text-fg-primary',
    success:
      'bg-status-success-muted hover:bg-status-success/20 border-status-success/30 text-status-success',
    danger:
      'bg-status-error-muted hover:bg-status-error/20 border-status-error/30 text-status-error',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 border transition-colors font-medium
                  flex items-center gap-2 ${variantClasses[variant]}`}
    >
      {option.shortcut && (
        <kbd className="px-1.5 py-0.5 bg-bg-active text-xs font-mono">
          {option.shortcut}
        </kbd>
      )}
      <span>{option.label}</span>
    </button>
  );
}
