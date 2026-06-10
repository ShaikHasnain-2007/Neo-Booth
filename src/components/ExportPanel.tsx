import React from 'react';
import { Download, Image, Check } from 'lucide-react';
import type { StitchOptions } from '../utils/canvasStitcher';

interface ExportPanelProps {
  options: StitchOptions;
  onChange: (options: StitchOptions) => void;
  dataUrl: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ options, onChange, dataUrl }) => {
  const isPng = options.downloadFormat === 'png';
  
  const setFormat = (format: 'png' | 'jpg') => {
    onChange({
      ...options,
      downloadFormat: format,
    });
  };

  const filename = `photobooth-${new Date().toISOString().slice(0, 10)}.${options.downloadFormat}`;

  return (
    <div className="flex flex-col gap-5 p-6 bg-white border-3 border-cream-900 rounded-2xl shadow-neo w-full">
      <h3 className="text-xl font-bold uppercase tracking-wider border-b-2 border-cream-100 pb-2 mb-1 flex items-center gap-2">
        <Image className="w-5 h-5 text-pastelpink-500" />
        Save Your Photos
      </h3>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-mono uppercase tracking-widest text-cream-400">Download Quality</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setFormat('png')}
            className={`flex flex-col items-start p-3 border-2 border-cream-900 rounded-xl transition-all font-sans text-left relative ${
              isPng 
                ? 'bg-pastelpink-50 shadow-none translate-x-[1px] translate-y-[1px]' 
                : 'bg-white hover:bg-cream-50 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-cream-900">
              PNG Format
              {isPng && <Check className="w-3.5 h-3.5 text-pastelpink-500" />}
            </div>
            <span className="text-[10px] font-mono text-cream-500 leading-normal mt-0.5">
              Lossless. Best sharpness for frames, stickers & text.
            </span>
          </button>

          <button
            onClick={() => setFormat('jpg')}
            className={`flex flex-col items-start p-3 border-2 border-cream-900 rounded-xl transition-all font-sans text-left relative ${
              !isPng 
                ? 'bg-pastelpink-50 shadow-none translate-x-[1px] translate-y-[1px]' 
                : 'bg-white hover:bg-cream-50 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-cream-900">
              JPG Format
              {!isPng && <Check className="w-3.5 h-3.5 text-pastelpink-500" />}
            </div>
            <span className="text-[10px] font-mono text-cream-500 leading-normal mt-0.5">
              100% Max Quality. Best photo realism. Smaller size.
            </span>
          </button>
        </div>
      </div>

      <a
        href={dataUrl}
        download={filename}
        className="flex items-center justify-center gap-3 w-full py-4 bg-cream-900 text-white border-2 border-cream-900 rounded-xl font-bold uppercase text-lg transition-all shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none cursor-pointer"
      >
        <Download className="w-5 h-5" />
        Download {options.downloadFormat.toUpperCase()} Strip
      </a>
    </div>
  );
};
