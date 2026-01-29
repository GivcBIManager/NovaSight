/**
 * EmptyState Component
 * 
 * Reusable empty state display for when there's no data.
 * Supports multiple variants and optional actions.
 */

import { motion } from 'framer-motion';
import { 
  FileQuestion, 
  SearchX, 
  AlertCircle, 
  Inbox,
  Rocket,
  type LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

type EmptyStateVariant = 'default' | 'search' | 'error' | 'empty' | 'new';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
}

interface EmptyStateProps {
  /** Variant determines the default icon and styling */
  variant?: EmptyStateVariant;
  /** Custom icon to display */
  icon?: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: EmptyStateAction;
  /** Secondary action button */
  secondaryAction?: EmptyStateAction;
  /** Additional CSS classes */
  className?: string;
  /** Size of the empty state */
  size?: 'sm' | 'md' | 'lg';
  /** Enable entrance animation */
  animated?: boolean;
}

const variantIcons: Record<EmptyStateVariant, LucideIcon> = {
  default: FileQuestion,
  search: SearchX,
  error: AlertCircle,
  empty: Inbox,
  new: Rocket,
};

const variantColors: Record<EmptyStateVariant, string> = {
  default: 'text-muted-foreground',
  search: 'text-muted-foreground',
  error: 'text-error',
  empty: 'text-muted-foreground',
  new: 'text-accent-purple',
};

export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
  animated = true,
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];
  const iconColor = variantColors[variant];

  const sizeClasses = {
    sm: {
      container: 'py-6 px-4',
      icon: 'h-10 w-10',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12 px-6',
      icon: 'h-16 w-16',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16 px-8',
      icon: 'h-20 w-20',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const sizes = sizeClasses[size];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  const Wrapper = animated ? motion.div : 'div';
  const Item = animated ? motion.div : 'div';

  const wrapperProps = animated
    ? {
        variants: containerVariants,
        initial: 'hidden',
        animate: 'visible',
      }
    : {};

  const itemProps = animated ? { variants: itemVariants } : {};

  return (
    <Wrapper
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
      {...wrapperProps}
    >
      {/* Icon */}
      <Item {...itemProps}>
        <div
          className={cn(
            'mb-4 flex items-center justify-center rounded-full',
            'bg-muted/50 p-4',
            variant === 'new' && 'bg-accent-purple/10'
          )}
        >
          <Icon className={cn(sizes.icon, iconColor)} />
        </div>
      </Item>

      {/* Title */}
      <Item {...itemProps}>
        <h3
          className={cn(
            'font-semibold text-foreground',
            sizes.title
          )}
        >
          {title}
        </h3>
      </Item>

      {/* Description */}
      {description && (
        <Item {...itemProps}>
          <p
            className={cn(
              'mt-2 max-w-md text-muted-foreground',
              sizes.description
            )}
          >
            {description}
          </p>
        </Item>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <Item {...itemProps}>
          <div className="mt-6 flex items-center gap-3">
            {action && (
              <Button
                variant={action.variant || 'default'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant={secondaryAction.variant || 'outline'}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </Item>
      )}
    </Wrapper>
  );
}

// Pre-configured empty states for common scenarios
export function NoDataEmptyState(props: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      variant="empty"
      title="No data yet"
      description="Get started by adding your first item."
      {...props}
    />
  );
}

export function NoResultsEmptyState(props: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description="Try adjusting your search or filter to find what you're looking for."
      {...props}
    />
  );
}

export function ErrorEmptyState(props: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description="We couldn't load the data. Please try again later."
      {...props}
    />
  );
}

export function GettingStartedEmptyState(props: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      variant="new"
      title="Welcome!"
      description="Let's get you set up with your first project."
      {...props}
    />
  );
}

export default EmptyState;
