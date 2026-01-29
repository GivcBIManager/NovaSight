/**
 * QueryAssistant Component
 * 
 * Natural language to SQL query assistant.
 * Features NL input, SQL preview, and execution controls.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Play,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
  History,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { AIThinkingIndicator } from './AIThinkingIndicator';

interface QuerySuggestion {
  id: string;
  text: string;
  category?: string;
}

interface QueryHistoryItem {
  id: string;
  naturalLanguage: string;
  sql: string;
  timestamp: Date;
}

interface QueryAssistantProps {
  /** Callback when query is generated */
  onQueryGenerated?: (sql: string, naturalLanguage: string) => void;
  /** Callback to execute the query */
  onExecuteQuery?: (sql: string) => void;
  /** Whether AI is currently generating */
  isGenerating?: boolean;
  /** Generated SQL query */
  generatedSQL?: string;
  /** Error message if generation failed */
  error?: string;
  /** AI generation steps for progress */
  generationSteps?: string[];
  /** Current generation step */
  currentStep?: number;
  /** Query suggestions */
  suggestions?: QuerySuggestion[];
  /** Query history */
  history?: QueryHistoryItem[];
  /** Cancel generation callback */
  onCancelGeneration?: () => void;
  /** Additional CSS classes */
  className?: string;
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      className={className}
    >
      {copied ? (
        <Check className="h-4 w-4 text-neon-green" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

function SQLPreview({ sql }: { sql: string }) {
  const [expanded, setExpanded] = React.useState(true);

  // Simple SQL syntax highlighting
  const highlightSQL = (code: string) => {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
      'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
      'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX',
      'AS', 'IN', 'NOT', 'NULL', 'IS', 'LIKE', 'BETWEEN', 'HAVING', 'DISTINCT',
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    ];

    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
    
    return code
      .replace(keywordRegex, '<span class="text-accent-purple font-medium">$1</span>')
      .replace(/'[^']*'/g, '<span class="text-neon-green">$&</span>')
      .replace(/\b\d+\b/g, '<span class="text-neon-cyan">$&</span>')
      .replace(/--.*$/gm, '<span class="text-muted-foreground">$&</span>');
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="rounded-xl border border-border bg-bg-primary overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Generated SQL</span>
          <span className="rounded bg-neon-green/20 px-1.5 py-0.5 text-[10px] text-neon-green">
            Ready
          </span>
        </div>
        <div className="flex items-center gap-1">
          <CopyButton text={sql} />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.pre
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-x-auto p-4"
          >
            <code
              className="text-sm font-mono"
              dangerouslySetInnerHTML={{ __html: highlightSQL(sql) }}
            />
          </motion.pre>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SuggestionChips({
  suggestions,
  onSelect,
}: {
  suggestions: QuerySuggestion[];
  onSelect: (text: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(suggestion.text)}
          className={cn(
            'group flex items-center gap-2 rounded-full border border-border',
            'bg-bg-tertiary px-3 py-1.5 text-sm',
            'hover:border-accent-purple/50 hover:bg-bg-secondary',
            'transition-colors'
          )}
        >
          <Lightbulb className="h-3 w-3 text-accent-purple" />
          <span className="text-muted-foreground group-hover:text-foreground">
            {suggestion.text}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

function HistoryDropdown({
  history,
  onSelect,
  onClose,
}: {
  history: QueryHistoryItem[];
  onSelect: (item: QueryHistoryItem) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-bg-secondary shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">Recent Queries</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="divide-y divide-border">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item);
              onClose();
            }}
            className="w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors"
          >
            <p className="text-sm text-foreground truncate">{item.naturalLanguage}</p>
            <p className="mt-1 text-xs text-muted-foreground font-mono truncate">
              {item.sql}
            </p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function QueryAssistant({
  onQueryGenerated,
  onExecuteQuery,
  isGenerating = false,
  generatedSQL,
  error,
  generationSteps = [
    'Analyzing your question',
    'Identifying relevant tables',
    'Building SQL query',
    'Validating syntax',
  ],
  currentStep = 0,
  suggestions = [],
  history = [],
  onCancelGeneration,
  className,
}: QueryAssistantProps) {
  const [input, setInput] = React.useState('');
  const [showHistory, setShowHistory] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isGenerating) return;
    
    // Simulate query generation (in real app, this would call the AI service)
    onQueryGenerated?.(input, input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionSelect = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleHistorySelect = (item: QueryHistoryItem) => {
    setInput(item.naturalLanguage);
  };

  return (
    <GlassCard variant="ai" className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple/20">
          <Sparkles className="h-5 w-5 text-accent-purple" />
        </div>
        <div>
          <h3 className="font-medium">Query Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Describe what data you want to see
          </p>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="relative mb-6">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Show me total sales by region for the last quarter"
            rows={3}
            className={cn(
              'w-full resize-none rounded-xl border border-border bg-bg-tertiary',
              'px-4 py-3 text-sm',
              'placeholder:text-muted-foreground',
              'focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple',
              'disabled:opacity-50'
            )}
            disabled={isGenerating}
          />

          {/* Action buttons */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {history.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="submit"
              variant="gradient"
              size="sm"
              disabled={!input.trim() || isGenerating}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate
            </Button>
          </div>
        </div>

        {/* History dropdown */}
        <AnimatePresence>
          {showHistory && history.length > 0 && (
            <HistoryDropdown
              history={history}
              onSelect={handleHistorySelect}
              onClose={() => setShowHistory(false)}
            />
          )}
        </AnimatePresence>
      </form>

      {/* Suggestions */}
      {suggestions.length > 0 && !isGenerating && !generatedSQL && (
        <div className="mb-6">
          <p className="mb-3 text-sm text-muted-foreground">Try asking:</p>
          <SuggestionChips
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
          />
        </div>
      )}

      {/* Generating indicator */}
      <AnimatePresence>
        {isGenerating && (
          <AIThinkingIndicator
            isThinking
            message="Generating your query"
            steps={generationSteps}
            currentStep={currentStep}
            showCancel={!!onCancelGeneration}
            onCancel={onCancelGeneration}
            className="mb-6"
          />
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
          >
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-400">Generation Failed</p>
              <p className="mt-1 text-sm text-red-400/80">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated SQL */}
      <AnimatePresence>
        {generatedSQL && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <SQLPreview sql={generatedSQL} />

            {/* Action buttons */}
            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="gradient"
                onClick={() => onExecuteQuery?.(generatedSQL)}
              >
                <Play className="mr-2 h-4 w-4" />
                Execute Query
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Reset state for new query
                  setInput('');
                }}
              >
                New Query
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

export default QueryAssistant;
