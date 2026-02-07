/**
 * MagneticButton Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderMarketing, screen, userEvent } from '@/test/marketing-utils';
import { MagneticButton } from '@/components/marketing/effects/MagneticButton';

describe('MagneticButton', () => {
  it('renders children correctly', () => {
    renderMarketing(<MagneticButton>Click Me</MagneticButton>);
    
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('applies gradient variant classes by default', () => {
    const { container } = renderMarketing(
      <MagneticButton>Gradient Button</MagneticButton>
    );
    
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
    // Gradient variant should have gradient background classes
    expect(button?.className).toContain('bg-gradient');
  });

  it('applies outline variant classes', () => {
    const { container } = renderMarketing(
      <MagneticButton variant="outline">Outline Button</MagneticButton>
    );
    
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
    expect(button?.className).toContain('border');
  });

  it('applies ghost variant classes', () => {
    const { container } = renderMarketing(
      <MagneticButton variant="ghost">Ghost Button</MagneticButton>
    );
    
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { container: smContainer } = renderMarketing(
      <MagneticButton size="sm">Small</MagneticButton>
    );
    const { container: lgContainer } = renderMarketing(
      <MagneticButton size="lg">Large</MagneticButton>
    );
    
    expect(smContainer.querySelector('button')?.className).toContain('h-9');
    expect(lgContainer.querySelector('button')?.className).toContain('h-14');
  });

  it('is keyboard accessible', async () => {
    const handleClick = vi.fn();
    renderMarketing(
      <MagneticButton onClick={handleClick}>Accessible Button</MagneticButton>
    );
    
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
  });

  it('handles onClick events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    renderMarketing(
      <MagneticButton onClick={handleClick}>Clickable</MagneticButton>
    );
    
    const button = screen.getByRole('button', { name: 'Clickable' });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has focus-visible ring styles', () => {
    const { container } = renderMarketing(
      <MagneticButton>Focus Button</MagneticButton>
    );
    
    const button = container.querySelector('button');
    expect(button?.className).toContain('focus-visible');
  });

  it('disables pointer events when disabled', () => {
    const { container } = renderMarketing(
      <MagneticButton disabled>Disabled Button</MagneticButton>
    );
    
    const button = container.querySelector('button');
    expect(button).toBeDisabled();
    expect(button?.className).toContain('disabled');
  });

  it('applies additional className', () => {
    const { container } = renderMarketing(
      <MagneticButton className="custom-class">Custom</MagneticButton>
    );
    
    const button = container.querySelector('.custom-class');
    expect(button).toBeInTheDocument();
  });

  it('passes through native button props', () => {
    renderMarketing(
      <MagneticButton type="submit" aria-label="Submit form">
        Submit
      </MagneticButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('aria-label', 'Submit form');
  });
});
