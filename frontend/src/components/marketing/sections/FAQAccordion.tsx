/**
 * FAQAccordion Component
 * 
 * Expandable FAQ section with smooth animations.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface FAQItem {
  /** Question */
  question: string;
  /** Answer */
  answer: string;
}

export interface FAQAccordionProps {
  /** FAQ items */
  items: FAQItem[];
  /** Allow multiple items to be expanded */
  allowMultiple?: boolean;
  /** Additional CSS classes */
  className?: string;
}

function FAQItemComponent({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'border-b border-border',
        isOpen && 'bg-muted/20'
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="pr-4 font-medium text-foreground">{item.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 text-muted-foreground leading-relaxed">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQAccordion({
  items,
  allowMultiple = false,
  className,
}: FAQAccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<number>>(new Set());

  const handleToggle = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-bg-secondary/50 overflow-hidden',
        className
      )}
    >
      {items.map((item, index) => (
        <FAQItemComponent
          key={index}
          item={item}
          isOpen={openItems.has(index)}
          onToggle={() => handleToggle(index)}
          index={index}
        />
      ))}
    </div>
  );
}

export default FAQAccordion;
