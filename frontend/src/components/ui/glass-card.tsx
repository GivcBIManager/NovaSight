/**
 * GlassCard Component
 * 
 * A glass morphism card component with multiple variants.
 * Extends the base Card component with blur effects and hover states.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

const glassCardVariants = cva(
  'rounded-xl border transition-all duration-base',
  {
    variants: {
      variant: {
        default: [
          'bg-[var(--glass-bg)]',
          'border-[var(--glass-border)]',
          'backdrop-blur-glass',
        ],
        elevated: [
          'bg-[var(--glass-bg)]',
          'border-[var(--glass-border)]',
          'backdrop-blur-glass',
          'shadow-lg',
          'hover:shadow-xl',
          'hover:-translate-y-1',
        ],
        interactive: [
          'bg-[var(--glass-bg)]',
          'border-[var(--glass-border)]',
          'backdrop-blur-glass',
          'cursor-pointer',
          'hover:bg-[var(--glass-bg-hover)]',
          'hover:border-[var(--glass-border-hover)]',
          'hover:scale-[1.02]',
          'hover:shadow-glow-sm',
          'active:scale-[0.98]',
        ],
        ai: [
          'bg-[var(--glass-bg)]',
          'border-transparent',
          'backdrop-blur-glass',
          'relative',
          'overflow-hidden',
        ],
        solid: [
          'bg-bg-secondary',
          'border-border',
        ],
      },
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface GlassCardProps
  extends Omit<HTMLMotionProps<'div'>, 'children'>,
    VariantProps<typeof glassCardVariants> {
  /** Card content */
  children: React.ReactNode;
  /** Enable hover animation */
  animated?: boolean;
  /** Show AI gradient border (only for ai variant) */
  glowOnHover?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant,
      size,
      children,
      animated = true,
      glowOnHover = false,
      ...props
    },
    ref
  ) => {
    const isAIVariant = variant === 'ai';

    const cardContent = (
      <>
        {/* AI Gradient Border */}
        {isAIVariant && (
          <div
            className={cn(
              'absolute inset-0 rounded-xl opacity-50',
              'bg-gradient-to-r from-accent-purple via-neon-pink to-accent-purple',
              'bg-[length:200%_100%]',
              animated && 'animate-gradient-flow',
              glowOnHover && 'group-hover:opacity-100 transition-opacity'
            )}
            style={{ padding: '1px' }}
          >
            <div className="h-full w-full rounded-xl bg-bg-secondary" />
          </div>
        )}

        {/* Content */}
        <div className={cn('relative z-10', isAIVariant && 'p-4')}>
          {children}
        </div>
      </>
    );

    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={cn(
            glassCardVariants({ variant, size: isAIVariant ? undefined : size }),
            glowOnHover && 'group',
            className
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          {...props}
        >
          {cardContent}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          glassCardVariants({ variant, size: isAIVariant ? undefined : size }),
          glowOnHover && 'group',
          className
        )}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {cardContent}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

// Sub-components for structured content
const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
));
GlassCardHeader.displayName = 'GlassCardHeader';

const GlassCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-foreground',
      className
    )}
    {...props}
  />
));
GlassCardTitle.displayName = 'GlassCardTitle';

const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
GlassCardDescription.displayName = 'GlassCardDescription';

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
GlassCardContent.displayName = 'GlassCardContent';

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
));
GlassCardFooter.displayName = 'GlassCardFooter';

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
  glassCardVariants,
};
