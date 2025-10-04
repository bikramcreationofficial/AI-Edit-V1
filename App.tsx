import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Product, Poster, AspectRatio, ExpandDirection, ExpandSize, ImageFilters } from './types';
import Header from './components/Header';
import ProductUploader from './components/ProductUploader';
import ConceptInput from './components/ConceptInput';
import PosterDisplay from './components/PosterDisplay';
import PosterGallery from './components/PosterGallery';
import CropTool from './components/CropTool';
import { ThemeProvider } from './hooks/useTheme';
import { removeBackground, generatePoster, refinePoster, getBase64AndMimeType, upscalePoster, expandPoster } from './services/geminiService';
import { XMarkIcon, ZoomInIcon, ZoomOutIcon, ResetZoomIcon } from './components/icons';


// --- Fullscreen Preview Modal ---
interface ImagePreviewModalProps {
  src: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ src, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePosition.current.x;
    const dy = e.clientY - lastMousePosition.current.y;
    setPosition(pos => ({ x: pos.x + dx, y: pos.y + dy }));
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsDragging(false);
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, scale * scaleAmount);
    setScale(newScale);
  };

  const reset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" 
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt="Fullscreen Preview"
          className="max-w-[90vw] max-h-[90vh] transition-transform duration-200 select-none"
          style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
      
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
        <XMarkIcon className="w-6 h-6" />
      </button>
      
      <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-black/50 text-white p-1.5 rounded-full">
          <button onClick={() => setScale(s => s * 0.8)} className="p-2 rounded-full hover:bg-black/70 transition-colors"><ZoomOutIcon className="w-5 h-5" /></button>
          <button onClick={reset} className="p-2 rounded-full hover:bg-black/70 transition-colors"><ResetZoomIcon className="w-5 h-5" /></button>
          <button onClick={() => setScale(s => s * 1.2)} className="p-2 rounded-full hover:bg-black/70 transition-colors"><ZoomInIcon className="w-5 h-5" /></button>
      </div>
    </div>
  );
};


// --- Image Editor Component ---
const TINT_COLORS = [
    { name: 'Sepia', color: '#704214' },
    { name: 'Cool', color: '#00a1d9' },
    { name: 'Warm', color: '#ff8c00' },
    { name: 'Emerald', color: '#009b77' },
    { name: 'Rose', color: '#ff007f' },
];

interface ImageEditorProps {
  filters: ImageFilters;
  onFilterChange: (filters: ImageFilters) => void;
  onApply: () => void;
  onReset: () => void;
  disabled: boolean;
}

const Slider: React.FC<{label: string; value: number; min: string; max: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; unit?: string;}> = ({ label, value, min, max, onChange, unit = '' }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <label className="text-sm font-medium text-text-light dark:text-text-dark">{label}</label>
      <span className="text-xs text-subtext-light dark:text-subtext-dark">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={onChange}
      className="w-full h-2 bg-border-light dark:bg-border-dark rounded-lg appearance-none cursor-pointer accent-primary-light dark:accent-primary-dark"
    />
  </div>
);

const ImageEditor: React.FC<ImageEditorProps> = ({ filters, onFilterChange, onApply, onReset, disabled }) => {
  const handleSliderChange = (filterName: keyof Omit<ImageFilters, 'tint'>, value: string) => {
    onFilterChange({
      ...filters,
      [filterName]: Number(value),
    });
  };

  const handleTintAmountChange = (amount: number) => {
    if (filters.tint) {
      onFilterChange({ ...filters, tint: { ...filters.tint, amount: amount } });
    }
  };

  const handleTintColorChange = (color: string) => {
    onFilterChange({ ...filters, tint: { color, amount: filters.tint?.amount || 0.3 } });
  };
  
  const clearTint = () => {
    onFilterChange({ ...filters, tint: null });
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-border-light dark:border-border-dark">
      <h2 className="text-lg font-bold mb-4">Adjustments</h2>
      <div className="space-y-4">
        <Slider
          label="Brightness"
          value={filters.brightness}
          min="0"
          max="200"
          unit="%"
          onChange={(e) => handleSliderChange('brightness', e.target.value)}
        />
        <Slider
          label="Contrast"
          value={filters.contrast}
          min="0"
          max="200"
          unit="%"
          onChange={(e) => handleSliderChange('contrast', e.target.value)}
        />
        <Slider
          label="Saturation"
          value={filters.saturate}
          min="0"
          max="200"
          unit="%"
          onChange={(e) => handleSliderChange('saturate', e.target.value)}
        />
        <div>
            <label className="block text-sm font-medium mb-2">Color Tint</label>
            <div className="flex flex-wrap gap-2 mb-2">
                {TINT_COLORS.map(c => (
                    <button key={c.name} onClick={() => handleTintColorChange(c.color)} className={`w-6 h-6 rounded-full transition-transform ring-offset-2 ring-offset-surface-light dark:ring-offset-surface-dark ${filters.tint?.color === c.color ? 'ring-2 ring-primary-light dark:ring-primary-dark' : ''} hover:scale-110`} style={{backgroundColor: c.color}} title={c.name} />
                ))}
                <button onClick={clearTint} className="w-6 h-6 rounded-full bg-cover" title="No Tint">
                    <div className="w-full h-full rounded-full bg-bkg-light dark:bg-bkg-dark border border-border-light dark:border-border-dark flex items-center justify-center">
                        <XMarkIcon className="w-4 h-4 text-subtext-light dark:text-subtext-dark" />
                    </div>
                </button>
            </div>
             {filters.tint && (
                <Slider
                    label="Tint Intensity"
                    value={Math.round(filters.tint.amount * 100)}
                    min="0"
                    max="100"
                    unit="%"
                    onChange={(e) => handleTintAmountChange(Number(e.target.value) / 100)}
                />
            )}
        </div>
      </div>
      <div className="flex space-x-2 mt-6">
        <button
            onClick={onReset}
            className="w-full bg-bkg-light dark:bg-bkg-dark border border-border-light dark:border-border-dark text-sm font-semibold py-2 px-4 rounded-lg hover:bg-border-light dark:hover:bg-border-dark transition-colors"
        >
            Reset
        </button>
        <button
            onClick={onApply}
            disabled={disabled}
            className="w-full bg-rose-candy dark:bg-primary-dark text-on-primary-light dark:text-on-primary-dark text-sm font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
            Apply
        </button>
      </div>
    </div>
  );
};
// --- End Image Editor Component ---


const DEFAULT_FILTERS: ImageFilters = {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    tint: null,
};

const aspectRatiosMap: Record<AspectRatio, number> = {
    '9:16': 9 / 16,
    '1:1': 1,
    '16:9': 16 / 9,
    '3:4': 3 / 4,
    '4:3': 4 / 3,
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [activePosterId, setActivePosterId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [isLoading, setIsLoading] = useState({ generating: false, modifying: false });
  const [error, setError] = useState<string | null>(null);
  const [refinementVariations, setRefinementVariations] = useState<Poster[]>([]);
  
  // For live preview of adjustments
  const [pendingFilters, setPendingFilters] = useState<ImageFilters>(DEFAULT_FILTERS);
  
  const [previewModal, setPreviewModal] = useState<{isOpen: boolean, src: string | null}>({isOpen: false, src: null});
  const [posterCropModal, setPosterCropModal] = useState({ isOpen: false, src: null as string | null });

  // For product upload workflow
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [productToCrop, setProductToCrop] = useState<{file: File, fileURL: string} | null>(null);

  // Reset filters when active poster changes
  useEffect(() => {
    setPendingFilters(DEFAULT_FILTERS);
  }, [activePosterId]);

  // Process upload queue
  useEffect(() => {
      if (uploadQueue.length > 0 && !productToCrop) {
          const nextFile = uploadQueue[0];
          setProductToCrop({ file: nextFile, fileURL: URL.createObjectURL(nextFile) });
      }
  }, [uploadQueue, productToCrop]);

  const handleFileSelect = useCallback((files: FileList) => {
    setUploadQueue(q => [...q, ...Array.from(files)]);
  }, []);
  
  const handleApplyProductCrop = useCallback(async (croppedImageSrc: string) => {
    if (!productToCrop) return;

    const { file } = productToCrop;
    const newProduct: Product = {
      id: `${file.name}-${Date.now()}`,
      original: croppedImageSrc, // The cropped version is the new original
      originalMimeType: 'image/jpeg', // Crop tool outputs jpeg
      processed: null,
      isProcessing: true,
    };
    
    setProducts(prev => [...prev, newProduct]);
    setProductToCrop(null); // Close modal
    setUploadQueue(q => q.slice(1)); // Dequeue

    try {
        const blob = await (await fetch(croppedImageSrc)).blob();
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });

        const processedBase64 = await removeBackground(base64, newProduct.originalMimeType);
        const processedSrc = `data:image/png;base64,${processedBase64}`;
        setProducts(prev => prev.map(p => p.id === newProduct.id ? { ...p, processed: processedSrc, isProcessing: false } : p));
    } catch (err) {
        console.error(err);
        setError(`Failed to process image: ${file.name}`);
        setProducts(prev => prev.map(p => p.id === newProduct.id ? { ...p, isProcessing: false } : p));
    }

  }, [productToCrop]);
  
  const handleCancelProductCrop = () => {
    setProductToCrop(null);
    setUploadQueue(q => q.slice(1));
  };

  const handleProductRemove = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleGenerate = useCallback(async (concept: string, referenceImageFile: File | null, posterText: string) => {
    const processedProducts = products.filter(p => p.processed);
    if (processedProducts.length === 0) {
        setError("Please upload and process at least one product image.");
        return;
    }
    
    setIsLoading({ generating: true, modifying: false });
    setError(null);

    try {
      let referenceImage: { base64: string; mimeType: string; } | null = null;
      if (referenceImageFile) {
        referenceImage = await getBase64AndMimeType(referenceImageFile);
      }

      const productData = processedProducts.map(p => {
          const base64 = p.processed!.split(',')[1];
          return { base64, mimeType: 'image/png' };
      });
      
      const posterBase64 = await generatePoster(productData, concept, aspectRatio, referenceImage, posterText);
      const newPoster: Poster = {
        id: `poster-${Date.now()}`,
        src: `data:image/jpeg;base64,${posterBase64}`,
        prompt: concept,
      };
      setPosters(prev => [newPoster, ...prev.slice(0, 1)]); // Keep history to 2
      setActivePosterId(newPoster.id);
      
      if (previewModal.isOpen) {
          setPreviewModal({ isOpen: true, src: newPoster.src });
      }

    } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to generate poster. Please try again.");
    } finally {
        setIsLoading({ generating: false, modifying: false });
    }
  }, [products, aspectRatio, previewModal.isOpen]);

  const handleRefine = useCallback(async (refinementPrompt: string) => {
    const activePoster = posters.find(p => p.id === activePosterId);
    if (!activePoster) return;

    setIsLoading(prev => ({ ...prev, modifying: true }));
    setError(null);
    setRefinementVariations([]);

    try {
        const currentPosterBase64 = activePoster.src.split(',')[1];
        const refinedPosterBase64s = await refinePoster({ base64: currentPosterBase64, mimeType: 'image/jpeg' }, refinementPrompt);
        
        const newPosters: Poster[] = refinedPosterBase64s.map((base64, index) => ({
            id: `poster-variation-${Date.now()}-${index}`,
            src: `data:image/jpeg;base64,${base64}`,
            prompt: refinementPrompt,
        }));
        setRefinementVariations(newPosters);
    } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to refine poster. Please try again.");
    } finally {
        setIsLoading(prev => ({ ...prev, modifying: false }));
    }
  }, [activePosterId, posters]);
  
  const handleImageModification = useCallback(async (modificationFn: () => Promise<string>, prompt: string) => {
    setIsLoading(prev => ({ ...prev, modifying: true }));
    setError(null);
    try {
        const newBase64 = await modificationFn();
        const newPoster: Poster = {
            id: `poster-${Date.now()}`,
            src: `data:image/jpeg;base64,${newBase64}`,
            prompt: prompt,
        };
        setPosters(prev => [newPoster, ...prev.slice(0, 1)]);
        setActivePosterId(newPoster.id);
    } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred during image modification.");
    } finally {
        setIsLoading(prev => ({ ...prev, modifying: false }));
    }
}, []);

const handleApplyFilters = () => {
    const activePoster = posters.find(p => p.id === activePosterId);
    if (!activePoster) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activePoster.src;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { brightness, contrast, saturate, tint } = pendingFilters;
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
        ctx.drawImage(img, 0, 0);

        if (tint && tint.amount > 0) {
            ctx.globalCompositeOperation = 'color';
            ctx.fillStyle = tint.color;
            ctx.globalAlpha = tint.amount;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const newSrc = canvas.toDataURL('image/jpeg');
        const newPoster: Poster = {
            id: `poster-${Date.now()}`,
            src: newSrc,
            prompt: 'Applied image adjustments',
        };
        setPosters(prev => [newPoster, ...prev.slice(0, 1)]);
        setActivePosterId(newPoster.id);
        setPendingFilters(DEFAULT_FILTERS); // Reset after applying
    };
};


const handleUpscale = useCallback((scale: 2 | 4) => {
    const activePoster = posters.find(p => p.id === activePosterId);
    if (!activePoster) return;
    const base64 = activePoster.src.split(',')[1];
    handleImageModification(() => upscalePoster({ base64, mimeType: 'image/jpeg' }, scale), `Upscaled ${scale}x`);
}, [activePosterId, posters, handleImageModification]);

const handleExpand = useCallback((direction: ExpandDirection, size: ExpandSize) => {
    const activePoster = posters.find(p => p.id === activePosterId);
    if (!activePoster) return;
    const base64 = activePoster.src.split(',')[1];
    handleImageModification(() => expandPoster({ base64, mimeType: 'image/jpeg' }, direction, size), `Expanded image (${direction} ${size}%)`);
}, [activePosterId, posters, handleImageModification]);


  const handleConfirmRefinement = (poster: Poster) => {
    setPosters(prev => [poster, ...prev.slice(0, 1)]);
    setActivePosterId(poster.id);
    setRefinementVariations([]);
  };

  const handleCancelRefinement = () => {
    setRefinementVariations([]);
  };

  const handleDownload = (quality: 'standard' | 'large' | 'hq') => {
    const activePoster = posters.find(p => p.id === activePosterId);
    if (!activePoster) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activePoster.src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      let scale = 1;
      if (quality === 'large') scale = 2;
      if (quality === 'hq') scale = 4;
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.download = `poster-${activePoster.id}-${quality}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  }
  
  const handlePreview = () => {
      const activePoster = posters.find(p => p.id === activePosterId);
      if (activePoster) {
          setPreviewModal({ isOpen: true, src: activePoster.src });
      }
  }

  const handleOpenPosterCropModal = () => {
    const activePoster = posters.find(p => p.id === activePosterId);
    if (activePoster) {
        setPosterCropModal({ isOpen: true, src: activePoster.src });
    }
  };

  const handleClosePosterCropModal = () => {
      setPosterCropModal({ isOpen: false, src: null });
  };

  const handleApplyPosterCrop = (croppedImageSrc: string) => {
      const newPoster: Poster = {
          id: `poster-${Date.now()}`,
          src: croppedImageSrc,
          prompt: "Cropped image",
      };
      setPosters(prev => [newPoster, ...prev.slice(0, 1)]);
      setActivePosterId(newPoster.id);
      handleClosePosterCropModal();
  };

  const activePoster = posters.find(p => p.id === activePosterId) || posters[0] || null;

  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            {error && (
                <div className="bg-surface-light dark:bg-surface-dark border border-error-light dark:border-error-dark text-error-light dark:text-error-dark px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                    <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close error">
                        <XMarkIcon className="h-6 w-6 text-error-light dark:text-error-dark"/>
                    </button>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full items-start">
                <div className="lg:col-span-1 col-span-1 space-y-6">
                    <ProductUploader 
                      products={products} 
                      onFilesSelect={handleFileSelect}
                      onProductRemove={handleProductRemove}
                      aspectRatio={aspectRatio}
                      onAspectRatioChange={setAspectRatio}
                    />
                    <ConceptInput 
                      onGenerate={handleGenerate} 
                      isLoading={isLoading.generating}
                      disabled={products.every(p => !p.processed)}
                    />
                </div>
                
                <div className="lg:col-span-3 col-span-1 lg:sticky top-20 lg:h-[calc(100vh-7rem)]">
                    <PosterDisplay
                      activePoster={activePoster}
                      onRefine={handleRefine}
                      onPreview={handlePreview}
                      isLoading={isLoading.generating && !activePoster}
                      isModifying={isLoading.modifying}
                      refinementVariations={refinementVariations}
                      onConfirmRefinement={handleConfirmRefinement}
                      onCancelRefinement={handleCancelRefinement}
                      filters={pendingFilters}
                    />
                </div>

                <div className="lg:col-span-1 col-span-1 space-y-6">
                    <ImageEditor 
                        filters={pendingFilters}
                        onFilterChange={setPendingFilters}
                        onReset={() => setPendingFilters(DEFAULT_FILTERS)}
                        onApply={handleApplyFilters}
                        disabled={!activePoster}
                    />
                    <PosterGallery 
                      posters={posters.slice(0, 2)}
                      activePosterId={activePoster?.id || null}
                      onSelect={setActivePosterId}
                    />
                </div>
            </div>
        </main>
        {previewModal.isOpen && previewModal.src && (
            <ImagePreviewModal src={previewModal.src} onClose={() => setPreviewModal({isOpen: false, src: null})} />
        )}
        {posterCropModal.isOpen && posterCropModal.src && (
            <CropTool 
                src={posterCropModal.src}
                onClose={handleClosePosterCropModal}
                onCrop={handleApplyPosterCrop}
            />
        )}
        {productToCrop && (
            <CropTool
                src={productToCrop.fileURL}
                onClose={handleCancelProductCrop}
                onCrop={handleApplyProductCrop}
                aspectRatio={aspectRatiosMap[aspectRatio]}
            />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;