/**
 * ContactForm Component
 * 
 * Contact/demo request form with validation using react-hook-form + zod.
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MagneticButton } from '@/components/marketing/effects';
import { Loader2, Send, CheckCircle2, PartyPopper } from 'lucide-react';

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  company: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().optional(),
  companySize: z.string().optional(),
  interest: z.string().min(1, 'Please select your interest'),
  message: z.string().optional(),
  newsletter: z.boolean().default(false),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export interface ContactFormProps {
  /** Callback on successful submission */
  onSubmit?: (data: ContactFormData) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

const companySizeOptions = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

const interestOptions = [
  { value: 'demo', label: 'Request a Demo' },
  { value: 'pricing', label: 'Pricing Inquiry' },
  { value: 'technical', label: 'Technical Questions' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' },
];

export function ContactForm({ onSubmit, className }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      newsletter: false,
    },
  });

  const handleFormSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      // Store in localStorage for now
      const submissions = JSON.parse(localStorage.getItem('contact-submissions') || '[]');
      submissions.push({ ...data, timestamp: new Date().toISOString() });
      localStorage.setItem('contact-submissions', JSON.stringify(submissions));

      // Call custom onSubmit if provided
      if (onSubmit) {
        await onSubmit(data);
      }

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSuccess(true);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-neon-green/20"
            >
              <CheckCircle2 className="h-10 w-10 text-neon-green" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="mb-2 text-2xl font-bold text-foreground">
                Thank You! <PartyPopper className="ml-2 inline h-6 w-6" />
              </h3>
              <p className="mb-6 text-muted-foreground">
                We've received your message and will get back to you soon.
              </p>
              <button
                onClick={() => setIsSuccess(false)}
                className="text-sm text-accent-purple hover:underline"
              >
                Send another message
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-6"
          >
            {/* Name fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  First name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register('firstName')}
                  className={cn(errors.firstName && 'border-red-500')}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Last name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register('lastName')}
                  className={cn(errors.lastName && 'border-red-500')}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Work email <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                {...register('email')}
                className={cn(errors.email && 'border-red-500')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Company and job title */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="company"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Company <span className="text-red-500">*</span>
                </label>
                <Input
                  id="company"
                  placeholder="Acme Inc."
                  {...register('company')}
                  className={cn(errors.company && 'border-red-500')}
                />
                {errors.company && (
                  <p className="mt-1 text-xs text-red-500">{errors.company.message}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="jobTitle"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Job title
                </label>
                <Input
                  id="jobTitle"
                  placeholder="Data Engineer"
                  {...register('jobTitle')}
                />
              </div>
            </div>

            {/* Company size */}
            <div>
              <label
                htmlFor="companySize"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Company size
              </label>
              <select
                id="companySize"
                {...register('companySize')}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select company size</option>
                {companySizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Interest */}
            <div>
              <label
                htmlFor="interest"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                What are you interested in? <span className="text-red-500">*</span>
              </label>
              <select
                id="interest"
                {...register('interest')}
                className={cn(
                  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.interest && 'border-red-500'
                )}
              >
                <option value="">Select your interest</option>
                {interestOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.interest && (
                <p className="mt-1 text-xs text-red-500">{errors.interest.message}</p>
              )}
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Message
              </label>
              <Textarea
                id="message"
                placeholder="Tell us about your data challenges..."
                rows={4}
                {...register('message')}
              />
            </div>

            {/* Newsletter opt-in */}
            <div className="flex items-start gap-3">
              <Checkbox id="newsletter" {...register('newsletter')} />
              <label
                htmlFor="newsletter"
                className="text-sm text-muted-foreground leading-tight"
              >
                Subscribe to our newsletter for product updates, tips, and data engineering insights.
              </label>
            </div>

            {/* Submit button */}
            <MagneticButton
              type="submit"
              variant="gradient"
              size="lg"
              glow
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Send Message
                </>
              )}
            </MagneticButton>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ContactForm;
