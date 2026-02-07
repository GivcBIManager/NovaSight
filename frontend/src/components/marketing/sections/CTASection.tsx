/**
 * CTASection Component
 * 
 * Full-width call-to-action section with gradient background.
 * Includes decorative elements and trust badges.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ArrowRight, Calendar, Check } from 'lucide-react';
import { NeuralNetwork } from '@/components/backgrounds/NeuralNetwork';
import { GlowOrb, MagneticButton, TextReveal } from '@/components/marketing/effects';

export interface CTASectionProps {
  /** Additional CSS classes */
  className?: string;
}

const trustBadges = [
  { icon: '🎁', text: 'Free tier available' },
  { icon: '💳', text: 'No credit card required' },
  { icon: '⚡', text: '5-minute setup' },
  { icon: '✕', text: 'Cancel anytime' },
];

export function CTASection({ className }: CTASectionProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden py-20 md:py-28 lg:py-32',
        className
      )}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-accent-indigo/20 via-accent-purple/15 to-neon-cyan/10"
        aria-hidden="true"
      />

      {/* Neural network at low opacity */}
      <div className="absolute inset-0 opacity-30" aria-hidden="true">
        <NeuralNetwork nodeCount={40} speed={0.2} interactive={false} />
      </div>

      {/* Glow orbs */}
      <GlowOrb
        color="purple"
        size="lg"
        position={{ top: '10%', left: '10%' }}
        intensity={0.25}
      />
      <GlowOrb
        color="cyan"
        size="lg"
        position={{ bottom: '10%', right: '10%' }}
        intensity={0.2}
      />

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Title */}
          <motion.h2
            className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <TextReveal
              text="Ready to Transform Your"
              as="span"
              className="inline justify-center"
            />{' '}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Data?
            </span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            className="mb-10 text-lg text-muted-foreground md:text-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Join hundreds of data-driven teams who have already made the switch.
            Start building today.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link to="/register">
              <MagneticButton variant="gradient" size="lg" glow>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </MagneticButton>
            </Link>
            <Link to="/contact">
              <MagneticButton variant="outline" size="lg">
                <Calendar className="mr-2 h-5 w-5" />
                Book a Demo
              </MagneticButton>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 md:gap-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {trustBadges.map((badge, index) => (
              <motion.div
                key={badge.text}
                className="flex items-center gap-2 text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
              >
                <span className="text-base" aria-hidden="true">
                  {badge.icon}
                </span>
                <span>{badge.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default CTASection;
