/**
 * ThemeToggle Component
 * 
 * Toggle between light and dark themes with smooth animations.
 * Persists preference to localStorage and respects system preference.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  /** Additional CSS classes */
  className?: string;
  /** Show dropdown with system option */
  showDropdown?: boolean;
  /** Size of the toggle button */
  size?: 'sm' | 'default' | 'lg';
}

const THEME_KEY = 'novasight-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
}

export function ThemeToggle({
  className,
  showDropdown = false,
  size = 'default',
}: ThemeToggleProps) {
  const [theme, setTheme] = React.useState<Theme>('system');
  const [mounted, setMounted] = React.useState(false);

  // Initialize theme on mount
  React.useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (getStoredTheme() === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const resolvedCurrent =
      theme === 'system' ? getSystemTheme() : theme;
    const newTheme = resolvedCurrent === 'dark' ? 'light' : 'dark';
    updateTheme(newTheme);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : 'icon'}
        className={cn('relative', className)}
        aria-label="Toggle theme"
      >
        <div className="h-5 w-5" />
      </Button>
    );
  }

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  const isDark = resolvedTheme === 'dark';

  const iconVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0 },
    exit: { scale: 0, rotate: 180 },
  };

  if (showDropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : 'icon'}
            className={cn('relative', className)}
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.div
                  key="moon"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => updateTheme('light')}
            className={cn(theme === 'light' && 'bg-accent')}
          >
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateTheme('dark')}
            className={cn(theme === 'dark' && 'bg-accent')}
          >
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateTheme('system')}
            className={cn(theme === 'system' && 'bg-accent')}
          >
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : 'icon'}
      onClick={toggleTheme}
      className={cn('relative overflow-hidden', className)}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Moon className="h-5 w-5" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Sun className="h-5 w-5" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}

export default ThemeToggle;
