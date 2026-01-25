import { useState, useCallback, useRef } from 'react';
import { OutputLine, StyledSpan } from '../../../../shared/terminalTypes';
import { AnsiParser } from '../../../services/AnsiParser';

const MAX_LINES = 10000;

export function useTerminalOutput() {
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [bufferSpans, setBufferSpans] = useState<StyledSpan[]>([]);
  const parserRef = useRef(new AnsiParser());

  const addData = useCallback((data: string) => {
    const newLines = parserRef.current.parse(data);

    if (newLines.length > 0) {
      setLines((prev) => {
        const combined = [...prev, ...newLines];
        if (combined.length > MAX_LINES) {
          return combined.slice(-MAX_LINES);
        }
        return combined;
      });
    }

    // Update buffer spans for partial line display
    setBufferSpans(parserRef.current.getBufferAsSpans());
  }, []);

  const getBufferText = useCallback(() => {
    return parserRef.current.getBuffer();
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setBufferSpans([]);
    parserRef.current.reset();
  }, []);

  const flush = useCallback(() => {
    const remaining = parserRef.current.flush();
    if (remaining) {
      setLines((prev) => [...prev, remaining]);
    }
    setBufferSpans([]);
  }, []);

  return { lines, bufferSpans, addData, getBufferText, clear, flush };
}
