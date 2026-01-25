import { useState, useCallback, KeyboardEvent, useRef, useEffect } from 'react';

interface InputAreaProps {
  onSubmit: (text: string) => void;
  onInterrupt: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function InputArea({
  onSubmit,
  onInterrupt,
  placeholder = 'Type a message...',
  disabled,
}: InputAreaProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setHistory((prev) => [trimmed, ...prev].slice(0, 100));
      setInput('');
      setHistoryIndex(-1);
    } else if (input === '') {
      // Allow empty submit (just Enter)
      onSubmit('');
    }
  }, [input, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setInput('');
        }
      } else if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        onInterrupt();
      }
    },
    [handleSubmit, history, historyIndex, onInterrupt]
  );

  return (
    <div className="border-t border-border bg-bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="text-accent-primary font-mono text-lg">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-fg-primary font-mono text-sm
                     outline-none placeholder:text-fg-muted"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="px-3 py-1.5 bg-accent-primary hover:bg-accent-primary-hover
                     text-white rounded text-sm font-medium transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
