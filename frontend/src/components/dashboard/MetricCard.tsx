/**
 * MetricCard Component
 * 
 * Dashboard metric display with glass morphism styling.
 * Features animated value counter, trend indicator, and sparkline.
 */

import * as React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';

interface MetricCardProps {
  /** Metric label/title */
  label?: string;
  /** Alias for label (backward compat with charts/MetricCard) */
  title?: string;
  /** Current value (number for animation, string for display) */
  value: number | string;
  /** Previous value for trend calculation */
  previousValue?: number;
  /** Format function for displaying the value */
  formatValue?: (value: number) => string;
  /** Built-in format preset (used when formatValue is not provided) */
  format?: 'currency' | 'percentage' | 'number' | 'compact';
  /** Optional unit (e.g., '%', 'ms', 'K') */
  unit?: string;
  /** Prefix displayed before the value */
  prefix?: string;
  /** Suffix displayed after the value */
  suffix?: string;
  /** Subtitle text below the value */
  subtitle?: string;
  /** Custom trend percentage (overrides calculated) */
  trendPercent?: number;
  /** Icon to display */
  icon?: LucideIcon;
  /** Icon background color class */
  iconColor?: 'indigo' | 'purple' | 'cyan' | 'pink' | 'green';
  /** Sparkline data points */
  sparklineData?: number[];
  /** Additional CSS classes */
  className?: string;
  /** Enable value counter animation */
  animated?: boolean;
  /** Card size */
  size?: 'sm' | 'md' | 'lg';
}

const iconColorClasses = {
  indigo: 'bg-accent-indigo/20 text-accent-indigo',
  purple: 'bg-accent-purple/20 text-accent-purple',
  cyan: 'bg-neon-cyan/20 text-neon-cyan',
  pink: 'bg-neon-pink/20 text-neon-pink',
  green: 'bg-neon-green/20 text-neon-green',
};

function AnimatedValue({
  value,
  formatValue,
}: {
  value: number;
  formatValue: (v: number) => string;
}) {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: 1000,
  });
  
  const display = useTransform(spring, (v) => formatValue(Math.round(v)));

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data.length) return null;

  const width = 80;
  const height = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const isPositive = data[data.length - 1] >= data[0];

  return (
    <svg
      className={cn('overflow-visible', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={isPositive ? 'hsl(160, 84%, 39%)' : 'hsl(0, 84%, 60%)'}
            stopOpacity="0.3"
          />
          <stop
            offset="100%"
            stopColor={isPositive ? 'hsl(160, 84%, 39%)' : 'hsl(0, 84%, 60%)'}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      
      {/* Fill area */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparkline-gradient)"
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? 'hsl(160, 84%, 39%)' : 'hsl(0, 84%, 60%)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="2"
        fill={isPositive ? 'hsl(160, 84%, 39%)' : 'hsl(0, 84%, 60%)'}
      />
    </svg>
  );
}

function TrendIndicator({ percent }: { percent: number }) {
  if (percent === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>0%</span>
      </span>
    );
  }

  const isPositive = percent > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        isPositive ? 'text-neon-green' : 'text-error'
      )}
    >
      <Icon className="h-3 w-3" />
      <span>
        {isPositive ? '+' : ''}
        {percent.toFixed(1)}%
      </span>
    </span>
  );
}

function formatMetricPreset(
  value: number,
  format: 'currency' | 'percentage' | 'number' | 'compact'
): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'compact':
      if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
      if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return value.toFixed(0);
    case 'number':
    default:
      return value.toLocaleString();
  }
}

export function MetricCard({
  label,
  title,
  value,
  previousValue,
  formatValue,
  format,
  unit,
  prefix,
  suffix,
  subtitle,
  trendPercent,
  icon: Icon,
  iconColor = 'indigo',
  sparklineData,
  className,
  animated = true,
  size = 'md',
}: MetricCardProps) {
  const displayLabel = title || label;
  const resolvedFormatValue = formatValue
    || (format ? (v: number) => formatMetricPreset(v, format) : (v: number) => v.toLocaleString());
  // Calculate trend if not provided
  const calculatedTrend = React.useMemo(() => {
    if (trendPercent !== undefined) return trendPercent;
    if (previousValue === undefined || typeof value !== 'number') return undefined;
    if (previousValue === 0) return value > 0 ? 100 : 0;
    return ((value - previousValue) / previousValue) * 100;
  }, [value, previousValue, trendPercent]);

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const valueSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <GlassCard
      variant="interactive"
      className={cn(sizeClasses[size], className)}
      animated={animated}
    >
      <div className="flex items-start justify-between">
        {/* Left side - Label and Value */}
        <div className="flex-1 min-w-0">
          {displayLabel && <p className="text-sm text-muted-foreground truncate">{displayLabel}</p>}
          
          <div className="mt-1 flex items-baseline gap-1">
            {prefix && (
              <span className="text-sm text-muted-foreground">{prefix}</span>
            )}
            <span
              className={cn(
                'font-bold tracking-tight text-gradient',
                valueSizeClasses[size]
              )}
            >
              {typeof value === 'number' && animated ? (
                <AnimatedValue value={value} formatValue={resolvedFormatValue} />
              ) : typeof value === 'number' ? (
                resolvedFormatValue(value)
              ) : (
                value
              )}
            </span>
            {(suffix || unit) && (
              <span className="text-sm text-muted-foreground">{suffix || unit}</span>
            )}
          </div>

          {/* Trend indicator */}
          {calculatedTrend !== undefined && (
            <div className="mt-2">
              <TrendIndicator percent={calculatedTrend} />
            </div>
          )}

          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Right side - Icon and/or Sparkline */}
        <div className="flex flex-col items-end gap-2">
          {Icon && (
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                iconColorClasses[iconColor]
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          
          {sparklineData && sparklineData.length > 1 && (
            <Sparkline data={sparklineData} />
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export default MetricCard;
