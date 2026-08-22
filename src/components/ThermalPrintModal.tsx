import React, { useState, useEffect } from 'react';
import { Printer, Download, X, Check, Sparkles } from 'lucide-react';
import { createDitheredDataUrl } from '../utils/dithering';

interface ThermalPrintModalProps {
  sourceDataUrl: string;
  onClose: () => void;
}

export const ThermalPrintModal: React.FC<ThermalPrintModalProps> = ({ sourceDataUrl, onClose }) => {
  const [ditheredUrl, setDitheredUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const result = createDitheredDataUrl(canvas);
        setDitheredUrl(result);
      }
    };
    img.src = sourceDataUrl;
  }, [sourceDataUrl]);

  const handleSystemPrint = () => {
    if (!ditheredUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>NEO.BOOTH Thermal Print</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 4mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              background: #fff;
            }
            img {
              width: 100%;
              max-width: 50mm;
              height: auto;
              image-rendering: pixelated;
            }
          </style>
        </head>
        <body>
          <img src="${ditheredUrl}" onload="window.print();window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadDithered = () => {
    if (!ditheredUrl) return;
    const a = document.createElement('a');
    a.href = ditheredUrl;
    a.download = `neobooth-thermal-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border-3 border-cream-900 rounded-3xl p-6 shadow-neo-lg flex flex-col items-center text-center max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream-100 hover:bg-cream-200 border-2 border-cream-900 flex items-center justify-center text-cream-900 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-xl bg-pastelpink-200 border-2 border-cream-900 flex items-center justify-center -rotate-3 shadow-neo-sm mb-3">
          <Printer className="w-6 h-6 text-cream-900" />
        </div>

        <h3 className="text-xl font-black uppercase tracking-tight text-cream-900 mb-1">
          Thermal Pocket Printer Mode
        </h3>
        <p className="text-xs text-cream-600 font-medium mb-4">
          Monochrome 1-bit Floyd-Steinberg error diffusion. Perfect for PeriPage, Phomemo & ESC/POS receipt printers!
        </p>

        {/* Thermal Receipt Visual Preview Container */}
        <div className="p-4 bg-zinc-100 border-3 border-cream-900 rounded-2xl shadow-neo-sm mb-4 w-full flex flex-col items-center justify-center min-h-[300px]">
          {ditheredUrl ? (
            <div className="bg-white p-2 border-2 border-zinc-300 shadow-sm max-w-[220px] rounded flex flex-col items-center">
              <img
                src={ditheredUrl}
                alt="Thermal Dithered Print"
                className="w-full h-auto object-contain image-rendering-pixelated max-h-[48vh]"
              />
              <span className="text-[8px] font-mono text-zinc-400 mt-2 uppercase tracking-widest">
                ✦ 1-BIT DITHERED BITMAP ✦
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-xs font-mono text-cream-500 uppercase">
              <Sparkles className="w-6 h-6 animate-spin text-pastelpink-500" />
              <span>Dithering Bitmap...</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={handleSystemPrint}
            disabled={!ditheredUrl}
            className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-cream-900 text-white border-2 border-cream-900 rounded-xl font-bold uppercase text-xs sm:text-sm shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print on Receipt / Thermal Printer
          </button>

          <button
            onClick={handleDownloadDithered}
            disabled={!ditheredUrl}
            className="flex items-center justify-center gap-2 w-full py-3 bg-pastelpink-100 hover:bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase text-xs shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
            {copied ? 'Thermal PNG Downloaded!' : 'Download 1-Bit Thermal PNG'}
          </button>
        </div>
      </div>
    </div>
  );
};
