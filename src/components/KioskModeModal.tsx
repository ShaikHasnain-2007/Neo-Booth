import React, { useState } from 'react';
import { Maximize2, Sparkles, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface KioskModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: (autoResetSeconds: number) => void;
}

export const KioskModeModal: React.FC<KioskModeModalProps> = ({ isOpen, onClose, onActivate }) => {
  const [resetTimer, setResetTimer] = useState<number>(30);

  if (!isOpen) return null;

  const handleStartKiosk = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        void document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
    onActivate(resetTimer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border-3 border-cream-900 rounded-3xl p-6 shadow-neo-lg flex flex-col items-center text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream-100 hover:bg-cream-200 border-2 border-cream-900 flex items-center justify-center text-cream-900 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-200 border-2 border-cream-900 flex items-center justify-center -rotate-2 shadow-neo-sm mb-3">
          <Maximize2 className="w-6 h-6 text-cream-900" />
        </div>

        <h3 className="text-xl font-black uppercase tracking-tight text-cream-900 mb-1">
          Party & Event Kiosk Mode
        </h3>
        <p className="text-xs text-cream-600 font-medium mb-4">
          Turn your tablet or laptop into a self-service photobooth for weddings, birthdays, and parties with automated guest reset!
        </p>

        <div className="w-full bg-amber-50 border-2 border-amber-900/40 rounded-2xl p-4 mb-4 text-left flex flex-col gap-3 text-xs">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-cream-800">
              <strong>Fullscreen Experience:</strong> Hides browser navigation for clean iPad/tablet kiosk display.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="text-cream-900">Auto-Reset for Next Guest:</strong>
              <div className="flex items-center gap-2 mt-1.5">
                {[15, 30, 45, 60].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setResetTimer(sec)}
                    className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border-2 border-cream-900 transition-all cursor-pointer ${
                      resetTimer === sec
                        ? 'bg-amber-300 shadow-none translate-x-[1px] translate-y-[1px]'
                        : 'bg-white shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-cream-700 text-[11px]">
              Press <strong>Esc</strong> anytime or tap the top exit badge to leave kiosk mode.
            </span>
          </div>
        </div>

        <button
          onClick={handleStartKiosk}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-cream-900 text-white border-2 border-cream-900 rounded-xl font-bold uppercase text-sm shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
          Launch Event Kiosk Mode
        </button>
      </div>
    </div>
  );
};
