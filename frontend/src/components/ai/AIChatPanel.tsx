/**
 * AIChatPanel Component
 * 
 * Chat interface for AI interactions with message history,
 * typing indicators, and code block support.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Copy, Check, Bot, User, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AIChatPanelProps {
  /** Chat messages */
  messages: ChatMessage[];
  /** Callback when user sends a message */
  onSendMessage: (message: string) => void;
  /** Whether AI is currently responding */
  isLoading?: boolean;
  /** Placeholder text for input */
  placeholder?: string;
  /** Suggested prompts to show when empty */
  suggestedPrompts?: string[];
  /** Callback when a suggested prompt is clicked */
  onSuggestedPromptClick?: (prompt: string) => void;
  /** Callback to regenerate last response */
  onRegenerate?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Maximum height of the panel */
  maxHeight?: string | number;
}

function CopyButton({ text }: { text: string }) {
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
      className="opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {copied ? (
        <Check className="h-3 w-3 text-neon-green" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="group relative my-3 rounded-lg bg-bg-primary border border-border">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">
          {language || 'code'}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-foreground">{code}</code>
      </pre>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-accent-purple"
          animate={{
            y: [0, -6, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple parser for code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          if (match) {
            const [, language, code] = match;
            return <CodeBlock key={index} code={code.trim()} language={language} />;
          }
        }
        // Regular text - split by newlines for paragraphs
        return part.split('\n').map((line, lineIndex) => (
          <p key={`${index}-${lineIndex}`} className="mb-2 last:mb-0">
            {line || '\u00A0'}
          </p>
        ));
      })}
    </div>
  );
}

function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-accent-indigo text-white'
            : 'bg-accent-purple/20 text-accent-purple'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'group relative max-w-[80%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-accent-indigo text-white rounded-tr-sm'
            : 'bg-bg-tertiary border border-border rounded-tl-sm'
        )}
      >
        <MessageContent content={message.content} />

        {/* Timestamp */}
        <span className="mt-1 block text-[10px] opacity-50">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>

        {/* Streaming indicator */}
        {message.isStreaming && (
          <motion.span
            className="inline-block w-1 h-4 bg-accent-purple ml-1"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}

function SuggestedPrompts({
  prompts,
  onSelect,
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(prompt)}
          className={cn(
            'rounded-full border border-border bg-bg-tertiary px-4 py-2',
            'text-sm text-muted-foreground',
            'hover:border-accent-purple/50 hover:text-foreground',
            'transition-colors'
          )}
        >
          {prompt}
        </motion.button>
      ))}
    </div>
  );
}

export function AIChatPanel({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = 'Ask anything about your data...',
  suggestedPrompts = [],
  onSuggestedPromptClick,
  onRegenerate,
  className,
  maxHeight = '600px',
}: AIChatPanelProps) {
  const [input, setInput] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestedClick = (prompt: string) => {
    if (onSuggestedPromptClick) {
      onSuggestedPromptClick(prompt);
    } else {
      setInput(prompt);
      inputRef.current?.focus();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <GlassCard
      variant="solid"
      className={cn('flex flex-col overflow-hidden p-0', className)}
      style={{ maxHeight }}
      animated={false}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-purple/20">
          <Sparkles className="h-4 w-4 text-accent-purple" />
        </div>
        <div>
          <h3 className="font-medium">AI Assistant</h3>
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Thinking...' : 'Ready to help'}
          </p>
        </div>
        {onRegenerate && messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRegenerate}
            disabled={isLoading}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-purple/20">
              <Bot className="h-8 w-8 text-accent-purple" />
            </div>
            <h4 className="text-lg font-medium">How can I help you today?</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask me anything about your data, queries, or dashboards.
            </p>
            {suggestedPrompts.length > 0 && (
              <div className="mt-6">
                <SuggestedPrompts
                  prompts={suggestedPrompts}
                  onSelect={handleSuggestedClick}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <ChatMessageItem key={message.id} message={message} />
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-accent-purple">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-bg-tertiary border border-border px-4 py-2">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className={cn(
                'w-full resize-none rounded-xl border border-border bg-bg-tertiary',
                'px-4 py-3 pr-12 text-sm',
                'placeholder:text-muted-foreground',
                'focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple',
                'disabled:opacity-50'
              )}
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            variant="gradient"
            size="icon"
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to send, Shift + Enter for new line
        </p>
      </form>
    </GlassCard>
  );
}

export default AIChatPanel;
