/**
 * Marketing Tests Index
 * 
 * This file re-exports all marketing component tests for easy discovery.
 * Run all marketing tests with: npm test -- src/components/marketing/__tests__
 */

// Effects tests
export * from './effects/GlowOrb.test';
export * from './effects/MagneticButton.test';
export * from './effects/CountUp.test';
export * from './effects/TypewriterText.test';

// Layout tests
export * from './layout/MarketingNavbar.test';
export * from './layout/MarketingFooter.test';

// Sections tests
export * from './sections/HeroSection.test';
export * from './sections/PricingCards.test';
export * from './sections/TestimonialsCarousel.test';
export * from './sections/FAQAccordion.test';

// Shared tests
export * from './shared/NewsletterForm.test';

// Pages tests
export * from './pages/HomePage.test';
export * from './pages/ContactPage.test';
