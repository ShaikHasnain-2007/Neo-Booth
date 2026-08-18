import React, { useEffect, useState, useRef } from 'react';
import { Peer } from 'peerjs';
import { Download, Share2, Sparkles, Camera, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

interface MobileReceiverViewProps {
  roomId: string;
  directFileUrl?: string | null;
  onGoToBooth: () => void;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelay',
    credential: 'openrelay',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelay',
    credential: 'openrelay',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelay',
    credential: 'openrelay',
  },
];

export const MobileReceiverView: React.FC<MobileReceiverViewProps> = ({ roomId, directFileUrl, onGoToBooth }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'receiving' | 'received' | 'error'>('connecting');
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('neobooth-photo.png');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const hasReceivedRef = useRef(false);
  const chunksBufferRef = useRef<string[]>([]);
  const totalChunksRef = useRef(0);
  const receivedChunksCountRef = useRef(0);

  // 1. Instant Direct Cloud URL Loader (Works 100% on 5G / CGNAT / Wi-Fi)
  useEffect(() => {
    if (!directFileUrl || hasReceivedRef.current) return;

    let isCancelled = false;
    const fetchDirectPhoto = async () => {
      try {
        setStatus('receiving');
        setReceiveProgress(40);
        const res = await fetch(directFileUrl);
        if (!res.ok) throw new Error('Cloud file fetch error');

        const blob = await res.blob();
        if (isCancelled) return;

        const reader = new FileReader();
        reader.onloadend = () => {
          if (isCancelled || !reader.result) return;
          hasReceivedRef.current = true;
          setPhotoDataUrl(reader.result as string);
          setReceiveProgress(100);
          setStatus('received');

          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD6DE', '#CFDEC0', '#5C0617', '#FF3D66', '#A3BE91', '#00FFCC'],
          });
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn('Direct cloud URL fetch failed, relying on WebRTC stream:', err);
      }
    };

    void fetchDirectPhoto();

    return () => {
      isCancelled = true;
    };
  }, [directFileUrl]);

  // 2. TURN-Backed WebRTC Stream Connection
  useEffect(() => {
    if (!roomId || roomId === 'direct-file') return;

    let peer: Peer | null = null;
    let isCancelled = false;

    const connectToHost = () => {
      if (!hasReceivedRef.current) {
        setStatus('connecting');
        setErrorMessage('');
      }

      try {
        peer = new Peer({
          config: { iceServers: ICE_SERVERS },
        });

        peer.on('open', () => {
          if (isCancelled || !peer) return;
          const conn = peer.connect(roomId, { reliable: true });

          conn.on('open', () => {
            if (isCancelled) return;
            if (!hasReceivedRef.current) setStatus('connected');
            // Request the photo strip transmission
            conn.send({ type: 'READY_FOR_PHOTO' });
          });

          conn.on('data', (data: unknown) => {
            if (isCancelled) return;
            const payload = data as {
              type?: string;
              dataUrl?: string;
              filename?: string;
              totalChunks?: number;
              index?: number;
              chunk?: string;
            };

            if (!payload) return;

            // 1. Chunked Stream Header
            if (payload.type === 'PHOTO_HEADER' && payload.totalChunks) {
              if (!hasReceivedRef.current) setStatus('receiving');
              totalChunksRef.current = payload.totalChunks;
              chunksBufferRef.current = new Array(payload.totalChunks);
              receivedChunksCountRef.current = 0;
              if (payload.filename) setFilename(payload.filename);
            }

            // 2. Chunked Stream Piece
            else if (payload.type === 'PHOTO_CHUNK' && payload.chunk !== undefined && payload.index !== undefined) {
              chunksBufferRef.current[payload.index] = payload.chunk;
              receivedChunksCountRef.current++;

              const total = totalChunksRef.current || 1;
              const percent = Math.min(99, Math.round((receivedChunksCountRef.current / total) * 100));
              setReceiveProgress(percent);

              if (receivedChunksCountRef.current >= totalChunksRef.current && totalChunksRef.current > 0) {
                const fullImage = chunksBufferRef.current.join('');
                hasReceivedRef.current = true;
                setPhotoDataUrl(fullImage);
                setReceiveProgress(100);
                setStatus('received');

                confetti({
                  particleCount: 90,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#FFD6DE', '#CFDEC0', '#5C0617', '#FF3D66', '#A3BE91', '#00FFCC'],
                });
              }
            }

            // 3. Chunked Stream Complete
            else if (payload.type === 'PHOTO_COMPLETE') {
              if (chunksBufferRef.current.length > 0 && !hasReceivedRef.current) {
                const fullImage = chunksBufferRef.current.join('');
                hasReceivedRef.current = true;
                setPhotoDataUrl(fullImage);
                setReceiveProgress(100);
                setStatus('received');

                confetti({
                  particleCount: 90,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#FFD6DE', '#CFDEC0', '#5C0617', '#FF3D66', '#A3BE91', '#00FFCC'],
                });
              }
            }

            // 4. Single packet fallback
            else if (payload.type === 'PHOTO_STRIP' && payload.dataUrl) {
              hasReceivedRef.current = true;
              setPhotoDataUrl(payload.dataUrl);
              if (payload.filename) setFilename(payload.filename);
              setReceiveProgress(100);
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
            console.warn('Peer connection warning:', err);
            if (!isCancelled && !hasReceivedRef.current) {
              setStatus('error');
              setErrorMessage('Could not connect to the photobooth. Please verify the QR Code is still open on desktop.');
            }
          });
        });

        peer.on('error', (err) => {
          console.warn('PeerJS warning:', err);
          if (!isCancelled && !hasReceivedRef.current) {
            setStatus('error');
            setErrorMessage('Network connection error. Please ensure you have an active internet connection.');
          }
        });
      } catch (err) {
        console.warn('Initialization error:', err);
        if (!hasReceivedRef.current) {
          setStatus('error');
          setErrorMessage('Failed to initialize WebRTC streaming.');
        }
      }
    };

    connectToHost();

    // Timeout fallback after 20s if not received via cloud or webrtc
    const timeout = setTimeout(() => {
      if (!hasReceivedRef.current && !isCancelled) {
        setStatus('error');
        setErrorMessage('Connection timed out. Please ensure the QR Code window is still open on your laptop.');
      }
    }, 20000);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
      if (peer) {
        peer.destroy();
      }
    };
  }, [roomId]);

  // Mobile Save to Photos / Camera Roll handler
  const handleSaveToCameraRoll = async () => {
    if (!photoDataUrl) return;

    try {
      const res = await fetch(photoDataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type });

      // 1. Try native Web Share API (Triggers iOS/Android "Save to Camera Roll / Save Image")
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My NEO.BOOTH Strip',
          text: 'Captured on NEO.BOOTH // Y2K Retro Photobooth 📸✨',
          files: [file],
        });
        return;
      }
    } catch (err) {
      console.warn('Share sheet was dismissed or unsupported, attempting direct download:', err);
    }

    // 2. Direct Blob Object Download fallback
    try {
      const res = await fetch(photoDataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch (fallbackErr) {
      console.error('Direct download fallback failed:', fallbackErr);
      window.open(photoDataUrl, '_blank');
    }
  };

  const handleShareStories = async () => {
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
        await handleSaveToCameraRoll();
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
              <h2 className="text-xl font-bold uppercase text-cream-900">Connecting to Laptop</h2>
              <p className="text-xs text-cream-500 mt-1 font-mono uppercase">
                Pairing encrypted stream...
              </p>
            </div>
          </motion.div>
        )}

        {(status === 'connected' || status === 'receiving') && !photoDataUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white border-3 border-cream-900 rounded-3xl p-6 shadow-neo text-center flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-sage-100 border-2 border-cream-900 flex items-center justify-center shadow-neo-sm">
              <Sparkles className="w-8 h-8 text-sage-600 animate-pulse" />
            </div>
            <div className="w-full">
              <h2 className="text-xl font-bold uppercase text-cream-900">Receiving Photo Strip</h2>
              <p className="text-xs text-cream-500 mt-1 font-mono uppercase">
                {receiveProgress > 0 ? `Loading: ${receiveProgress}%` : 'Beaming high-res lossless image...'}
              </p>

              {/* Live Streaming Progress Bar */}
              <div className="w-full bg-cream-100 border-2 border-cream-900 rounded-full h-3.5 mt-4 overflow-hidden p-0.5">
                <div
                  style={{ width: `${Math.max(8, receiveProgress)}%` }}
                  className="bg-pastelpink-400 h-full rounded-full transition-all duration-150"
                />
              </div>
            </div>
          </motion.div>
        )}

        {status === 'error' && !photoDataUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white border-3 border-cream-900 rounded-3xl p-6 shadow-neo text-center flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-100 border-2 border-cream-900 flex items-center justify-center shadow-neo-sm">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase text-cream-900">Connection Failed</h2>
              <p className="text-xs text-cream-600 mt-2 max-w-xs mx-auto">
                {errorMessage || 'Unable to beam photos. Please make sure the QR modal is still open on desktop.'}
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

            {/* Photo Strip Frame Preview with iOS touch-to-save support */}
            <div className="p-3 bg-[#eae8e1] border-3 border-cream-900 rounded-2xl shadow-neo max-w-[280px] w-full flex flex-col items-center">
              <img
                src={photoDataUrl}
                alt="Received Photo Strip"
                className="w-full h-auto max-h-[50vh] object-contain border border-cream-900 rounded shadow-sm select-auto"
              />
              <p className="text-[9px] font-mono text-cream-500 uppercase mt-2 text-center">
                ✦ Tip: Press and hold image to save directly ✦
              </p>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={handleSaveToCameraRoll}
                className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-cream-900 text-white border-2 border-cream-900 rounded-xl font-bold uppercase text-sm shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] cursor-pointer text-center"
              >
                <Download className="w-4 h-4" />
                Save to Camera Roll / Download
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleShareStories}
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
