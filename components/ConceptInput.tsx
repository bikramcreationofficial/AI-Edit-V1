import React, { useState } from 'react';
import { UploadIcon } from './icons';

interface ConceptInputProps {
  onGenerate: (concept: string, referenceImageFile: File | null, posterText: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

const ConceptInput: React.FC<ConceptInputProps> = ({ onGenerate, isLoading, disabled }) => {
  const [concept, setConcept] = useState('');
  const [posterText, setPosterText] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceImage(file);
      setPreview(URL.createObjectURL(file));
      e.target.value = ''; // Allow re-uploading the same file
    }
  };

  const handleGenerateClick = () => {
    if (concept.trim() && !isLoading && !disabled) {
      onGenerate(concept, referenceImage, posterText);
    }
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-border-light dark:border-border-dark">
      <h2 className="text-lg font-bold mb-4 flex items-center">
        <span className="bg-rose-candy dark:bg-primary-dark text-on-primary-light dark:text-on-primary-dark rounded-full w-7 h-7 flex items-center justify-center font-bold mr-3">2</span>
        Describe Your Poster
      </h2>
      
      <div className="space-y-4">
        <textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="e.g., A vibrant, futuristic ad for a new sneaker, set in Tokyo at night..."
          className="w-full h-24 p-3 bg-bkg-light dark:bg-bkg-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:outline-none transition"
          rows={3}
        />
        
        <input
          type="text"
          value={posterText}
          onChange={(e) => setPosterText(e.target.value)}
          placeholder="Text to add (optional)"
          className="w-full p-3 bg-bkg-light dark:bg-bkg-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:outline-none transition"
        />

        <div className="flex items-center space-x-4">
          <label htmlFor="ref-upload" className="cursor-pointer w-24 h-24 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg flex flex-col items-center justify-center text-center hover:bg-bkg-light dark:hover:bg-bkg-dark transition-colors">
            {preview ? (
              <img src={preview} alt="Reference preview" className="w-full h-full object-cover rounded-md" />
            ) : (
              <>
                <UploadIcon className="w-6 h-6 text-subtext-light dark:text-subtext-dark" />
                <span className="text-xs mt-1 text-subtext-light dark:text-subtext-dark">Add Style Ref (Optional)</span>
              </>
            )}
          </label>
          <input id="ref-upload" type="file" accept="image/*" className="hidden" onChange={handleReferenceImageChange} />
        </div>

        <button
          onClick={handleGenerateClick}
          disabled={!concept.trim() || isLoading || disabled}
          className="w-full bg-rose-candy dark:bg-primary-dark text-on-primary-light dark:text-on-primary-dark font-bold py-3 px-4 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {isLoading ? 'Generating...' : 'Generate Poster'}
        </button>
      </div>
    </div>
  );
};

export default ConceptInput;