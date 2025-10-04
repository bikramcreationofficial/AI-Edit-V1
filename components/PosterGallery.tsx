import React from 'react';
import type { Poster } from '../types';

interface PosterGalleryProps {
  posters: Poster[]; // Expects an array of [current, previous]
  activePosterId: string | null;
  onSelect: (posterId: string) => void;
}

const PosterGallery: React.FC<PosterGalleryProps> = ({ posters, activePosterId, onSelect }) => {
  if (posters.length === 0) {
    return (
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-border-light dark:border-border-dark">
            <h2 className="text-lg font-bold mb-4">Your Edits</h2>
            <p className="text-sm text-subtext-light dark:text-subtext-dark text-center py-8">No edits yet.</p>
        </div>
    );
  }
  
  const current = posters.find(p => p.id === activePosterId);
  const history = posters.filter(p => p.id !== activePosterId);
  const [previous] = history;

  const currentPoster = posters[0];
  const previousPoster = posters[1];


  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-border-light dark:border-border-dark">
      <h2 className="text-lg font-bold mb-4">
        Your Edits
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {currentPoster && (
             <div className="space-y-2">
                <div 
                    onClick={() => onSelect(currentPoster.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${activePosterId === currentPoster.id ? 'border-primary-light dark:border-primary-dark' : 'border-transparent hover:border-border-light dark:hover:border-border-dark'}`}
                >
                    <img src={currentPoster.src} alt="Current poster version" className="w-full h-full object-cover" />
                </div>
                 <p className="text-sm text-center font-semibold text-subtext-light dark:text-subtext-dark">Current</p>
             </div>
        )}
        {previousPoster && (
             <div className="space-y-2">
                <div 
                    onClick={() => onSelect(previousPoster.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${activePosterId === previousPoster.id ? 'border-primary-light dark:border-primary-dark' : 'border-transparent hover:border-border-light dark:hover:border-border-dark'}`}
                >
                    <img src={previousPoster.src} alt="Previous poster version" className="w-full h-full object-cover" />
                </div>
                 <p className="text-sm text-center font-semibold text-subtext-light dark:text-subtext-dark">Previous</p>
             </div>
        )}
      </div>
    </div>
  );
};

export default PosterGallery;