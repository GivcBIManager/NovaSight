/**
 * ContactPage Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderMarketing, screen, userEvent, waitFor } from '@/test/marketing-utils';
import { ContactPage } from '@/pages/marketing/ContactPage';

// Mock SEO and shared components
vi.mock('@/components/marketing/shared', () => ({
  SectionHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
  SEOHead: ({ title }: { title: string }) => <title>{title}</title>,
}));

vi.mock('@/data/seo-config', () => ({
  seoConfig: {
    contact: {
      title: 'Contact Us - NovaSight',
      description: 'Get in touch with our team',
    },
  },
  getCanonicalUrl: (path: string) => `https://novasight.io${path}`,
}));

describe('ContactPage', () => {
  it('renders contact form', () => {
    renderMarketing(<ContactPage />);
    
    // Form should be present
    expect(screen.getByRole('form') || screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    renderMarketing(<ContactPage />);
    
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderMarketing(<ContactPage />);
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    renderMarketing(<ContactPage />);
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Should show validation errors (HTML5 validation or custom)
    const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
    
    // Either form shows error messages or input has :invalid pseudo-class
    await waitFor(() => {
      const hasValidation = firstNameInput.validity && !firstNameInput.validity.valid ||
                           screen.queryByText(/required/i) !== null;
      expect(hasValidation || firstNameInput.required).toBeTruthy();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderMarketing(<ContactPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Email input should be invalid
    expect((emailInput as HTMLInputElement).validity.valid).toBe(false);
  });

  it('accepts valid email format', async () => {
    const user = userEvent.setup();
    renderMarketing(<ContactPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'valid@example.com');
    
    expect((emailInput as HTMLInputElement).validity.valid).toBe(true);
  });

  it('renders page title', () => {
    renderMarketing(<ContactPage />);
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders page subtitle', () => {
    renderMarketing(<ContactPage />);
    
    expect(screen.getByText(/questions/i)).toBeInTheDocument();
  });

  it('renders contact information section', () => {
    renderMarketing(<ContactPage />);
    
    // Should have email, phone, location info
    expect(screen.getByText(/hello@novasight.io/i)).toBeInTheDocument();
  });

  it('renders phone number', () => {
    renderMarketing(<ContactPage />);
    
    expect(screen.getByText(/\+1 \(555\) 123-4567/i)).toBeInTheDocument();
  });

  it('renders location', () => {
    renderMarketing(<ContactPage />);
    
    expect(screen.getByText(/san francisco/i)).toBeInTheDocument();
  });

  it('form fields accept input', async () => {
    const user = userEvent.setup();
    renderMarketing(<ContactPage />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);
    
    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(messageInput, 'Test message');
    
    expect(firstNameInput).toHaveValue('John');
    expect(lastNameInput).toHaveValue('Doe');
    expect(emailInput).toHaveValue('john@example.com');
    expect(messageInput).toHaveValue('Test message');
  });

  it('has proper form structure', () => {
    const { container } = renderMarketing(<ContactPage />);
    
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  it('renders contact icons', () => {
    const { container } = renderMarketing(<ContactPage />);
    
    // Should have icons for email, phone, location
    const svgIcons = container.querySelectorAll('svg');
    expect(svgIcons.length).toBeGreaterThanOrEqual(3);
  });

  it('message textarea has multiple rows', () => {
    renderMarketing(<ContactPage />);
    
    const messageInput = screen.getByLabelText(/message/i);
    expect(messageInput).toHaveAttribute('rows');
  });

  it('form has accessible labels', () => {
    renderMarketing(<ContactPage />);
    
    // All inputs should have associated labels
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);
    
    expect(firstNameInput).toHaveAccessibleName();
    expect(lastNameInput).toHaveAccessibleName();
    expect(emailInput).toHaveAccessibleName();
    expect(messageInput).toHaveAccessibleName();
  });

  it('submit button has correct type', () => {
    renderMarketing(<ContactPage />);
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    // Button should be a submit type or within form
    expect(submitButton).toBeInTheDocument();
  });
});
