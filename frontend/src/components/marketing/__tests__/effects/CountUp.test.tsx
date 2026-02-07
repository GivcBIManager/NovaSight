/**
 * CountUp Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderMarketing, screen } from '@/test/marketing-utils';
import { CountUp } from '@/components/marketing/effects/CountUp';

describe('CountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays start value initially', () => {
    renderMarketing(<CountUp target={100} />);
    
    // With reduced motion, it should show the target value directly
    const counter = screen.getByRole('status');
    expect(counter).toBeInTheDocument();
  });

  it('formats with separator', () => {
    renderMarketing(<CountUp target={1000000} />);
    
    const counter = screen.getByRole('status');
    // Should contain formatted number with separators
    expect(counter.textContent).toContain('1,000,000');
  });

  it('applies prefix and suffix', () => {
    renderMarketing(<CountUp target={99} prefix="$" suffix="+" />);
    
    const counter = screen.getByRole('status');
    expect(counter.textContent).toContain('$');
    expect(counter.textContent).toContain('+');
  });

  it('has aria-live="polite"', () => {
    const { container } = renderMarketing(<CountUp target={50} />);
    
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderMarketing(
      <CountUp target={100} className="custom-counter" />
    );
    
    const counter = container.querySelector('.custom-counter');
    expect(counter).toBeInTheDocument();
  });

  it('formats decimal places correctly', () => {
    renderMarketing(<CountUp target={99.5} decimals={1} />);
    
    const counter = screen.getByRole('status');
    expect(counter.textContent).toMatch(/99\.5|99,5/); // Handle different locales
  });

  it('uses custom formatter when provided', () => {
    const customFormatter = (value: number) => `${Math.round(value)}%`;
    
    renderMarketing(
      <CountUp target={75} formatter={customFormatter} />
    );
    
    const counter = screen.getByRole('status');
    expect(counter.textContent).toContain('75%');
  });

  it('shows target value with reduced motion', () => {
    // Our mock forces reduced motion
    renderMarketing(<CountUp target={250} />);
    
    const counter = screen.getByRole('status');
    expect(counter.textContent).toContain('250');
  });
});
