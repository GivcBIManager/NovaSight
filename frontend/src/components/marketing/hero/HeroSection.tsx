/**
 * HeroSection Component
 * 
 * Cinematic hero section with layered backgrounds, animated content,
 * and interactive elements. Responsive optimizations for mobile.
 */

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GridBackground } from '@/components/backgrounds/GridBackground';
import { NeuralNetwork } from '@/components/backgrounds/NeuralNetwork';
import { GlowOrb, MagneticButton, FloatingElements, TextReveal } from '@/components/marketing/effects';
import { LogoCloud } from '@/components/marketing/shared';
import { HeroBadge } from './HeroBadge';
import { HeroVisual } from './HeroVisual';
import { useIsMobile } from '@/hooks';

export interface HeroSectionProps {
  /** Additional CSS classes */
  className?: string;
}

// Sample logos for the logo cloud
const sampleLogos = [
  { id: '1', name: 'Company 1', component: <span className="text-lg font-semibold text-muted-foreground">TechCorp</span> },
  { id: '2', name: 'Company 2', component: <span className="text-lg font-semibold text-muted-foreground">DataFlow</span> },
  { id: '3', name: 'Company 3', component: <span className="text-lg font-semibold text-muted-foreground">CloudBI</span> },
  { id: '4', name: 'Company 4', component: <span className="text-lg font-semibold text-muted-foreground">InsightAI</span> },
  { id: '5', name: 'Company 5', component: <span className="text-lg font-semibold text-muted-foreground">Analytix</span> },
  { id: '6', name: 'Company 6', component: <span className="text-lg font-semibold text-muted-foreground">MetricHub</span> },
];

export function HeroSection({ className }: HeroSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // Reduce complexity on mobile for performance
  const neuralNetworkNodeCount = isMobile ? 30 : 80;
  const floatingElementsCount = isMobile ? 3 : 15;

  // Animation variants with staggered timing
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
    },
  };

  return (
    <section
      id="hero"
      className={cn(
        'relative min-h-screen overflow-hidden bg-bg-primary pt-20',
        className
      )}
    >
      {/* Layer 0: Base background */}
      <div className="absolute inset-0 bg-bg-primary" aria-hidden="true" />

      {/* Layer 1: Grid background */}
      <GridBackground gridOpacity={0.03} showOrbs={false} showGradient={false} />

      {/* Layer 2: Neural network - reduced nodes on mobile */}
      <div className="absolute inset-0 opacity-60" aria-hidden="true">
        <NeuralNetwork nodeCount={neuralNetworkNodeCount} interactive={!isMobile} speed={0.3} />
      </div>

      {/* Layer 3: Purple glow orb - top left */}
      <GlowOrb
        color="purple"
        size="lg"
        position={{ top: '-10%', left: '-5%' }}
        intensity={0.2}
      />

      {/* Layer 4: Cyan glow orb - bottom right */}
      <GlowOrb
        color="cyan"
        size="lg"
        position={{ bottom: '-10%', right: '-5%' }}
        intensity={0.15}
      />

      {/* Layer 5: Floating decorative elements - reduced on mobile */}
      <div className="absolute inset-0 opacity-40" aria-hidden="true">
        <FloatingElements count={floatingElementsCount} sizeRange={[4, 12]} />
      </div>

      {/* Layer 6: Content */}
      <div className="relative z-10">
        <motion.div
          className="container mx-auto px-4 py-16 sm:py-20 md:py-24 lg:py-28"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div
            className="mb-6 flex justify-center"
            variants={itemVariants}
          >
            <HeroBadge
              icon={<Rocket className="h-4 w-4" />}
              text="Now with AI-Powered Query Generation"
              animate
            />
          </motion.div>

          {/* Headline */}
          <motion.div className="mb-6 text-center" variants={itemVariants}>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              <TextReveal
                text="Transform Your Raw Data Into"
                as="span"
                className="inline justify-center"
                delay={0.4}
              />{' '}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Actionable Intelligence
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="mx-auto mb-10 max-w-2xl text-center text-lg text-muted-foreground sm:text-xl"
            variants={itemVariants}
          >
            The modern BI platform that connects, transforms, and visualizes your data
            — powered by AI, secured by design.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6"
            variants={itemVariants}
          >
            <Link to="/register">
              <MagneticButton variant="gradient" size="lg" glow>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </MagneticButton>
            </Link>
            <MagneticButton variant="outline" size="lg">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </MagneticButton>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: prefersReducedMotion ? 0 : 1.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <HeroVisual />
          </motion.div>

          {/* Logo Cloud */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: prefersReducedMotion ? 0 : 1.6,
            }}
          >
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Trusted by data-driven teams worldwide
            </p>
            <LogoCloud logos={sampleLogos} variant="grid" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
