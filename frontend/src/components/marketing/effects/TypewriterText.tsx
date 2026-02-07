/**
 * TypewriterText Component
 * 
 * Types out text character by character with blinking cursor.
 * Cycles through an array of texts.
 */

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TypewriterTextProps {
  /** Array of texts to cycle through */
  texts: string[];
  /** Typing speed in ms per character */
  typingSpeed?: number;
  /** Deletion speed in ms per character */
  deletingSpeed?: number;
  /** Pause duration after typing complete */
  pauseDuration?: number;
  /** Show blinking cursor */
  showCursor?: boolean;
  /** Cursor character */
  cursorChar?: string;
  /** Additional CSS classes */
  className?: string;
  /** Loop forever */
  loop?: boolean;
}

export function TypewriterText({
  texts,
  typingSpeed = 80,
  deletingSpeed = 50,
  pauseDuration = 2000,
  showCursor = true,
  cursorChar = '|',
  className,
  loop = true,
}: TypewriterTextProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayText, setDisplayText] = React.useState('');
  const [textIndex, setTextIndex] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    // If reduced motion, just show full text without animation
    if (prefersReducedMotion) {
      setDisplayText(texts[textIndex]);
      return;
    }

    const currentText = texts[textIndex];

    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(pauseTimer);
    }

    if (!isDeleting) {
      // Typing
      if (displayText.length < currentText.length) {
        const timer = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        }, typingSpeed);
        return () => clearTimeout(timer);
      } else {
        // Finished typing
        setIsPaused(true);
      }
    } else {
      // Deleting
      if (displayText.length > 0) {
        const timer = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, deletingSpeed);
        return () => clearTimeout(timer);
      } else {
        // Finished deleting
        setIsDeleting(false);
        if (loop || textIndex < texts.length - 1) {
          setTextIndex((prev: number) => (prev + 1) % texts.length);
        }
      }
    }
  }, [
    displayText,
    isDeleting,
    isPaused,
    textIndex,
    texts,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    loop,
    prefersReducedMotion,
  ]);

  return (
    <span className={cn('inline-flex', className)}>
      <span>{displayText}</span>
      {showCursor && (
        <motion.span
          className="ml-0.5 inline-block"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'steps(2)' }}
          aria-hidden="true"
        >
          {cursorChar}
        </motion.span>
      )}
    </span>
  );
}

export default TypewriterText;
