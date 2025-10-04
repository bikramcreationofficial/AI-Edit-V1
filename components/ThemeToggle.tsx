import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { SunIcon, MoonIcon } from './icons';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="relative inline-flex items-center h-8 w-14 cursor-pointer rounded-full bg-border-light dark:bg-border-dark transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-primary-dark"
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`${
          theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
        } inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out`}
      >
        {theme === 'dark' ? (
          <SunIcon className="w-4 h-4 text-warning-light" />
        ) : (
          <MoonIcon className="w-4 h-4 text-subtext-light" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;