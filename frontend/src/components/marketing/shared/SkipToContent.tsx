/**
 * SkipToContent Component
 * 
 * Accessibility component that provides a skip link to main content.
 * Visible only on keyboard focus for screen reader and keyboard users.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkipToContentProps {
  /** ID of the main content element to skip to */
  targetId?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SkipToContent({
  targetId = 'main-content',
  className,
}: SkipToContentProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        // Base styles
        'fixed left-4 top-4 z-[100] rounded-lg bg-accent-purple px-4 py-2 text-sm font-medium text-white shadow-lg',
        // Hidden by default, shown on focus
        'transform -translate-y-full opacity-0 transition-all duration-200',
        'focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent-purple focus:ring-offset-2 focus:ring-offset-bg-primary',
        // High contrast focus for accessibility
        'focus-visible:translate-y-0 focus-visible:opacity-100',
        className
      )}
    >
      Skip to main content
    </a>
  );
}

export default SkipToContent;
