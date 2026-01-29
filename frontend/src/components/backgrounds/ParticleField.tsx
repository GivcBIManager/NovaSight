/**
 * ParticleField Background Component
 * 
 * Canvas-based particle system with mouse interaction.
 * Creates a dynamic, technology-inspired background effect.
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface ParticleFieldProps {
  /** Additional CSS classes */
  className?: string;
  /** Number of particles */
  particleCount?: number;
  /** Particle colors (array of HSL values) */
  colors?: string[];
  /** Enable mouse interaction */
  interactive?: boolean;
  /** Connection line opacity (0-1) */
  lineOpacity?: number;
  /** Maximum connection distance */
  connectionDistance?: number;
  /** Particle speed multiplier */
  speed?: number;
  /** Fixed positioning */
  fixed?: boolean;
}

export function ParticleField({
  className,
  particleCount = 80,
  colors = ['239 84% 67%', '258 90% 66%', '187 94% 53%'],
  interactive = true,
  lineOpacity = 0.15,
  connectionDistance = 120,
  speed = 0.3,
  fixed = false,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width;
      canvas.height = height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
    };

    initParticles();

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    if (interactive) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    // Animation
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Update and draw particles
      particles.forEach((p, i) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Mouse interaction - repel
        if (interactive) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            const force = (100 - dist) / 100;
            p.vx += (dx / dist) * force * 0.5;
            p.vy += (dy / dist) * force * 0.5;
          }
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Restore velocity
        if (Math.abs(p.vx) < speed * 0.5) {
          p.vx += (Math.random() - 0.5) * 0.1;
        }
        if (Math.abs(p.vy) < speed * 0.5) {
          p.vy += (Math.random() - 0.5) * 0.1;
        }

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * lineOpacity;
            ctx.strokeStyle = `hsla(${p.color} / ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw particle
        ctx.fillStyle = `hsla(${p.color} / ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw mouse glow
      if (interactive && mouse.x > 0 && mouse.y > 0) {
        const gradient = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          150
        );
        gradient.addColorStop(0, 'hsla(239 84% 67% / 0.1)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 150, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (interactive) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particleCount, colors, interactive, lineOpacity, connectionDistance, speed]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'select-none overflow-hidden',
        fixed ? 'fixed inset-0' : 'absolute inset-0',
        interactive ? 'pointer-events-auto' : 'pointer-events-none',
        className
      )}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

export default ParticleField;
