/**
 * AIThinkingIndicator Component
 * 
 * Animated indicator showing AI is processing.
 * Features spinning animation, progress steps, and time elapsed.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AIThinkingIndicatorProps {
  /** Whether the AI is currently thinking */
  isThinking: boolean;
  /** Optional steps to show progress */
  steps?: string[];
  /** Current step index (0-based) */
  currentStep?: number;
  /** Message to display */
  message?: string;
  /** Show cancel button */
  showCancel?: boolean;
  /** Cancel callback */
  onCancel?: () => void;
  /** Variant style */
  variant?: 'default' | 'compact' | 'inline';
  /** Additional CSS classes */
  className?: string;
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent-purple"
          animate={{
            y: [0, -4, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
}

function SpinningRing({ size = 24 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
    >
      <defs>
        <linearGradient id="ai-spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--color-accent-purple))" />
          <stop offset="50%" stopColor="hsl(var(--color-neon-pink))" />
          <stop offset="100%" stopColor="hsl(var(--color-neon-cyan))" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="url(#ai-spinner-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="40 20"
      />
    </motion.svg>
  );
}

function ElapsedTime() {
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <span className="text-xs text-muted-foreground">{formatTime(seconds)}</span>
  );
}

export function AIThinkingIndicator({
  isThinking,
  steps,
  currentStep = 0,
  message = 'AI is analyzing',
  showCancel = true,
  onCancel,
  variant = 'default',
  className,
}: AIThinkingIndicatorProps) {
  if (variant === 'inline') {
    return (
      <AnimatePresence>
        {isThinking && (
          <motion.span
            className={cn('inline-flex items-center gap-2', className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SpinningRing size={16} />
            <span className="text-sm text-muted-foreground">{message}</span>
            <ThinkingDots />
          </motion.span>
        )}
      </AnimatePresence>
    );
  }

  if (variant === 'compact') {
    return (
      <AnimatePresence>
        {isThinking && (
          <motion.div
            className={cn(
              'flex items-center gap-3 rounded-lg bg-bg-tertiary px-4 py-3',
              className
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <SpinningRing size={20} />
            <span className="text-sm">{message}</span>
            <ThinkingDots />
            {showCancel && onCancel && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onCancel}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Default variant - full card
  return (
    <AnimatePresence>
      {isThinking && (
        <motion.div
          className={cn(
            'rounded-xl border border-accent-purple/30 bg-bg-secondary p-6',
            'shadow-glow-sm',
            className
          )}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple/20"
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(139, 92, 246, 0.4)',
                      '0 0 0 10px rgba(139, 92, 246, 0)',
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Brain className="h-6 w-6 text-accent-purple" />
                </motion.div>
                <motion.div
                  className="absolute -right-1 -top-1"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-4 w-4 text-neon-pink" />
                </motion.div>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground">{message}</h4>
                <div className="mt-1 flex items-center gap-2">
                  <ThinkingDots />
                  <ElapsedTime />
                </div>
              </div>
            </div>

            {showCancel && onCancel && (
              <Button variant="ghost" size="icon-sm" onClick={onCancel}>
                <X className="h-4 w-4" />
                <span className="sr-only">Cancel</span>
              </Button>
            )}
          </div>

          {/* Progress Steps */}
          {steps && steps.length > 0 && (
            <div className="mt-6 space-y-3">
              {steps.map((step, index) => {
                const isComplete = index < currentStep;
                const isCurrent = index === currentStep;
                const isPending = index > currentStep;

                return (
                  <motion.div
                    key={index}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* Step indicator */}
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                        isComplete && 'bg-neon-green text-white',
                        isCurrent && 'bg-accent-purple text-white',
                        isPending && 'bg-bg-tertiary text-muted-foreground'
                      )}
                    >
                      {isComplete ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          ✓
                        </motion.span>
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Step text */}
                    <span
                      className={cn(
                        'text-sm',
                        isComplete && 'text-muted-foreground line-through',
                        isCurrent && 'text-foreground',
                        isPending && 'text-muted-foreground'
                      )}
                    >
                      {step}
                    </span>

                    {/* Current step spinner */}
                    {isCurrent && <SpinningRing size={14} />}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AIThinkingIndicator;
