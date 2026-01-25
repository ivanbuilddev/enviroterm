import Anser from 'anser';
import { StyledSpan, OutputLine } from '../../shared/terminalTypes';

export class AnsiParser {
  private buffer: string = '';
  private lineIdCounter = 0;

  /**
   * Parse raw ANSI data into styled lines
   * Handles partial sequences by buffering
   */
  parse(data: string): OutputLine[] {
    this.buffer += data;
    const lines: OutputLine[] = [];

    // Split on newlines, keeping last partial line in buffer
    const parts = this.buffer.split(/\r?\n/);
    this.buffer = parts.pop() || '';

    for (const part of parts) {
      const cleanedPart = this.handleControlCodes(part);
      const spans = this.parseToSpans(cleanedPart);

      lines.push({
        id: `line-${++this.lineIdCounter}`,
        timestamp: Date.now(),
        spans,
        raw: part,
      });
    }

    return lines;
  }

  /**
   * Force flush buffer (for when we know input is complete)
   */
  flush(): OutputLine | null {
    if (this.buffer.length === 0) return null;

    const spans = this.parseToSpans(this.handleControlCodes(this.buffer));
    const line: OutputLine = {
      id: `line-${++this.lineIdCounter}`,
      timestamp: Date.now(),
      spans,
      raw: this.buffer,
    };

    this.buffer = '';
    return line;
  }

  /**
   * Get current buffer content (for prompt detection on partial lines)
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * Get buffer as styled spans (for rendering partial lines)
   */
  getBufferAsSpans(): StyledSpan[] {
    if (this.buffer.length === 0) return [];
    return this.parseToSpans(this.handleControlCodes(this.buffer));
  }

  private handleControlCodes(text: string): string {
    return text
      // Cursor movement (up, down, forward, back)
      .replace(/\x1b\[\d*[ABCD]/g, '')
      // Clear screen / clear line
      .replace(/\x1b\[\d*[JK]/g, '')
      // Cursor position
      .replace(/\x1b\[[\d;]*[Hf]/g, '')
      // Mode changes (show/hide cursor, etc)
      .replace(/\x1b\[\?[\d;]*[hl]/g, '')
      // Save/restore cursor
      .replace(/\x1b[78]/g, '')
      .replace(/\x1b\[s/g, '')
      .replace(/\x1b\[u/g, '')
      // Handle carriage return (line overwrite) - convert to newline behavior
      .replace(/\r(?!\n)/g, '')
      // Remove backspace sequences
      .replace(/.\x08/g, '');
  }

  private parseToSpans(text: string): StyledSpan[] {
    if (text.length === 0) return [];

    const parsed = Anser.ansiToJson(text, { use_classes: false });

    return parsed.map((item) => ({
      text: item.content,
      style: {
        foreground: item.fg || undefined,
        background: item.bg || undefined,
        bold: item.decoration?.includes('bold'),
        italic: item.decoration?.includes('italic'),
        underline: item.decoration?.includes('underline'),
        dim: item.decoration?.includes('dim'),
      },
    }));
  }

  reset(): void {
    this.buffer = '';
    this.lineIdCounter = 0;
  }
}
