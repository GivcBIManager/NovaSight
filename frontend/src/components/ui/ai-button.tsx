/**
 * AIButton Component
 * 
 * A specialized button for AI-powered actions with animated effects.
 * Features rotating gradient border, sparkle animation, and glow effects.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const aiButtonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-9 px-3 text-sm',
        default: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 px-8 text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export interface AIButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof aiButtonVariants> {
  /** Button text */
  children: React.ReactNode;
  /** Show loading state */
  loading?: boolean;
  /** Show success state */
  success?: boolean;
  /** Show AI badge */
  showBadge?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Pulse animation intensity */
  pulseIntensity?: 'low' | 'medium' | 'high';
}

export const AIButton = React.forwardRef<HTMLButtonElement, AIButtonProps>(
  (
    {
      className,
      size,
      children,
      loading = false,
      success = false,
      showBadge = true,
      icon,
      pulseIntensity = 'medium',
      disabled,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const pulseOpacity = {
      low: 0.3,
      medium: 0.5,
      high: 0.7,
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          aiButtonVariants({ size }),
          'group overflow-hidden',
          className
        )}
        disabled={disabled || loading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {/* Animated gradient border */}
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--color-accent-purple)), hsl(var(--color-neon-pink)), hsl(var(--color-neon-cyan)), hsl(var(--color-accent-purple)))',
            backgroundSize: '300% 100%',
            padding: '2px',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <div className="h-full w-full rounded-[6px] bg-bg-secondary" />
        </motion.div>

        {/* Glow effect on hover */}
        <AnimatePresence>
          {isHovered && !disabled && (
            <motion.div
              className="absolute inset-0 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: pulseOpacity[pulseIntensity] }}
              exit={{ opacity: 0 }}
              style={{
                boxShadow: '0 0 30px hsl(var(--color-accent-purple) / 0.5), 0 0 60px hsl(var(--color-neon-pink) / 0.3)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {/* Icon / Loading / Success state */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.2 },
                  rotate: { duration: 1, repeat: Infinity, ease: 'linear' },
                }}
              >
                <Loader2 className="h-4 w-4" />
              </motion.span>
            ) : success ? (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Check className="h-4 w-4 text-neon-green" />
              </motion.span>
            ) : icon ? (
              <motion.span
                key="icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {icon}
              </motion.span>
            ) : (
              <motion.span
                key="sparkles"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <Sparkles className="h-4 w-4" />
                {/* Sparkle animation overlay */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Sparkles className="h-4 w-4 text-neon-cyan" />
                </motion.div>
              </motion.span>
            )}
          </AnimatePresence>

          {/* Text */}
          <span className="text-gradient-neon">{children}</span>

          {/* AI Badge */}
          {showBadge && (
            <span className="ml-1 rounded-full bg-accent-purple/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-purple">
              AI
            </span>
          )}
        </span>
      </motion.button>
    );
  }
);

AIButton.displayName = 'AIButton';

export default AIButton;
