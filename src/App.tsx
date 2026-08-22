import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Sparkles, RefreshCw, Volume2, VolumeX, FolderUp, Maximize2 } from 'lucide-react';
import { WebcamCapture } from './components/WebcamCapture';
import { CustomizationBar } from './components/CustomizationBar';
import { ExportPanel } from './components/ExportPanel';
import { DoodleCanvas } from './components/DoodleCanvas';
import { PoseRetakeModal } from './components/PoseRetakeModal';
import { MobileReceiverView } from './components/MobileReceiverView';
import { ThermalPrintModal } from './components/ThermalPrintModal';
import { KioskModeModal } from './components/KioskModeModal';
import { stitchPhotos, getPhotoCountForLayout, clearImageCache } from './utils/canvasStitcher';
import type { StitchOptions, StickerInstance, DoodlePath } from './types/photobooth';
import { layoutsList } from './constants/photobooth';
import { setSoundEnabled, playClick } from './utils/audioEngine';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

function App() {
  const [view, setView] = useState<'landing' | 'layout-select' | 'booth' | 'result'>('landing');
  const [photos, setPhotos] = useState<string[]>([]);
  const [burstFrames, setBurstFrames] = useState<string[][]>([]);
  const [stitchedPhoto, setStitchedPhoto] = useState<string>('');
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Modals state
  const [showThermalModal, setShowThermalModal] = useState(false);
  const [showKioskModal, setShowKioskModal] = useState(false);

  // Kiosk Party Mode State
  const [kioskActive, setKioskActive] = useState(false);
  const [kioskAutoResetSec, setKioskAutoResetSec] = useState(30);
  const [kioskCountdown, setKioskCountdown] = useState<number | null>(null);

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
    captionText: '',
    captionFont: 'bubble',
    captionColor: '#1C1917',
    ditherMode: 'none',
  });

  const [stickers, setStickers] = useState<StickerInstance[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const [containerHeight, setContainerHeight] = useState(500);

  const resetSession = useCallback(() => {
    playClick();
    clearImageCache();
    setPhotos([]);
    setBurstFrames([]);
    setStitchedPhoto('');
    setStickers([]);
    setDoodles([]);
    setSelectedStickerId(null);
    setRetakePoseIndex(null);
    setView('landing');
  }, []);

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
  }, [stitchedPhoto, view]);

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
        } catch (err) {
          console.error('Failed to stitch photos:', err);
        }
      };

      const timer = setTimeout(generateStrip, 40);
      return () => clearTimeout(timer);
    }
  }, [photos, options, stickers, doodles]);

  // Kiosk Mode Auto-Reset Countdown when on Results view
  useEffect(() => {
    if (!kioskActive || view !== 'result') return;

    const interval = setInterval(() => {
      setKioskCountdown((prev) => {
        if (prev === null) return kioskAutoResetSec;
        if (prev <= 1) {
          clearInterval(interval);
          resetSession();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    const initTimer = setTimeout(() => {
      setKioskCountdown(kioskAutoResetSec);
    }, 0);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [kioskActive, view, kioskAutoResetSec, resetSession]);

  const handleCaptureComplete = (capturedPhotos: string[], capturedBurstFrames?: string[][]) => {
    setPhotos(capturedPhotos);
    if (capturedBurstFrames) {
      setBurstFrames(capturedBurstFrames);
    } else {
      setBurstFrames(capturedPhotos.map((p) => [p]));
    }
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
        setBurstFrames(uploadedPhotos.map((p) => [p]));
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

  const handleRetakeComplete = (newPhoto: string, index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      updated[index] = newPhoto;
      return updated;
    });
    setBurstFrames((prev) => {
      const updated = [...prev];
      updated[index] = [newPhoto];
      return updated;
    });
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
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleStickerTouchStart = (e: React.TouchEvent, id: string) => {
    if (doodleActive) return;
    setSelectedStickerId(id);
    const container = previewContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;

      const sticker = stickers.find((s) => s.id === id);
      if (!sticker) return;

      const startXPercent = sticker.x;
      const startYPercent = sticker.y;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (moveEvent.touches.length !== 1) return;
        const currentTouch = moveEvent.touches[0];
        const deltaX = currentTouch.clientX - startX;
        const deltaY = currentTouch.clientY - startY;

        const deltaXPercent = (deltaX / rect.width) * 100;
        const deltaYPercent = (deltaY / rect.height) * 100;

        const newX = Math.max(0, Math.min(100, startXPercent + deltaXPercent));
        const newY = Math.max(0, Math.min(100, startYPercent + deltaYPercent));

        updateSticker(id, { x: newX, y: newY });
      };

      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd);
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const initialDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const initialAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);

      const sticker = stickers.find((s) => s.id === id);
      if (!sticker) return;

      const initialScale = sticker.scale;
      const initialRotation = sticker.rotation;

      const handlePinchMove = (moveEvent: TouchEvent) => {
        if (moveEvent.touches.length === 2) {
          const mt1 = moveEvent.touches[0];
          const mt2 = moveEvent.touches[1];

          const currDist = Math.hypot(mt2.clientX - mt1.clientX, mt2.clientY - mt1.clientY);
          const currAngle = Math.atan2(mt2.clientY - mt1.clientY, mt2.clientX - mt1.clientX) * (180 / Math.PI);

          const scaleFactor = currDist / initialDist;
          const newScale = Math.max(0.4, Math.min(3.0, initialScale * scaleFactor));
          const newRotation = (initialRotation + (currAngle - initialAngle) + 360) % 360;

          updateSticker(id, {
            scale: parseFloat(newScale.toFixed(2)),
            rotation: Math.round(newRotation),
          });
        }
      };

      const handlePinchEnd = () => {
        document.removeEventListener('touchmove', handlePinchMove);
        document.removeEventListener('touchend', handlePinchEnd);
      };

      document.addEventListener('touchmove', handlePinchMove, { passive: true });
      document.addEventListener('touchend', handlePinchEnd);
    }
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
      case 'ribbon': return '🎀';
      case 'fire': return '🔥';
      case 'kiss': return '💋';
      case 'crown': return '👑';
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
    const newState = !soundEnabled;
    setSoundEnabledState(newState);
    setSoundEnabled(newState);
    playClick();
  };

  const isTraditionalSelected = options.layout === 'traditional-4';

  // If opened via Photo QR Code (?photo=...), show the Mobile Receiver Screen
  if (photoUrl) {
    return (
      <MobileReceiverView
        photoUrl={photoUrl}
        onGoToBooth={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setPhotoUrl(null);
          setView('landing');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen y2k-grid flex flex-col justify-between p-3 md:p-5 lg:p-6 relative">
      {/* Hidden File Input for Image Upload Mode */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept="image/*"
        className="hidden"
      />

      {(view === 'landing' || view === 'layout-select') && (
        <header className="w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between border-3 border-cream-900 bg-white p-3 md:p-4 rounded-2xl shadow-neo mb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pastelpink-300 via-sage-300 to-maroon-800" />
          
          <div className="flex items-center gap-3 mt-1">
            <div className="w-10 h-10 rounded-xl bg-pastelpink-200 border-2 border-cream-900 flex items-center justify-center rotate-3 shadow-neo-sm">
              <Camera className="w-5 h-5 text-cream-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider m-0 leading-none flex items-center gap-1">
                NEO.BOOTH <span className="text-xs font-mono text-pastelpink-500 font-bold px-1.5 py-0.5 border border-pastelpink-300 rounded bg-pastelpink-50">v2.0</span>
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-widest text-cream-600 mt-1">
                ✦ Tokyo-Retro / Gen-Z Photobooth ✦
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 md:mt-0 font-mono text-xs font-bold uppercase">
            {/* Event Kiosk Mode Button */}
            <button
              onClick={() => setShowKioskModal(true)}
              title="Party & Event Kiosk Mode"
              className={`flex items-center gap-1.5 px-3 py-1 border-2 border-cream-900 rounded-lg shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer ${
                kioskActive ? 'bg-amber-300 text-cream-900 ring-2 ring-cream-900' : 'bg-amber-100 hover:bg-amber-200 text-cream-900'
              }`}
            >
              <Maximize2 className="w-4 h-4" />
              <span>{kioskActive ? 'Kiosk Active' : 'Kiosk Mode'}</span>
            </button>

            <button
              onClick={handleToggleSound}
              className={`flex items-center gap-1.5 px-3 py-1 border-2 border-cream-900 rounded-lg shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer ${
                soundEnabled ? 'bg-pastelpink-100 text-cream-900' : 'bg-cream-100 text-cream-500'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  Sound On
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  Muted
                </>
              )}
            </button>
          </div>
        </header>
      )}

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto">
        <AnimatePresence mode="wait">

          {/* VIEW: LANDING */}
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center text-center max-w-lg bg-white border-3 border-cream-900 p-8 rounded-3xl shadow-neo relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-pastelpink-200 border-2 border-cream-900 flex items-center justify-center -rotate-6 shadow-neo-sm mb-4">
                <Sparkles className="w-8 h-8 text-cream-900" />
              </div>

              <h2 className="text-3xl font-black uppercase tracking-tight text-cream-900 mb-2">
                Snap, Deco, Print & Share
              </h2>
              <p className="text-sm text-cream-700 mb-6 font-medium leading-relaxed">
                Step into the Y2K photobooth. Live Purikura filters, animated GIF boomerang strips, instant QR sharing, and 4x6 print layouts!
              </p>

              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => {
                    playClick();
                    setView('layout-select');
                  }}
                  className="flex items-center justify-center gap-2 py-4 bg-pastelpink-200 hover:bg-pastelpink-300 text-cream-900 border-3 border-cream-900 rounded-2xl font-bold uppercase text-base shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  Start Camera Photobooth
                </button>

                <button
                  onClick={() => {
                    playClick();
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center justify-center gap-2 py-3 bg-cream-50 hover:bg-cream-100 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase text-xs shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                >
                  <FolderUp className="w-4 h-4 text-pastelpink-500" />
                  Upload Photos from Device
                </button>
              </div>
            </motion.div>
          )}

          {/* VIEW: LAYOUT SELECTION */}
          {view === 'layout-select' && (
            <motion.div
              key="layout-select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center text-center max-w-2xl w-full bg-white border-3 border-cream-900 p-6 md:p-8 rounded-3xl shadow-neo"
            >
              <h2 className="text-2xl md:text-3xl font-black uppercase text-cream-900 mb-1">
                Choose Strip Layout
              </h2>
              <p className="text-xs text-cream-600 mb-6 font-mono uppercase">
                Select your preferred photobooth frame style
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 w-full mb-6">
                {layoutsList.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => {
                      playClick();
                      setOptions((prev) => ({ ...prev, layout: layout.id }));
                      setView('booth');
                    }}
                    className={`flex flex-col items-center p-4 border-2 border-cream-900 rounded-2xl transition-all font-sans relative cursor-pointer ${
                      options.layout === layout.id
                        ? 'bg-pastelpink-100 shadow-none translate-x-[2px] translate-y-[2px]'
                        : 'bg-white hover:bg-cream-50 shadow-neo hover:translate-x-[1px] hover:translate-y-[1px]'
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {layout.id === 'vertical-4' ? '🎞️' :
                       layout.id === 'vertical-3' ? '📷' :
                       layout.id === 'vertical-2' ? '📸' :
                       layout.id === 'grid-6' ? '🖼️' : '🎞️'}
                    </div>
                    <div className="font-bold text-sm uppercase text-cream-900">{layout.name}</div>
                    <span className="text-[10px] font-mono text-cream-500 mt-1">{layout.description}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  playClick();
                  setView('landing');
                }}
                className="px-6 py-2 bg-cream-100 hover:bg-cream-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase cursor-pointer"
              >
                Back
              </button>
            </motion.div>
          )}

          {/* VIEW: BOOTH (LIVE WEBCAM) */}
          {view === 'booth' && (
            <motion.div
              key="booth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center"
            >
              <div className="w-full max-w-4xl flex items-center justify-between mb-3 px-2">
                <button
                  onClick={() => {
                    playClick();
                    setView('layout-select');
                  }}
                  className="px-4 py-1.5 bg-white text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer"
                >
                  ← Change Layout
                </button>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cream-700 uppercase bg-pastelpink-100 px-3 py-1 border-2 border-cream-900 rounded-lg">
                    {getPhotoCountForLayout(options.layout)} Poses
                  </span>
                </div>
              </div>

              <WebcamCapture
                onCaptureComplete={handleCaptureComplete}
                photoCount={getPhotoCountForLayout(options.layout)}
                isTraditional={isTraditionalSelected}
              />
            </motion.div>
          )}

          {/* VIEW: RESULT (CUSTOMIZATION & EXPORT) */}
          {view === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 w-full max-w-5xl relative"
            >
              {/* Kiosk Mode Auto-Reset Banner */}
              {kioskActive && kioskCountdown !== null && (
                <div className="w-full lg:col-span-2 bg-amber-200 border-3 border-cream-900 rounded-2xl p-3 shadow-neo flex items-center justify-between text-xs font-mono font-bold text-cream-900">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-amber-800 animate-pulse" />
                    <span>🎪 Kiosk Mode: Auto-resetting for next guest in {kioskCountdown}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setKioskCountdown(kioskAutoResetSec)}
                      className="px-3 py-1 bg-white hover:bg-cream-50 border-2 border-cream-900 rounded-lg shadow-neo-sm hover:shadow-none cursor-pointer"
                    >
                      Keep Editing
                    </button>
                    <button
                      onClick={() => setKioskActive(false)}
                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-700 rounded-lg cursor-pointer"
                    >
                      Exit Kiosk
                    </button>
                  </div>
                </div>
              )}

              {/* Strip Preview Container */}
              <div className="flex flex-col items-center gap-3 w-full lg:w-1/2">
                <div className="flex items-center justify-between w-full max-w-sm px-1">
                  <button
                    onClick={resetSession}
                    className="px-4 py-1.5 bg-white hover:bg-cream-50 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer"
                  >
                    ← Start Over
                  </button>
                  <span className="font-mono text-xs font-bold text-cream-600 uppercase">
                    Interactive Preview
                  </span>
                </div>

                <div 
                  ref={previewContainerRef}
                  style={{
                    '--container-width': `${containerWidth}px`,
                    '--container-height': `${containerHeight}px`,
                  } as React.CSSProperties}
                  className="relative p-3 bg-[#eae8e1] border-4 border-cream-900 rounded-2xl shadow-neo max-w-sm w-full flex flex-col items-center"
                >
                  {stitchedPhoto ? (
                    <div className="relative w-full flex flex-col items-center">
                      <img
                        src={stitchedPhoto}
                        alt="Stitched Photo Strip"
                        className="w-full h-auto object-contain rounded shadow select-none"
                      />

                      {/* Purikura Neon Doodle Overlay Canvas */}
                      {doodleActive && (
                        <DoodleCanvas
                          active={doodleActive}
                          currentColor={doodleColor}
                          currentSize={doodleSize}
                          glowEnabled={doodleGlow}
                          doodles={doodles}
                          onAddDoodle={(newDoodle) => setDoodles((prev) => [...prev, newDoodle])}
                          width={containerWidth}
                          height={containerHeight}
                        />
                      )}

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
                      <RefreshCw className="w-6 h-6 animate-spin text-pastelpink-400" />
                      Rendering Strip...
                    </div>
                  )}
                </div>
              </div>

              {/* Controls Column */}
              <div className="w-full lg:w-1/2 flex flex-col gap-6 max-w-md">
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
                  onOpenThermalModal={() => setShowThermalModal(true)}
                />

                {stitchedPhoto && (
                  <ExportPanel 
                    options={options} 
                    onChange={setOptions} 
                    dataUrl={stitchedPhoto}
                    burstFrames={burstFrames}
                    onOpenThermalModal={() => setShowThermalModal(true)}
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

      {/* Floyd-Steinberg Thermal Printer Modal */}
      {showThermalModal && stitchedPhoto && (
        <ThermalPrintModal
          sourceDataUrl={stitchedPhoto}
          onClose={() => setShowThermalModal(false)}
        />
      )}

      {/* Party / Event Kiosk Mode Modal */}
      {showKioskModal && (
        <KioskModeModal
          isOpen={showKioskModal}
          onClose={() => setShowKioskModal(false)}
          onActivate={(timerSec) => {
            setKioskAutoResetSec(timerSec);
            setKioskActive(true);
            if (view === 'landing') setView('layout-select');
          }}
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
