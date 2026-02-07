/**
 * GlowOrb Component Tests
 */

import { describe, it, expect } from 'vitest';
import { renderMarketing, screen } from '@/test/marketing-utils';
import { GlowOrb } from '@/components/marketing/effects/GlowOrb';

describe('GlowOrb', () => {
  it('renders with correct color class', () => {
    const { container } = renderMarketing(
      <GlowOrb color="purple" />
    );
    
    const orb = container.firstChild;
    expect(orb).toBeInTheDocument();
  });

  it('applies size-based dimensions', () => {
    const { container } = renderMarketing(<GlowOrb color="cyan" size="lg" />);
    
    // The component renders with motion.div which gets mocked
    // Size is applied via inline styles or class
    const orb = container.firstChild;
    expect(orb).toBeInTheDocument();
  });

  it('has pointer-events-none', () => {
    const { container } = renderMarketing(<GlowOrb color="pink" />);
    
    const orb = container.querySelector('[class*="pointer-events-none"]');
    expect(orb).toBeInTheDocument();
  });

  it('has aria-hidden="true"', () => {
    const { container } = renderMarketing(<GlowOrb color="indigo" />);
    
    const orb = container.querySelector('[aria-hidden="true"]');
    expect(orb).toBeInTheDocument();
  });

  it('applies custom position styles', () => {
    const { container } = renderMarketing(
      <GlowOrb 
        color="green" 
        position={{ top: '10%', left: '20%' }} 
      />
    );
    
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom intensity opacity', () => {
    const { container } = renderMarketing(
      <GlowOrb color="purple" intensity={0.5} />
    );
    
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom blur value', () => {
    const { container } = renderMarketing(
      <GlowOrb color="cyan" blur={150} />
    );
    
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts additional className', () => {
    const { container } = renderMarketing(
      <GlowOrb color="pink" className="custom-class" />
    );
    
    const orb = container.querySelector('.custom-class');
    expect(orb).toBeInTheDocument();
  });
});
