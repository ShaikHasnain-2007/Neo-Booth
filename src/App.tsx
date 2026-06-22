import { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { WebcamCapture } from './components/WebcamCapture';
import { CustomizationBar } from './components/CustomizationBar';
import { ExportPanel } from './components/ExportPanel';
import { stitchPhotos, getPhotoCountForLayout } from './utils/canvasStitcher';
import type { StitchOptions, StickerInstance } from './utils/canvasStitcher';
import { setSoundEnabled, playClick } from './utils/audioEngine';
import { motion, AnimatePresence } from 'framer-motion';

const layoutsList = [
  {
    id: 'vertical-4' as const,
    name: 'Layout A',
    poses: 4,
    description: '4 Pose Strip',
    style: 'vertical',
  },
  {
    id: 'vertical-3' as const,
    name: 'Layout B',
    poses: 3,
    description: '3 Pose Strip',
    style: 'vertical',
  },
  {
    id: 'vertical-2' as const,
    name: 'Layout C',
    poses: 2,
    description: '2 Pose Strip',
    style: 'vertical',
  },
  {
    id: 'grid-6' as const,
    name: 'Layout D',
    poses: 6,
    description: '6 Pose Grid',
    style: 'grid',
  },
  {
    id: 'traditional-4' as const,
    name: 'Traditional Photobooth Layout',
    poses: 4,
    description: '4 Pose Vertical',
    style: 'traditional',
  },
];

function App() {
  const [view, setView] = useState<'landing' | 'layout-select' | 'booth' | 'result'>('landing');
  const [photos, setPhotos] = useState<string[]>([]);
  const [stitchedPhoto, setStitchedPhoto] = useState<string>('');
  const [soundEnabled, setSoundEnabledState] = useState(true);
  
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

  useEffect(() => {
    setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const neededPhotos = getPhotoCountForLayout(options.layout);
    if (photos.length === neededPhotos) {
      const generateStrip = async () => {
        try {
          const result = await stitchPhotos(photos, {
            ...options,
            stickers,
          });
          setStitchedPhoto(result);
        } catch (err) {
          console.error('Failed to stitch photos:', err);
        }
      };
      
      const timer = setTimeout(generateStrip, 50);
      return () => clearTimeout(timer);
    }
  }, [photos, options, stickers]);

  const handleCaptureComplete = (capturedPhotos: string[]) => {
    setPhotos(capturedPhotos);
    setView('result');
  };

  const resetSession = () => {
    playClick();
    setPhotos([]);
    setStitchedPhoto('');
    setStickers([]);
    setSelectedStickerId(null);
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

  const deleteSticker = (id: string) => {
    playClick();
    setStickers((prev) => prev.filter((s) => s.id !== id));
    if (selectedStickerId === id) {
      setSelectedStickerId(null);
    }
  };

  const clearStickers = () => {
    playClick();
    setStickers([]);
    setSelectedStickerId(null);
  };

  const handleStickerMouseDown = (e: React.MouseEvent, id: string) => {
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

      updateSticker(id, {
        x: Math.max(0, Math.min(100, startXPercent + deltaXPercent)),
        y: Math.max(0, Math.min(100, startYPercent + deltaYPercent)),
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleStickerTouchStart = (e: React.TouchEvent, id: string) => {
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
      const moveTouch = moveEvent.touches[0];
      const deltaX = moveTouch.clientX - startX;
      const deltaY = moveTouch.clientY - startY;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      updateSticker(id, {
        x: Math.max(0, Math.min(100, startXPercent + deltaXPercent)),
        y: Math.max(0, Math.min(100, startYPercent + deltaYPercent)),
      });
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
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
    const newState = !soundEnabled;
    setSoundEnabledState(newState);
    setSoundEnabled(newState);
    playClick();
  };

  const isTraditionalSelected = options.layout === 'traditional-4';

  return (
    <div className="min-h-screen y2k-grid flex flex-col justify-between p-3 md:p-5 lg:p-6 relative">

      {view !== 'booth' && (
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

          <div className="flex items-center gap-3 mt-3 md:mt-0 font-mono text-xs font-bold uppercase">
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

            <span className="flex items-center gap-1 px-3 py-1 bg-sage-100 border-2 border-cream-900 rounded-lg shadow-neo-sm">
              <Sparkles className="w-3.5 h-3.5 text-sage-600 animate-spin" />
              Pure HTML5 Canvas
            </span>
          </div>
        </header>
      )}

      <main className="flex-1 w-full max-w-5xl mx-auto flex items-center justify-center py-2 md:py-4">
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
                Welcome to the retro digital photo booth. Select your layout, snap consecutive photos, customize retro filters, place draggable stickers, and download.
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
                  Frame Patterns & VHS HUDs
                </div>
                <div className="flex items-center gap-2 p-2 md:p-2.5 bg-cream-50 border-2 border-cream-200 rounded-xl">
                  <span className="w-5 h-5 rounded-lg bg-maroon-50 bg-opacity-50 flex items-center justify-center text-cream-900 text-xs">4</span>
                  Custom Text & Stickers
                </div>
              </div>

              <button
                onClick={() => {
                  playClick();
                  setView('layout-select');
                }}
                className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-3.5 bg-pastelpink-200 text-cream-900 border-3 border-cream-900 rounded-2xl font-bold text-lg md:text-xl uppercase tracking-wide hover:bg-pastelpink-300 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group"
              >
                <Camera className="w-5.5 h-5.5 md:w-6 h-6 group-hover:rotate-12 transition-transform" />
                Enter Photobooth
              </button>
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
                Select a layout for your photo session. You can choose from different styles and poses.
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
                                <Camera className="w-4 h-4 text-cream-400" />
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

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    playClick();
                    setView('landing');
                  }}
                  className="px-5 py-2 md:px-6 md:py-2.5 border-2 border-cream-900 bg-white font-bold text-xs md:text-sm uppercase rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    playClick();
                    setView('booth');
                  }}
                  className="inline-flex items-center gap-1.5 px-6 py-2 md:px-8 md:py-2.5 bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-base uppercase tracking-wide hover:bg-pastelpink-300 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer"
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
              <div className="flex items-center justify-between w-full max-w-4xl px-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      playClick();
                      setView('layout-select');
                    }}
                    className="px-4 py-2 border-2 border-cream-900 bg-white font-bold text-xs uppercase rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                  >
                    ← Back to Layouts
                  </button>
                  
                  <button
                    onClick={handleToggleSound}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-cream-900 rounded-lg shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer font-mono text-[10px] font-bold uppercase ${
                      soundEnabled ? 'bg-pastelpink-100 text-cream-900' : 'bg-cream-100 text-cream-500'
                    }`}
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        Sound On
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        Muted
                      </>
                    )}
                  </button>
                </div>

                <span className="font-mono text-xs font-bold uppercase text-cream-500">
                  Step 2: Take Poses ({getPhotoCountForLayout(options.layout)} photos)
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
                  <span className="font-mono text-xs font-bold uppercase text-cream-500">
                    Step 3: Edit & Add Stickers
                  </span>
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
                    >
                      <motion.img
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        src={stitchedPhoto}
                        alt="Your Stitched Photo Strip"
                        className="max-h-[60vh] w-auto border-2 border-cream-900 rounded shadow-md pointer-events-none select-none block"
                      />

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
                              cursor: 'grab',
                              zIndex: isSelected ? 40 : 20,
                            }}
                            onMouseDown={(e) => handleStickerMouseDown(e, sticker.id)}
                            onTouchStart={(e) => handleStickerTouchStart(e, sticker.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStickerId(sticker.id);
                            }}
                            className={`p-1 transition-shadow duration-100 ${
                              isSelected ? 'ring-3 ring-pink-500 rounded-md bg-white/20 backdrop-blur-[1px]' : ''
                            }`}
                          >
                            {emoji && (
                              <span className="text-4xl filter drop-shadow select-none pointer-events-none block">
                                {emoji}
                              </span>
                            )}
                            {badgeText && (
                              <span
                                className={`font-black text-xl select-none pointer-events-none px-2 py-0.5 border-2 border-black rounded-lg shadow-neo-sm font-sans tracking-wide block ${
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
                />

                {stitchedPhoto && <ExportPanel options={options} onChange={setOptions} dataUrl={stitchedPhoto} />}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="w-full max-w-5xl mx-auto border-t-2 border-cream-200 mt-4 pt-3 md:mt-6 md:pt-4 flex items-center justify-center font-mono text-[10px] text-cream-400 uppercase tracking-widest">
        <span>✦ Made with love ✦ Neo.Booth Photobooth ✦</span>
      </footer>
    </div>
  );
}

export default App;
