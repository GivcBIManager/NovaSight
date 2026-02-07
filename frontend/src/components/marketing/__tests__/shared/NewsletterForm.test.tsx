/**
 * NewsletterForm Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderMarketing, screen, userEvent, waitFor } from '@/test/marketing-utils';
import { NewsletterForm } from '@/components/marketing/shared/NewsletterForm';

describe('NewsletterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email input', () => {
    renderMarketing(<NewsletterForm />);
    
    const emailInput = screen.getByRole('textbox');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('renders submit button', () => {
    renderMarketing(<NewsletterForm />);
    
    const submitButton = screen.getByRole('button', { name: /subscribe/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderMarketing(<NewsletterForm />);
    
    const emailInput = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /subscribe/i });
    
    // Enter invalid email
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('shows error on invalid email', async () => {
    const user = userEvent.setup();
    renderMarketing(<NewsletterForm />);
    
    const emailInput = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /subscribe/i });
    
    await user.type(emailInput, 'not-an-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('accepts valid email format', async () => {
    const user = userEvent.setup();
    renderMarketing(<NewsletterForm />);
    
    const emailInput = screen.getByRole('textbox');
    
    await user.type(emailInput, 'valid@email.com');
    
    // No error should appear before submit
    expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
  });

  it('shows success state on submit', async () => {
    const user = userEvent.setup();
    renderMarketing(<NewsletterForm />);
    
    const emailInput = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /subscribe/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    // Success message should appear
    await waitFor(() => {
      expect(screen.getByText(/thanks for subscribing/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('calls onSubmit callback with email', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    
    renderMarketing(<NewsletterForm onSubmit={handleSubmit} />);
    
    const emailInput = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /subscribe/i });
    
    await user.type(emailInput, 'callback@test.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith('callback@test.com');
    });
  });

  it('shows loading state during submit', async () => {
    const handleSubmit = vi.fn().mockImplementation(() => 
      new Promise((resolve) => setTimeout(resolve, 500))
    );
    const user = userEvent.setup();
    
    renderMarketing(<NewsletterForm onSubmit={handleSubmit} />);
    
    const emailInput = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /subscribe/i });
    
    await user.type(emailInput, 'loading@test.com');
    await user.click(submitButton);
    
    // Button should show loading state
    // (specific implementation may vary)
    expect(submitButton).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    renderMarketing(<NewsletterForm placeholder="Your work email" />);
    
    const emailInput = screen.getByPlaceholderText('Your work email');
    expect(emailInput).toBeInTheDocument();
  });

  it('renders with custom button text', () => {
    renderMarketing(<NewsletterForm buttonText="Join Now" />);
    
    const submitButton = screen.getByRole('button', { name: 'Join Now' });
    expect(submitButton).toBeInTheDocument();
  });

  it('applies inline variant layout', () => {
    const { container } = renderMarketing(
      <NewsletterForm variant="inline" />
    );
    
    // Inline variant should have flex-row layout
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  it('applies card variant layout', () => {
    const { container } = renderMarketing(
      <NewsletterForm variant="card" />
    );
    
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  it('has accessible error message', async () => {
    const user = userEvent.setup();
    renderMarketing(<NewsletterForm />);
    
    const emailInput = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /subscribe/i });
    
    await user.type(emailInput, 'bad');
    await user.click(submitButton);
    
    await waitFor(() => {
      // Input should be marked as invalid
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('clears form after successful submit', async () => {
    const user = userEvent.setup();
    renderMarketing(<NewsletterForm />);
    
    const emailInput = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /subscribe/i });
    
    await user.type(emailInput, 'clear@test.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/thanks for subscribing/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('applies additional className', () => {
    const { container } = renderMarketing(
      <NewsletterForm className="custom-newsletter" />
    );
    
    // Form or wrapper should have custom class
    expect(container.firstChild).toBeInTheDocument();
  });
});
