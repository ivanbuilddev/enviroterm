import { memo } from 'react';
import { OutputLine as OutputLineType, StyledSpan } from '../../../shared/terminalTypes';

interface OutputLineProps {
  line: OutputLineType;
}

function StyledText({ span }: { span: StyledSpan }) {
  const style: React.CSSProperties = {};

  if (span.style.foreground) {
    style.color = span.style.foreground;
  }
  if (span.style.background) {
    style.backgroundColor = span.style.background;
  }
  if (span.style.bold) {
    style.fontWeight = 'bold';
  }
  if (span.style.italic) {
    style.fontStyle = 'italic';
  }
  if (span.style.underline) {
    style.textDecoration = 'underline';
  }
  if (span.style.dim) {
    style.opacity = 0.6;
  }

  return <span style={style}>{span.text}</span>;
}

export const OutputLine = memo(function OutputLine({ line }: OutputLineProps) {
  if (line.spans.length === 0) {
    return <div className="h-5">&nbsp;</div>;
  }

  return (
    <div className="whitespace-pre-wrap break-all leading-5">
      {line.spans.map((span, index) => (
        <StyledText key={index} span={span} />
      ))}
    </div>
  );
});

// For rendering buffer spans (partial lines)
interface BufferLineProps {
  spans: StyledSpan[];
}

export function BufferLine({ spans }: BufferLineProps) {
  if (spans.length === 0) return null;

  return (
    <div className="whitespace-pre-wrap break-all leading-5">
      {spans.map((span, index) => (
        <StyledText key={index} span={span} />
      ))}
    </div>
  );
}
