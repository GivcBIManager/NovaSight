/**
 * useContactForm Hook
 * 
 * Custom hook for managing contact form state with localStorage persistence.
 */

import * as React from 'react';
import type { ContactFormData } from '@/components/marketing/sections/ContactForm';

interface ContactSubmission extends ContactFormData {
  id: string;
  timestamp: string;
  status: 'pending' | 'contacted' | 'closed';
}

interface UseContactFormReturn {
  /** Submit contact form data */
  submitContact: (data: ContactFormData) => Promise<void>;
  /** Get all submissions (for admin use) */
  getSubmissions: () => ContactSubmission[];
  /** Clear all submissions */
  clearSubmissions: () => void;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

const STORAGE_KEY = 'novasight-contact-submissions';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useContactForm(): UseContactFormReturn {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submitContact = React.useCallback(async (data: ContactFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const submission: ContactSubmission = {
        ...data,
        id: generateId(),
        timestamp: new Date().toISOString(),
        status: 'pending',
      };

      // Get existing submissions
      const existingData = localStorage.getItem(STORAGE_KEY);
      const submissions: ContactSubmission[] = existingData
        ? JSON.parse(existingData)
        : [];

      // Add new submission
      submissions.push(submission);

      // Save back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));

      // In a real app, you would also send to an API here
      // await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(submission),
      // });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit form';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSubmissions = React.useCallback((): ContactSubmission[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }, []);

  const clearSubmissions = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    submitContact,
    getSubmissions,
    clearSubmissions,
    isLoading,
    error,
  };
}

export default useContactForm;
