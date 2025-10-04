import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { AspectRatio } from '../types';
import { ResetIcon, XMarkIcon } from './icons';

const aspectRatios: { label: AspectRatio, value: number }[] = [
  { label: '9:16', value: 9 / 16 },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:4', value: 3 / 4 },
  { label: '4:3', value: 4 / 3 },
];

interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropToolProps {
  src: string;
  onCrop: (croppedImageBase64: string) => void;
  onClose: () => void;
  aspectRatio?: number;
}

const CropTool: React.FC<CropToolProps> = ({ src, onCrop, onClose, aspectRatio }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, width: 100, height: 100 });
  const [activeAspectRatio, setActiveAspectRatio] = useState<number | null>(aspectRatio || null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const resetCropToAspectRatio = useCallback((ratio: number | null) => {
      const { width: imgW, height: imgH } = imageSize;
      if (imgW === 0 || imgH === 0) return;

      if (ratio === null) {
          setCrop({ x: 0, y: 0, width: imgW, height: imgH });
          return;
      }
      
      let newW = imgW;
      let newH = newW / ratio;
      
      if (newH > imgH) {
        newH = imgH;
        newW = imgH * ratio;
      }
  
      const newX = (imgW - newW) / 2;
      const newY = (imgH - newH) / 2;
      setCrop({ x: newX, y: newY, width: newW, height: newH });
  }, [imageSize]);

  // Load image and initialize crop
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const size = { width: img.naturalWidth, height: img.naturalHeight };
      setImageSize(size);
      
      // Initialize crop based on aspect ratio
      if (activeAspectRatio) {
        let newW = size.width;
        let newH = newW / activeAspectRatio;
        if (newH > size.height) {
            newH = size.height;
            newW = newH * activeAspectRatio;
        }
        setCrop({ x: (size.width - newW) / 2, y: (size.height - newH) / 2, width: newW, height: newH });
      } else {
        setCrop({ x: 0, y: 0, width: size.width, height: size.height });
      }
    };
  }, [src, activeAspectRatio]);

  // Draw preview
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (canvas && image && crop.width > 0 && crop.height > 0) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = crop.width;
      canvas.height = crop.height;
      ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    }
  }, [crop, imageSize]);

  const getClientPos = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  const handleInteractionStart = (
    e: React.MouseEvent | React.TouchEvent,
    handler: (startX: number, startY: number, startCrop: Crop) => (e: MouseEvent | TouchEvent) => void
  ) => {
      e.preventDefault();
      e.stopPropagation();
      if (!containerRef.current) return;
      const { x: startX, y: startY } = getClientPos(e.nativeEvent);

      const moveHandler = handler(startX, startY, crop);
      
      const upHandler = () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', upHandler);
      };

      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      document.addEventListener('touchmove', moveHandler);
      document.addEventListener('touchend', upHandler);
  };
  
  const getScale = () => {
      if (!imageRef.current || !containerRef.current) return { scaleX: 1, scaleY: 1 };
      return {
          scaleX: imageSize.width / containerRef.current.offsetWidth,
          scaleY: imageSize.height / containerRef.current.offsetHeight,
      };
  }

  const handleDrag = (startX: number, startY: number, startCrop: Crop) => (e: MouseEvent | TouchEvent) => {
    const { x, y } = getClientPos(e);
    const { scaleX, scaleY } = getScale();
    const deltaX = (x - startX) * scaleX;
    const deltaY = (y - startY) * scaleY;
    
    let newX = startCrop.x + deltaX;
    let newY = startCrop.y + deltaY;

    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + startCrop.width > imageSize.width) newX = imageSize.width - startCrop.width;
    if (newY + startCrop.height > imageSize.height) newY = imageSize.height - startCrop.height;

    setCrop(c => ({ ...c, x: newX, y: newY }));
  };

  const handleResize = (startX: number, startY: number, startCrop: Crop, handle: string) => (e: MouseEvent | TouchEvent) => {
      const { x, y } = getClientPos(e);
      const { scaleX, scaleY } = getScale();
      let deltaX = (x - startX) * scaleX;
      let deltaY = (y - startY) * scaleY;

      let { x: newX, y: newY, width: newW, height: newH } = startCrop;
      const aspect = activeAspectRatio;

      if (aspect) {
          const changeX = handle.includes('l') || handle.includes('r');
          const changeY = handle.includes('t') || handle.includes('b');

          if (changeX && changeY) { // Corner handles
              if (Math.abs(deltaX) > Math.abs(deltaY * aspect)) {
                  deltaY = (handle.includes('t') ? -1 : 1) * Math.abs(deltaX / aspect);
              } else {
                  deltaX = (handle.includes('l') ? -1 : 1) * Math.abs(deltaY * aspect);
              }
          } else if (changeX) { // Side handles
              deltaY = (handle.includes('t') ? -0.5 : 0.5) * deltaX / aspect;
          } else if (changeY) { // Top/bottom handles
              deltaX = (handle.includes('l') ? -0.5 : 0.5) * deltaY * aspect;
          }
      }

      if (handle.includes('r')) newW = startCrop.width + deltaX;
      if (handle.includes('l')) { newW = startCrop.width - deltaX; newX = startCrop.x + deltaX; }
      if (handle.includes('b')) newH = startCrop.height + deltaY;
      if (handle.includes('t')) { newH = startCrop.height - deltaY; newY = startCrop.y + deltaY; }
      
      if(aspect) {
        if(handle.includes('l')) newX = startCrop.x + startCrop.width - newW;
        if(handle.includes('t')) newY = startCrop.y + startCrop.height - newH;
      }

      // Boundary checks
      if (newW < 10 || newH < 10) return;
      if (newX < 0) { newW += newX; newX = 0; if (aspect) newH = newW / aspect; }
      if (newY < 0) { newH += newY; newY = 0; if (aspect) newW = newH * aspect; }
      if (newX + newW > imageSize.width) { newW = imageSize.width - newX; if (aspect) newH = newW / aspect;}
      if (newY + newH > imageSize.height) { newH = imageSize.height - newY; if (aspect) newW = newH * aspect;}
     
      setCrop({ x: newX, y: newY, width: newW, height: newH });
  };
  
  const handleSetAspectRatio = (ratio: number) => {
    setActiveAspectRatio(ratio);
    resetCropToAspectRatio(ratio);
  };
  
  const handleReset = () => {
    setActiveAspectRatio(aspectRatio || null);
    resetCropToAspectRatio(aspectRatio || null);
  };
  
  const handleApplyCrop = () => {
      const canvas = document.createElement('canvas');
      const image = new Image();
      image.src = src;
      image.onload = () => {
          canvas.width = crop.width;
          canvas.height = crop.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
          onCrop(canvas.toDataURL('image/jpeg'));
      };
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    maxWidth: 'calc(100vw - 300px)',
    maxHeight: 'calc(100vh - 100px)',
    overflow: 'hidden',
  };

  const cropBoxStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${(crop.x / imageSize.width) * 100}%`,
    top: `${(crop.y / imageSize.height) * 100}%`,
    width: `${(crop.width / imageSize.width) * 100}%`,
    height: `${(crop.height / imageSize.height) * 100}%`,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
    border: '2px solid white',
    cursor: 'move',
    touchAction: 'none'
  };
  
  const handles = ['t', 'b', 'l', 'r', 'tl', 'tr', 'bl', 'br'];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-dark p-6 rounded-2xl shadow-lg w-full h-full flex flex-col md:flex-row gap-6">
        <div className="flex-grow flex items-center justify-center" ref={containerRef}>
          <div style={containerStyle}>
            <img ref={imageRef} src={src} alt="Crop source" style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', pointerEvents: 'none' }}/>
            {imageSize.width > 0 && (
              <div
                style={cropBoxStyle}
                onMouseDown={(e) => handleInteractionStart(e, handleDrag)}
                onTouchStart={(e) => handleInteractionStart(e, handleDrag)}
              >
                {handles.map(handle => (
                    <div 
                        key={handle}
                        className={`absolute w-3 h-3 bg-text-dark rounded-full border-2 border-bkg-dark ${handle.includes('t') ? '-top-1.5' : ''} ${handle.includes('b') ? '-bottom-1.5' : ''} ${handle.includes('l') ? '-left-1.5' : ''} ${handle.includes('r') ? '-right-1.5' : ''} ${handle.length === 1 ? (handle === 't' || handle === 'b' ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2') : ''}
                        ${handle === 'tl' || handle === 'br' ? 'cursor-nwse-resize' : ''}
                        ${handle === 'tr' || handle === 'bl' ? 'cursor-nesw-resize' : ''}
                        ${handle === 't' || handle === 'b' ? 'cursor-ns-resize' : ''}
                        ${handle === 'l' || handle === 'r' ? 'cursor-ew-resize' : ''}
                        `}
                        onMouseDown={(e) => handleInteractionStart(e, (sx, sy, sc) => handleResize(sx, sy, sc, handle))}
                        onTouchStart={(e) => handleInteractionStart(e, (sx, sy, sc) => handleResize(sx, sy, sc, handle))}
                    ></div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-64 flex-shrink-0 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-4 text-text-dark">Crop Image</h3>
            <div className="mb-4">
              <h4 className="font-semibold mb-2 text-text-dark">Preview</h4>
              <div className="w-full aspect-square bg-bkg-dark rounded-lg overflow-hidden border border-border-dark">
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            </div>
            {!aspectRatio && (
                 <div>
                    <h4 className="font-semibold mb-2 text-text-dark">Aspect Ratio</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {aspectRatios.map(ar => (
                        <button
                            key={ar.label}
                            onClick={() => handleSetAspectRatio(ar.value)}
                            className={`p-2 rounded-md font-semibold text-sm transition-colors ${activeAspectRatio === ar.value ? 'bg-primary-dark text-on-primary-dark' : 'bg-border-dark text-text-dark hover:bg-bkg-dark'}`}
                        >
                            {ar.label}
                        </button>
                        ))}
                        <button onClick={handleReset} title="Reset crop" className="col-span-3 p-2 rounded-md bg-border-dark text-text-dark hover:bg-bkg-dark flex items-center justify-center">
                            <ResetIcon className="w-5 h-5"/>
                        </button>
                    </div>
                 </div>
            )}
          </div>
          <div className="flex space-x-2 mt-4">
            <button onClick={onClose} className="w-full py-2 px-4 rounded-lg bg-border-dark text-text-dark hover:bg-bkg-dark font-semibold transition-colors">Cancel</button>
            <button onClick={handleApplyCrop} className="w-full py-2 px-4 rounded-lg bg-primary-dark text-on-primary-dark font-semibold hover:opacity-90 transition-opacity">Apply Crop</button>
          </div>
        </div>
      </div>
      <button onClick={onClose} className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
        <XMarkIcon className="w-6 h-6 text-white"/>
      </button>
    </div>
  );
};

export default CropTool;