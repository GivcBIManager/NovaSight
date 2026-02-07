/**
 * MarketingFooter Component Tests
 */

import { describe, it, expect } from 'vitest';
import { renderMarketing, screen } from '@/test/marketing-utils';
import { MarketingFooter } from '@/components/marketing/layout/MarketingFooter';

describe('MarketingFooter', () => {
  it('renders footer landmark', () => {
    renderMarketing(<MarketingFooter />);
    
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  it('renders Product link section', () => {
    renderMarketing(<MarketingFooter />);
    
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Features' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pricing' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Integrations' })).toBeInTheDocument();
  });

  it('renders Solutions link section', () => {
    renderMarketing(<MarketingFooter />);
    
    expect(screen.getByText('Solutions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'For Startups' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'For Enterprise' })).toBeInTheDocument();
  });

  it('renders Company link section', () => {
    renderMarketing(<MarketingFooter />);
    
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Blog' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Careers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact' })).toBeInTheDocument();
  });

  it('renders Resources link section', () => {
    renderMarketing(<MarketingFooter />);
    
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'API Reference' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Community' })).toBeInTheDocument();
  });

  it('renders social media links', () => {
    renderMarketing(<MarketingFooter />);
    
    expect(screen.getByRole('link', { name: /twitter/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /discord/i })).toBeInTheDocument();
  });

  it('renders copyright text with current year', () => {
    renderMarketing(<MarketingFooter />);
    
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument();
    expect(screen.getByText(/novasight/i)).toBeInTheDocument();
  });

  it('renders NovaSight logo', () => {
    renderMarketing(<MarketingFooter />);
    
    const logos = screen.getAllByText('NovaSight');
    expect(logos.length).toBeGreaterThan(0);
  });

  it('has accessible heading for screen readers', () => {
    renderMarketing(<MarketingFooter />);
    
    const footerHeading = screen.getByText('Footer', { selector: '.sr-only' });
    expect(footerHeading).toBeInTheDocument();
  });

  it('renders newsletter subscription section', () => {
    renderMarketing(<MarketingFooter />);
    
    expect(screen.getByText(/subscribe/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('renders brand description', () => {
    renderMarketing(<MarketingFooter />);
    
    expect(screen.getByText(/transform your data/i)).toBeInTheDocument();
  });

  it('all links have valid href attributes', () => {
    renderMarketing(<MarketingFooter />);
    
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      const href = link.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
    });
  });

  it('social links open in new tab', () => {
    renderMarketing(<MarketingFooter />);
    
    const twitterLink = screen.getByRole('link', { name: /twitter/i });
    expect(twitterLink).toHaveAttribute('target', '_blank');
    expect(twitterLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('applies additional className', () => {
    const { container } = renderMarketing(
      <MarketingFooter className="custom-footer" />
    );
    
    const footer = container.querySelector('.custom-footer');
    expect(footer).toBeInTheDocument();
  });
});
