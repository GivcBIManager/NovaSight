/**
 * TechStackVisual Component
 * 
 * Layered architecture diagram showing the technology stack.
 * Layers animate in from bottom on scroll.
 */

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/marketing/shared';

export interface TechStackVisualProps {
  /** Additional CSS classes */
  className?: string;
}

const layers = [
  {
    name: 'AI',
    items: ['Ollama', 'LLM Models'],
    color: 'purple',
    description: 'AI-powered query generation and insights',
  },
  {
    name: 'PRESENTATION',
    items: ['React', 'TypeScript', 'Tailwind'],
    color: 'cyan',
    description: 'Modern, responsive user interface',
  },
  {
    name: 'API',
    items: ['Flask', 'REST', 'Auth'],
    color: 'indigo',
    description: 'Secure, scalable API layer',
  },
  {
    name: 'COMPUTE',
    items: ['PySpark', 'dbt'],
    color: 'green',
    description: 'Distributed data processing',
  },
  {
    name: 'ORCHESTRATION',
    items: ['Apache Airflow'],
    color: 'pink',
    description: 'Workflow automation and scheduling',
  },
  {
    name: 'STORAGE',
    items: ['ClickHouse', 'PostgreSQL', 'Redis'],
    color: 'cyan',
    description: 'High-performance data storage',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  purple: {
    bg: 'bg-accent-purple/10',
    border: 'border-accent-purple/30',
    text: 'text-accent-purple',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--color-accent-purple)/0.2)]',
  },
  cyan: {
    bg: 'bg-neon-cyan/10',
    border: 'border-neon-cyan/30',
    text: 'text-neon-cyan',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--color-neon-cyan)/0.2)]',
  },
  indigo: {
    bg: 'bg-accent-indigo/10',
    border: 'border-accent-indigo/30',
    text: 'text-accent-indigo',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--color-accent-indigo)/0.2)]',
  },
  green: {
    bg: 'bg-neon-green/10',
    border: 'border-neon-green/30',
    text: 'text-neon-green',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--color-neon-green)/0.2)]',
  },
  pink: {
    bg: 'bg-neon-pink/10',
    border: 'border-neon-pink/30',
    text: 'text-neon-pink',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--color-neon-pink)/0.2)]',
  },
};

// Animated connection line between layers
function ConnectionLine({ index }: { index: number }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative mx-auto h-8 w-px bg-border/50">
      {!prefersReducedMotion && (
        <motion.div
          className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-accent-purple"
          animate={{
            top: ['-4px', 'calc(100% + 4px)'],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.3,
            ease: 'linear',
          }}
        />
      )}
    </div>
  );
}

function LayerCard({
  layer,
  index,
}: {
  layer: typeof layers[0];
  index: number;
}) {
  const colors = colorMap[layer.color];
  const reversedIndex = layers.length - 1 - index;

  return (
    <>
      <motion.div
        className={cn(
          'group relative rounded-lg border backdrop-blur-sm transition-all duration-base',
          colors.bg,
          colors.border,
          colors.glow,
          'hover:-translate-y-1'
        )}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, delay: reversedIndex * 0.1 }}
      >
        <div className="flex flex-col items-center p-4 md:flex-row md:justify-between md:p-6">
          {/* Layer name */}
          <div className="mb-2 text-center md:mb-0 md:text-left">
            <p className={cn('text-xs font-semibold uppercase tracking-wider', colors.text)}>
              {layer.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {layer.description}
            </p>
          </div>

          {/* Technology badges */}
          <div className="flex flex-wrap justify-center gap-2 md:justify-end">
            {layer.items.map((item) => (
              <span
                key={item}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm font-medium',
                  colors.border,
                  colors.text
                )}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Connection line (except after last layer) */}
      {index < layers.length - 1 && <ConnectionLine index={index} />}
    </>
  );
}

export function TechStackVisual({ className }: TechStackVisualProps) {
  return (
    <section className={cn('py-20 md:py-28 lg:py-32', className)}>
      <div className="container mx-auto px-4">
        <SectionHeader
          badge="Technology"
          title="Modern Stack for Modern Data"
          titleHighlight="Modern Data"
          subtitle="Built on battle-tested open-source technologies for reliability, performance, and extensibility."
          align="center"
          className="mb-16"
        />

        {/* Architecture diagram */}
        <div className="mx-auto max-w-3xl space-y-0">
          {layers.map((layer, index) => (
            <LayerCard key={layer.name} layer={layer} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TechStackVisual;
