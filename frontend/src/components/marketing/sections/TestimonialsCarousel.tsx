/**
 * TestimonialsCarousel Component
 * 
 * Auto-rotating carousel of customer testimonials.
 * Includes keyboard navigation and pause on hover.
 */

import * as React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { SectionHeader } from '@/components/marketing/shared';
import { GlassCard } from '@/components/ui/glass-card';

export interface TestimonialsCarouselProps {
  /** Additional CSS classes */
  className?: string;
}

const testimonials = [
  {
    id: 1,
    quote:
      "NovaSight transformed how we handle data analytics. What used to take our team days now happens in minutes. The AI-powered query generation alone has saved us countless hours.",
    author: 'Sarah Chen',
    role: 'VP of Data',
    company: 'TechCorp Industries',
    rating: 5,
  },
  {
    id: 2,
    quote:
      "The multi-tenant architecture gives us the isolation we need while keeping costs manageable. Our clients love having their own secure data environments.",
    author: 'Marcus Rodriguez',
    role: 'CTO',
    company: 'DataFlow Solutions',
    rating: 5,
  },
  {
    id: 3,
    quote:
      "We evaluated a dozen BI platforms before choosing NovaSight. The combination of performance, security, and ease of use is unmatched in the market.",
    author: 'Emily Thompson',
    role: 'Director of Analytics',
    company: 'CloudBI Ventures',
    rating: 5,
  },
  {
    id: 4,
    quote:
      "The dbt integration and Dagster orchestration made our data pipelines so much more reliable. We went from daily data issues to nearly zero incidents.",
    author: 'James Wilson',
    role: 'Data Engineering Lead',
    company: 'InsightAI Labs',
    rating: 5,
  },
  {
    id: 5,
    quote:
      "Finally, a BI tool that doesn't require a PhD to use but is still powerful enough for our advanced analytics needs. The semantic layer is a game-changer.",
    author: 'Priya Patel',
    role: 'Head of Business Intelligence',
    company: 'Analytix Global',
    rating: 5,
  },
];

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

// Star rating component
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4',
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
          )}
        />
      ))}
    </div>
  );
}

export function TestimonialsCarousel({ className }: TestimonialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();
  const intervalRef = React.useRef<ReturnType<typeof setInterval>>();

  // Auto-advance carousel
  React.useEffect(() => {
    if (isPaused || prefersReducedMotion) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, prefersReducedMotion]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className={cn('py-20 md:py-28 lg:py-32', className)}>
      <div className="container mx-auto px-4">
        <SectionHeader
          badge="Testimonials"
          title="Loved by Data Teams Everywhere"
          titleHighlight="Data Teams"
          subtitle="See what our customers have to say about their experience with NovaSight."
          align="center"
          className="mb-16"
        />

        <div
          className="relative mx-auto max-w-4xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="region"
          aria-label="Testimonials carousel"
          aria-roledescription="carousel"
        >
          {/* Testimonial card */}
          <GlassCard variant="elevated" size="xl" className="relative overflow-hidden">
            {/* Decorative quote mark */}
            <Quote
              className="absolute right-4 top-4 h-16 w-16 text-accent-purple/10"
              aria-hidden="true"
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                {/* Rating */}
                <div className="mb-6">
                  <StarRating rating={currentTestimonial.rating} />
                </div>

                {/* Quote */}
                <blockquote className="mb-8 text-lg text-foreground md:text-xl lg:text-2xl">
                  "{currentTestimonial.quote}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-lg font-semibold text-white">
                    {getInitials(currentTestimonial.author)}
                  </div>

                  <div>
                    <p className="font-semibold text-foreground">
                      {currentTestimonial.author}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentTestimonial.role} at {currentTestimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </GlassCard>

          {/* Navigation arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 -translate-x-4 -translate-y-1/2 rounded-full border border-border bg-bg-secondary p-2 text-muted-foreground transition-colors hover:bg-bg-tertiary hover:text-foreground md:-translate-x-12"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full border border-border bg-bg-secondary p-2 text-muted-foreground transition-colors hover:bg-bg-tertiary hover:text-foreground md:translate-x-12"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dot indicators */}
          <div
            className="mt-8 flex justify-center gap-2"
            role="tablist"
            aria-label="Testimonial slides"
          >
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  'h-2 w-2 rounded-full transition-all',
                  index === currentIndex
                    ? 'w-6 bg-accent-purple'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsCarousel;
