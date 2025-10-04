

import React, { useState, useEffect } from 'react';
import type { Poster, ImageFilters } from '../types';
import Spinner from './Spinner';
import { WandIcon, ZoomInIcon, ZoomOutIcon, ResetZoomIcon, ArrowsPointingOutIcon } from './icons';

interface PosterDisplayProps {
  activePoster: Poster | null;
  onRefine: (refinementPrompt: string) => void;
  onPreview: () => void;
  isLoading: boolean;
  isModifying: boolean;
  refinementVariations: Poster[];
  onConfirmRefinement: (poster: Poster) => void;
  onCancelRefinement: () => void;
  filters: ImageFilters;
}

const PosterDisplay: React.FC<PosterDisplayProps> = ({ 
    activePoster, onRefine, onPreview,
    isLoading, isModifying, refinementVariations, onConfirmRefinement, 
    onCancelRefinement, filters 
}) => {
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [scale, setScale] = useState(1);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);

  useEffect(() => {
    if (refinementVariations.length > 0 && !selectedVariationId) {
        setSelectedVariationId(refinementVariations[0].id);
    }
  }, [refinementVariations, selectedVariationId]);
  
  useEffect(() => {
    setScale(1);
  }, [activePoster?.id]);

  const handleRefineClick = () => {
    if (refinementPrompt.trim() && activePoster && !isModifying) {
      onRefine(refinementPrompt);
      setRefinementPrompt('');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRefineClick();
  };

  const handleConfirm = () => {
    const selected = refinementVariations.find(p => p.id === selectedVariationId);
    if(selected) {
        onConfirmRefinement(selected);
        setSelectedVariationId(null);
    }
  };
  
  const handleCancel = () => {
      onCancelRefinement();
      setSelectedVariationId(null);
  };

  const tintStyle = {
    '--tint-color': filters.tint?.color || 'transparent',
    '--tint-amount': filters.tint?.amount || 0,
  } as React.CSSProperties;
  
  if (refinementVariations.length > 0) {
    return (
        <div className="w-full h-full flex flex-col p-4 bg-bkg-light dark:bg-bkg-dark rounded-2xl">
            <h3 className="text-lg font-bold mb-4 text-center">Choose a variation</h3>
            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4 w-full items-center justify-center">
                {refinementVariations.map(variation => (
                    <div 
                        key={variation.id} 
                        onClick={() => setSelectedVariationId(variation.id)}
                        className={`cursor-pointer rounded-lg overflow-hidden ring-4 transition-all duration-200 ${selectedVariationId === variation.id ? 'ring-primary-light dark:ring-primary-dark' : 'ring-transparent hover:ring-border-light dark:hover:ring-border-dark'}`}
                    >
                        <img src={variation.src} alt="Refined variation" className="w-full h-full object-contain max-h-[calc(100vh-25rem)]" />
                    </div>
                ))}
            </div>
            <div className="flex justify-center space-x-4 mt-4">
                <button 
                    onClick={handleCancel} 
                    className="px-6 py-2 rounded-lg bg-bkg-light dark:bg-bkg-dark border border-border-light dark:border-border-dark hover:bg-border-light dark:hover:bg-border-dark transition-colors">
                    Cancel
                </button>
                <button 
                    onClick={handleConfirm} 
                    disabled={!selectedVariationId} 
                    className="px-6 py-2 rounded-lg bg-rose-candy dark:bg-primary-dark text-on-primary-light dark:text-on-primary-dark font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity">
                    Confirm
                </button>
            </div>
        </div>
    )
  }

  return (
    <div className="relative col-span-1 md:col-span-2 bg-bkg-light dark:bg-bkg-dark p-4 rounded-2xl flex flex-col justify-between items-center h-full">
        {isLoading && !activePoster && (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-subtext-light dark:text-subtext-dark">Generating your masterpiece...</p>
                <p className="text-sm text-subtext-light dark:text-subtext-dark mt-2">This can take a moment.</p>
            </div>
        )}

        {!isLoading && !activePoster && (
             <div className="flex flex-col items-center justify-center h-full text-center">
                <WandIcon className="w-16 h-16 text-border-light dark:text-border-dark" />
                <p className="mt-4 text-lg text-subtext-light dark:text-subtext-dark">Your generated poster will appear here.</p>
             </div>
        )}

        {activePoster && (
            <>
                <div className="w-full flex-grow relative mb-4 flex items-center justify-center overflow-hidden group/poster" style={tintStyle}>
                    <img 
                        src={activePoster.src} 
                        alt="Generated Poster" 
                        className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
                        style={{ 
                            transform: `scale(${scale})`, 
                            maxHeight: 'calc(100vh - 250px)',
                            filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`
                        }}
                    />
                    <div className="absolute inset-0 rounded-lg pointer-events-none after:content-[''] after:absolute after:inset-0 after:bg-[var(--tint-color)] after:opacity-[var(--tint-amount)] after:mix-blend-color"></div>

                    {isModifying && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg">
                            <Spinner size="lg" />
                            <p className="mt-4 text-white">Applying AI magic...</p>
                        </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col space-y-2">
                        <button onClick={onPreview} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors" title="Fullscreen">
                            <ArrowsPointingOutIcon className="w-5 h-5" />
                        </button>
                    </div>
                     <div className="absolute bottom-2 right-2 flex items-center space-x-2 bg-black/50 text-white p-1.5 rounded-full">
                        <button onClick={() => setScale(s => s / 1.2)} className="p-1 rounded-full hover:bg-black/70 transition-colors"><ZoomOutIcon className="w-5 h-5" /></button>
                        <button onClick={() => setScale(1)} className="p-1 rounded-full hover:bg-black/70 transition-colors"><ResetZoomIcon className="w-5 h-5" /></button>
                        <button onClick={() => setScale(s => s * 1.2)} className="p-1 rounded-full hover:bg-black/70 transition-colors"><ZoomInIcon className="w-5 h-5" /></button>
                    </div>
                </div>
                
                <div className="w-full">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={refinementPrompt}
                            onChange={(e) => setRefinementPrompt(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="e.g., Change the background to a beach sunset"
                            className="flex-grow bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:outline-none transition"
                            disabled={isModifying}
                        />
                        <button
                            onClick={handleRefineClick}
                            disabled={!refinementPrompt.trim() || isModifying}
                            className="bg-rose-candy dark:bg-primary-dark text-on-primary-light dark:text-on-primary-dark font-semibold px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                        >
                            Refine
                        </button>
                    </div>
                </div>
            </>
        )}
    </div>
  );
};


export default PosterDisplay;