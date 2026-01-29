/**
 * NeuralNetwork Background Component
 * 
 * Animated neural network visualization with nodes and connections.
 * Creates an AI-inspired technology aesthetic.
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Connection {
  from: number;
  to: number;
  distance: number;
}

interface NeuralNetworkProps {
  /** Additional CSS classes */
  className?: string;
  /** Number of nodes */
  nodeCount?: number;
  /** Maximum connection distance in pixels */
  connectionDistance?: number;
  /** Node radius in pixels */
  nodeRadius?: number;
  /** Animation speed multiplier */
  speed?: number;
  /** Enable mouse interaction */
  interactive?: boolean;
  /** Fixed positioning (covers viewport) */
  fixed?: boolean;
}

export function NeuralNetwork({
  className,
  nodeCount = 50,
  connectionDistance = 150,
  nodeRadius = 3,
  speed = 0.5,
  interactive = true,
  fixed = false,
}: NeuralNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize nodes
    const initNodes = () => {
      nodesRef.current = Array.from({ length: nodeCount }, (_, i) => ({
        id: i,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
      }));
    };

    initNodes();

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

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      const mouse = mouseRef.current;

      // Update node positions
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Keep in bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));

        // Mouse attraction/repulsion
        if (interactive) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 200) {
            const force = (200 - dist) / 200;
            node.vx += (dx / dist) * force * 0.02;
            node.vy += (dy / dist) * force * 0.02;
          }
        }

        // Limit velocity
        const maxSpeed = speed * 2;
        const currentSpeed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (currentSpeed > maxSpeed) {
          node.vx = (node.vx / currentSpeed) * maxSpeed;
          node.vy = (node.vy / currentSpeed) * maxSpeed;
        }
      });

      // Find and draw connections
      const connections: Connection[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            connections.push({ from: i, to: j, distance });
          }
        }
      }

      // Draw connections
      connections.forEach(({ from, to, distance }) => {
        const opacity = 1 - distance / connectionDistance;
        ctx.strokeStyle = `rgba(99, 102, 241, ${opacity * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodes[from].x, nodes[from].y);
        ctx.lineTo(nodes[to].x, nodes[to].y);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node) => {
        // Calculate glow based on connections
        const nodeConnections = connections.filter(
          (c) => c.from === node.id || c.to === node.id
        );
        const glowIntensity = Math.min(nodeConnections.length / 5, 1);

        // Glow
        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          nodeRadius * 4
        );
        gradient.addColorStop(0, `rgba(99, 102, 241, ${0.3 * glowIntensity})`);
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Node
        ctx.fillStyle = `rgba(139, 92, 246, ${0.6 + glowIntensity * 0.4})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      });

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
  }, [nodeCount, connectionDistance, nodeRadius, speed, interactive]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'pointer-events-none select-none overflow-hidden',
        fixed ? 'fixed inset-0' : 'absolute inset-0',
        interactive && 'pointer-events-auto',
        className
      )}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

export default NeuralNetwork;
