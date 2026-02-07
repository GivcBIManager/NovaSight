# Prompt 016 — Marketing Pages Testing Suite

**Agent**: `@testing`  
**Phase**: 5 — Quality  
**Dependencies**: All marketing pages complete (001–015)  
**Estimated Effort**: High  

---

## 🎯 Objective

Build a comprehensive testing suite for all marketing pages, covering unit tests for components, integration tests for page composition, visual regression tests, and end-to-end tests for critical user journeys.

---

## 📁 Files to Create

```
frontend/src/components/marketing/__tests__/
  ├── effects/
  │   ├── GlowOrb.test.tsx
  │   ├── MagneticButton.test.tsx
  │   ├── TiltCard.test.tsx
  │   ├── TextReveal.test.tsx
  │   ├── CountUp.test.tsx
  │   └── TypewriterText.test.tsx
  ├── layout/
  │   ├── MarketingNavbar.test.tsx
  │   ├── MarketingFooter.test.tsx
  │   └── MarketingLayout.test.tsx
  ├── shared/
  │   ├── SectionHeader.test.tsx
  │   ├── FeatureCard.test.tsx
  │   ├── NewsletterForm.test.tsx
  │   ├── BentoGrid.test.tsx
  │   └── FAQAccordion.test.tsx
  ├── sections/
  │   ├── HeroSection.test.tsx
  │   ├── FeatureShowcase.test.tsx
  │   ├── MetricsSection.test.tsx
  │   ├── PricingCards.test.tsx
  │   ├── TestimonialsCarousel.test.tsx
  │   └── ComparisonTable.test.tsx
  └── pages/
      ├── HomePage.test.tsx
      ├── FeaturesPage.test.tsx
      ├── PricingPage.test.tsx
      ├── SolutionsPage.test.tsx
      ├── AboutPage.test.tsx
      └── ContactPage.test.tsx

frontend/e2e/marketing/
  ├── homepage.spec.ts
  ├── features.spec.ts
  ├── pricing.spec.ts
  ├── contact.spec.ts
  ├── navigation.spec.ts
  ├── responsive.spec.ts
  └── accessibility.spec.ts
```

---

## 📐 Unit Tests (Vitest + Testing Library)

### Test Framework Setup
```typescript
// Use existing vitest + @testing-library/react setup
// Add test utilities for marketing components:

// frontend/src/test/marketing-utils.tsx
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';

export function renderMarketing(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <ThemeProvider defaultTheme="dark" storageKey="test-theme">
          {children}
        </ThemeProvider>
      </BrowserRouter>
    ),
  });
}
```

### Effect Components Tests

#### GlowOrb.test.tsx
```typescript
describe('GlowOrb', () => {
  it('renders with correct color class');
  it('applies size-based dimensions');
  it('has pointer-events-none');
  it('has aria-hidden="true"');
  it('applies custom position styles');
  it('disables animation when prefers-reduced-motion');
});
```

#### MagneticButton.test.tsx
```typescript
describe('MagneticButton', () => {
  it('renders children correctly');
  it('applies variant classes');
  it('is keyboard accessible (Enter/Space activates)');
  it('applies glow effect on hover when glow=true');
  it('handles onClick events');
  it('supports asChild pattern for Link wrapping');
  it('does not apply magnetic transform on keyboard focus');
});
```

#### CountUp.test.tsx
```typescript
describe('CountUp', () => {
  it('displays start value initially');
  it('counts to end value when in view');
  it('formats with separator');
  it('applies prefix and suffix');
  it('handles decimal places');
  it('shows final value immediately when prefers-reduced-motion');
  it('has aria-live="polite"');
});
```

#### TypewriterText.test.tsx
```typescript
describe('TypewriterText', () => {
  it('types out text character by character');
  it('cycles through multiple texts when loop=true');
  it('stops after first text when loop=false');
  it('shows full text in aria-label');
  it('cleans up timeouts on unmount');
  it('shows full text immediately when prefers-reduced-motion');
});
```

### Layout Component Tests

#### MarketingNavbar.test.tsx
```typescript
describe('MarketingNavbar', () => {
  it('renders logo linking to home');
  it('renders all navigation links');
  it('renders Sign In and Get Started buttons');
  it('shows mobile menu button on small screens');
  it('toggles mobile menu on hamburger click');
  it('closes mobile menu on link click');
  it('closes mobile menu on Escape key');
  it('applies frosted glass style on scroll');
  it('has nav landmark with aria-label');
  it('focus trap works in mobile menu');
  it('all links have correct href attributes');
});
```

#### MarketingFooter.test.tsx
```typescript
describe('MarketingFooter', () => {
  it('renders footer landmark');
  it('renders all link sections (Product, Solutions, Company, Resources)');
  it('renders social media links');
  it('renders copyright text with current year');
  it('renders newsletter form');
  it('all links have correct href');
});
```

### Section Component Tests

#### HeroSection.test.tsx
```typescript
describe('HeroSection', () => {
  it('renders h1 headline');
  it('renders subtitle paragraph');
  it('renders primary and secondary CTA buttons');
  it('primary CTA links to /register');
  it('secondary CTA links to demo');
  it('renders HeroVisual component');
  it('renders background effects (NeuralNetwork)');
  it('headline contains gradient text for highlight');
});
```

#### PricingCards.test.tsx
```typescript
describe('PricingCards', () => {
  it('renders 3 pricing tiers');
  it('highlights Professional plan');
  it('shows "Most Popular" badge on Professional');
  it('toggles between monthly and annual pricing');
  it('shows 20% savings on annual billing');
  it('renders feature lists with check/cross icons');
  it('CTA buttons have correct links');
  it('excluded features show strikethrough');
  it('Enterprise shows "Custom" pricing');
});
```

#### TestimonialsCarousel.test.tsx
```typescript
describe('TestimonialsCarousel', () => {
  it('renders first testimonial on load');
  it('advances to next slide on arrow click');
  it('goes to previous slide on back arrow');
  it('wraps around at last/first slide');
  it('dot indicators reflect active slide');
  it('clicking dot navigates to that slide');
  it('pauses auto-advance on hover');
  it('has carousel ARIA roles');
  it('supports keyboard navigation (arrow keys)');
  it('announces slide changes to screen readers');
});
```

#### FAQAccordion.test.tsx
```typescript
describe('FAQAccordion', () => {
  it('renders all questions');
  it('expands answer on question click');
  it('collapses previously open answer');
  it('supports keyboard navigation (Enter, Space, Arrow keys)');
  it('has correct aria-expanded states');
  it('answer content is accessible when expanded');
});
```

### Page Integration Tests

#### HomePage.test.tsx
```typescript
describe('HomePage', () => {
  it('renders all sections in correct order');
  it('renders HeroSection as first section');
  it('renders CTASection as last section');
  it('all internal links are valid routes');
  it('SEO head sets correct title and description');
});
```

#### ContactPage.test.tsx
```typescript
describe('ContactPage', () => {
  it('renders contact form with all fields');
  it('shows validation errors on empty submit');
  it('validates email format');
  it('shows success state on valid submission');
  it('renders contact info section');
  it('renders resource quick links');
});
```

---

## 📐 End-to-End Tests (Playwright)

### homepage.spec.ts
```typescript
test.describe('Marketing Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads and displays hero section', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Start Free Trial')).toBeVisible();
  });

  test('navbar becomes frosted on scroll', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 200));
    const nav = page.locator('nav');
    await expect(nav).toHaveCSS('backdrop-filter', /blur/);
  });

  test('CTA navigates to registration', async ({ page }) => {
    await page.getByText('Start Free Trial').click();
    await expect(page).toHaveURL('/register');
  });

  test('feature cards are visible on scroll', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect(page.getByText('Data Connections')).toBeVisible();
  });

  test('metrics count up on scroll', async ({ page }) => {
    const metricsSection = page.locator('[data-testid="metrics-section"]');
    await metricsSection.scrollIntoViewIfNeeded();
    // Wait for count animation
    await page.waitForTimeout(3000);
    await expect(page.getByText('20+')).toBeVisible();
  });
});
```

### navigation.spec.ts
```typescript
test.describe('Marketing Navigation', () => {
  test('can navigate to all marketing pages', async ({ page }) => {
    await page.goto('/');
    
    // Features
    await page.getByRole('link', { name: 'Features' }).click();
    await expect(page).toHaveURL('/features');
    
    // Back to home
    await page.getByRole('link', { name: /novasight/i }).click();
    await expect(page).toHaveURL('/');
    
    // Pricing
    await page.getByRole('link', { name: 'Pricing' }).click();
    await expect(page).toHaveURL('/pricing');
  });

  test('mobile navigation works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(page.getByRole('link', { name: 'Features' })).toBeVisible();
    
    // Navigate
    await page.getByRole('link', { name: 'Features' }).click();
    await expect(page).toHaveURL('/features');
  });

  test('authenticated user at / redirects to dashboard', async ({ page }) => {
    // Set auth token
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-token');
    });
    await page.goto('/');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### contact.spec.ts
```typescript
test.describe('Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Please enter a valid email')).toBeVisible();
  });

  test('submits form successfully with valid data', async ({ page }) => {
    await page.getByLabel(/first name/i).fill('John');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/email/i).fill('john@example.com');
    await page.getByLabel(/company/i).fill('Acme Inc');
    // Select company size
    await page.getByLabel(/company size/i).click();
    await page.getByText('11-50').click();
    // Select interest
    await page.getByLabel(/interested in/i).click();
    await page.getByText('Book a Demo').click();
    
    await page.getByRole('button', { name: /send message/i }).click();
    
    await expect(page.getByText(/we'll get back to you/i)).toBeVisible();
  });
});
```

### responsive.spec.ts
```typescript
test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`homepage renders correctly on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      
      // No horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width + 1);
      
      // Hero is visible
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      
      // Screenshot for visual comparison
      await page.screenshot({ 
        path: `test-results/homepage-${vp.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true 
      });
    });
  }
});
```

### accessibility.spec.ts
```typescript
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  const pages = ['/', '/features', '/pricing', '/solutions', '/about', '/contact'];

  for (const pagePath of pages) {
    test(`${pagePath} passes axe accessibility audit`, async ({ page }) => {
      await page.goto(pagePath);
      // Wait for animations to settle
      await page.waitForTimeout(2000);
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test('keyboard navigation works on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Tab to skip link
    await page.keyboard.press('Tab');
    const skipLink = page.getByText('Skip to main content');
    await expect(skipLink).toBeFocused();
    
    // Activate skip link
    await page.keyboard.press('Enter');
    
    // Continue tabbing through interactive elements
    await page.keyboard.press('Tab');
    // First interactive element after main should be focused
  });
});
```

---

## 📐 Test Coverage Targets

| Area | Target |
|------|--------|
| Unit tests (components) | ≥ 85% line coverage |
| Integration tests (pages) | ≥ 75% line coverage |
| E2E tests (journeys) | All critical paths covered |
| Accessibility | 0 violations on all pages |

---

## 🧪 Acceptance Criteria

- [ ] All unit tests pass (`vitest run`)
- [ ] All E2E tests pass (`playwright test`)
- [ ] Accessibility audit passes on all pages (0 violations)
- [ ] Responsive screenshots captured for 3 viewports
- [ ] Contact form E2E test covers full happy path
- [ ] Navigation E2E test covers all page transitions
- [ ] Mobile navigation E2E test works
- [ ] Code coverage meets targets
- [ ] Tests run in CI pipeline (GitHub Actions)
- [ ] No flaky tests (all deterministic)

---

*Prompt 016 — Marketing Tests v1.0*
