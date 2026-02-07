/**
 * HeroSection Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderMarketing, screen } from '@/test/marketing-utils';
import { HeroSection } from '@/components/marketing/hero/HeroSection';

// Mock heavy background components
vi.mock('@/components/backgrounds/GridBackground', () => ({
  GridBackground: () => <div data-testid="grid-background" />,
}));

vi.mock('@/components/backgrounds/NeuralNetwork', () => ({
  NeuralNetwork: () => <div data-testid="neural-network" />,
}));

vi.mock('@/hooks', () => ({
  useIsMobile: () => false,
}));

describe('HeroSection', () => {
  it('renders h1 headline', () => {
    renderMarketing(<HeroSection />);
    
    const headline = screen.getByRole('heading', { level: 1 });
    expect(headline).toBeInTheDocument();
    expect(headline.textContent).toContain('Transform');
  });

  it('renders the main tagline text', () => {
    renderMarketing(<HeroSection />);
    
    expect(screen.getByText(/actionable intelligence/i)).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    renderMarketing(<HeroSection />);
    
    expect(screen.getByText(/modern bi platform/i)).toBeInTheDocument();
  });

  it('renders primary CTA button', () => {
    renderMarketing(<HeroSection />);
    
    const primaryCta = screen.getByRole('link', { name: /start free trial/i });
    expect(primaryCta).toBeInTheDocument();
  });

  it('primary CTA links to /register', () => {
    renderMarketing(<HeroSection />);
    
    const primaryCta = screen.getByRole('link', { name: /start free trial/i });
    expect(primaryCta).toHaveAttribute('href', '/register');
  });

  it('renders secondary CTA button', () => {
    renderMarketing(<HeroSection />);
    
    const secondaryCta = screen.getByRole('link', { name: /watch demo/i });
    expect(secondaryCta).toBeInTheDocument();
  });

  it('renders hero badge', () => {
    renderMarketing(<HeroSection />);
    
    expect(screen.getByText(/ai-powered/i)).toBeInTheDocument();
  });

  it('has proper section structure', () => {
    const { container } = renderMarketing(<HeroSection />);
    
    const section = container.querySelector('section#hero');
    expect(section).toBeInTheDocument();
  });

  it('renders logo cloud with trusted companies', () => {
    renderMarketing(<HeroSection />);
    
    // Check for some sample company names in the logo cloud
    expect(screen.getByText(/techcorp/i)).toBeInTheDocument();
  });

  it('applies additional className', () => {
    const { container } = renderMarketing(
      <HeroSection className="custom-hero" />
    );
    
    const section = container.querySelector('.custom-hero');
    expect(section).toBeInTheDocument();
  });

  it('renders background elements with aria-hidden', () => {
    const { container } = renderMarketing(<HeroSection />);
    
    const hiddenElements = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenElements.length).toBeGreaterThan(0);
  });

  it('has minimum height for full viewport', () => {
    const { container } = renderMarketing(<HeroSection />);
    
    const section = container.querySelector('section');
    expect(section?.className).toContain('min-h-screen');
  });
});
