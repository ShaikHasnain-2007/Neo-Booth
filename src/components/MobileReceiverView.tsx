import React, { useEffect, useState, useRef } from 'react';
import { Peer } from 'peerjs';
import { Download, Share2, Sparkles, Camera, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

interface MobileReceiverViewProps {
  roomId: string;
  onGoToBooth: () => void;
}

export const MobileReceiverView: React.FC<MobileReceiverViewProps> = ({ roomId, onGoToBooth }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'received' | 'error'>('connecting');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('neobooth-photo.png');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const hasReceivedRef = useRef(false);

  useEffect(() => {
    let peer: Peer | null = null;
    let isCancelled = false;

    const connectToHost = () => {
      setStatus('connecting');
      setErrorMessage('');

      try {
        peer = new Peer();

        peer.on('open', () => {
          if (isCancelled || !peer) return;
          const conn = peer.connect(roomId, { reliable: true });

          conn.on('open', () => {
            if (isCancelled) return;
            setStatus('connected');
            // Request the photo strip
            conn.send({ type: 'REQUEST_PHOTO' });
          });

          conn.on('data', (data: unknown) => {
            if (isCancelled) return;
            const payload = data as { type: string; dataUrl?: string; filename?: string };
            if (payload && payload.type === 'PHOTO_STRIP' && payload.dataUrl) {
              hasReceivedRef.current = true;
              setPhotoDataUrl(payload.dataUrl);
              if (payload.filename) setFilename(payload.filename);
              setStatus('received');

              confetti({
                particleCount: 90,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFD6DE', '#CFDEC0', '#5C0617', '#FF3D66', '#A3BE91', '#00FFCC'],
              });
            }
          });

          conn.on('error', (err) => {
            console.error('Peer connection error:', err);
            if (!isCancelled) {
              setStatus('error');
              setErrorMessage('Could not connect to the desktop photobooth. Please check if the QR code is still open.');
            }
          });
        });

        peer.on('error', (err) => {
          console.error('PeerJS error:', err);
          if (!isCancelled) {
            setStatus('error');
            setErrorMessage('Network connection issue. Please ensure you are connected to the internet and try again.');
          }
        });
      } catch (err) {
        console.error('Initialization error:', err);
        setStatus('error');
        setErrorMessage('Failed to initialize WebRTC transfer.');
      }
    };

    connectToHost();

    // Timeout fallback after 15s if not received
    const timeout = setTimeout(() => {
      if (!hasReceivedRef.current && !isCancelled) {
        setStatus('error');
        setErrorMessage('Connection timed out. Please ensure the QR Code window is still open on desktop.');
      }
    }, 15000);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
      if (peer) {
        peer.destroy();
      }
    };
  }, [roomId]);

  const handleShare = async () => {
    if (!photoDataUrl) return;
    try {
      const res = await fetch(photoDataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My NEO.BOOTH Strip',
          text: 'Captured on NEO.BOOTH // Y2K Retro Photobooth 📸✨',
          files: [file],
        });
      } else {
        // Fallback download
        const a = document.createElement('a');
        a.href = photoDataUrl;
        a.download = filename;
        a.click();
      }
    } catch (err) {
      console.error('Share failed:', err);
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
              ✦ Mobile Instant Receiver ✦
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1 px-2.5 py-1 bg-sage-100 border-2 border-cream-900 rounded-lg text-[10px] font-mono font-bold uppercase shadow-neo-sm">
          <Sparkles className="w-3 h-3 text-sage-600 animate-spin" />
          Live P2P
        </span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center my-4">
        {status === 'connecting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white border-3 border-cream-900 rounded-3xl p-6 shadow-neo text-center flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-pastelpink-100 border-2 border-cream-900 flex items-center justify-center shadow-neo-sm">
              <RefreshCw className="w-8 h-8 animate-spin text-pastelpink-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase text-cream-900">Connecting to Photobooth</h2>
              <p className="text-xs text-cream-500 mt-1 font-mono uppercase">
                Pairing via encrypted WebRTC stream...
              </p>
            </div>
          </motion.div>
        )}

        {status === 'connected' && !photoDataUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white border-3 border-cream-900 rounded-3xl p-6 shadow-neo text-center flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-sage-100 border-2 border-cream-900 flex items-center justify-center shadow-neo-sm">
              <Sparkles className="w-8 h-8 text-sage-600 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase text-cream-900">Receiving Photo Strip</h2>
              <p className="text-xs text-cream-500 mt-1 font-mono uppercase">
                Beaming high-res image directly to your device...
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
              <h2 className="text-lg font-bold uppercase text-cream-900">Transfer Unsuccessful</h2>
              <p className="text-xs text-cream-600 mt-2 max-w-xs mx-auto">
                {errorMessage || 'Unable to receive photos. Please ensure the QR code modal is still open on desktop.'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {status === 'received' && photoDataUrl && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-2 bg-emerald-100 border-2 border-emerald-900 text-emerald-900 px-4 py-1.5 rounded-full text-xs font-bold uppercase shadow-neo-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Photo Strip Received!
            </div>

            {/* Photo Strip Frame Preview */}
            <div className="p-3 bg-[#eae8e1] border-3 border-cream-900 rounded-2xl shadow-neo max-w-[280px] w-full flex justify-center">
              <img
                src={photoDataUrl}
                alt="Received Photo Strip"
                className="w-full h-auto max-h-[55vh] object-contain border border-cream-900 rounded shadow-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              <a
                href={photoDataUrl}
                download={filename}
                className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-cream-900 text-white border-2 border-cream-900 rounded-xl font-bold uppercase text-sm shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] cursor-pointer text-center"
              >
                <Download className="w-4 h-4" />
                Save to Camera Roll / Download
              </a>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase text-xs shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer"
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
