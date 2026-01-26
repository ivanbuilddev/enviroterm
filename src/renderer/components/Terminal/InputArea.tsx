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
    // Send the raw input exactly as typed, without trimming
    // Trimming can remove important spaces that interactive CLIs expect
    onSubmit(input);
    if (input.trim()) {
      setHistory((prev) => [input.trim(), ...prev].slice(0, 100));
    }
    setInput('');
    setHistoryIndex(-1);
  }, [input, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'ArrowUp' && input === '') {
        // Only trigger history if current input is empty to avoid conflict with multiline navigation
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      } else if (e.key === 'ArrowDown' && historyIndex !== -1) {
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
    [handleSubmit, history, historyIndex, input, onInterrupt]
  );

  return (
    <div className="border-t border-border bg-bg-surface p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-end gap-3 max-w-5xl mx-auto">
        <div className="flex-1 bg-bg-base border border-border focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary transition-all duration-200 px-3 py-1 flex items-end">
          <span className="text-accent-primary font-mono text-lg mb-1 mr-2 opacity-70 select-none">&gt;</span>
          <textarea
            ref={inputRef as any}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Simple auto-resize logic
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-fg-primary font-mono text-sm
                       outline-none placeholder:text-fg-muted resize-none py-2
                       leading-relaxed scrollbar-thin scrollbar-thumb-accent-primary/20"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="px-5 py-2.5 bg-accent-primary hover:bg-accent-primary-hover
                     text-white text-sm font-semibold transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed mb-0.5
                     shadow-md hover:shadow-lg active:transform active:scale-95
                     flex items-center justify-center gap-2"
        >
          <span>Send</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
