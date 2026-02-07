/**
 * FAQAccordion Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderMarketing, screen, userEvent } from '@/test/marketing-utils';
import { FAQAccordion, FAQItem } from '@/components/marketing/sections/FAQAccordion';

const mockFAQItems: FAQItem[] = [
  {
    question: 'What is NovaSight?',
    answer: 'NovaSight is a modern BI platform for data analytics.',
  },
  {
    question: 'How much does it cost?',
    answer: 'We offer three pricing tiers starting at $29/month.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes, we offer a 14-day free trial with full access.',
  },
  {
    question: 'What integrations do you support?',
    answer: 'We support PostgreSQL, MySQL, Snowflake, BigQuery, and more.',
  },
];

describe('FAQAccordion', () => {
  it('renders all questions', () => {
    renderMarketing(<FAQAccordion items={mockFAQItems} />);
    
    mockFAQItems.forEach((item) => {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    });
  });

  it('answers are hidden initially', () => {
    renderMarketing(<FAQAccordion items={mockFAQItems} />);
    
    // Answers should not be visible initially
    expect(screen.queryByText('NovaSight is a modern BI platform for data analytics.')).not.toBeVisible();
  });

  it('expands answer on question click', async () => {
    const user = userEvent.setup();
    renderMarketing(<FAQAccordion items={mockFAQItems} />);
    
    const question = screen.getByText('What is NovaSight?');
    await user.click(question);
    
    // Answer should now be visible
    expect(screen.getByText('NovaSight is a modern BI platform for data analytics.')).toBeVisible();
  });

  it('collapses answer on second click', async () => {
    const user = userEvent.setup();
    renderMarketing(<FAQAccordion items={mockFAQItems} />);
    
    const question = screen.getByText('What is NovaSight?');
    
    // First click - expand
    await user.click(question);
    expect(screen.getByText('NovaSight is a modern BI platform for data analytics.')).toBeVisible();
    
    // Second click - collapse
    await user.click(question);
    // Answer should be hidden
    expect(screen.queryByText('NovaSight is a modern BI platform for data analytics.')).not.toBeVisible();
  });

  it('has correct aria-expanded states', async () => {
    const user = userEvent.setup();
    renderMarketing(<FAQAccordion items={mockFAQItems} />);
    
    const questionButton = screen.getByRole('button', { name: 'What is NovaSight?' });
    
    // Initially collapsed
    expect(questionButton).toHaveAttribute('aria-expanded', 'false');
    
    // After click - expanded
    await user.click(questionButton);
    expect(questionButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes other items when one is opened (single mode)', async () => {
    const user = userEvent.setup();
    renderMarketing(<FAQAccordion items={mockFAQItems} allowMultiple={false} />);
    
    // Open first question
    await user.click(screen.getByText('What is NovaSight?'));
    expect(screen.getByText('NovaSight is a modern BI platform for data analytics.')).toBeVisible();
    
    // Open second question
    await user.click(screen.getByText('How much does it cost?'));
    
    // First answer should be hidden
    expect(screen.queryByText('NovaSight is a modern BI platform for data analytics.')).not.toBeVisible();
    // Second answer should be visible
    expect(screen.getByText(/three pricing tiers/i)).toBeVisible();
  });

  it('allows multiple items open when allowMultiple is true', async () => {
    const user = userEvent.setup();
    renderMarketing(<FAQAccordion items={mockFAQItems} allowMultiple={true} />);
    
    // Open first question
    await user.click(screen.getByText('What is NovaSight?'));
    
    // Open second question
    await user.click(screen.getByText('How much does it cost?'));
    
    // Both answers should be visible
    expect(screen.getByText('NovaSight is a modern BI platform for data analytics.')).toBeVisible();
    expect(screen.getByText(/three pricing tiers/i)).toBeVisible();
  });

  it('questions are keyboard accessible', async () => {
    const user = userEvent.setup();
    renderMarketing(<FAQAccordion items={mockFAQItems} />);
    
    const firstQuestion = screen.getByRole('button', { name: 'What is NovaSight?' });
    
    // Focus on first question
    firstQuestion.focus();
    expect(firstQuestion).toHaveFocus();
    
    // Press Enter to expand
    await user.keyboard('{Enter}');
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
  });

  it('can navigate with Tab key', async () => {
    const user = userEvent.setup();
    renderMarketing(<FAQAccordion items={mockFAQItems} />);
    
    // Tab to first question
    await user.tab();
    expect(screen.getByRole('button', { name: 'What is NovaSight?' })).toHaveFocus();
    
    // Tab to second question
    await user.tab();
    expect(screen.getByRole('button', { name: 'How much does it cost?' })).toHaveFocus();
  });

  it('applies additional className', () => {
    const { container } = renderMarketing(
      <FAQAccordion items={mockFAQItems} className="custom-faq" />
    );
    
    const faq = container.querySelector('.custom-faq');
    expect(faq).toBeInTheDocument();
  });

  it('renders chevron icons', () => {
    const { container } = renderMarketing(
      <FAQAccordion items={mockFAQItems} />
    );
    
    // Should have chevron/arrow icons
    const svgIcons = container.querySelectorAll('svg');
    expect(svgIcons.length).toBeGreaterThanOrEqual(mockFAQItems.length);
  });

  it('handles empty items array', () => {
    const { container } = renderMarketing(
      <FAQAccordion items={[]} />
    );
    
    // Should render without crashing
    expect(container).toBeInTheDocument();
  });
});
