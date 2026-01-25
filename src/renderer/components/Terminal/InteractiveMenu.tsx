import { InteractivePrompt } from '../../../shared/terminalTypes';
import { PromptButton } from './PromptButton';

interface InteractiveMenuProps {
  prompt: InteractivePrompt;
  onSelect: (value: string, index: number) => void;
  onDismiss: () => void;
}

export function InteractiveMenu({
  prompt,
  onSelect,
  onDismiss,
}: InteractiveMenuProps) {
  const getButtonVariant = (option: { value: string; label: string }) => {
    if (prompt.type === 'yes-no') {
      if (option.value === 'y') return 'success' as const;
      if (option.value === 'n') return 'danger' as const;
    }
    return 'default' as const;
  };

  const getLayoutClass = () => {
    switch (prompt.type) {
      case 'numbered-list':
        return 'flex flex-col gap-2';
      default:
        return 'flex flex-wrap gap-2';
    }
  };

  return (
    <div className="absolute bottom-16 right-4 z-10">
      <div className="bg-bg-elevated border border-border rounded-lg shadow-lg p-4 min-w-[200px] max-w-[400px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-fg-secondary text-sm font-medium">
            Select an option
          </span>
          <button
            onClick={onDismiss}
            className="text-fg-muted hover:text-fg-secondary text-lg leading-none
                       w-6 h-6 flex items-center justify-center rounded hover:bg-bg-hover"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        {/* Options */}
        <div className={getLayoutClass()}>
          {prompt.options.map((option, index) => (
            <PromptButton
              key={index}
              option={option}
              onClick={() => {
                console.log('[InteractiveMenu] Button clicked, value:', option.value, 'index:', index);
                onSelect(option.value, index);
              }}
              variant={getButtonVariant(option)}
            />
          ))}
        </div>

        {/* Hint */}
        <p className="text-fg-muted text-xs mt-3">
          Click an option or type manually below
        </p>
      </div>
    </div>
  );
}
