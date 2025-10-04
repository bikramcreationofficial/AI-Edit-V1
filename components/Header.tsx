
import React from 'react';
import ThemeToggle from './ThemeToggle';
import { WandIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-sm border-b border-border-light dark:border-border-dark z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <WandIcon className="w-7 h-7 text-primary-light dark:text-primary-dark" />
            <h1 className="text-xl font-bold tracking-tight text-text-light dark:text-text-dark">
              AI Edit
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
