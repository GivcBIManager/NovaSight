/**
 * SQL Editor Component
 * Monaco-based SQL editor with syntax highlighting and autocomplete
 */

import { useRef, useCallback } from 'react'
import Editor, { OnMount, loader } from '@monaco-editor/react'
import { Play, Save, History, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Configure Monaco to load from CDN
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
  },
})

interface SQLEditorProps {
  value: string
  onChange: (value: string) => void
  onExecute?: () => void
  onSave?: () => void
  isExecuting?: boolean
  executionTime?: number
  rowCount?: number
  className?: string
  readOnly?: boolean
}

export function SQLEditor({
  value,
  onChange,
  onExecute,
  onSave,
  isExecuting = false,
  executionTime,
  rowCount,
  className,
  readOnly = false,
}: SQLEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor

      // Add keyboard shortcut for execute (Ctrl+Enter or Cmd+Enter)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onExecute?.()
      })

      // Add keyboard shortcut for save (Ctrl+S or Cmd+S)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave?.()
      })

      // Configure SQL language
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (
          model: { getWordUntilPosition: (pos: unknown) => { startColumn: number; endColumn: number } },
          position: { lineNumber: number }
        ) => {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }

          // SQL keywords suggestions
          const keywords = [
            'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
            'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
            'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
            'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE',
            'TABLE', 'INDEX', 'DROP', 'ALTER', 'ADD', 'COLUMN', 'PRIMARY', 'KEY',
            'FOREIGN', 'REFERENCES', 'UNIQUE', 'DEFAULT', 'CHECK', 'CONSTRAINT',
            'UNION', 'ALL', 'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'CAST',
          ]

          const suggestions = keywords.map((keyword) => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
          }))

          return { suggestions }
        },
      })

      // Focus editor
      editor.focus()
    },
    [onExecute, onSave]
  )

  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      onChange(newValue || '')
    },
    [onChange]
  )

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
        <Button
          size="sm"
          onClick={onExecute}
          disabled={isExecuting || !value.trim()}
          className="gap-1.5"
        >
          {isExecuting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run
          <kbd className="ml-1 text-xs opacity-60">Ctrl+Enter</kbd>
        </Button>

        {onSave && (
          <Button size="sm" variant="outline" onClick={onSave} className="gap-1.5">
            <Save className="h-4 w-4" />
            Save
          </Button>
        )}

        <Button size="sm" variant="ghost" className="gap-1.5">
          <History className="h-4 w-4" />
          History
        </Button>

        {/* Execution metadata */}
        {executionTime !== undefined && (
          <span className="ml-auto text-sm text-muted-foreground">
            {rowCount !== undefined && (
              <span className="mr-2">{rowCount.toLocaleString()} rows</span>
            )}
            <span>{executionTime}ms</span>
          </span>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="sql"
          theme="vs-dark"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            readOnly,
            renderWhitespace: 'selection',
            folding: true,
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 3,
            padding: { top: 8 },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            snippetSuggestions: 'inline',
          }}
        />
      </div>
    </div>
  )
}
