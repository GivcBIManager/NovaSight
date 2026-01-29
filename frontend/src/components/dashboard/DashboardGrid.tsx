/**
 * DashboardGrid Component
 * 
 * Responsive grid layout for dashboard widgets.
 * Uses CSS Grid with support for different breakpoints.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { staggerContainerVariants, fadeVariants } from '@/lib/motion-variants';

export interface GridItem {
  id: string;
  /** Column span (1-12) */
  colSpan?: number;
  /** Row span */
  rowSpan?: number;
  /** Column span at different breakpoints */
  responsive?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

interface DashboardGridProps {
  /** Grid items */
  items: GridItem[];
  /** Render function for each item */
  renderItem: (item: GridItem) => React.ReactNode;
  /** Number of columns (default: 12) */
  columns?: number;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Animate items on mount */
  animated?: boolean;
  /** Edit mode - shows grid guidelines */
  editMode?: boolean;
  /** Callback when item order changes (for drag and drop) */
  onOrderChange?: (newOrder: GridItem[]) => void;
  /** Additional CSS classes */
  className?: string;
}

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

function getColSpanClass(span: number | undefined) {
  if (!span) return 'col-span-12';
  
  const spanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12',
  };
  
  return spanClasses[span] || 'col-span-12';
}

function getResponsiveClasses(responsive?: GridItem['responsive']) {
  if (!responsive) return '';
  
  const classes: string[] = [];
  
  if (responsive.sm) classes.push(`sm:col-span-${responsive.sm}`);
  if (responsive.md) classes.push(`md:col-span-${responsive.md}`);
  if (responsive.lg) classes.push(`lg:col-span-${responsive.lg}`);
  if (responsive.xl) classes.push(`xl:col-span-${responsive.xl}`);
  
  return classes.join(' ');
}

function getRowSpanClass(span: number | undefined) {
  if (!span) return '';
  
  const spanClasses: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
    5: 'row-span-5',
    6: 'row-span-6',
  };
  
  return spanClasses[span] || '';
}

export function DashboardGrid({
  items,
  renderItem,
  columns = 12,
  gap = 'md',
  animated = true,
  editMode = false,
  onOrderChange,
  className,
}: DashboardGridProps) {
  // Generate grid template columns style based on column count
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  };

  const Container = animated ? motion.div : 'div';
  const containerProps = animated
    ? {
        variants: staggerContainerVariants,
        initial: 'hidden',
        animate: 'visible',
      }
    : {};

  return (
    <Container
      {...containerProps}
      className={cn(
        'grid',
        gapClasses[gap],
        editMode && 'relative',
        className
      )}
      style={gridStyle}
    >
      {/* Edit mode grid overlay */}
      {editMode && (
        <div
          className="pointer-events-none absolute inset-0 grid opacity-20"
          style={gridStyle}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="border-l border-dashed border-accent-purple first:border-l-0"
            />
          ))}
        </div>
      )}

      {/* Grid items */}
      <AnimatePresence>
        {items.map((item) => {
          const ItemWrapper = animated ? motion.div : 'div';
          const itemProps = animated
            ? {
                key: item.id,
                variants: fadeVariants,
                layout: true,
              }
            : { key: item.id };

          return (
            <ItemWrapper
              {...itemProps}
              className={cn(
                getColSpanClass(item.colSpan),
                getRowSpanClass(item.rowSpan),
                getResponsiveClasses(item.responsive),
                editMode && 'ring-1 ring-accent-purple/30 ring-offset-2 ring-offset-bg-primary'
              )}
            >
              {renderItem(item)}
            </ItemWrapper>
          );
        })}
      </AnimatePresence>
    </Container>
  );
}

// Preset grid layouts
export const presetLayouts = {
  /** 3 equal columns */
  threeColumn: [
    { id: '1', colSpan: 4, responsive: { sm: 12, md: 6, lg: 4 } },
    { id: '2', colSpan: 4, responsive: { sm: 12, md: 6, lg: 4 } },
    { id: '3', colSpan: 4, responsive: { sm: 12, md: 12, lg: 4 } },
  ],
  
  /** 4 equal columns */
  fourColumn: [
    { id: '1', colSpan: 3, responsive: { sm: 12, md: 6, lg: 3 } },
    { id: '2', colSpan: 3, responsive: { sm: 12, md: 6, lg: 3 } },
    { id: '3', colSpan: 3, responsive: { sm: 12, md: 6, lg: 3 } },
    { id: '4', colSpan: 3, responsive: { sm: 12, md: 6, lg: 3 } },
  ],
  
  /** Main content with sidebar */
  mainWithSidebar: [
    { id: 'main', colSpan: 8, responsive: { sm: 12, lg: 8 } },
    { id: 'sidebar', colSpan: 4, responsive: { sm: 12, lg: 4 } },
  ],
  
  /** Hero with 3 cards below */
  heroWithCards: [
    { id: 'hero', colSpan: 12 },
    { id: 'card1', colSpan: 4, responsive: { sm: 12, md: 4 } },
    { id: 'card2', colSpan: 4, responsive: { sm: 12, md: 4 } },
    { id: 'card3', colSpan: 4, responsive: { sm: 12, md: 4 } },
  ],
  
  /** Dashboard with metrics row */
  dashboardStandard: [
    { id: 'metric1', colSpan: 3, responsive: { sm: 6, md: 3 } },
    { id: 'metric2', colSpan: 3, responsive: { sm: 6, md: 3 } },
    { id: 'metric3', colSpan: 3, responsive: { sm: 6, md: 3 } },
    { id: 'metric4', colSpan: 3, responsive: { sm: 6, md: 3 } },
    { id: 'chart1', colSpan: 8, responsive: { sm: 12, lg: 8 } },
    { id: 'chart2', colSpan: 4, responsive: { sm: 12, lg: 4 } },
    { id: 'table', colSpan: 12 },
  ],
};

export default DashboardGrid;
