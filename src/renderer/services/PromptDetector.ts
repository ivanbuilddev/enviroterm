import { OutputLine, InteractivePrompt, PromptOption } from '../../shared/terminalTypes';

export class PromptDetector {
  /**
   * Analyze recent lines and buffer to detect interactive prompts
   */
  detectPrompt(lines: OutputLine[], bufferText: string): InteractivePrompt | null {
    // Combine recent lines with current buffer for analysis
    const recentLines = lines.slice(-20);
    const recentText = [
      ...recentLines.map((l) => l.spans.map((s) => s.text).join('')),
      bufferText,
    ].join('\n');

    const lastLineId = recentLines[recentLines.length - 1]?.id || 'buffer';

    // Debug logging
    console.log('[PromptDetector] Checking text:', recentText.slice(-300));

    // Check patterns in order of specificity
    const result =
      this.detectYesNoAllow(recentText, lastLineId) ||
      this.detectYesNo(recentText, lastLineId) ||
      this.detectNumberedList(recentText, lastLineId) ||
      this.detectSingleKey(recentText, lastLineId) ||
      null;

    if (result) {
      console.log('[PromptDetector] Detected:', result.type, result.options);
    }

    return result;
  }

  private detectYesNo(text: string, lineId: string): InteractivePrompt | null {
    // Patterns: [y/n], [Y/n], [yes/no], (y/n), yes/no?
    const patterns = [
      /\[([yY])\/([nN])\]\s*$/,
      /\[([yY])es\/([nN])o\]\s*$/,
      /\(([yY])\/([nN])\)\s*$/,
      /([yY])es\/([nN])o\?\s*$/,
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'yes-no',
          options: [
            { label: 'Yes', value: 'y', shortcut: 'y' },
            { label: 'No', value: 'n', shortcut: 'n' },
          ],
          raw: text.slice(-100),
          lineId,
        };
      }
    }
    return null;
  }

  private detectYesNoAllow(text: string, lineId: string): InteractivePrompt | null {
    // Claude Code specific: (y/n/a) for tool approvals
    // Also handles (y)es, (n)o, (a)lways patterns
    const patterns = [
      /\(([yY])\/([nN])\/([aA])\)\s*$/,
      /\[([yY])\/([nN])\/([aA])\]\s*$/,
      /\(y\)es.*\(n\)o.*\(a\)lways/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          type: 'yes-no',
          options: [
            { label: 'Yes', value: 'y', shortcut: 'y' },
            { label: 'No', value: 'n', shortcut: 'n' },
            { label: 'Always', value: 'a', shortcut: 'a' },
          ],
          raw: text.slice(-100),
          lineId,
        };
      }
    }
    return null;
  }

  private detectNumberedList(text: string, lineId: string): InteractivePrompt | null {
    // Split into lines and look for consecutive numbered options
    const lines = text.split(/\n/);

    // Log raw line content for debugging
    console.log('[PromptDetector] Lines to check:', lines.slice(-10).map((l, i) =>
      `${i}: [${l.substring(0, 60)}] (codes: ${[...l.substring(0, 10)].map(c => c.charCodeAt(0)).join(',')})`
    ));

    // Pattern that matches "1. text" or "1) text" anywhere in the line
    // Use a pattern that finds the number even if there's junk before it
    const linePattern = /(?:^|[^\d])(\d)[.)]\s+([A-Za-z].{1,50}?)$/;

    const numberedLines: { num: number; label: string; lineIndex: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(linePattern);
      if (match) {
        const num = parseInt(match[1], 10);
        const label = match[2].trim();
        // Only accept single digit numbers 1-9 with reasonable labels
        if (num >= 1 && num <= 9 && label.length > 1 && !label.includes(':\\') && !label.includes('powershell')) {
          console.log(`[PromptDetector] Found option ${num}: "${label}" in line: "${line.substring(0, 60)}"`);
          numberedLines.push({ num, label, lineIndex: i });
        }
      }
    }

    console.log('[PromptDetector] Numbered lines found:', numberedLines);

    // Look for consecutive numbered options (1, 2, 3... appearing close together)
    if (numberedLines.length >= 2) {
      // Check if we have sequential numbers starting from 1
      const hasOne = numberedLines.some(l => l.num === 1);
      const hasTwo = numberedLines.some(l => l.num === 2);

      if (hasOne && hasTwo) {
        // Sort by number
        numberedLines.sort((a, b) => a.num - b.num);

        // Deduplicate by number (keep last occurrence - most recent)
        const seen = new Map<number, { num: number; label: string; lineIndex: number }>();
        for (const line of numberedLines) {
          seen.set(line.num, line);
        }

        const uniqueOptions = Array.from(seen.values()).sort((a, b) => a.num - b.num);

        console.log('[PromptDetector] Valid options:', uniqueOptions);

        const options: PromptOption[] = uniqueOptions.slice(0, 10).map((opt) => ({
          label: opt.label.substring(0, 50),
          value: String(opt.num),
          shortcut: String(opt.num),
        }));

        return {
          type: 'numbered-list',
          options,
          raw: text.slice(-500),
          lineId,
        };
      }
    }
    return null;
  }

  private detectSingleKey(text: string, lineId: string): InteractivePrompt | null {
    // Patterns like "[a] accept [r] reject" or "(a)ccept (r)eject"
    // Also: "Press a/b/c"

    // Pattern 1: [key] label
    const bracketPattern = /\[([a-z])\]\s*(\w+)/gi;
    const bracketMatches = [...text.matchAll(bracketPattern)];

    if (bracketMatches.length >= 2) {
      const options: PromptOption[] = bracketMatches.map((m) => ({
        label: m[2],
        value: m[1].toLowerCase(),
        shortcut: m[1].toLowerCase(),
      }));

      return {
        type: 'single-key',
        options,
        raw: text.slice(-200),
        lineId,
      };
    }

    // Pattern 2: (key)label like (a)ccept
    const parenPattern = /\(([a-z])\)(\w+)/gi;
    const parenMatches = [...text.matchAll(parenPattern)];

    if (parenMatches.length >= 2) {
      const options: PromptOption[] = parenMatches.map((m) => ({
        label: m[1] + m[2],
        value: m[1].toLowerCase(),
        shortcut: m[1].toLowerCase(),
      }));

      return {
        type: 'single-key',
        options,
        raw: text.slice(-200),
        lineId,
      };
    }

    return null;
  }
}
