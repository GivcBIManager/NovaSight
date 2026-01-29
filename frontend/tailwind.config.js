/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // NovaSight Extended Colors
        'bg-primary': 'hsl(var(--color-bg-primary))',
        'bg-secondary': 'hsl(var(--color-bg-secondary))',
        'bg-tertiary': 'hsl(var(--color-bg-tertiary))',
        'bg-elevated': 'hsl(var(--color-bg-elevated))',
        'accent-indigo': 'hsl(var(--color-accent-indigo))',
        'accent-purple': 'hsl(var(--color-accent-purple))',
        'accent-violet': 'hsl(var(--color-accent-violet))',
        'neon-cyan': 'hsl(var(--color-neon-cyan))',
        'neon-pink': 'hsl(var(--color-neon-pink))',
        'neon-green': 'hsl(var(--color-neon-green))',
        success: 'hsl(var(--color-success))',
        warning: 'hsl(var(--color-warning))',
        error: 'hsl(var(--color-error))',
        info: 'hsl(var(--color-info))',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
        'sidebar-expanded': 'var(--sidebar-width-expanded)',
        'header': 'var(--header-height)',
        'mobile-nav': 'var(--mobile-nav-height)',
        'touch-target': 'var(--touch-target-min)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
      },
      boxShadow: {
        'glow-sm': 'var(--shadow-glow-sm)',
        'glow-md': 'var(--shadow-glow-md)',
        'glow-lg': 'var(--shadow-glow-lg)',
        'glow-neon': 'var(--shadow-glow-neon)',
        'glow-pink': 'var(--shadow-glow-pink)',
      },
      backdropBlur: {
        'glass': 'var(--glass-blur)',
        'glass-lg': 'var(--glass-blur-lg)',
      },
      transitionDuration: {
        'micro': 'var(--duration-micro)',
        'base': 'var(--duration-base)',
        'slow': 'var(--duration-slow)',
        'slower': 'var(--duration-slower)',
      },
      transitionTimingFunction: {
        'out-expo': 'var(--ease-out-expo)',
        'out-back': 'var(--ease-out-back)',
        'spring': 'var(--ease-spring)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'ai-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 5px hsl(var(--color-accent-purple) / 0.4), 0 0 20px hsl(var(--color-accent-purple) / 0.2), 0 0 40px hsl(var(--color-accent-purple) / 0.1)',
          },
          '50%': {
            boxShadow: '0 0 10px hsl(var(--color-accent-purple) / 0.6), 0 0 30px hsl(var(--color-accent-purple) / 0.4), 0 0 60px hsl(var(--color-accent-purple) / 0.2)',
          },
        },
        'gradient-flow': {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-20px) translateX(10px)' },
          '50%': { transform: 'translateY(-10px) translateX(-10px)' },
          '75%': { transform: 'translateY(-25px) translateX(5px)' },
        },
        'typing-dot': {
          '0%, 20%': { opacity: '0.3', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-4px)' },
          '80%, 100%': { opacity: '0.3', transform: 'translateY(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-down': {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'ai-pulse': 'ai-pulse 2s ease-in-out infinite',
        'gradient-flow': 'gradient-flow 8s ease infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'typing-dot': 'typing-dot 1.4s ease-in-out infinite',
        'fade-up': 'fade-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-down': 'fade-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shake': 'shake 0.5s ease-in-out',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, hsl(var(--color-accent-indigo)), hsl(var(--color-accent-purple)))',
        'gradient-accent': 'linear-gradient(135deg, hsl(var(--color-accent-purple)), hsl(var(--color-accent-violet)))',
        'gradient-neon': 'linear-gradient(135deg, hsl(var(--color-neon-cyan)), hsl(var(--color-neon-pink)))',
        'gradient-ai': 'linear-gradient(90deg, hsl(var(--color-accent-purple)), hsl(var(--color-neon-pink)), hsl(var(--color-accent-purple)))',
        'gradient-glow': 'radial-gradient(ellipse at center, hsl(var(--color-accent-indigo) / 0.15) 0%, transparent 70%)',
        'grid-pattern': 'linear-gradient(to right, hsl(var(--color-border-subtle)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--color-border-subtle)) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
