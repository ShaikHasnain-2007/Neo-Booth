import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Sparkles, RefreshCw, Volume2, VolumeX, Upload, FolderUp, Film } from 'lucide-react';
import { WebcamCapture } from './components/WebcamCapture';
import { CustomizationBar } from './components/CustomizationBar';
import { ExportPanel } from './components/ExportPanel';
import { DoodleCanvas } from './components/DoodleCanvas';
import { PoseRetakeModal } from './components/PoseRetakeModal';
import { MobileReceiverView } from './components/MobileReceiverView';
import { stitchPhotos, getPhotoCountForLayout, clearImageCache } from './utils/canvasStitcher';
import { stitchAnimatedGif } from './utils/gifStitcher';
import type { StitchOptions, StickerInstance, DoodlePath } from './types/photobooth';
import { layoutsList } from './constants/photobooth';
import { setSoundEnabled, playClick } from './utils/audioEngine';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

function App() {
  const [view, setView] = useState<'landing' | 'layout-select' | 'booth' | 'result'>('landing');
  const [photos, setPhotos] = useState<string[]>([]);
  const [poseBursts, setPoseBursts] = useState<string[][]>([]);
  const [stitchedPhoto, setStitchedPhoto] = useState<string>('');
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Live GIF Boomerang State
  const [previewTab, setPreviewTab] = useState<'still' | 'gif'>('still');
  const [gifDataUrl, setGifDataUrl] = useState<string | null>(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState<boolean>(false);
  const [gifProgress, setGifProgress] = useState<number>(0);

  // Mobile Photo Delivery Mode (initialized directly from URL search params)
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('photo') || params.get('file') || params.get('f') || null;
  });

  // Single-Pose Retake State
  const [retakePoseIndex, setRetakePoseIndex] = useState<number | null>(null);

  // Purikura Doodle Tool State
  const [doodles, setDoodles] = useState<DoodlePath[]>([]);
  const [doodleActive, setDoodleActive] = useState(false);
  const [doodleColor, setDoodleColor] = useState('#FF2E93');
  const [doodleSize, setDoodleSize] = useState(6);
  const [doodleGlow, setDoodleGlow] = useState(true);

  const [options, setOptions] = useState<StitchOptions>({
    layout: 'vertical-4',
    backgroundColor: '#FFFFFF',
    filter: 'none',
    showDate: true,
    isMirrored: false,
    downloadFormat: 'png',
    pattern: 'none',
    grainStrength: 15,
    chromaticOffset: 0,
    vhsOverlay: false,
    customR: 0,
    customG: 0,
    customB: 0,
    customBrightness: 0,
  });

  const [stickers, setStickers] = useState<StickerInstance[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const [containerHeight, setContainerHeight] = useState(500);

  useEffect(() => {
    const element = previewContainerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
        if (entry.contentRect.height > 0) {
          setContainerHeight(entry.contentRect.height);
        }
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [stitchedPhoto, view, previewTab, gifDataUrl]);

  useEffect(() => {
    setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // Fast debounced canvas stitching pipeline with image caching
  useEffect(() => {
    const neededPhotos = getPhotoCountForLayout(options.layout);
    if (photos.length === neededPhotos) {
      const generateStrip = async () => {
        try {
          const result = await stitchPhotos(photos, {
            ...options,
            stickers,
            doodles,
          });
          setStitchedPhoto(result);
          // Invalidate cached GIF when options, stickers, or doodles change
          setGifDataUrl(null);
        } catch (err) {
          console.error('Failed to stitch photos:', err);
        }
      };

      const timer = setTimeout(generateStrip, 40);
      return () => clearTimeout(timer);
    }
  }, [photos, options, stickers, doodles]);

  const handleGenerateGif = useCallback(async (): Promise<string | null> => {
    if (photos.length === 0) return null;
    setIsGeneratingGif(true);
    setGifProgress(10);
    try {
      const result = await stitchAnimatedGif(
        photos,
        {
          ...options,
          stickers,
          doodles,
          poseBursts,
        },
        { boomerang: true, scale: 0.5 },
        (percent) => setGifProgress(percent)
      );
      setGifDataUrl(result.dataUrl);
      return result.dataUrl;
    } catch (err) {
      console.error('GIF generation failed:', err);
      return null;
    } finally {
      setIsGeneratingGif(false);
    }
  }, [photos, options, stickers, doodles, poseBursts]);

  const handleCaptureComplete = (capturedPhotos: string[], capturedBursts?: string[][]) => {
    setPhotos(capturedPhotos);
    if (capturedBursts && capturedBursts.length > 0) {
      setPoseBursts(capturedBursts);
    } else {
      setPoseBursts([]);
    }
    setGifDataUrl(null);
    setPreviewTab('still');
    setView('result');
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FFD6DE', '#CFDEC0', '#5C0617', '#FF3D66', '#A3BE91', '#00FFCC'],
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    playClick();
    const fileList = Array.from(files);
    const readers = fileList.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((uploadedPhotos) => {
      if (uploadedPhotos.length > 0) {
        let selectedLayout = options.layout;
        if (uploadedPhotos.length === 2) selectedLayout = 'vertical-2';
        else if (uploadedPhotos.length === 3) selectedLayout = 'vertical-3';
        else if (uploadedPhotos.length === 6) selectedLayout = 'grid-6';
        else selectedLayout = 'vertical-4';

        setOptions((prev) => ({ ...prev, layout: selectedLayout }));
        setPhotos(uploadedPhotos);
        setPoseBursts([]);
        setGifDataUrl(null);
        setPreviewTab('still');
        setView('result');
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FFD6DE', '#CFDEC0', '#5C0617', '#FF3D66', '#A3BE91', '#00FFCC'],
        });
      }
    });
  };

  const deleteSticker = useCallback((id: string) => {
    playClick();
    setStickers((prev) => prev.filter((s) => s.id !== id));
    setSelectedStickerId((prev) => (prev === id ? null : prev));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'result') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStickerId) {
        e.preventDefault();
        deleteSticker(selectedStickerId);
      } else if (e.key === 'Escape') {
        setSelectedStickerId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, selectedStickerId, deleteSticker]);

  const resetSession = () => {
    playClick();
    clearImageCache();
    setPhotos([]);
    setPoseBursts([]);
    setStitchedPhoto('');
    setGifDataUrl(null);
    setPreviewTab('still');
    setStickers([]);
    setDoodles([]);
    setSelectedStickerId(null);
    setRetakePoseIndex(null);
    setView('landing');
  };

  const addSticker = (type: string) => {
    playClick();
    const newSticker: StickerInstance = {
      id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  const addCustomTextSticker = (text: string, style: string) => {
    playClick();
    if (!text.trim()) return;
    const newSticker: StickerInstance = {
      id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: style,
      text: text.trim().toUpperCase(),
      x: 50,
      y: 50,
      scale: 1.2,
      rotation: 0,
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  const updateSticker = (id: string, updates: Partial<StickerInstance>) => {
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const clearStickers = () => {
    playClick();
    setStickers([]);
    setSelectedStickerId(null);
  };

  const handleRetakeComplete = (newPhoto: string, index: number, newBurst?: string[]) => {
    setPhotos((prev) => {
      const updated = [...prev];
      updated[index] = newPhoto;
      return updated;
    });
    if (newBurst && newBurst.length > 0) {
      setPoseBursts((prev) => {
        const updated = [...prev];
        updated[index] = newBurst;
        return updated;
      });
    }
    setGifDataUrl(null);
    setRetakePoseIndex(null);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleStickerMouseDown = (e: React.MouseEvent, id: string) => {
    if (doodleActive) return;
    e.preventDefault();
    setSelectedStickerId(id);
    const container = previewContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;

    const startXPercent = sticker.x;
    const startYPercent = sticker.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, startXPercent + deltaXPercent));
      const newY = Math.max(0, Math.min(100, startYPercent + deltaYPercent));

      updateSticker(id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleStickerTouchStart = (e: React.TouchEvent, id: string) => {
    if (doodleActive) return;
    setSelectedStickerId(id);
    const container = previewContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;

    const startXPercent = sticker.x;
    const startYPercent = sticker.y;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length > 0) {
        const moveTouch = moveEvent.touches[0];
        const deltaX = moveTouch.clientX - startX;
        const deltaY = moveTouch.clientY - startY;

        const deltaXPercent = (deltaX / rect.width) * 100;
        const deltaYPercent = (deltaY / rect.height) * 100;

        const newX = Math.max(0, Math.min(100, startXPercent + deltaXPercent));
        const newY = Math.max(0, Math.min(100, startYPercent + deltaYPercent));

        updateSticker(id, { x: newX, y: newY });
      }
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  const getEmojiForSticker = (type: string): string | null => {
    switch (type) {
      case 'heart': return '💖';
      case 'star': return '⭐';
      case 'sparkles': return '✨';
      case 'cherry': return '🍒';
      case 'sunglasses': return '🕶️';
      case 'butterfly': return '🦋';
      case 'alien': return '👾';
      case 'flower': return '🌸';
      case 'lightning': return '⚡';
      case 'teddy': return '🧸';
      default: return null;
    }
  };

  const getBadgeTextForSticker = (type: string): string | null => {
    switch (type) {
      case 'badge-cute': return 'CUTE';
      case 'badge-y2k': return 'Y2K';
      case 'badge-cool': return 'COOL';
      case 'badge-baby': return 'BABY';
      default: return null;
    }
  };

  const handleToggleSound = () => {
    setSoundEnabledState((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      if (next) playClick();
      return next;
    });
  };

  const isTraditionalSelected = options.layout === 'traditional-4';

  // If user opens the website via a mobile photo share link (?photo=...)
  if (photoUrl) {
    return (
      <MobileReceiverView 
        photoUrl={photoUrl} 
        onGoToBooth={() => {
          setPhotoUrl(null);
          window.history.replaceState({}, '', window.location.pathname);
          setView('landing');
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen y2k-grid flex flex-col justify-between p-3 md:p-6 select-none">
      {/* Hidden File Input for Image Upload Mode */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Header */}
      {view !== 'booth' && (
        <header className="w-full max-w-5xl mx-auto flex items-center justify-between border-3 border-cream-900 bg-white p-3 md:p-4 rounded-2xl shadow-neo relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pastelpink-300 via-sage-300 to-maroon-800" />
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-pastelpink-200 border-2 border-cream-900 flex items-center justify-center rotate-3 shadow-neo-sm">
              <Camera className="w-5 h-5 md:w-6 md:h-6 text-cream-900" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wider leading-none text-cream-900 flex items-center gap-1.5">
                NEO.BOOTH <span className="text-[10px] md:text-xs font-mono text-pastelpink-500 font-bold px-1.5 py-0.5 border border-pastelpink-300 rounded bg-pastelpink-50">v2.0</span>
              </h1>
              <p className="text-[9px] md:text-[10px] font-mono uppercase tracking-widest text-cream-600 mt-0.5">
                ✦ Y2K Retro Photobooth & Live Strip ✦
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload photos from gallery"
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 border-2 border-cream-900 rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none bg-white hover:bg-cream-100 text-cream-900 transition-all cursor-pointer font-mono text-xs font-bold uppercase"
            >
              <Upload className="w-3.5 h-3.5 text-cream-800" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            <button
              onClick={handleToggleSound}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 border-2 border-cream-900 rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer font-mono text-xs font-bold uppercase ${
                soundEnabled ? 'bg-pastelpink-100 text-cream-900' : 'bg-cream-100 text-cream-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <VolumeX className="w-3 h-3 md:w-3.5 md:h-3.5" />}
              <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>
          </div>
        </header>
      )}

      <main className={`flex-1 w-full max-w-5xl mx-auto flex ${view === 'result' ? 'items-start pt-24 lg:pt-6 xl:pt-2' : 'items-center'} justify-center py-2 md:py-4`}>
        <AnimatePresence mode="wait">

          {view === 'landing' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-xl bg-white border-3 border-cream-900 rounded-3xl p-5 md:p-8 shadow-neo text-center relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-pastelpink-100 rounded-full blur-2xl opacity-60" />
              
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-cream-900 text-white rounded-full text-xs font-mono uppercase tracking-widest mb-4">
                ✦ No login required • Free forever ✦
              </div>

              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-cream-900 leading-none mb-3 md:mb-4">
                Capture the Moment, <br />
                <span className="text-pastelpink-500 underline decoration-wavy decoration-pastelpink-300">Y2K Style.</span>
              </h2>

              <p className="text-cream-600 font-medium text-xs md:text-sm max-w-sm mx-auto mb-4 md:mb-6">
                Welcome to the retro digital photo booth. Select your layout, snap live animated motion or upload photos, draw glowing neon brush doodles, place stickers, and beam straight to your phone!
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-6 md:mb-8 text-left font-mono text-[11px] md:text-xs font-bold text-cream-700">
                <div className="flex items-center gap-2 p-2 md:p-2.5 bg-cream-50 border-2 border-cream-200 rounded-xl">
                  <span className="w-5 h-5 rounded-lg bg-pastelpink-200 flex items-center justify-center text-cream-900 text-xs">1</span>
                  Choose Layout & Poses
                </div>
                <div className="flex items-center gap-2 p-2 md:p-2.5 bg-cream-50 border-2 border-cream-200 rounded-xl">
                  <span className="w-5 h-5 rounded-lg bg-sage-200 flex items-center justify-center text-cream-900 text-xs">2</span>
                  Stitch vertically/grid
                </div>
                <div className="flex items-center gap-2 p-2 md:p-2.5 bg-cream-50 border-2 border-cream-200 rounded-xl">
                  <span className="w-5 h-5 rounded-lg bg-cream-200 flex items-center justify-center text-cream-900 text-xs">3</span>
                  Live Boomerang & Doodles
                </div>
                <div className="flex items-center gap-2 p-2 md:p-2.5 bg-cream-50 border-2 border-cream-200 rounded-xl">
                  <span className="w-5 h-5 rounded-lg bg-maroon-50 bg-opacity-50 flex items-center justify-center text-cream-900 text-xs">4</span>
                  Beam to Mobile via QR
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    playClick();
                    setView('layout-select');
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-pastelpink-200 text-cream-900 border-3 border-cream-900 rounded-2xl font-bold text-base md:text-lg uppercase tracking-wide hover:bg-pastelpink-300 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group cursor-pointer"
                >
                  <Camera className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Enter Photobooth
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-cream-900 border-3 border-cream-900 rounded-2xl font-bold text-sm uppercase tracking-wide hover:bg-cream-100 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-cream-700" />
                  Upload Photos
                </button>
              </div>
            </motion.div>
          )}

          {view === 'layout-select' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-4xl bg-white border-3 border-cream-900 rounded-3xl p-5 md:p-6 shadow-neo text-center relative overflow-hidden"
            >
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-cream-900 mb-1 md:mb-2">
                Choose your layout
              </h2>
              <p className="text-cream-500 font-medium text-xs md:text-sm mb-4 md:mb-6">
                Select a layout for your photo session. You can shoot live poses or upload files.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
                {layoutsList.map((lay) => {
                  const isSelected = options.layout === lay.id;
                  const isTraditional = lay.id === 'traditional-4';
                  
                  return (
                    <button
                      key={lay.id}
                      onClick={() => {
                        playClick();
                        setOptions(prev => ({ ...prev, layout: lay.id }));
                      }}
                      className={`flex flex-col items-center p-2 md:p-3 border-3 rounded-2xl transition-all shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none bg-cream-50/50 cursor-pointer ${
                        isSelected
                          ? 'border-pink-500 ring-4 ring-pink-300 ring-offset-2 scale-102 bg-white'
                          : 'border-cream-900 hover:bg-cream-100/30'
                      }`}
                    >
                      <div
                        className="h-28 sm:h-36 md:h-40 aspect-[1/3.2] rounded-lg border-2 border-cream-900 p-1 flex flex-col gap-0.5 overflow-hidden relative mx-auto"
                        style={{ backgroundColor: isTraditional ? '#000000' : '#FFFFFF' }}
                      >
                        {isTraditional ? (
                          <>
                            {[...Array(lay.poses)].map((_, i) => (
                              <div key={i} className="flex-1 bg-zinc-800 border-[1.5px] border-white rounded-sm flex items-center justify-center">
                                <Camera className="w-4 h-4 text-white/40" />
                              </div>
                            ))}
                            <div className="h-1.5 w-full flex items-center justify-center">
                              <div className="w-8 h-0.5 bg-white/30 rounded-full" />
                            </div>
                          </>
                        ) : lay.style === 'grid' ? (
                          <div className="flex-1 grid grid-cols-2 gap-0.5">
                            {[...Array(6)].map((_, i) => (
                              <div key={i} className="bg-cream-200 rounded border border-cream-900/10 flex items-center justify-center">
                                <Camera className="w-3 h-3 text-cream-400" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            {[...Array(lay.poses)].map((_, i) => (
                              <div key={i} className="flex-1 bg-cream-200 rounded border border-cream-900/10 flex items-center justify-center">
                                <Camera className="w-3 h-3 text-cream-400" />
                              </div>
                            ))}
                            <div className="h-1.5 w-full flex items-center justify-center">
                              <div className="w-8 h-0.5 bg-cream-400/40 rounded-full" />
                            </div>
                          </>
                        )}
                      </div>

                      <span className="font-bold text-xs md:text-sm text-cream-900 mt-2 md:mt-3 leading-tight">{lay.name}</span>
                      <span className="font-mono text-[10px] md:text-xs text-cream-500 mt-1">{lay.description}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => {
                    playClick();
                    setView('landing');
                  }}
                  className="px-5 py-2.5 border-2 border-cream-900 bg-white font-bold text-xs md:text-sm uppercase rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                >
                  Back
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-cream-100 hover:bg-cream-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-xs md:text-sm uppercase shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                >
                  <FolderUp className="w-4 h-4" />
                  Upload Photos
                </button>

                <button
                  onClick={() => {
                    playClick();
                    setView('booth');
                  }}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-base uppercase tracking-wide hover:bg-pastelpink-300 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer"
                >
                  Proceed to Booth
                </button>
              </div>
            </motion.div>
          )}

          {view === 'booth' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex flex-col items-center gap-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-4xl px-2">
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    onClick={() => {
                      playClick();
                      setView('layout-select');
                    }}
                    className="px-3 py-1.5 md:px-4 md:py-2 border-2 border-cream-900 bg-white font-bold text-[11px] md:text-xs uppercase rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer font-sans"
                  >
                    ← Back to Layouts
                  </button>
                  
                  <button
                    onClick={handleToggleSound}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-1.5 border-2 border-cream-900 rounded-lg shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer font-mono text-[10px] font-bold uppercase ${
                      soundEnabled ? 'bg-pastelpink-100 text-cream-900' : 'bg-cream-100 text-cream-500'
                    }`}
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Sound On</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Muted</span>
                      </>
                    )}
                  </button>
                </div>

                <span className="font-mono text-[10px] md:text-xs font-bold uppercase text-cream-600 bg-cream-100/90 px-2.5 py-1 rounded-lg border border-cream-300">
                  Step 2: Take Poses ({getPhotoCountForLayout(options.layout)} Poses)
                </span>
              </div>
              <WebcamCapture 
                onCaptureComplete={handleCaptureComplete} 
                photoCount={getPhotoCountForLayout(options.layout)}
                isTraditional={isTraditionalSelected}
              />
            </motion.div>
          )}

          {view === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full flex flex-col lg:flex-row gap-8 items-start justify-center"
            >
              <div className="w-full lg:w-1/2 flex flex-col items-center gap-4">
                <div className="flex items-center justify-between w-full max-w-md px-2 lg:px-0">
                  {/* Preview Tab Selector (Still vs Live Boomerang GIF) */}
                  <div className="flex items-center gap-1.5 bg-white p-1 border-2 border-cream-900 rounded-xl shadow-neo-sm">
                    <button
                      onClick={() => setPreviewTab('still')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        previewTab === 'still'
                          ? 'bg-pastelpink-200 text-cream-900 border border-cream-900 shadow-sm'
                          : 'text-cream-600 hover:text-cream-900'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>📸 Still</span>
                    </button>

                    <button
                      onClick={() => {
                        setPreviewTab('gif');
                        if (!gifDataUrl) {
                          void handleGenerateGif();
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        previewTab === 'gif'
                          ? 'bg-emerald-200 text-emerald-950 border border-emerald-900 shadow-sm'
                          : 'text-cream-600 hover:text-cream-900'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                      <span>🎞️ Live GIF</span>
                    </button>
                  </div>

                  <button
                    onClick={resetSession}
                    className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-cream-900 bg-white font-bold text-xs uppercase rounded-lg shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retake All
                  </button>
                </div>

                <div className="relative w-full max-w-md flex justify-center p-4 bg-[#eae8e1] border-3 border-cream-900 rounded-3xl shadow-neo-lg overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pastelpink-300 via-sage-300 to-maroon-800" />
                  
                  {stitchedPhoto ? (
                    <div 
                      ref={previewContainerRef}
                      onClick={() => setSelectedStickerId(null)}
                      className="relative w-fit max-w-full select-none cursor-default"
                      style={{ '--container-width': `${containerWidth}px` } as React.CSSProperties}
                    >
                      <motion.img
                        key={previewTab === 'gif' && gifDataUrl ? 'gif' : 'still'}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        src={previewTab === 'gif' && gifDataUrl ? gifDataUrl : stitchedPhoto}
                        alt="Your Stitched Photo Strip"
                        className="max-h-[72vh] min-w-[220px] w-auto border-2 border-cream-900 rounded shadow-md pointer-events-none select-none block"
                      />

                      {/* GIF Generation Overlay Spinner */}
                      {previewTab === 'gif' && !gifDataUrl && isGeneratingGif && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded flex flex-col items-center justify-center gap-2 text-white font-mono text-xs uppercase z-30">
                          <RefreshCw className="w-7 h-7 animate-spin text-pastelpink-300" />
                          <span className="font-bold">Rendering Live Boomerang ({gifProgress}%)...</span>
                        </div>
                      )}

                      {/* Purikura Neon Brush Overlay Canvas */}
                      <DoodleCanvas
                        active={doodleActive}
                        doodles={doodles}
                        onAddDoodle={(newDoodle) => setDoodles((prev) => [...prev, newDoodle])}
                        currentColor={doodleColor}
                        currentSize={doodleSize}
                        glowEnabled={doodleGlow}
                        width={containerWidth}
                        height={containerHeight}
                      />

                      {/* Interactive Stickers Layer */}
                      {stickers.map((sticker) => {
                        const isSelected = sticker.id === selectedStickerId;
                        const emoji = getEmojiForSticker(sticker.type);
                        const badgeText = sticker.text || getBadgeTextForSticker(sticker.type);

                        return (
                          <div
                            key={sticker.id}
                            style={{
                              position: 'absolute',
                              left: `${sticker.x}%`,
                              top: `${sticker.y}%`,
                              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                              cursor: doodleActive ? 'default' : 'grab',
                              zIndex: isSelected ? 40 : 20,
                              pointerEvents: doodleActive ? 'none' : 'auto',
                            }}
                            onMouseDown={(e) => handleStickerMouseDown(e, sticker.id)}
                            onTouchStart={(e) => handleStickerTouchStart(e, sticker.id)}
                            onClick={(e) => {
                              if (doodleActive) return;
                              e.stopPropagation();
                              setSelectedStickerId(sticker.id);
                            }}
                            className={`p-1 transition-shadow duration-100 ${
                              isSelected ? 'ring-3 ring-pink-500 rounded-md bg-white/20 backdrop-blur-[1px]' : ''
                            }`}
                          >
                            {emoji && (
                              <span 
                                style={{ fontSize: 'calc(var(--container-width) * 0.11)' }} 
                                className="filter drop-shadow select-none pointer-events-none block leading-none"
                              >
                                {emoji}
                              </span>
                            )}
                            {badgeText && (
                              <span
                                style={{
                                  fontSize: 'calc(var(--container-width) * 0.068)',
                                  borderWidth: 'max(2px, calc(var(--container-width) * 0.0045))',
                                  padding: 'calc(var(--container-width) * 0.001) calc(var(--container-width) * 0.005)',
                                  borderRadius: 'max(4px, calc(var(--container-width) * 0.012))',
                                  boxShadow: 'max(3px, calc(var(--container-width) * 0.006)) max(3px, calc(var(--container-width) * 0.006)) 0px #000000',
                                }}
                                className={`font-black select-none pointer-events-none font-sans tracking-wide block leading-none border-black ${
                                  sticker.type.startsWith('badge-cute') ? 'bg-[#FFD6DE] text-cream-900' :
                                  sticker.type.startsWith('badge-y2k') ? 'bg-[#00FFCC] text-cream-900' :
                                  sticker.type.startsWith('badge-cool') ? 'bg-[#CFDEC0] text-cream-900' :
                                  'bg-[#FFE5B4] text-cream-900'
                                }`}
                              >
                                {badgeText}
                              </span>
                            )}

                            {isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSticker(sticker.id);
                                }}
                                className="absolute -top-3.5 -right-3.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md border-2 border-white cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-[300px] h-[500px] flex flex-col items-center justify-center gap-3 bg-white border-2 border-cream-900 rounded font-mono text-xs font-bold uppercase text-cream-400">
                      <Sparkles className="w-8 h-8 animate-spin text-pastelpink-500" />
                      <span>Stitching Photos...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls Column */}
              <div className="w-full lg:w-1/2 flex flex-col gap-6">
                <CustomizationBar 
                  options={options} 
                  onChange={setOptions} 
                  stickers={stickers}
                  selectedStickerId={selectedStickerId}
                  onAddSticker={addSticker}
                  onUpdateSticker={updateSticker}
                  onDeleteSticker={deleteSticker}
                  onClearStickers={clearStickers}
                  onAddCustomTextSticker={addCustomTextSticker}
                  soundEnabled={soundEnabled}
                  onToggleSound={handleToggleSound}
                  photos={photos}
                  onRetakePose={(idx) => setRetakePoseIndex(idx)}
                  doodleActive={doodleActive}
                  onToggleDoodle={() => {
                    playClick();
                    setDoodleActive((prev) => !prev);
                  }}
                  doodleColor={doodleColor}
                  onChangeDoodleColor={setDoodleColor}
                  doodleSize={doodleSize}
                  onChangeDoodleSize={setDoodleSize}
                  doodleGlow={doodleGlow}
                  onToggleDoodleGlow={() => setDoodleGlow((prev) => !prev)}
                  hasDoodles={doodles.length > 0}
                  onUndoDoodle={() => {
                    playClick();
                    setDoodles((prev) => prev.slice(0, -1));
                  }}
                  onClearDoodles={() => {
                    playClick();
                    setDoodles([]);
                  }}
                />

                {stitchedPhoto && (
                  <ExportPanel 
                    options={options} 
                    onChange={setOptions} 
                    dataUrl={stitchedPhoto} 
                    gifDataUrl={gifDataUrl}
                    onGenerateGif={handleGenerateGif}
                    isGeneratingGif={isGeneratingGif}
                    gifProgress={gifProgress}
                  />
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Single-Pose Retake Modal */}
      {retakePoseIndex !== null && (
        <PoseRetakeModal
          poseIndex={retakePoseIndex}
          totalPoses={photos.length}
          onRetakeComplete={handleRetakeComplete}
          onClose={() => setRetakePoseIndex(null)}
        />
      )}

      {view !== 'booth' && (
        <footer className="w-full max-w-5xl mx-auto border-t-2 border-cream-200 mt-4 pt-3 md:mt-6 md:pt-4 flex items-center justify-center font-mono text-[10px] text-cream-400 uppercase tracking-widest">
          <span>✦ Made with love ✦ Neo.Booth Photobooth ✦</span>
        </footer>
      )}
    </div>
  );
}

export default App;
