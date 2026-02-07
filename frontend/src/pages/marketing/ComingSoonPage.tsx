/**
 * ComingSoonPage Component
 * 
 * Placeholder page for inner pages that are not yet implemented.
 * Features animated background and newsletter signup.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeuralNetwork } from '@/components/backgrounds/NeuralNetwork';
import { GlowOrb } from '@/components/marketing/effects';
import { NewsletterForm } from '@/components/marketing/shared';
import { Button } from '@/components/ui/button';

export function ComingSoonPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-primary px-4 py-20">
      {/* Background */}
      <div className="absolute inset-0 opacity-50" aria-hidden="true">
        <NeuralNetwork nodeCount={60} speed={0.3} interactive />
      </div>

      {/* Glow orbs */}
      <GlowOrb
        color="purple"
        size="lg"
        position={{ top: '20%', left: '10%' }}
        intensity={0.2}
      />
      <GlowOrb
        color="cyan"
        size="md"
        position={{ bottom: '20%', right: '10%' }}
        intensity={0.15}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        {/* Icon */}
        <motion.div
          className="mb-8 inline-flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="rounded-full bg-gradient-primary p-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            Coming Soon
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mb-8 text-lg text-muted-foreground md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          We're working hard to bring you this page. Subscribe to our newsletter
          to be the first to know when it's ready.
        </motion.p>

        {/* Newsletter form */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <NewsletterForm
            variant="inline"
            placeholder="Enter your email for updates"
            buttonText="Notify Me"
            className="mx-auto max-w-md"
          />
        </motion.div>

        {/* Back to home button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Button asChild variant="outline" size="lg">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Decorative animated elements */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-purple/50 to-transparent" />
    </div>
  );
}

export default ComingSoonPage;
