/**
 * TextReveal Component
 * 
 * Text that reveals word-by-word on scroll using whileInView with stagger.
 * Supports gradient text styling.
 */

import * as React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TextRevealProps {
  /** Text content to reveal */
  text: string;
  /** Element type to render */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  /** Apply gradient to text */
  gradient?: boolean;
  /** Custom gradient class */
  gradientClass?: string;
  /** Delay before animation starts */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Trigger animation once */
  once?: boolean;
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const wordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function TextReveal({
  text,
  as: Component = 'p',
  gradient = false,
  gradientClass = 'bg-gradient-primary bg-clip-text text-transparent',
  delay = 0,
  className,
  once = true,
}: TextRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const words = text.split(' ');

  const variants = prefersReducedMotion ? reducedMotionVariants : wordVariants;

  return (
    <motion.div
      className={cn('flex flex-wrap', className)}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-50px' }}
      transition={{ delay }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className={cn(
            'mr-[0.25em] inline-block',
            gradient && gradientClass
          )}
          variants={variants}
        >
          <Component className="inline">{word}</Component>
        </motion.span>
      ))}
    </motion.div>
  );
}

export default TextReveal;
