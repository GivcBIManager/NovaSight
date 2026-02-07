/**
 * Marketing Test Utilities
 * 
 * Custom render function and test helpers for marketing components.
 */

import * as React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => true,
    motion: {
      div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
        ({ children, ...props }, ref) => (
          <div ref={ref} {...props}>
            {children}
          </div>
        )
      ),
      span: React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
        ({ children, ...props }, ref) => (
          <span ref={ref} {...props}>
            {children}
          </span>
        )
      ),
      button: React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
        ({ children, ...props }, ref) => (
          <button ref={ref} {...props}>
            {children}
          </button>
        )
      ),
      p: React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
        ({ children, ...props }, ref) => (
          <p ref={ref} {...props}>
            {children}
          </p>
        )
      ),
      h1: React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
        ({ children, ...props }, ref) => (
          <h1 ref={ref} {...props}>
            {children}
          </h1>
        )
      ),
      a: React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
        ({ children, ...props }, ref) => (
          <a ref={ref} {...props}>
            {children}
          </a>
        )
      ),
      nav: React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
        ({ children, ...props }, ref) => (
          <nav ref={ref} {...props}>
            {children}
          </nav>
        )
      ),
      header: React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
        ({ children, ...props }, ref) => (
          <header ref={ref} {...props}>
            {children}
          </header>
        )
      ),
      section: React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
        ({ children, ...props }, ref) => (
          <section ref={ref} {...props}>
            {children}
          </section>
        )
      ),
      ul: React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
        ({ children, ...props }, ref) => (
          <ul ref={ref} {...props}>
            {children}
          </ul>
        )
      ),
      li: React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
        ({ children, ...props }, ref) => (
          <li ref={ref} {...props}>
            {children}
          </li>
        )
      ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
    useSpring: () => ({ set: vi.fn(), get: () => 0, on: () => () => {} }),
    useInView: () => true,
  };
});

interface MarketingProviderProps {
  children: React.ReactNode;
}

function MarketingProvider({ children }: MarketingProviderProps) {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="test-theme">
        {children}
      </ThemeProvider>
    </BrowserRouter>
  );
}

/**
 * Custom render function for marketing components
 */
export function renderMarketing(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: MarketingProvider,
    ...options,
  });
}

/**
 * Wait for animations to complete (stub for motion mocks)
 */
export async function waitForAnimations() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock intersection observer entry
 */
export function createMockIntersectionEntry(isIntersecting: boolean): IntersectionObserverEntry {
  return {
    isIntersecting,
    boundingClientRect: {} as DOMRectReadOnly,
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: {} as DOMRectReadOnly,
    rootBounds: null,
    target: document.createElement('div'),
    time: Date.now(),
  };
}

/**
 * Simulate scroll position
 */
export function setScrollPosition(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, writable: true });
  window.dispatchEvent(new Event('scroll'));
}

/**
 * Mock viewport size for responsive tests
 */
export function setViewportSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
  window.dispatchEvent(new Event('resize'));
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
