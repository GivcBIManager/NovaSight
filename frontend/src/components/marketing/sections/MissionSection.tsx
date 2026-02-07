/**
 * MissionSection Component
 * 
 * Large mission statement with TextReveal effect.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TextReveal } from '@/components/marketing/effects';
import { Quote } from 'lucide-react';

export interface MissionSectionProps {
  /** Mission statement text */
  statement: string;
  /** Optional attribution */
  attribution?: string;
  /** Additional CSS classes */
  className?: string;
}

export function MissionSection({
  statement,
  attribution,
  className,
}: MissionSectionProps) {
  return (
    <section className={cn('relative py-20 md:py-28', className)}>
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent-purple/5 via-transparent to-transparent" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          {/* Quote icon */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mb-8 flex justify-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-purple/10">
              <Quote className="h-8 w-8 text-accent-purple" />
            </div>
          </motion.div>

          {/* Statement */}
          <blockquote className="mb-6">
            <TextReveal
              text={statement}
              as="p"
              className="justify-center text-2xl font-medium leading-relaxed text-foreground md:text-3xl lg:text-4xl"
              gradient={false}
            />
          </blockquote>

          {/* Attribution */}
          {attribution && (
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="text-muted-foreground"
            >
              — {attribution}
            </motion.p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export default MissionSection;
