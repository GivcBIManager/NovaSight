/**
 * FeatureTabView Component
 * 
 * Reusable tabbed interface for feature deep dives.
 * Supports icons, descriptions, and visual content per tab.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface FeatureTab {
  /** Unique tab identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Tab icon */
  icon: React.ReactNode;
  /** Tab content title */
  title: string;
  /** Tab content description */
  description: string;
  /** Optional list of features/points */
  features?: string[];
  /** Optional visual element */
  visual?: React.ReactNode;
}

export interface FeatureTabViewProps {
  /** Array of tabs */
  tabs: FeatureTab[];
  /** Default active tab */
  defaultTab?: string;
  /** Variant style */
  variant?: 'pills' | 'underline';
  /** Additional CSS classes */
  className?: string;
}

export function FeatureTabView({
  tabs,
  defaultTab,
  variant = 'pills',
  className,
}: FeatureTabViewProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);
  const activeContent = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className={cn('w-full', className)}>
      {/* Tab buttons */}
      <div
        className={cn(
          'mb-8 flex flex-wrap gap-2',
          variant === 'underline' && 'border-b border-border gap-0'
        )}
        role="tablist"
        aria-label="Feature tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200',
              variant === 'pills' && [
                'rounded-lg',
                activeTab === tab.id
                  ? 'bg-accent-purple text-white shadow-glow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              ],
              variant === 'underline' && [
                'border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-accent-purple text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
              ]
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeContent && (
          <motion.div
            key={activeContent.id}
            id={`panel-${activeContent.id}`}
            role="tabpanel"
            aria-labelledby={activeContent.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid gap-8 lg:grid-cols-2"
          >
            {/* Text content */}
            <div className="space-y-4">
              <h4 className="text-2xl font-bold text-foreground">
                {activeContent.title}
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                {activeContent.description}
              </p>
              {activeContent.features && activeContent.features.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {activeContent.features.map((feature, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-purple/10 text-accent-purple">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                      <span>{feature}</span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>

            {/* Visual content */}
            {activeContent.visual && (
              <div className="flex items-center justify-center rounded-xl border border-border bg-bg-secondary/50 p-6">
                {activeContent.visual}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FeatureTabView;
