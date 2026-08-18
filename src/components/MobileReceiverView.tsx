import React, { useEffect, useState, useRef } from 'react';
import { Download, Share2, Camera, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

interface MobileReceiverViewProps {
  photoUrl?: string | null;
  onGoToBooth: () => void;
}

export const MobileReceiverView: React.FC<MobileReceiverViewProps> = ({ photoUrl, onGoToBooth }) => {
  const [currentPhoto] = useState<string | null>(() => {
    if (photoUrl) return photoUrl;
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const queryPhoto = params.get('photo') || params.get('file') || params.get('f');
    return queryPhoto && queryPhoto !== 'local' ? queryPhoto : null;
  });

  const [status] = useState<'loading' | 'received' | 'error'>(() => {
    if (photoUrl) return 'received';
    if (typeof window === 'undefined') return 'loading';
    const params = new URLSearchParams(window.location.search);
    const queryPhoto = params.get('photo') || params.get('file') || params.get('f');
    return queryPhoto && queryPhoto !== 'local' ? 'received' : 'error';
  });

  const [downloading, setDownloading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const filename = 'neobooth-photostrip.png';

  useEffect(() => {
    if (status === 'received') {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD6DE', '#CFDEC0', '#5C0617', '#FF3D66', '#A3BE91', '#00FFCC'],
      });
    }
  }, [status]);

  // Convert the displayed image into a clean, 100% uncorrupted local binary PNG Blob
  const getPristinePngBlob = async (): Promise<Blob> => {
    if (!currentPhoto) throw new Error('No photo source');

    // 1. If image element is loaded in DOM, bake it directly onto canvas
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      const img = imgRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });
        if (blob && blob.size > 0) return blob;
      }
    }

    // 2. Fetch directly with arrayBuffer fallback
    const res = await fetch(currentPhoto);
    const arrayBuffer = await res.arrayBuffer();
    return new Blob([arrayBuffer], { type: 'image/png' });
  };

  // Mobile Save to Camera Roll / Photos handler
  const handleSaveToCameraRoll = async () => {
    if (!currentPhoto || downloading) return;
    setDownloading(true);

    try {
      const blob = await getPristinePngBlob();
      const file = new File([blob], filename, { type: 'image/png' });

      // 1. Try native Web Share API (Triggers native iOS/Android "Save Image / Save to Photos")
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My NEO.BOOTH Strip',
          text: 'Captured on NEO.BOOTH // Y2K Retro Photobooth 📸✨',
          files: [file],
        });
        setDownloading(false);
        return;
      }

      // 2. Direct Blob Download Fallback
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    } catch (err) {
      console.warn('Native save fallback, trying direct link:', err);
      if (currentPhoto) {
        const a = document.createElement('a');
        a.href = currentPhoto;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleShareStories = async () => {
    if (!currentPhoto || downloading) return;
    setDownloading(true);
    try {
      const blob = await getPristinePngBlob();
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My NEO.BOOTH Strip',
          text: 'Captured on NEO.BOOTH // Y2K Retro Photobooth 📸✨',
          files: [file],
        });
      } else {
        await handleSaveToCameraRoll();
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen y2k-grid flex flex-col items-center justify-between p-4 md:p-6">
      {/* Mobile Receiver Header */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between border-3 border-cream-900 bg-white p-3 rounded-2xl shadow-neo relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pastelpink-300 via-sage-300 to-maroon-800" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pastelpink-200 border-2 border-cream-900 flex items-center justify-center rotate-3 shadow-neo-sm">
            <Camera className="w-4 h-4 text-cream-900" />
          </div>
          <div>
            <h1 className="text-base font-bold uppercase tracking-wider leading-none text-cream-900">
              NEO.BOOTH <span className="text-[9px] font-mono text-pastelpink-500 font-bold px-1 py-0.5 border border-pastelpink-300 rounded bg-pastelpink-50">v2.0</span>
            </h1>
            <p className="text-[8px] font-mono uppercase tracking-widest text-cream-600 mt-0.5">
              ✦ Mobile Photo Delivery ✦
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1 px-2.5 py-1 bg-sage-100 border-2 border-cream-900 rounded-lg text-[10px] font-mono font-bold uppercase shadow-neo-sm">
          <CheckCircle2 className="w-3 h-3 text-sage-600" />
          Ready
        </span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center my-4">
        {status === 'loading' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white border-3 border-cream-900 rounded-3xl p-6 shadow-neo text-center flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-pastelpink-100 border-2 border-cream-900 flex items-center justify-center shadow-neo-sm">
              <RefreshCw className="w-8 h-8 animate-spin text-pastelpink-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase text-cream-900">Loading Photo Strip</h2>
              <p className="text-xs text-cream-500 mt-1 font-mono uppercase">
                Fetching your high-resolution strip...
              </p>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white border-3 border-cream-900 rounded-3xl p-6 shadow-neo text-center flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-100 border-2 border-cream-900 flex items-center justify-center shadow-neo-sm">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase text-cream-900">Photo Not Found</h2>
              <p className="text-xs text-cream-600 mt-2 max-w-xs mx-auto">
                No photo found for this QR link. Please scan a fresh QR code from your laptop.
              </p>
            </div>
            <button
              onClick={onGoToBooth}
              className="px-5 py-2.5 bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
            >
              Take New Photos
            </button>
          </motion.div>
        )}

        {status === 'received' && currentPhoto && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-2 bg-emerald-100 border-2 border-emerald-900 text-emerald-900 px-4 py-1.5 rounded-full text-xs font-bold uppercase shadow-neo-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Photo Strip Ready!
            </div>

            {/* Photo Strip Frame Preview with iOS touch-to-save support */}
            <div className="p-3 bg-[#eae8e1] border-3 border-cream-900 rounded-2xl shadow-neo max-w-[280px] w-full flex flex-col items-center">
              <img
                ref={imgRef}
                crossOrigin="anonymous"
                src={currentPhoto}
                alt="Your Photo Strip"
                className="w-full h-auto max-h-[52vh] object-contain border border-cream-900 rounded shadow-sm select-auto"
                onError={() => {
                  console.warn('Image load issue, displaying directly');
                }}
              />
              <p className="text-[9px] font-mono text-cream-500 uppercase mt-2 text-center">
                ✦ Tip: Press and hold image to save to Photos ✦
              </p>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={handleSaveToCameraRoll}
                disabled={downloading}
                className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-cream-900 text-white border-2 border-cream-900 rounded-xl font-bold uppercase text-sm shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] cursor-pointer text-center disabled:opacity-70"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Save to Camera Roll / Download
                  </>
                )}
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleShareStories}
                  disabled={downloading}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase text-xs shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer disabled:opacity-70"
                >
                  <Share2 className="w-4 h-4" />
                  Share to Instagram / Stories
                </button>
              )}

              <button
                onClick={onGoToBooth}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase text-xs hover:bg-cream-50 transition-colors cursor-pointer mt-1"
              >
                <Camera className="w-3.5 h-3.5" />
                Take Your Own Photos
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center font-mono text-[9px] text-cream-400 uppercase tracking-widest pt-2">
        ✦ NEO.BOOTH // Y2K Retro Photobooth ✦
      </footer>
    </div>
  );
};
