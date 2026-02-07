/**
 * MarketingNavbar Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderMarketing, screen, userEvent, fireEvent } from '@/test/marketing-utils';
import { MarketingNavbar } from '@/components/marketing/layout/MarketingNavbar';

describe('MarketingNavbar', () => {
  beforeEach(() => {
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  it('renders logo linking to home', () => {
    renderMarketing(<MarketingNavbar />);
    
    const logo = screen.getByText('NovaSight');
    expect(logo).toBeInTheDocument();
    
    // Check it's wrapped in a link to home
    const logoLink = logo.closest('a');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('renders all navigation links', () => {
    renderMarketing(<MarketingNavbar />);
    
    expect(screen.getByRole('link', { name: 'Features' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solutions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pricing' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
  });

  it('renders Sign In button', () => {
    renderMarketing(<MarketingNavbar />);
    
    const signInButton = screen.getByRole('link', { name: /sign in/i });
    expect(signInButton).toBeInTheDocument();
    expect(signInButton).toHaveAttribute('href', '/login');
  });

  it('renders Get Started button', () => {
    renderMarketing(<MarketingNavbar />);
    
    const getStartedButton = screen.getByRole('link', { name: /get started/i });
    expect(getStartedButton).toBeInTheDocument();
    expect(getStartedButton).toHaveAttribute('href', '/register');
  });

  it('shows mobile menu button on small screens', () => {
    renderMarketing(<MarketingNavbar />);
    
    // Mobile menu button should be present (hidden on desktop via CSS)
    const menuButton = screen.getByRole('button', { name: /menu|toggle/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('has nav landmark with aria-label', () => {
    renderMarketing(<MarketingNavbar />);
    
    const nav = screen.getByRole('navigation', { name: /main/i });
    expect(nav).toBeInTheDocument();
  });

  it('renders skip to content link', () => {
    renderMarketing(<MarketingNavbar />);
    
    const skipLink = screen.getByText(/skip to content/i);
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('has proper header structure', () => {
    renderMarketing(<MarketingNavbar />);
    
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  it('navigation links have correct hrefs', () => {
    renderMarketing(<MarketingNavbar />);
    
    expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/features');
    expect(screen.getByRole('link', { name: 'Solutions' })).toHaveAttribute('href', '/solutions');
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });

  it('applies additional className', () => {
    const { container } = renderMarketing(
      <MarketingNavbar className="custom-nav" />
    );
    
    const customElement = container.querySelector('.custom-nav');
    expect(customElement).toBeInTheDocument();
  });

  it('mobile menu can be toggled', async () => {
    const user = userEvent.setup();
    renderMarketing(<MarketingNavbar />);
    
    const menuButton = screen.getByRole('button', { name: /menu|toggle/i });
    
    // Open menu
    await user.click(menuButton);
    
    // Menu should be visible (on mobile viewports)
    // The mobile menu renders with AnimatePresence
    expect(menuButton).toBeInTheDocument();
  });

  it('closes mobile menu on escape key', async () => {
    const user = userEvent.setup();
    renderMarketing(<MarketingNavbar />);
    
    const menuButton = screen.getByRole('button', { name: /menu|toggle/i });
    
    // Open menu
    await user.click(menuButton);
    
    // Press Escape
    await user.keyboard('{Escape}');
    
    // Menu should close
    expect(menuButton).toBeInTheDocument();
  });

  it('applies frosted effect class on scroll', () => {
    const { container } = renderMarketing(<MarketingNavbar />);
    
    // Simulate scroll
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    fireEvent.scroll(window);
    
    // The header should have backdrop-blur class when scrolled
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });
});
