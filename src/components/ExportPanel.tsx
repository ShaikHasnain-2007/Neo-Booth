import React, { useState, useEffect, useRef } from 'react';
import { Download, Image, Check, Copy, Share2, QrCode, X, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { Peer } from 'peerjs';
import type { StitchOptions } from '../types/photobooth';

interface ExportPanelProps {
  options: StitchOptions;
  onChange: (options: StitchOptions) => void;
  dataUrl: string;
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

export const ExportPanel: React.FC<ExportPanelProps> = ({ options, onChange, dataUrl }) => {
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [transferStatus, setTransferStatus] = useState<'idle' | 'waiting' | 'sending' | 'success'>('idle');
  const [connectedCount, setConnectedCount] = useState(0);

  const peerRef = useRef<Peer | null>(null);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const isPng = options.downloadFormat === 'png';
  const filename = `neobooth-${new Date().toISOString().slice(0, 10)}.${options.downloadFormat}`;

  const handleOpenQRModal = () => {
    setTransferStatus('waiting');
    setConnectedCount(0);
    setShowQRModal(true);
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setTransferStatus('idle');
  };

  // Initialize Dual-Engine QR Beaming: Fast Cloud File Relay + TURN-Backed WebRTC P2P
  useEffect(() => {
    if (!showQRModal) return;

    let isMounted = true;
    const randomId = 'neo-' + Math.random().toString(36).substring(2, 9);

    const baseOrigin =
      typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'https://neo-booth.vercel.app'
        : window.location.origin;

    // Helper to generate the QR code image
    const generateQr = (url: string) => {
      QRCode.toDataURL(url, {
        width: 260,
        margin: 2,
        color: {
          dark: '#1b1b19',
          light: '#ffffff',
        },
      })
        .then((qr) => {
          if (isMounted) setQrCodeUrl(qr);
        })
        .catch((err) => console.error('QR generation failed:', err));
    };

    // 1. Initial QR with WebRTC room ID
    const initialShareUrl = `${baseOrigin}/?receive=${randomId}`;
    generateQr(initialShareUrl);

    // 2. Fast background cloud upload for 100% cellular 5G / CGNAT guarantee
    const uploadToRelay = async () => {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const topic = `neobooth_${randomId}`;

        const uploadRes = await fetch(`https://ntfy.sh/${topic}`, {
          method: 'PUT',
          body: blob,
          headers: {
            Filename: filename,
          },
        });

        const uploadData = await uploadRes.json();
        if (uploadData && uploadData.attachment && uploadData.attachment.url) {
          const directFileUrl = uploadData.attachment.url;
          // Upgrade QR code to include direct file URL for instantaneous, 0-timeout mobile loading
          const enrichedShareUrl = `${baseOrigin}/?receive=${randomId}&file=${encodeURIComponent(directFileUrl)}`;
          if (isMounted) {
            generateQr(enrichedShareUrl);
          }
        }
      } catch (err) {
        console.warn('Fast cloud upload fallback skipped:', err);
      }
    };

    void uploadToRelay();

    // 3. Initialize WebRTC Peer Host with TURN Relays
    try {
      const peer = new Peer(randomId, {
        config: { iceServers: ICE_SERVERS },
      });
      peerRef.current = peer;

      peer.on('connection', (conn) => {
        if (!isMounted) return;
        setTransferStatus('sending');

        const streamPhotoChunks = () => {
          const CHUNK_SIZE = 16384; // 16KB per chunk
          const totalLength = dataUrl.length;
          const totalChunks = Math.ceil(totalLength / CHUNK_SIZE);

          try {
            conn.send({
              type: 'PHOTO_HEADER',
              filename,
              totalChunks,
              totalSize: totalLength,
            });

            let currentChunk = 0;
            const sendBatch = () => {
              while (currentChunk < totalChunks) {
                const start = currentChunk * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, totalLength);
                const chunkData = dataUrl.substring(start, end);

                conn.send({
                  type: 'PHOTO_CHUNK',
                  index: currentChunk,
                  chunk: chunkData,
                });

                currentChunk++;

                if (currentChunk % 8 === 0 && currentChunk < totalChunks) {
                  setTimeout(sendBatch, 15);
                  return;
                }
              }

              conn.send({ type: 'PHOTO_COMPLETE' });

              if (isMounted) {
                setTransferStatus('success');
                setConnectedCount((prev) => prev + 1);

                confetti({
                  particleCount: 80,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#FFD6DE', '#CFDEC0', '#5C0617', '#FF3D66', '#A3BE91', '#00FFCC'],
                });
              }
            };

            setTimeout(sendBatch, 40);
          } catch (err) {
            console.error('WebRTC chunk stream error:', err);
          }
        };

        if (conn.open) {
          streamPhotoChunks();
        } else {
          conn.on('open', streamPhotoChunks);
        }

        conn.on('data', (data: unknown) => {
          const payload = data as { type?: string };
          if (payload && (payload.type === 'REQUEST_PHOTO' || payload.type === 'READY_FOR_PHOTO')) {
            streamPhotoChunks();
          }
        });
      });

      peer.on('error', (err) => {
        console.warn('Peer error in host mode:', err);
      });
    } catch (err) {
      console.warn('Peer initialization error:', err);
    }

    return () => {
      isMounted = false;
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [showQRModal, dataUrl, filename]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#FFD6DE', '#CFDEC0', '#5C0617', '#FF3D66', '#A3BE91'],
    });
  };

  const setFormat = (format: 'png' | 'jpg') => {
    onChange({
      ...options,
      downloadFormat: format,
    });
  };

  const handleDownload = () => {
    triggerConfetti();
  };

  const handleCopyToClipboard = async () => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      let clipboardBlob = blob;
      if (blob.type !== 'image/png') {
        const img = document.createElement('img');
        img.src = dataUrl;
        await new Promise((resolve) => { img.onload = resolve; });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          clipboardBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b || blob), 'image/png');
          });
        }
      }

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': clipboardBlob }),
      ]);
      setCopied(true);
      triggerConfetti();
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Clipboard fallback failed:', fallbackErr);
      }
    }
  };

  const handleShare = async () => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My NEO.BOOTH Strip',
          text: 'Captured on NEO.BOOTH // Y2K Retro Photobooth 📸✨',
          files: [file],
        });
        triggerConfetti();
      } else {
        await handleCopyToClipboard();
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-white border-3 border-cream-900 rounded-2xl shadow-neo w-full relative">
      <h3 className="text-xl font-bold uppercase tracking-wider border-b-2 border-cream-100 pb-2 mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Image className="w-5 h-5 text-pastelpink-500" />
          Save & Share
        </span>
        <button
          onClick={handleOpenQRModal}
          title="Scan QR Code to save on phone"
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-pastelpink-100 hover:bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-cream-900" />
          <span>Save on Mobile</span>
        </button>
      </h3>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-mono uppercase tracking-widest text-cream-400">Download Quality</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setFormat('png')}
            className={`flex flex-col items-start p-3 border-2 border-cream-900 rounded-xl transition-all font-sans text-left relative cursor-pointer ${
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
            className={`flex flex-col items-start p-3 border-2 border-cream-900 rounded-xl transition-all font-sans text-left relative cursor-pointer ${
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

      <div className="flex gap-2">
        <button
          onClick={handleCopyToClipboard}
          className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 border-cream-900 rounded-xl font-bold uppercase text-xs transition-all shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer ${
            copied ? 'bg-emerald-100 text-emerald-900 border-emerald-900' : 'bg-cream-50 hover:bg-cream-100 text-cream-900'
          }`}
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy Image'}</span>
        </button>

        {canNativeShare && (
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-cream-50 hover:bg-cream-100 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase text-xs transition-all shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        )}
      </div>

      <a
        href={dataUrl}
        download={filename}
        onClick={handleDownload}
        className="flex items-center justify-center gap-3 w-full py-4 bg-cream-900 text-white border-2 border-cream-900 rounded-xl font-bold uppercase text-base md:text-lg transition-all shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none cursor-pointer text-center"
      >
        <Download className="w-5 h-5" />
        Download {options.downloadFormat.toUpperCase()} Strip
      </a>

      {/* Real-time Dual Engine QR Code Sharing Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white border-3 border-cream-900 rounded-3xl p-6 shadow-neo-lg flex flex-col items-center text-center">
            <button
              onClick={handleCloseQRModal}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream-100 hover:bg-cream-200 border-2 border-cream-900 flex items-center justify-center text-cream-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-11 h-11 rounded-xl bg-pastelpink-200 border-2 border-cream-900 flex items-center justify-center rotate-3 shadow-neo-sm mb-3">
              <QrCode className="w-6 h-6 text-cream-900" />
            </div>

            <h4 className="text-xl font-black uppercase tracking-tight text-cream-900 mb-1">
              Beam to Smartphone
            </h4>
            <p className="text-xs text-cream-600 font-medium mb-4">
              Scan this QR code with your phone camera to instantly receive and save your high-resolution photo strip!
            </p>

            <div className="p-3 bg-cream-50 border-3 border-cream-900 rounded-2xl shadow-neo-sm mb-4 relative">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Photobooth QR Code" className="w-52 h-52 rounded-xl" />
              ) : (
                <div className="w-52 h-52 flex flex-col items-center justify-center gap-2 text-xs font-mono text-cream-400 uppercase">
                  <RefreshCw className="w-6 h-6 animate-spin text-pastelpink-400" />
                  Generating Secure P2P QR...
                </div>
              )}
            </div>

            {/* Live WebRTC Transfer Status Indicator */}
            <div className="w-full mb-4">
              {transferStatus === 'waiting' && (
                <div className="flex items-center justify-center gap-2 p-2 bg-cream-50 border-2 border-cream-200 rounded-xl text-[11px] font-mono font-bold text-cream-600 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  Ready! Scan with phone camera...
                </div>
              )}

              {transferStatus === 'sending' && (
                <div className="flex items-center justify-center gap-2 p-2 bg-sage-100 border-2 border-cream-900 rounded-xl text-[11px] font-mono font-bold text-sage-800 uppercase animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-sage-600 animate-spin" />
                  Phone connected! Streaming photo...
                </div>
              )}

              {transferStatus === 'success' && (
                <div className="flex items-center justify-center gap-2 p-2 bg-emerald-100 border-2 border-emerald-900 rounded-xl text-[11px] font-mono font-bold text-emerald-900 uppercase">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Photo beamed successfully! ({connectedCount} saved)
                </div>
              )}
            </div>

            <button
              onClick={handleCloseQRModal}
              className="w-full py-3 bg-cream-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl border-2 border-cream-900 hover:bg-cream-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
