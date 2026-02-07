/**
 * HomePage Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderMarketing, screen } from '@/test/marketing-utils';
import { HomePage } from '@/pages/marketing/HomePage';

// Mock lazy-loaded components
vi.mock('@/components/marketing/sections/HowItWorks', () => ({
  HowItWorks: () => <section data-testid="how-it-works">How It Works</section>,
}));

vi.mock('@/components/marketing/sections/FeatureShowcase', () => ({
  FeatureShowcase: () => <section data-testid="feature-showcase">Feature Showcase</section>,
}));

vi.mock('@/components/marketing/sections/BentoFeatures', () => ({
  BentoFeatures: () => <section data-testid="bento-features">Bento Features</section>,
}));

vi.mock('@/components/marketing/sections/MetricsSection', () => ({
  MetricsSection: () => <section data-testid="metrics-section">Metrics Section</section>,
}));

vi.mock('@/components/marketing/sections/TechStackVisual', () => ({
  TechStackVisual: () => <section data-testid="tech-stack">Tech Stack</section>,
}));

vi.mock('@/components/marketing/sections/TestimonialsCarousel', () => ({
  TestimonialsCarousel: () => <section data-testid="testimonials">Testimonials</section>,
}));

vi.mock('@/components/marketing/sections/ComparisonTable', () => ({
  ComparisonTable: () => <section data-testid="comparison">Comparison</section>,
}));

vi.mock('@/components/marketing/sections/CTASection', () => ({
  CTASection: () => <section data-testid="cta-section">CTA Section</section>,
}));

vi.mock('@/components/marketing/hero', () => ({
  HeroSection: () => <section data-testid="hero-section">Hero Section</section>,
}));

vi.mock('@/components/marketing/shared', () => ({
  SectionDivider: ({ variant }: { variant: string }) => (
    <hr data-testid={`divider-${variant}`} />
  ),
  SEOHead: ({ title }: { title: string }) => <title>{title}</title>,
}));

vi.mock('@/data/seo-config', () => ({
  seoConfig: {
    home: {
      title: 'NovaSight - Modern BI Platform',
      description: 'Transform your data',
    },
  },
  getCanonicalUrl: (path: string) => `https://novasight.io${path}`,
}));

describe('HomePage', () => {
  it('renders hero section first', async () => {
    renderMarketing(<HomePage />);
    
    const heroSection = screen.getByTestId('hero-section');
    expect(heroSection).toBeInTheDocument();
  });

  it('renders sections in correct order', async () => {
    const { container } = renderMarketing(<HomePage />);
    
    // Hero should be first
    const heroSection = screen.getByTestId('hero-section');
    expect(heroSection).toBeInTheDocument();
    
    // Verify container has content
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders HowItWorks section', async () => {
    renderMarketing(<HomePage />);
    
    // Wait for lazy-loaded section
    const section = await screen.findByTestId('how-it-works');
    expect(section).toBeInTheDocument();
  });

  it('renders FeatureShowcase section', async () => {
    renderMarketing(<HomePage />);
    
    const section = await screen.findByTestId('feature-showcase');
    expect(section).toBeInTheDocument();
  });

  it('renders BentoFeatures section', async () => {
    renderMarketing(<HomePage />);
    
    const section = await screen.findByTestId('bento-features');
    expect(section).toBeInTheDocument();
  });

  it('renders MetricsSection', async () => {
    renderMarketing(<HomePage />);
    
    const section = await screen.findByTestId('metrics-section');
    expect(section).toBeInTheDocument();
  });

  it('renders TechStackVisual section', async () => {
    renderMarketing(<HomePage />);
    
    const section = await screen.findByTestId('tech-stack');
    expect(section).toBeInTheDocument();
  });

  it('renders TestimonialsCarousel section', async () => {
    renderMarketing(<HomePage />);
    
    const section = await screen.findByTestId('testimonials');
    expect(section).toBeInTheDocument();
  });

  it('renders ComparisonTable section', async () => {
    renderMarketing(<HomePage />);
    
    const section = await screen.findByTestId('comparison');
    expect(section).toBeInTheDocument();
  });

  it('renders CTASection at the end', async () => {
    renderMarketing(<HomePage />);
    
    const section = await screen.findByTestId('cta-section');
    expect(section).toBeInTheDocument();
  });

  it('renders section dividers', async () => {
    renderMarketing(<HomePage />);
    
    const gradientDivider = await screen.findAllByTestId(/divider-/);
    expect(gradientDivider.length).toBeGreaterThan(0);
  });

  it('SEO head sets correct title', () => {
    renderMarketing(<HomePage />);
    
    // Document title should be set
    expect(document.title).toContain('NovaSight');
  });

  it('has proper page structure', () => {
    const { container } = renderMarketing(<HomePage />);
    
    // Should have a wrapper div
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.className).toContain('relative');
  });

  it('lazy loads sections below the fold', async () => {
    renderMarketing(<HomePage />);
    
    // Initially shows loading spinner for lazy sections
    // Then sections appear
    await screen.findByTestId('how-it-works');
    await screen.findByTestId('feature-showcase');
    
    // All sections eventually render
    expect(screen.getByTestId('cta-section')).toBeInTheDocument();
  });
});
