import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Image, Check, Copy, Share2, QrCode, X, Sparkles, CheckCircle2, RefreshCw, ExternalLink, Film, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { Peer } from 'peerjs';
import { uploadPhotoStripToCloud } from '../utils/photoShareService';
import type { StitchOptions } from '../types/photobooth';

interface ExportPanelProps {
  options: StitchOptions;
  onChange: (options: StitchOptions) => void;
  dataUrl: string;
  gifDataUrl?: string | null;
  onGenerateGif?: () => Promise<string | null>;
  isGeneratingGif?: boolean;
  gifProgress?: number;
}

// In-memory cache for instant zero-latency QR display
const qrCache = new Map<string, { qrCodeUrl: string; shareUrl: string }>();

export const ExportPanel: React.FC<ExportPanelProps> = ({ 
  options, 
  onChange, 
  dataUrl,
  gifDataUrl,
  onGenerateGif,
  isGeneratingGif,
  gifProgress = 0,
}) => {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [shareablePhotoUrl, setShareablePhotoUrl] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'ready' | 'error'>('idle');

  const isGif = options.downloadFormat === 'gif';
  const activeExportDataUrl = isGif && gifDataUrl ? gifDataUrl : dataUrl;
  const filename = `neobooth-${new Date().toISOString().slice(0, 10)}.${options.downloadFormat}`;
  const isMountedRef = useRef(true);

  // P2P Direct Device-to-Device WebRTC Session
  const peerRef = useRef<Peer | null>(null);
  const [peerId, setPeerId] = useState<string>('');

  useEffect(() => {
    let active = true;
    let currentPeer: Peer | null = null;

    try {
      const generatedPeerId = 'neo-' + Math.random().toString(36).substring(2, 9);
      currentPeer = new Peer(generatedPeerId);
      peerRef.current = currentPeer;

      currentPeer.on('open', (id) => {
        if (active) {
          setPeerId(id);
        }
      });

      currentPeer.on('connection', (conn) => {
        const sendPhoto = () => {
          conn.send({
            type: 'PHOTO_DATA',
            dataUrl: activeExportDataUrl,
            filename,
            isGif,
          });
        };

        conn.on('open', sendPhoto);

        conn.on('data', (msg: unknown) => {
          if (msg && typeof msg === 'object' && 'type' in msg && msg.type === 'REQUEST_PHOTO') {
            sendPhoto();
          }
        });
      });
    } catch (err) {
      console.warn('PeerJS host init skipped:', err);
    }

    return () => {
      active = false;
      if (currentPeer) {
        currentPeer.destroy();
      }
    };
  }, [activeExportDataUrl, filename, isGif]);

  // Core upload and QR generator function
  const uploadAndGenerateQR = useCallback(async (targetDataUrl: string, targetFilename: string, currentPeerId?: string) => {
    if (!targetDataUrl) return;

    const cacheKey = targetDataUrl + (currentPeerId || '');
    if (qrCache.has(cacheKey)) {
      const cached = qrCache.get(cacheKey)!;
      if (isMountedRef.current) {
        setQrCodeUrl(cached.qrCodeUrl);
        setShareablePhotoUrl(cached.shareUrl);
        setUploadStatus('ready');
      }
      return;
    }

    if (isMountedRef.current) {
      setUploadStatus('uploading');
    }

    const baseOrigin =
      typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'https://neo-booth.vercel.app'
        : window.location.origin;

    try {
      // 1. First generate direct share link using P2P if available
      const uploadedUrl = await uploadPhotoStripToCloud(targetDataUrl, targetFilename);

      let directShareLink = '';
      if (currentPeerId) {
        directShareLink = `${baseOrigin}/?peer=${currentPeerId}${uploadedUrl ? '&photo=' + encodeURIComponent(uploadedUrl) : ''}`;
      } else if (uploadedUrl) {
        directShareLink = `${baseOrigin}/?photo=${encodeURIComponent(uploadedUrl)}`;
      } else {
        directShareLink = `${baseOrigin}/`;
      }

      const qr = await QRCode.toDataURL(directShareLink, {
        width: 280,
        margin: 2,
        color: {
          dark: '#1b1b19',
          light: '#ffffff',
        },
      });

      qrCache.set(cacheKey, { qrCodeUrl: qr, shareUrl: directShareLink });

      if (isMountedRef.current) {
        setQrCodeUrl(qr);
        setShareablePhotoUrl(directShareLink);
        setUploadStatus('ready');
      }
    } catch (err) {
      console.warn('QR code generation issue:', err);
      if (isMountedRef.current) {
        setUploadStatus('error');
      }
    }
  }, []);

  // Background Pre-Upload: As soon as the active dataUrl is ready, upload in background so the QR is ready immediately
  useEffect(() => {
    isMountedRef.current = true;
    if (!activeExportDataUrl) return;

    const timer = setTimeout(() => {
      void uploadAndGenerateQR(activeExportDataUrl, filename, peerId);
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [activeExportDataUrl, filename, peerId, uploadAndGenerateQR]);

  const handleOpenQRModal = async () => {
    setShowQRModal(true);

    let targetUrl = activeExportDataUrl;
    if (isGif && !gifDataUrl && onGenerateGif) {
      setUploadStatus('uploading');
      const generated = await onGenerateGif();
      if (generated) {
        targetUrl = generated;
      }
    }

    const cacheKey = targetUrl + (peerId || '');
    if (qrCache.has(cacheKey)) {
      const cached = qrCache.get(cacheKey)!;
      setQrCodeUrl(cached.qrCodeUrl);
      setShareablePhotoUrl(cached.shareUrl);
      setUploadStatus('ready');
    } else {
      void uploadAndGenerateQR(targetUrl, filename, peerId);
    }
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#FFD6DE', '#CFDEC0', '#5C0617', '#FF3D66', '#A3BE91'],
    });
  };

  const setFormat = (format: 'png' | 'jpg' | 'gif') => {
    onChange({
      ...options,
      downloadFormat: format,
    });
    if (format === 'gif' && !gifDataUrl && onGenerateGif) {
      void onGenerateGif();
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    if (isGif && !gifDataUrl && onGenerateGif) {
      e.preventDefault();
      const generated = await onGenerateGif();
      if (generated) {
        triggerConfetti();
        const a = document.createElement('a');
        a.href = generated;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return;
    }
    triggerConfetti();
  };

  const handleCopyShareLink = async () => {
    if (!shareablePhotoUrl) return;
    try {
      await navigator.clipboard.writeText(shareablePhotoUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const res = await fetch(activeExportDataUrl);
      const blob = await res.blob();
      
      let clipboardBlob = blob;
      if (blob.type !== 'image/png') {
        const img = document.createElement('img');
        img.src = activeExportDataUrl;
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
      const res = await fetch(activeExportDataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: isGif ? 'My NEO.BOOTH Animated GIF' : 'My NEO.BOOTH Strip',
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

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

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
        <span className="text-xs font-mono uppercase tracking-widest text-cream-400">Export Format</span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setFormat('png')}
            className={`flex flex-col items-start p-2.5 border-2 border-cream-900 rounded-xl transition-all font-sans text-left relative cursor-pointer ${
              options.downloadFormat === 'png'
                ? 'bg-pastelpink-50 shadow-none translate-x-[1px] translate-y-[1px]' 
                : 'bg-white hover:bg-cream-50 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
            }`}
          >
            <div className="flex items-center gap-1 font-bold text-xs uppercase text-cream-900">
              PNG
              {options.downloadFormat === 'png' && <Check className="w-3 h-3 text-pastelpink-500" />}
            </div>
            <span className="text-[9px] font-mono text-cream-500 leading-tight mt-0.5">
              Lossless. Sharp stickers & text.
            </span>
          </button>

          <button
            onClick={() => setFormat('jpg')}
            className={`flex flex-col items-start p-2.5 border-2 border-cream-900 rounded-xl transition-all font-sans text-left relative cursor-pointer ${
              options.downloadFormat === 'jpg'
                ? 'bg-pastelpink-50 shadow-none translate-x-[1px] translate-y-[1px]' 
                : 'bg-white hover:bg-cream-50 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
            }`}
          >
            <div className="flex items-center gap-1 font-bold text-xs uppercase text-cream-900">
              JPG
              {options.downloadFormat === 'jpg' && <Check className="w-3 h-3 text-pastelpink-500" />}
            </div>
            <span className="text-[9px] font-mono text-cream-500 leading-tight mt-0.5">
              100% Quality. Ultra fast.
            </span>
          </button>

          <button
            onClick={() => setFormat('gif')}
            className={`flex flex-col items-start p-2.5 border-2 border-cream-900 rounded-xl transition-all font-sans text-left relative cursor-pointer ${
              options.downloadFormat === 'gif'
                ? 'bg-emerald-50 border-emerald-900 shadow-none translate-x-[1px] translate-y-[1px]' 
                : 'bg-white hover:bg-cream-50 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
            }`}
          >
            <div className="flex items-center gap-1 font-bold text-xs uppercase text-emerald-900">
              <Film className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              GIF
              {options.downloadFormat === 'gif' && <Check className="w-3 h-3 text-emerald-600" />}
            </div>
            <span className="text-[9px] font-mono text-emerald-700 leading-tight mt-0.5 font-bold">
              Live Boomerang Loop! 🎞️
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
        href={activeExportDataUrl}
        download={filename}
        onClick={handleDownload}
        className={`flex items-center justify-center gap-3 w-full py-4 text-white border-2 border-cream-900 rounded-xl font-bold uppercase text-base md:text-lg transition-all shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none cursor-pointer text-center ${
          isGif ? 'bg-emerald-900 hover:bg-emerald-800' : 'bg-cream-900 hover:bg-cream-800'
        }`}
      >
        {isGeneratingGif ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Encoding GIF ({gifProgress}%)...</span>
          </>
        ) : (
          <>
            {isGif ? <Film className="w-5 h-5" /> : <Download className="w-5 h-5" />}
            <span>Download {options.downloadFormat.toUpperCase()} Strip</span>
          </>
        )}
      </a>

      {/* Dedicated Per-Photo Mobile QR Code Sharing Modal */}
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
              Save {isGif ? 'Animated GIF' : 'Photo'} on Phone
            </h4>
            <p className="text-xs text-cream-600 font-medium mb-4">
              Scan this QR code with your phone camera to instantly download your {isGif ? 'animated boomerang strip' : 'photo strip'} to your camera roll!
            </p>

            <div className="p-3 bg-cream-50 border-3 border-cream-900 rounded-2xl shadow-neo-sm mb-4 relative min-h-[220px] w-full flex items-center justify-center">
              {uploadStatus === 'uploading' && !qrCodeUrl && (
                <div className="w-52 h-52 flex flex-col items-center justify-center gap-3 text-xs font-mono text-cream-600 uppercase">
                  <RefreshCw className="w-8 h-8 animate-spin text-pastelpink-500" />
                  <span className="font-bold">Generating Photo QR...</span>
                  <span className="text-[10px] text-cream-400">Creating dedicated mobile link</span>
                </div>
              )}

              {qrCodeUrl && (
                <div className="flex flex-col items-center">
                  <img src={qrCodeUrl} alt="Photobooth QR Code" className="w-52 h-52 rounded-xl" />
                </div>
              )}

              {uploadStatus === 'error' && !qrCodeUrl && (
                <div className="w-52 h-52 flex flex-col items-center justify-center gap-2 text-xs font-mono text-red-500 uppercase">
                  <span>Failed to generate QR</span>
                  <button
                    onClick={handleOpenQRModal}
                    className="px-3 py-1.5 bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-lg font-bold text-xs"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Live Status Indicator */}
            <div className="w-full mb-4">
              {qrCodeUrl && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 p-2 bg-emerald-100 border-2 border-emerald-900 rounded-xl text-[11px] font-mono font-bold text-emerald-900 uppercase">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {isGif ? 'Animated GIF QR Ready!' : 'Ultra-Crisp QR Ready!'} Scan with phone
                  </div>

                  <div className="flex items-center justify-center gap-1.5 p-1.5 bg-cream-50 border border-cream-300 rounded-lg text-[10px] font-mono text-emerald-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Direct Device-to-Device P2P • Zero Ads</span>
                  </div>

                  {shareablePhotoUrl && (
                    <button
                      onClick={handleCopyShareLink}
                      className="flex items-center justify-center gap-1.5 text-[11px] font-mono font-bold text-cream-700 hover:text-cream-900 underline cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{linkCopied ? 'Link Copied to Clipboard!' : 'Copy Direct Share Link'}</span>
                    </button>
                  )}
                </div>
              )}

              {uploadStatus === 'uploading' && !qrCodeUrl && (
                <div className="flex items-center justify-center gap-2 p-2 bg-pastelpink-50 border-2 border-cream-200 rounded-xl text-[11px] font-mono font-bold text-cream-600 uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-pastelpink-500 animate-spin" />
                  Preparing private link...
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
