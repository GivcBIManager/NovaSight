/**
 * FeatureShowcase Component
 * 
 * Alternating left-right feature rows with interactive visuals.
 * Each feature includes an icon, description, bullet points, and mockup.
 */

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Database, GitBranch, Bot, BarChart3, ArrowRight, Check } from 'lucide-react';
import { IconBadge, SectionHeader } from '@/components/marketing/shared';

export interface FeatureShowcaseProps {
  /** Additional CSS classes */
  className?: string;
}

const features = [
  {
    id: 'connections',
    title: 'Data Connections',
    subtitle: 'Connect to Any Data Source',
    description:
      'Seamlessly integrate with 20+ data sources including databases, cloud warehouses, APIs, and file systems. Real-time sync keeps your data fresh.',
    bullets: [
      'PostgreSQL, MySQL, MongoDB, ClickHouse',
      'Snowflake, BigQuery, Redshift, Databricks',
      'REST APIs, GraphQL, S3, Google Sheets',
    ],
    icon: Database,
    color: 'indigo' as const,
    cta: { text: 'View Connectors', href: '/features/connectors' },
    visual: 'connections',
  },
  {
    id: 'pipelines',
    title: 'Pipeline Orchestration',
    subtitle: 'Automate Your Data Workflows',
    description:
      'Build, schedule, and monitor complex data pipelines with Apache Airflow integration. Visual DAG builder makes orchestration intuitive.',
    bullets: [
      'Drag-and-drop DAG designer',
      'Built-in dbt integration for transformations',
      'Real-time monitoring and alerting',
    ],
    icon: GitBranch,
    color: 'green' as const,
    cta: { text: 'Explore Pipelines', href: '/features/pipelines' },
    visual: 'pipelines',
  },
  {
    id: 'ai',
    title: 'AI-Powered Analytics',
    subtitle: 'Ask Questions in Plain English',
    description:
      'Our AI assistant understands your data and generates SQL queries, insights, and visualizations from natural language prompts.',
    bullets: [
      'Natural language to SQL generation',
      'Automatic insight discovery',
      'Smart visualization recommendations',
    ],
    icon: Bot,
    color: 'purple' as const,
    cta: { text: 'Try AI Assistant', href: '/features/ai' },
    visual: 'ai',
  },
  {
    id: 'dashboards',
    title: 'Interactive Dashboards',
    subtitle: 'Build Stunning Visualizations',
    description:
      'Create pixel-perfect dashboards with our drag-and-drop builder. Choose from 50+ chart types and share insights across your organization.',
    bullets: [
      'Rich library of visualization components',
      'Real-time collaboration and sharing',
      'Embedded analytics and white-labeling',
    ],
    icon: BarChart3,
    color: 'cyan' as const,
    cta: { text: 'See Dashboard Gallery', href: '/features/dashboards' },
    visual: 'dashboards',
  },
];

// Connection diagram visual
function ConnectionsVisual() {
  return (
    <div className="relative h-64 w-full">
      {/* Central hub */}
      <motion.div
        className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-accent-indigo/20 border border-accent-indigo/40"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Database className="h-8 w-8 text-accent-indigo" />
      </motion.div>

      {/* Orbiting database icons */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <motion.div
          key={angle}
          className="absolute left-1/2 top-1/2"
          initial={{ rotate: angle }}
          animate={{ rotate: angle + 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
          style={{ transformOrigin: '0 0' }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--glass-bg)] border border-border backdrop-blur-sm"
            style={{ transform: 'translate(80px, -20px)' }}
          >
            <div className={cn(
              'h-3 w-3 rounded-full',
              i % 3 === 0 ? 'bg-neon-cyan' : i % 3 === 1 ? 'bg-accent-purple' : 'bg-neon-green'
            )} />
          </div>
        </motion.div>
      ))}

      {/* Connection lines */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 256">
        {[30, 90, 150, 210, 270, 330].map((angle, i) => {
          const x = 150 + Math.cos((angle * Math.PI) / 180) * 80;
          const y = 128 + Math.sin((angle * Math.PI) / 180) * 80;
          return (
            <motion.line
              key={angle}
              x1="150"
              y1="128"
              x2={x}
              y2={y}
              stroke="hsl(var(--color-accent-indigo))"
              strokeWidth="1"
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: i * 0.1 }}
            />
          );
        })}
      </svg>
    </div>
  );
}

// Pipeline DAG visual
function PipelinesVisual() {
  return (
    <div className="relative h-64 w-full p-4">
      <svg className="h-full w-full" viewBox="0 0 280 200">
        {/* DAG nodes */}
        {[
          { x: 40, y: 30, label: 'Extract' },
          { x: 140, y: 30, label: 'Clean' },
          { x: 240, y: 30, label: 'Load' },
          { x: 90, y: 100, label: 'Transform' },
          { x: 190, y: 100, label: 'Validate' },
          { x: 140, y: 170, label: 'Publish' },
        ].map((node, i) => (
          <motion.g
            key={node.label}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
          >
            <rect
              x={node.x - 35}
              y={node.y - 15}
              width="70"
              height="30"
              rx="6"
              fill="hsl(var(--color-neon-green) / 0.15)"
              stroke="hsl(var(--color-neon-green) / 0.5)"
              strokeWidth="1"
            />
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              fill="hsl(var(--color-neon-green))"
              fontSize="10"
              fontWeight="500"
            >
              {node.label}
            </text>
          </motion.g>
        ))}

        {/* Connection lines */}
        {[
          'M75,30 L105,30',
          'M175,30 L205,30',
          'M40,45 L90,85',
          'M140,45 L140,85 L110,85',
          'M240,45 L190,85',
          'M90,115 L140,155',
          'M190,115 L140,155',
        ].map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="hsl(var(--color-neon-green) / 0.4)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
          />
        ))}
      </svg>
    </div>
  );
}

// AI chat interface visual
function AIVisual() {
  const [showTyping, setShowTyping] = React.useState(true);
  const prefersReducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setShowTyping((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg border border-border bg-bg-secondary p-4">
      {/* Chat messages */}
      <div className="space-y-3">
        {/* User message */}
        <motion.div
          className="ml-auto max-w-[80%] rounded-lg bg-accent-purple/20 px-3 py-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm text-foreground">
            Show me revenue by region for Q4
          </p>
        </motion.div>

        {/* AI response */}
        <motion.div
          className="max-w-[90%] space-y-2 rounded-lg bg-[var(--glass-bg)] px-3 py-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-xs text-muted-foreground">Generated SQL:</p>
          <code className="block rounded bg-bg-primary p-2 text-xs text-neon-cyan">
            SELECT region, SUM(revenue)...
          </code>
        </motion.div>

        {/* Typing indicator */}
        {showTyping && (
          <motion.div
            className="flex items-center gap-1 text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Bot className="h-4 w-4 text-accent-purple" />
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-accent-purple"
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Dashboard builder visual
function DashboardsVisual() {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg border border-border bg-bg-secondary">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-neon-cyan" />
        <div className="h-2 w-16 rounded bg-muted" />
        <div className="ml-auto flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-4 rounded bg-muted/50" />
          ))}
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {/* Large chart */}
        <motion.div
          className="col-span-2 rounded-md bg-[var(--glass-bg)] p-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-1 h-2 w-12 rounded bg-muted" />
          <svg className="h-24 w-full" viewBox="0 0 200 80">
            <motion.path
              d="M0 60 Q50 40 100 50 T200 30"
              fill="none"
              stroke="hsl(var(--color-neon-cyan))"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
            <motion.path
              d="M0 60 Q50 40 100 50 T200 30 L200 80 L0 80 Z"
              fill="url(#dashboardGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 1 }}
            />
            <defs>
              <linearGradient id="dashboardGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--color-neon-cyan))" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* KPI cards */}
        <div className="space-y-2">
          {['cyan', 'purple', 'green'].map((color, i) => (
            <motion.div
              key={color}
              className="rounded-md bg-[var(--glass-bg)] p-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
            >
              <div className={cn('mb-1 h-1.5 w-4 rounded', `bg-neon-${color}`)} />
              <div className="h-2 w-8 rounded bg-muted" />
            </motion.div>
          ))}
        </div>

        {/* Bottom row */}
        <motion.div
          className="col-span-3 rounded-md bg-[var(--glass-bg)] p-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex gap-4">
            {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
              <div key={i} className="flex-1">
                <div
                  className="rounded-t bg-accent-indigo/60"
                  style={{ height: h * 0.3 }}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const visualComponents: Record<string, React.FC> = {
  connections: ConnectionsVisual,
  pipelines: PipelinesVisual,
  ai: AIVisual,
  dashboards: DashboardsVisual,
};

// Single feature row
function FeatureRow({
  feature,
  index,
  reverse,
}: {
  feature: typeof features[0];
  index: number;
  reverse: boolean;
}) {
  const Icon = feature.icon;
  const VisualComponent = visualComponents[feature.visual];

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center gap-8 lg:gap-16',
        reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'
      )}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      {/* Content */}
      <div className="flex-1 space-y-6">
        <div className="flex items-start gap-4">
          <IconBadge icon={<Icon className="h-6 w-6" />} color={feature.color} size="lg" glow />
          <div>
            <p className="text-sm font-medium text-muted-foreground">{feature.title}</p>
            <h3 className="text-2xl font-bold text-foreground lg:text-3xl">
              {feature.subtitle.split(' ').map((word, i) => (
                <span key={i}>
                  {i === feature.subtitle.split(' ').length - 1 ? (
                    <span className="bg-gradient-primary bg-clip-text text-transparent">
                      {word}
                    </span>
                  ) : (
                    `${word} `
                  )}
                </span>
              ))}
            </h3>
          </div>
        </div>

        <p className="text-lg text-muted-foreground">{feature.description}</p>

        <ul className="space-y-2">
          {feature.bullets.map((bullet, i) => (
            <li key={i} className="flex items-center gap-2 text-muted-foreground">
              <Check className={cn('h-4 w-4 flex-shrink-0', `text-${feature.color === 'indigo' ? 'accent-indigo' : feature.color === 'green' ? 'neon-green' : feature.color === 'purple' ? 'accent-purple' : 'neon-cyan'}`)} />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        <Link
          to={feature.cta.href}
          className={cn(
            'inline-flex items-center gap-2 font-medium transition-colors',
            feature.color === 'indigo' && 'text-accent-indigo hover:text-accent-indigo/80',
            feature.color === 'green' && 'text-neon-green hover:text-neon-green/80',
            feature.color === 'purple' && 'text-accent-purple hover:text-accent-purple/80',
            feature.color === 'cyan' && 'text-neon-cyan hover:text-neon-cyan/80'
          )}
        >
          {feature.cta.text}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Visual */}
      <motion.div
        className="w-full max-w-md flex-1 lg:max-w-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="rounded-xl border border-border bg-[var(--glass-bg)] p-4 backdrop-blur-sm">
          <VisualComponent />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function FeatureShowcase({ className }: FeatureShowcaseProps) {
  return (
    <section
      id="features"
      className={cn('py-20 md:py-28 lg:py-32', className)}
    >
      <div className="container mx-auto px-4">
        <SectionHeader
          badge="Features"
          title="Everything You Need for Modern Data Analytics"
          titleHighlight="Modern Data Analytics"
          subtitle="A complete platform that handles the entire data lifecycle from ingestion to visualization."
          align="center"
          className="mb-20"
        />

        <div className="space-y-24 lg:space-y-32">
          {features.map((feature, index) => (
            <FeatureRow
              key={feature.id}
              feature={feature}
              index={index}
              reverse={index % 2 === 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeatureShowcase;
