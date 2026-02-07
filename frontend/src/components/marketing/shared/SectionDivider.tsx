/**
 * SectionDivider Component
 * 
 * Decorative dividers for separating content sections.
 * Multiple style variants available.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SectionDividerProps {
  /** Divider style variant */
  variant?: 'line' | 'gradient' | 'dots' | 'wave';
  /** Additional CSS classes */
  className?: string;
}

function LineDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn('mx-auto h-px w-full max-w-md bg-border', className)}
      aria-hidden="true"
    />
  );
}

function GradientDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'mx-auto h-px w-full max-w-2xl',
        'bg-gradient-to-r from-transparent via-accent-purple to-transparent',
        className
      )}
      aria-hidden="true"
    />
  );
}

function DotsDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center justify-center gap-2', className)}
      aria-hidden="true"
    >
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent-purple"
        />
      ))}
    </div>
  );
}

function WaveDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn('w-full overflow-hidden', className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-full text-border"
        preserveAspectRatio="none"
      >
        <path
          d="M0 30C240 60 480 0 720 30C960 60 1200 0 1440 30"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
}

export function SectionDivider({
  variant = 'gradient',
  className,
}: SectionDividerProps) {
  const Divider = {
    line: LineDivider,
    gradient: GradientDivider,
    dots: DotsDivider,
    wave: WaveDivider,
  }[variant];

  return (
    <div className={cn('py-12', className)}>
      <Divider />
    </div>
  );
}

export default SectionDivider;
