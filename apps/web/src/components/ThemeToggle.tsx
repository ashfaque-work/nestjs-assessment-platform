import { useState } from 'react';

// Switches between light and dark; the choice is remembered on this device
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* not remembered, still applied */
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Use light theme' : 'Use dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className="grid size-9 place-items-center rounded-md text-graphite-soft hover:bg-rule/60 hover:text-graphite"
    >
      <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden="true">
        {/* A half-filled bubble: pencil on one side, paper on the other */}
        <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d={dark ? 'M10 2.75a7.25 7.25 0 0 1 0 14.5z' : 'M10 2.75a7.25 7.25 0 0 0 0 14.5z'} fill="currentColor" />
      </svg>
    </button>
  );
}
