import Editor, { OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Eye, Code } from "lucide-react";

interface CodeEditorProps {
  filePath: string | null;
  initialContent: string;
  onSave: (path: string, content: string) => Promise<void>;
  readOnly?: boolean;
}

export function CodeEditor({ filePath, initialContent, onSave, readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  const isMarkdown = filePath?.toLowerCase().endsWith('.md');

  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
  }, [initialContent, filePath]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add save command (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  const handleSave = async () => {
    if (!filePath || !editorRef.current) return;
    const currentContent = editorRef.current.getValue();
    await onSave(filePath, currentContent);
    setIsDirty(false);
  };

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      setIsDirty(value !== initialContent);
    }
  };

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center text-fg-muted bg-bg-base">
        <p>Select a file to edit</p>
      </div>
    );
  }

  // Determine language based on file extension
  const getLanguage = (path: string) => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.md')) return 'markdown';
    return 'plaintext';
  };

  return (
    <div className="h-full flex flex-col bg-bg-base">
      <div className="flex items-center justify-between px-4 py-2 bg-bg-elevated border-b border-border">
        <span className="text-sm font-medium text-fg-primary truncate flex items-center gap-2">
          {filePath.split(/[/\\]/).pop()}
          {isDirty && <span className="w-2 h-2 rounded-full bg-accent-primary"></span>}
        </span>
        <div className="flex items-center gap-4">
          {isMarkdown && (
            <div className="flex bg-bg-base/50 rounded-md p-0.5 border border-border">
              <button
                onClick={() => setViewMode('code')}
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === 'code' ? 'bg-bg-elevated text-fg-primary shadow-sm' : 'text-fg-muted hover:text-fg-primary'
                  }`}
                title="Code Layout"
              >
                <Code size={14} />
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === 'preview' ? 'bg-bg-elevated text-fg-primary shadow-sm' : 'text-fg-muted hover:text-fg-primary'
                  }`}
                title="Preview Layout"
              >
                <Eye size={14} />
              </button>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`text-xs px-3 py-1 rounded transition-colors ${isDirty
              ? 'bg-accent-primary text-white hover:bg-accent-primary/90'
              : 'text-fg-muted bg-bg-hover opacity-50 cursor-not-allowed'
              }`}
          >
            Save
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {isMarkdown && viewMode === 'preview' ? (
          <div className="w-full h-full overflow-y-auto p-6 bg-bg-base">
            <div className="max-w-3xl mx-auto text-fg-primary markdown-preview" style={{ fontFamily: 'var(--font-text), monospace' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-border" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3 pb-1 border-b border-border/50" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 pl-4" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 pl-4" {...props} />,
                  li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                  a: ({ node, ...props }) => <a className="text-accent-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-accent-primary pl-4 py-1 mb-4 bg-bg-elevated/30 text-fg-secondary italic" {...props} />,
                  code: ({ node, inline, className, children, ...props }: any) => {
                    return inline ? (
                      <code className="px-1.5 py-0.5 rounded bg-bg-elevated text-sm font-mono text-accent-secondary" {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre className="block p-4 rounded-md bg-bg-elevated overflow-x-auto text-sm font-mono mb-4 text-fg-secondary border border-border">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                  table: ({ node, ...props }) => <div className="overflow-x-auto mb-4"><table className="w-full border-collapse text-sm" {...props} /></div>,
                  th: ({ node, ...props }) => <th className="border border-border px-4 py-2 bg-bg-elevated font-bold text-left" {...props} />,
                  td: ({ node, ...props }) => <td className="border border-border px-4 py-2" {...props} />
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <Editor
            height="100%"
            language={getLanguage(filePath)}
            theme="vs-dark"
            value={content}
            onChange={handleChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              readOnly: readOnly,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16 }
            }}
          />
        )}
      </div>
    </div>
  );
}
