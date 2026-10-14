'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Moon, Sun } from "@/components/icons";
import { cn } from '@/lib/utils';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const ThemeSelector = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-brand-950',
        'disabled:cursor-wait disabled:opacity-60',
        isDark
          ? 'border-brand-800 bg-brand-900 text-amber-300 hover:border-accent-500/50 hover:bg-brand-800'
          : 'border-neutral-200 bg-white text-brand-700 hover:border-accent-300 hover:bg-accent-50 hover:text-accent-600'
      )}
    >
      {isDark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
};

export default ThemeSelector;
