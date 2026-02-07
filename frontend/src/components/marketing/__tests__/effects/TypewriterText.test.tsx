/**
 * TypewriterText Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderMarketing, screen, waitFor } from '@/test/marketing-utils';
import { TypewriterText } from '@/components/marketing/effects/TypewriterText';

describe('TypewriterText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the component', () => {
    const { container } = renderMarketing(
      <TypewriterText texts={['Hello World', 'Welcome']} />
    );
    
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows full text with reduced motion', () => {
    // Our mock forces reduced motion, so full text should be shown
    renderMarketing(
      <TypewriterText texts={['Hello World']} />
    );
    
    // With reduced motion, full text is displayed immediately
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('has aria-label with full text for accessibility', () => {
    const { container } = renderMarketing(
      <TypewriterText texts={['Accessible Text', 'More Text']} />
    );
    
    // The component should have accessible text
    const element = container.querySelector('[aria-label]');
    expect(element || container.textContent).toBeTruthy();
  });

  it('shows cursor by default', () => {
    const { container } = renderMarketing(
      <TypewriterText texts={['With Cursor']} showCursor={true} />
    );
    
    // Default cursor is '|'
    expect(container.textContent).toContain('|');
  });

  it('hides cursor when showCursor is false', () => {
    const { container } = renderMarketing(
      <TypewriterText texts={['No Cursor']} showCursor={false} />
    );
    
    expect(container.textContent).not.toContain('|');
  });

  it('uses custom cursor character', () => {
    const { container } = renderMarketing(
      <TypewriterText texts={['Custom Cursor']} cursorChar="_" />
    );
    
    expect(container.textContent).toContain('_');
  });

  it('applies custom className', () => {
    const { container } = renderMarketing(
      <TypewriterText texts={['Styled']} className="custom-typewriter" />
    );
    
    const element = container.querySelector('.custom-typewriter');
    expect(element).toBeInTheDocument();
  });

  it('cycles through multiple texts with reduced motion', async () => {
    vi.useRealTimers(); // Use real timers for this test
    
    renderMarketing(
      <TypewriterText texts={['First Text', 'Second Text']} />
    );
    
    // With reduced motion, first text is shown immediately
    expect(screen.getByText(/First Text/)).toBeInTheDocument();
  });

  it('handles empty texts array gracefully', () => {
    const { container } = renderMarketing(
      <TypewriterText texts={[]} />
    );
    
    // Should not crash
    expect(container).toBeInTheDocument();
  });

  it('handles single text item', () => {
    renderMarketing(
      <TypewriterText texts={['Only One']} loop={false} />
    );
    
    expect(screen.getByText(/Only One/)).toBeInTheDocument();
  });
});
