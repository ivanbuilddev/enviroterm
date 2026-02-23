import Editor, { OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";

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
            <button
                onClick={handleSave}
                disabled={!isDirty}
                className={`text-xs px-3 py-1 rounded transition-colors ${
                    isDirty 
                        ? 'bg-accent-primary text-white hover:bg-accent-primary/90' 
                        : 'text-fg-muted bg-bg-hover opacity-50 cursor-not-allowed'
                }`}
            >
                Save
            </button>
        </div>
      <div className="flex-1 overflow-hidden">
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
      </div>
    </div>
  );
}
