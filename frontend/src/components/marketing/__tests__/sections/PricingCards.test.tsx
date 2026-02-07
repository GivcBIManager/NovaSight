/**
 * PricingCards Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderMarketing, screen, userEvent } from '@/test/marketing-utils';
import { PricingCards, PricingTier } from '@/components/marketing/sections/PricingCards';

const mockTiers: PricingTier[] = [
  {
    name: 'Starter',
    monthlyPrice: 29,
    annualPrice: 24,
    description: 'Perfect for small teams',
    features: ['5 users', '10GB storage', 'Basic analytics'],
    cta: 'Start Free Trial',
    ctaLink: '/register?plan=starter',
    highlighted: false,
  },
  {
    name: 'Professional',
    monthlyPrice: 99,
    annualPrice: 79,
    description: 'For growing businesses',
    features: ['25 users', '100GB storage', 'Advanced analytics', 'Priority support'],
    cta: 'Start Free Trial',
    ctaLink: '/register?plan=professional',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    description: 'For large organizations',
    features: ['Unlimited users', 'Unlimited storage', 'Custom integrations', 'Dedicated support'],
    cta: 'Contact Sales',
    ctaLink: '/contact',
    highlighted: false,
  },
];

describe('PricingCards', () => {
  it('renders 3 pricing tiers', () => {
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="monthly"
        onBillingChange={() => {}}
      />
    );
    
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('highlights Professional plan', () => {
    const { container } = renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="monthly"
        onBillingChange={() => {}}
      />
    );
    
    // The highlighted plan should have a badge
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
    
    // Professional card should have special styling
    const professionalCard = screen.getByText('Professional').closest('div');
    expect(professionalCard?.className || container.innerHTML).toContain('purple');
  });

  it('toggles between monthly and annual pricing', async () => {
    const handleBillingChange = vi.fn();
    const user = userEvent.setup();
    
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="monthly"
        onBillingChange={handleBillingChange}
      />
    );
    
    // Find the toggle button
    const toggle = screen.getByRole('switch', { name: /annual/i });
    await user.click(toggle);
    
    expect(handleBillingChange).toHaveBeenCalledWith('annual');
  });

  it('displays monthly prices when billing is monthly', () => {
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="monthly"
        onBillingChange={() => {}}
      />
    );
    
    // Monthly prices should be displayed
    expect(screen.getByText('$29')).toBeInTheDocument();
    expect(screen.getByText('$99')).toBeInTheDocument();
  });

  it('displays annual prices when billing is annual', () => {
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="annual"
        onBillingChange={() => {}}
      />
    );
    
    // Annual prices should be displayed
    expect(screen.getByText('$24')).toBeInTheDocument();
    expect(screen.getByText('$79')).toBeInTheDocument();
  });

  it('displays "Custom" for enterprise pricing', () => {
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="monthly"
        onBillingChange={() => {}}
      />
    );
    
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('renders all features for each tier', () => {
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="monthly"
        onBillingChange={() => {}}
      />
    );
    
    // Check some features
    expect(screen.getByText('5 users')).toBeInTheDocument();
    expect(screen.getByText('Priority support')).toBeInTheDocument();
    expect(screen.getByText('Unlimited users')).toBeInTheDocument();
  });

  it('renders CTA buttons for each tier', () => {
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="monthly"
        onBillingChange={() => {}}
      />
    );
    
    const ctaButtons = screen.getAllByRole('link', { name: /start free trial|contact sales/i });
    expect(ctaButtons.length).toBe(3);
  });

  it('CTA links to correct registration URLs', () => {
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="monthly"
        onBillingChange={() => {}}
      />
    );
    
    const starterCta = screen.getAllByRole('link', { name: /start free trial/i })[0];
    expect(starterCta).toHaveAttribute('href', '/register?plan=starter');
    
    const contactCta = screen.getByRole('link', { name: /contact sales/i });
    expect(contactCta).toHaveAttribute('href', '/contact');
  });

  it('displays annual discount percentage', () => {
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="monthly"
        onBillingChange={() => {}}
        annualDiscount={20}
      />
    );
    
    expect(screen.getByText(/save 20%/i)).toBeInTheDocument();
  });

  it('billing toggle has correct aria attributes', () => {
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="monthly"
        onBillingChange={() => {}}
      />
    );
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('toggle shows checked state for annual', () => {
    renderMarketing(
      <PricingCards
        tiers={mockTiers}
        billingPeriod="annual"
        onBillingChange={() => {}}
      />
    );
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});
