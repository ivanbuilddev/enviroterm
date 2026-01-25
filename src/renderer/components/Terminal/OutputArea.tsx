import { forwardRef } from 'react';
import { OutputLine as OutputLineType, StyledSpan } from '../../../shared/terminalTypes';
import { OutputLine, BufferLine } from './OutputLine';

interface OutputAreaProps {
  lines: OutputLineType[];
  bufferSpans: StyledSpan[];
  className?: string;
}

export const OutputArea = forwardRef<HTMLDivElement, OutputAreaProps>(
  function OutputArea({ lines, bufferSpans, className }, ref) {
    return (
      <div
        ref={ref}
        className={`p-4 font-mono text-sm text-fg-primary terminal-output ${className}`}
      >
        {lines.map((line) => (
          <OutputLine key={line.id} line={line} />
        ))}
        <BufferLine spans={bufferSpans} />
      </div>
    );
  }
);
