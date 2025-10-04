import React, { useRef, useState } from 'react';
import type { Product, AspectRatio } from '../types';
import { UploadIcon, TrashIcon, SwitchHorizontalIcon } from './icons';
import Spinner from './Spinner';

interface ProductUploaderProps {
  products: Product[];
  onFilesSelect: (files: FileList) => void;
  onProductRemove: (id: string) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
}

const aspectRatios: AspectRatio[] = ['9:16', '1:1', '16:9', '3:4', '4:3'];

const ProductUploader: React.FC<ProductUploaderProps> = ({ products, onFilesSelect, onProductRemove, aspectRatio, onAspectRatioChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFilesSelect(event.target.files);
       // Reset the input value to allow re-uploading the same file
      event.target.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onFilesSelect(event.dataTransfer.files);
      event.dataTransfer.clearData();
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => e.preventDefault();
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => e.preventDefault();
  
  return (
    <div className="bg-surface-light dark:bg-galaxy-purple p-6 rounded-2xl shadow-sm border border-border-light dark:border-transparent">
      <h2 className="text-lg font-bold mb-4 flex items-center">
        <span className="bg-rose-candy dark:bg-primary-dark text-on-primary-light dark:text-on-primary-dark rounded-full w-7 h-7 flex items-center justify-center font-bold mr-3">1</span>
        Upload & Setup
      </h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Poster Aspect Ratio</label>
        <div className="flex flex-wrap gap-2">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio}
              onClick={() => onAspectRatioChange(ratio)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                aspectRatio === ratio
                  ? 'bg-rose-candy dark:bg-primary-dark text-on-primary-light dark:text-on-primary-dark'
                  : 'bg-bkg-light dark:bg-bkg-dark hover:bg-border-light dark:hover:bg-border-dark'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <label 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        htmlFor="product-upload" 
        className="cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg hover:bg-bkg-light dark:hover:bg-bkg-dark transition-colors"
      >
        <UploadIcon className="w-8 h-8 text-subtext-light dark:text-subtext-dark mb-2" />
        <p className="text-sm text-subtext-light dark:text-subtext-dark">
          <span className="font-semibold text-primary-light dark:text-primary-dark">Click to upload product</span>
        </p>
        <p className="text-xs text-subtext-light dark:text-subtext-dark">or drag and drop</p>
      </label>
      <input
        ref={fileInputRef}
        id="product-upload"
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {products.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div key={product.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border-light dark:border-border-dark">
              <img 
                src={showOriginal[product.id] ? product.original : (product.processed || product.original)} 
                alt="Product" 
                className="w-full h-full object-contain"
              />
              {product.isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Spinner size="sm"/>
                </div>
              )}
               <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
                 {product.processed && !product.isProcessing && (
                    <button
                        onClick={() => setShowOriginal(prev => ({...prev, [product.id]: !prev[product.id]}))}
                        className="bg-black/50 text-white p-1 rounded-full hover:bg-primary-light dark:hover:bg-primary-dark transition-colors"
                        aria-label="Toggle before/after view"
                        title="Toggle before/after"
                    >
                        <SwitchHorizontalIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onProductRemove(product.id)}
                    className="bg-black/50 text-white p-1 rounded-full hover:bg-error-light dark:hover:bg-error-dark transition-colors"
                    aria-label="Remove product"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductUploader;