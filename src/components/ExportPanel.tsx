import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Image, 
  Check, 
  Copy, 
  Share2, 
  QrCode, 
  X, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink,
  Film,
  Printer,
  Scissors
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { uploadPhotoStripToCloud } from '../utils/photoShareService';
import { stitchDualPrintSheet, generateAnimatedGif } from '../utils/canvasStitcher';
import type { StitchOptions } from '../types/photobooth';

interface ExportPanelProps {
  options: StitchOptions;
  onChange: (options: StitchOptions) => void;
  dataUrl: string;
  burstFrames?: string[][];
  onOpenThermalModal?: () => void;
}

// In-memory cache for instant zero-latency QR display
const qrCache = new Map<string, { qrCodeUrl: string; shareUrl: string }>();

export const ExportPanel: React.FC<ExportPanelProps> = ({ 
  options, 
  onChange, 
  dataUrl, 
  burstFrames,
  onOpenThermalModal 
}) => {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [shareablePhotoUrl, setShareablePhotoUrl] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'ready' | 'error'>('idle');

  // GIF generation loading state
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [gifCopied, setGifCopied] = useState(false);

  // 4x6 print sheet loading state
  const [isGenerating4x6, setIsGenerating4x6] = useState(false);

  const isPng = options.downloadFormat === 'png';
  const filename = `neobooth-${new Date().toISOString().slice(0, 10)}.${options.downloadFormat}`;
  const isMountedRef = useRef(true);

  // Background Pre-Upload: As soon as the photo strip renders, upload in background so the QR is ready immediately
  useEffect(() => {
    isMountedRef.current = true;
    if (!dataUrl) return;

    let isCancelled = false;

    const timer = setTimeout(() => {
      // Check if already in cache
      if (qrCache.has(dataUrl)) {
        const cached = qrCache.get(dataUrl)!;
        if (isMountedRef.current && !isCancelled) {
          setQrCodeUrl(cached.qrCodeUrl);
          setShareablePhotoUrl(cached.shareUrl);
          setUploadStatus('ready');
        }
        return;
      }

      const preUploadAndGenerateQR = async () => {
        const baseOrigin =
          typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'https://neo-booth.vercel.app'
            : window.location.origin;

        try {
          const uploadedUrl = await uploadPhotoStripToCloud(dataUrl, filename);
          if (isCancelled || !uploadedUrl) return;

          const directShareLink = `${baseOrigin}/?photo=${encodeURIComponent(uploadedUrl)}`;
          const qr = await QRCode.toDataURL(directShareLink, {
            width: 280,
            margin: 2,
            color: {
              dark: '#1b1b19',
              light: '#ffffff',
            },
          });

          qrCache.set(dataUrl, { qrCodeUrl: qr, shareUrl: directShareLink });

          if (isMountedRef.current && !isCancelled) {
            setQrCodeUrl(qr);
            setShareablePhotoUrl(directShareLink);
            setUploadStatus('ready');
          }
        } catch (err) {
          console.warn('Background pre-upload skipped:', err);
        }
      };

      void preUploadAndGenerateQR();
    }, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [dataUrl, filename]);

  const handleOpenQRModal = () => {
    setShowQRModal(true);
    if (qrCache.has(dataUrl)) {
      const cached = qrCache.get(dataUrl)!;
      setQrCodeUrl(cached.qrCodeUrl);
      setShareablePhotoUrl(cached.shareUrl);
      setUploadStatus('ready');
    } else {
      setUploadStatus('uploading');
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

  const setFormat = (format: 'png' | 'jpg') => {
    onChange({
      ...options,
      downloadFormat: format,
    });
  };

  const handleDownload = () => {
    triggerConfetti();
  };

  // 🎞️ Animated GIF Download Handler
  const handleDownloadGif = async () => {
    if (!burstFrames || burstFrames.length === 0 || isGeneratingGif) return;
    setIsGeneratingGif(true);

    try {
      const gifBlob = await generateAnimatedGif(burstFrames, options);
      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neobooth-animated-${new Date().toISOString().slice(0, 10)}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setGifCopied(true);
      triggerConfetti();
      setTimeout(() => setGifCopied(false), 3000);
    } catch (err) {
      console.error('GIF generation failed:', err);
    } finally {
      setIsGeneratingGif(false);
    }
  };

  // 🖨️ 4x6" Duplicate Printable Sheet Handler
  const handleDownload4x6Sheet = async () => {
    if (isGenerating4x6 || !dataUrl) return;
    setIsGenerating4x6(true);

    try {
      const dualSheetUrl = await stitchDualPrintSheet(dataUrl);
      const a = document.createElement('a');
      a.href = dualSheetUrl;
      a.download = `neobooth-4x6-dual-strip-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      triggerConfetti();
    } catch (err) {
      console.error('4x6 sheet generation failed:', err);
    } finally {
      setIsGenerating4x6(false);
    }
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

      {/* Main Download Button */}
      <a
        href={dataUrl}
        download={filename}
        onClick={handleDownload}
        className="flex items-center justify-center gap-3 w-full py-4 bg-cream-900 text-white border-2 border-cream-900 rounded-xl font-bold uppercase text-base md:text-lg transition-all shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none cursor-pointer text-center"
      >
        <Download className="w-5 h-5" />
        Download {options.downloadFormat.toUpperCase()} Strip
      </a>

      {/* 🎞️ Animated GIF and 🖨️ 4x6 Dual-Strip Advanced Exporters */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t-2 border-cream-100">
        <button
          onClick={handleDownloadGif}
          disabled={isGeneratingGif}
          className="flex items-center justify-center gap-2 p-3 bg-pastelpink-100 hover:bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase text-xs shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer disabled:opacity-60 text-left"
        >
          {isGeneratingGif ? (
            <RefreshCw className="w-4 h-4 animate-spin text-pastelpink-600" />
          ) : gifCopied ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Film className="w-4 h-4 text-pastelpink-600" />
          )}
          <span className="truncate">
            {isGeneratingGif ? 'Compiling GIF...' : gifCopied ? 'GIF Saved!' : 'Animated GIF'}
          </span>
        </button>

        <button
          onClick={handleDownload4x6Sheet}
          disabled={isGenerating4x6}
          title="Download 4x6 inch standard photo paper sheet with 2 cut-strips"
          className="flex items-center justify-center gap-2 p-3 bg-amber-50 hover:bg-amber-100 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase text-xs shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer disabled:opacity-60 text-left"
        >
          {isGenerating4x6 ? (
            <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
          ) : (
            <Scissors className="w-4 h-4 text-amber-700" />
          )}
          <span className="truncate">
            {isGenerating4x6 ? 'Rendering Sheet...' : '4x6" Dual Print'}
          </span>
        </button>
      </div>

      {onOpenThermalModal && (
        <button
          onClick={onOpenThermalModal}
          className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-neo-sm hover:translate-y-[1px] cursor-pointer"
        >
          <Printer className="w-4 h-4 text-cream-900" />
          Thermal Pocket Printer Mode
        </button>
      )}

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
              Save on Smartphone
            </h4>
            <p className="text-xs text-cream-600 font-medium mb-4">
              Scan this QR code with your phone camera to instantly download your photo strip to your camera roll!
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
                    Ultra-Crisp QR Ready! Scan with phone
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
