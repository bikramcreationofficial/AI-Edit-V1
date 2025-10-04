// FIX: Removed self-referential import of AspectRatio which caused a conflict with the local declaration.

export type Theme = 'light' | 'dark';

export type AspectRatio = '9:16' | '1:1' | '16:9' | '3:4' | '4:3';

export type ExpandDirection = 'all' | 'top' | 'bottom' | 'left' | 'right';

export type ExpandSize = 25 | 50 | 100;

export interface Product {
  id: string;
  original: string; // base64
  originalMimeType: string;
  processed: string | null; // base64 of background-removed image
  isProcessing: boolean;
}

export interface Poster {
  id: string;
  src: string; // base64
  prompt: string;
}

export interface ImageFilters {
  brightness: number;
  contrast: number;
  saturate: number;
  tint: {
    color: string;
    amount: number; // 0 to 1
  } | null;
}