/**
 * NewsletterForm Component
 * 
 * Email signup form with validation using react-hook-form and zod.
 * Supports inline and card variants.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Loader2, Mail } from 'lucide-react';

const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type NewsletterFormValues = z.infer<typeof newsletterSchema>;

export interface NewsletterFormProps {
  /** Form layout variant */
  variant?: 'inline' | 'card';
  /** Callback when form is submitted */
  onSubmit?: (email: string) => Promise<void>;
  /** Placeholder text */
  placeholder?: string;
  /** Submit button text */
  buttonText?: string;
  /** Additional CSS classes */
  className?: string;
}

export function NewsletterForm({
  variant = 'inline',
  onSubmit,
  placeholder = 'Enter your email',
  buttonText = 'Subscribe',
  className,
}: NewsletterFormProps) {
  const [isSuccess, setIsSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterSchema),
  });

  const handleFormSubmit = async (data: NewsletterFormValues) => {
    try {
      if (onSubmit) {
        await onSubmit(data.email);
      } else {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setIsSuccess(true);
      reset();

      // Reset success state after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error('Newsletter signup failed:', error);
    }
  };

  const FormContent = (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="relative">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 py-2 text-success"
          >
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Thanks for subscribing!</span>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'flex gap-2',
              variant === 'inline' ? 'flex-row items-start' : 'flex-col'
            )}
          >
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder={placeholder}
                className={cn(
                  'pl-10',
                  errors.email && 'border-error focus-visible:ring-error'
                )}
                {...register('email')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p
                  id="email-error"
                  className="absolute -bottom-5 left-0 text-xs text-error"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="gradient"
              disabled={isSubmitting}
              className={cn(variant === 'card' && 'w-full')}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                buttonText
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'rounded-xl border border-border bg-bg-secondary p-6',
          className
        )}
      >
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          Stay updated
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Get the latest updates and news delivered to your inbox.
        </p>
        {FormContent}
      </div>
    );
  }

  return <div className={cn('w-full max-w-md', className)}>{FormContent}</div>;
}

export default NewsletterForm;
