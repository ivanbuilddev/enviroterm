import { useState, useEffect, useCallback, useRef } from 'react';
import { OutputLine, InteractivePrompt } from '../../../../shared/terminalTypes';
import { PromptDetector } from '../../../services/PromptDetector';

export function usePromptDetection(
  lines: OutputLine[],
  getBufferText: () => string
) {
  const [activePrompt, setActivePrompt] = useState<InteractivePrompt | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const detectorRef = useRef(new PromptDetector());
  const lastPromptRawRef = useRef<string | null>(null);

  useEffect(() => {
    // Debounce detection - run whenever lines change
    const timer = setTimeout(() => {
      const bufferText = getBufferText();
      console.log('[usePromptDetection] Running detection, lines:', lines.length, 'buffer:', bufferText.length);

      const detected = detectorRef.current.detectPrompt(lines, bufferText);

      // Only update if prompt is different
      if (detected?.raw !== lastPromptRawRef.current) {
        lastPromptRawRef.current = detected?.raw || null;
        setActivePrompt(detected);
        if (detected) {
          setDismissed(false);
        }
        console.log('[usePromptDetection] Updated prompt:', detected?.type);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [lines, getBufferText]);

  const dismissPrompt = useCallback(() => {
    setDismissed(true);
    setActivePrompt(null);
  }, []);

  return {
    activePrompt: dismissed ? null : activePrompt,
    dismissPrompt,
  };
}
