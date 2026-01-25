// Represents a single styled text span
export interface StyledSpan {
  text: string;
  style: {
    foreground?: string;
    background?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    dim?: boolean;
  };
}

// A line of output with styling
export interface OutputLine {
  id: string;
  timestamp: number;
  spans: StyledSpan[];
  raw: string;
}

// Types of interactive prompts Claude CLI might show
export type PromptType =
  | 'yes-no'
  | 'numbered-list'
  | 'single-key'
  | 'text-input';

// Individual selectable option
export interface PromptOption {
  label: string;
  value: string;
  shortcut?: string;
}

// Detected interactive prompt
export interface InteractivePrompt {
  type: PromptType;
  options: PromptOption[];
  raw: string;
  lineId: string;
}
