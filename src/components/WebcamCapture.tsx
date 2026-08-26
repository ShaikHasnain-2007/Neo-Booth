import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle2, SwitchCamera, Sparkles, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBeep, playShutter, playClick } from '../utils/audioEngine';
import { renderARFilters, getNoiseCanvases } from '../utils/arFilters';
import { renderSegmentedUserWithBackdrop } from '../utils/backgroundSegmenter';
import { virtualBackdropsList } from '../constants/photobooth';
import type { FaceLandmarker, HandLandmarker, ImageSegmenter } from '@mediapipe/tasks-vision';
import type { 
  ARFilter, 
  NormalizedLandmark, 
  PixelLandmark, 
  HeartParticle, 
  FilterImages,
  VirtualBackdropType
} from '../types/photobooth';

interface WebcamCaptureProps {
  onCaptureComplete: (photos: string[], poseBursts?: string[][]) => void;
  photoCount: number;
  isTraditional?: boolean;
}

type CapturePhase = 'idle' | 'countdown' | 'flash' | 'intermission';

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ 
  onCaptureComplete, 
  photoCount, 
  isTraditional 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const lastLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const lastHandmarksRef = useRef<NormalizedLandmark[][] | null>(null);
  const lastDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const lastMaskRef = useRef<{ data: Float32Array; width: number; height: number } | null>(null);

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<ARFilter[]>([]);
  const [activeBackdrop, setActiveBackdrop] = useState<VirtualBackdropType>('none');
  const [drawerTab, setDrawerTab] = useState<'filters' | 'backdrops'>('filters');
  const [hasLandmarker, setHasLandmarker] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [countdown, setCountdown] = useState(3);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const [photosTaken, setPhotosTaken] = useState<string[]>([]);
  const photosRef = useRef<string[]>([]);
  const poseBurstsRef = useRef<string[][]>([]);
  const currentBurstRef = useRef<string[]>([]);
  const burstIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Floating heart particles state
  const floatingHeartsRef = useRef<HeartParticle[]>([]);
  const lastHandHeartSpawnTimeRef = useRef<number>(0);
  const filterImagesRef = useRef<FilterImages>({ aviators: null, tulip: null });

  // Preload assets on mount
  useEffect(() => {
    const img1 = new Image();
    img1.src = '/filters/aviators.svg';
    filterImagesRef.current.aviators = img1;

    const img2 = new Image();
    img2.src = '/filters/tulip.png';
    filterImagesRef.current.tulip = img2;
  }, []);

  // Initialize MediaPipe FaceLandmarker, HandLandmarker, and ImageSegmenter
  useEffect(() => {
    let active = true;
    async function loadMediaPipe() {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        const [faceLandmarker, handLandmarker, imageSegmenter] = await Promise.all([
          vision.FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU"
            },
            outputFaceBlendshapes: false,
            runningMode: "VIDEO",
            numFaces: 1
          }),
          vision.HandLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
          }),
          vision.ImageSegmenter.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.task",
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            outputCategoryMask: false,
            outputConfidenceMasks: true
          })
        ]);

        if (active) {
          landmarkerRef.current = faceLandmarker;
          handLandmarkerRef.current = handLandmarker;
          segmenterRef.current = imageSegmenter;
          setHasLandmarker(true);
          setIsModelLoading(false);
        }
      } catch (err) {
        console.error("Failed to load MediaPipe models:", err);
        if (active) {
          setIsModelLoading(false);
        }
      }
    }
    loadMediaPipe();
    return () => {
      active = false;
      if (landmarkerRef.current) landmarkerRef.current.close();
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
      if (segmenterRef.current) segmenterRef.current.close();
    };
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startWebcam = useCallback(async () => {
    setErrorMessage('');
    try {
      stopWebcam();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      setPermissionState('granted');
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      if (!isMountedRef.current) return;
      setPermissionState('denied');
      const errorObj = err as Error;
      if (errorObj.name === 'NotAllowedError') {
        setErrorMessage('Camera access was denied. Please allow camera access in your browser settings.');
      } else if (errorObj.name === 'NotFoundError') {
        setErrorMessage('No camera was found on your device.');
      } else {
        setErrorMessage('Could not access camera. Please check your browser permissions.');
      }
    }
  }, [facingMode, stopWebcam]);

  useEffect(() => {
    isMountedRef.current = true;
    const initTimer = setTimeout(() => {
      void startWebcam();
    }, 0);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimer);
      stopWebcam();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (burstIntervalRef.current) clearInterval(burstIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startWebcam, stopWebcam]);

  useEffect(() => {
    if (permissionState === 'granted' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => {
        console.error("Video play failed:", err);
      });
    }
  }, [permissionState]);

  // Main high-performance render loop
  useEffect(() => {
    if (permissionState !== 'granted') return;

    let animationId: number;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastVideoTime = -1;

    const renderLoop = () => {
      const videoW = video.videoWidth || 0;
      const videoH = video.videoHeight || 0;

      if (video.readyState >= 2 && videoW > 0 && videoH > 0) {
        const targetW = 800;
        const targetH = 600;

        ctx.clearRect(0, 0, targetW, targetH);

        // Aspect ratio crop (camera stream to photobooth 4:3)
        const videoAspectRatio = videoW / videoH;
        const targetAspectRatio = targetW / targetH;

        let sWidth = videoW;
        let sHeight = videoH;
        let sx = 0;
        let sy = 0;

        if (videoAspectRatio > targetAspectRatio) {
          sWidth = videoH * targetAspectRatio;
          sx = (videoW - sWidth) / 2;
        } else {
          sHeight = videoW / targetAspectRatio;
          sy = (videoH - sHeight) / 2;
        }

        const cropDims = { sx, sy, sWidth, sHeight, targetW, targetH };

        // Process MediaPipe AI Models (Segmentation & Landmarks)
        const landmarker = landmarkerRef.current;
        const handLandmarker = handLandmarkerRef.current;
        const segmenter = segmenterRef.current;

        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const now = performance.now();
          
          if (landmarker) {
            try {
              const results = landmarker.detectForVideo(video, now);
              if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                lastLandmarksRef.current = results.faceLandmarks[0];
                lastDimensionsRef.current = { width: videoW, height: videoH };
              }
            } catch (err) {
              console.error("Landmark detection error:", err);
            }
          }

          if (handLandmarker) {
            try {
              const handResults = handLandmarker.detectForVideo(video, now);
              if (handResults.landmarks && handResults.landmarks.length > 0) {
                lastHandmarksRef.current = handResults.landmarks;
              } else {
                lastHandmarksRef.current = null;
              }
            } catch (err) {
              console.error("Hand detection error:", err);
            }
          } else {
            lastHandmarksRef.current = null;
          }

          // Real-time AI Selfie Segmentation for Virtual Backdrops
          if (activeBackdrop !== 'none' && segmenter) {
            try {
              segmenter.segmentForVideo(video, now, (segResults) => {
                if (segResults.confidenceMasks && segResults.confidenceMasks.length > 0) {
                  const mask = segResults.confidenceMasks[0];
                  const maskData = mask.getAsFloat32Array();
                  lastMaskRef.current = {
                    data: maskData,
                    width: mask.width,
                    height: mask.height,
                  };
                }
              });
            } catch (err) {
              console.error("Segmentation error:", err);
            }
          }
        }

        // Draw Base Frame: Virtual Backdrop Studio or Standard Camera
        if (activeBackdrop !== 'none' && lastMaskRef.current) {
          renderSegmentedUserWithBackdrop(
            ctx,
            video,
            lastMaskRef.current.data,
            lastMaskRef.current.width,
            lastMaskRef.current.height,
            activeBackdrop,
            targetW,
            targetH,
            cropDims
          );
        } else {
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
        }

        // Render AR Face Filters and Hand Gestures on Top
        const cachedLandmarks = lastLandmarksRef.current;
        const dims = lastDimensionsRef.current;
        if (dims.width > 0 && dims.height > 0) {
          const mappedLandmarks: PixelLandmark[] = cachedLandmarks
            ? cachedLandmarks.map((pt) => {
                const x_pixel = ((pt.x * dims.width) - sx) / sWidth * targetW;
                const y_pixel = ((pt.y * dims.height) - sy) / sHeight * targetH;
                return { x: x_pixel, y: y_pixel, z: pt.z };
              })
            : [];
          
          renderARFilters(
            ctx,
            mappedLandmarks,
            activeFilters,
            filterImagesRef.current,
            floatingHeartsRef,
            lastHandHeartSpawnTimeRef,
            lastHandmarksRef.current,
            dims,
            cropDims
          );
        }

        // Draw Screen Overlays (e.g. Noise filter)
        if (activeFilters.includes('noise')) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          const canvases = getNoiseCanvases();
          if (canvases.length > 0) {
            const noiseCanvas = canvases[Math.floor(Math.random() * canvases.length)];
            const pattern = ctx.createPattern(noiseCanvas, 'repeat');
            if (pattern) {
              ctx.fillStyle = pattern;
              ctx.fillRect(0, 0, targetW, targetH);
            }
          }
          ctx.restore();
        }
      }

      animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [activeFilters, activeBackdrop, hasLandmarker, permissionState]);

  const captureFrame = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !streamRef.current) return null;
    return canvas.toDataURL('image/png');
  }, []);

  // Photoshoot sequence controller avoiding recursive closure references
  const stepCountdownRef = useRef<(index: number) => void>(() => {});

  const runCountdownStep = useCallback((index: number) => {
    setPhotoIndex(index);
    setCountdown(countdownDuration);
    setPhase('countdown');
    currentBurstRef.current = [];

    // Clear previous burst interval if any
    if (burstIntervalRef.current) {
      clearInterval(burstIntervalRef.current);
      burstIntervalRef.current = null;
    }

    // Start sampling live burst frames (110ms interval = ~8 frames before snap)
    burstIntervalRef.current = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          const frame = canvas.toDataURL('image/jpeg', 0.88);
          currentBurstRef.current.push(frame);
          if (currentBurstRef.current.length > 8) {
            currentBurstRef.current.shift();
          }
        } catch (err) {
          console.warn('Burst frame capture failed:', err);
        }
      }
    }, 110);

    let count = countdownDuration;
    playBeep(800, 0.08);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playBeep(800, 0.08);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;

        if (burstIntervalRef.current) {
          clearInterval(burstIntervalRef.current);
          burstIntervalRef.current = null;
        }

        setPhase('flash');
        setShowFlash(true);
        playShutter();

        const photo = captureFrame();

        timerRef.current = setTimeout(() => {
          setShowFlash(false);

          if (photo) {
            photosRef.current = [...photosRef.current, photo];
            setPhotosTaken([...photosRef.current]);

            // Assemble pose burst
            const finalBurst = currentBurstRef.current.length >= 2 
              ? [...currentBurstRef.current, photo] 
              : [photo];
            poseBurstsRef.current = [...poseBurstsRef.current, finalBurst];
          }

          const nextIndex = index + 1;
          if (nextIndex < photoCount) {
            setPhase('intermission');
            timerRef.current = setTimeout(() => {
              stepCountdownRef.current(nextIndex);
            }, 2500);
          } else {
            setPhase('intermission');
            timerRef.current = setTimeout(() => {
              setPhase('idle');
              onCaptureComplete(photosRef.current, poseBurstsRef.current);
            }, 1200);
          }
        }, 200);
      }
    }, 1000);
  }, [captureFrame, countdownDuration, onCaptureComplete, photoCount]);

  useEffect(() => {
    stepCountdownRef.current = runCountdownStep;
  }, [runCountdownStep]);

  const startPhotoSession = useCallback(() => {
    if (phase !== 'idle') return;
    playClick();
    photosRef.current = [];
    poseBurstsRef.current = [];
    currentBurstRef.current = [];
    setPhotosTaken([]);
    runCountdownStep(0);
  }, [phase, runCountdownStep]);

  // Spacebar shortcut to start photoshoot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'idle' && permissionState === 'granted') {
        e.preventDefault();
        startPhotoSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, permissionState, startPhotoSession]);

  const toggleCameraFacing = () => {
    playClick();
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const isActive = phase !== 'idle';

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 w-full max-w-4xl mx-auto">
      <div className={`relative w-full max-w-2xl aspect-[4/3] border-4 rounded-2xl shadow-neo overflow-hidden transition-all duration-300 flex-shrink-0 ${isTraditional ? 'bg-black border-zinc-950' : 'bg-cream-900 border-cream-900'}`}>

        {permissionState === 'prompt' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-100 p-6">
            <RefreshCw className="w-12 h-12 animate-spin text-pastelpink-300 mb-4" />
            <p className="font-mono text-sm uppercase tracking-wider text-center">
              Requesting Camera Permission...
            </p>
          </div>
        )}

        {permissionState === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-100 p-6 bg-red-950/80 backdrop-blur-sm">
            <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
            <p className="font-bold text-center text-base mb-2">Camera Access Blocked</p>
            <p className="text-xs text-center max-w-md text-red-200 mb-6">{errorMessage}</p>
            <button
              onClick={startWebcam}
              className="px-5 py-2.5 bg-white text-cream-900 font-bold rounded-xl border-2 border-cream-900 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer font-mono text-xs uppercase"
            >
              Try Again
            </button>
          </div>
        )}

        {permissionState === 'granted' && (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover hidden"
            />
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full h-full object-cover block"
            />

            {/* Model Loading Badge */}
            {isModelLoading && (
              <div className="absolute top-4 left-4 z-30 bg-black/60 backdrop-blur-sm border border-white/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-mono text-white/80">
                <RefreshCw className="w-3 h-3 animate-spin text-pastelpink-400" />
                <span>Loading AI models...</span>
              </div>
            )}

            {/* Camera Switcher Toggle */}
            <button
              onClick={toggleCameraFacing}
              title="Switch Camera (Front / Back)"
              className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-cream-900 border-2 border-cream-900 flex items-center justify-center shadow-neo-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>

            {/* Dual Drawer: AR Face Filters & Virtual Backdrops */}
            {!isActive && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-40 max-w-[92%]">
                {/* Tab Switcher */}
                <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 border border-white/30 rounded-full shadow-lg">
                  <button
                    onClick={() => {
                      playClick();
                      setDrawerTab('filters');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      drawerTab === 'filters'
                        ? 'bg-pastelpink-300 text-cream-900 shadow-sm'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Face Filters</span>
                  </button>

                  <button
                    onClick={() => {
                      playClick();
                      setDrawerTab('backdrops');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      drawerTab === 'backdrops'
                        ? 'bg-emerald-300 text-emerald-950 shadow-sm'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Backdrop Studio</span>
                  </button>
                </div>

                {/* Tab 1: AR Face Filters List */}
                {drawerTab === 'filters' && (
                  <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/20 scrollbar-none max-w-full">
                    {[
                      { id: 'none', label: 'None', icon: '🚫' },
                      { id: 'aviators', label: 'Retro Shades', icon: '🕶️' },
                      { id: 'cyber-shades', label: 'Cyber Glasses', icon: '🥽' },
                      { id: 'beauty-makeup', label: 'Glam Makeup', icon: '💄' },
                      { id: 'heart-blush', label: 'Heart Blush', icon: '💖' },
                      { id: 'macbook-hearts', label: 'Float Hearts', icon: '🫧' },
                      { id: 'tulip', label: 'Flower', icon: '🌷' },
                      { id: 'noise', label: 'Noise', icon: '📺' },
                    ].map((filt) => {
                      const isSelected = filt.id === 'none'
                        ? activeFilters.length === 0
                        : activeFilters.includes(filt.id as ARFilter);

                      return (
                        <button
                          key={filt.id}
                          onClick={() => {
                            playClick();
                            if (filt.id === 'none') {
                              setActiveFilters([]);
                            } else {
                              const targetId = filt.id as ARFilter;
                              setActiveFilters((prev) => {
                                if (prev.includes(targetId)) {
                                  return prev.filter((id) => id !== targetId);
                                } else {
                                  let updated = [...prev];
                                  if (targetId === 'aviators') updated = updated.filter((id) => id !== 'cyber-shades');
                                  else if (targetId === 'cyber-shades') updated = updated.filter((id) => id !== 'aviators');
                                  if (targetId === 'beauty-makeup') updated = updated.filter((id) => id !== 'heart-blush');
                                  else if (targetId === 'heart-blush') updated = updated.filter((id) => id !== 'beauty-makeup');
                                  updated.push(targetId);
                                  return updated;
                                }
                              });
                            }
                          }}
                          title={filt.label}
                          className={`w-11 h-11 flex-shrink-0 rounded-full border-2 flex flex-col items-center justify-center text-lg transition-all shadow-neo-sm hover:scale-105 active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-pastelpink-300 text-cream-900 border-cream-900 scale-110 shadow-none translate-y-[1px] ring-2 ring-white/60'
                              : 'bg-cream-50/90 text-cream-800 border-cream-900 hover:bg-pastelpink-50'
                          }`}
                        >
                          <span>{filt.icon}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: Virtual Backdrops Studio */}
                {drawerTab === 'backdrops' && (
                  <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/20 scrollbar-none max-w-full">
                    {virtualBackdropsList.map((bd) => {
                      const isSelected = activeBackdrop === bd.id;

                      return (
                        <button
                          key={bd.id}
                          onClick={() => {
                            playClick();
                            setActiveBackdrop(bd.id);
                          }}
                          title={`${bd.name} - ${bd.description}`}
                          className={`w-11 h-11 flex-shrink-0 rounded-full border-2 flex flex-col items-center justify-center text-lg transition-all shadow-neo-sm hover:scale-105 active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-300 text-emerald-950 border-emerald-950 scale-110 shadow-none translate-y-[1px] ring-2 ring-white/60'
                              : 'bg-cream-50/90 text-cream-800 border-cream-900 hover:bg-emerald-50'
                          }`}
                        >
                          <span>{bd.preview}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <AnimatePresence>
              {showFlash && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 bg-white z-50 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {phase === 'countdown' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 z-40"
                >
                  <p className="text-white text-sm font-bold uppercase tracking-widest mb-2 font-mono">
                    Pose {photoIndex + 1} of {photoCount}
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={countdown}
                      initial={{ opacity: 0, scale: 0.3 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.8 }}
                      transition={{ duration: 0.3 }}
                      className="text-[140px] font-mono font-black text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)] select-none leading-none"
                    >
                      {countdown}
                    </motion.span>
                  </AnimatePresence>
                  <p className="text-white/70 text-xs font-mono uppercase tracking-widest mt-4">
                    Get ready!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {phase === 'intermission' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/15 z-40"
                >
                  <motion.div
                    initial={{ scale: 0.5, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-9 h-9 text-white" />
                    </div>
                    <p className="text-white text-2xl font-bold uppercase tracking-wider">
                      Photo {photoIndex + 1} Saved!
                    </p>
                    {photoIndex + 1 < photoCount ? (
                      <p className="text-white/70 text-sm font-mono uppercase tracking-widest">
                        Get ready for pose {photoIndex + 2}...
                      </p>
                    ) : (
                      <p className="text-white/70 text-sm font-mono uppercase tracking-widest">
                        All done! Creating your strip...
                      </p>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {isActive && photosTaken.length > 0 && (
              <div className="absolute top-4 right-4 flex gap-2 z-30">
                {photosTaken.map((photo, i) => (
                  <motion.div
                    initial={{ scale: 0, y: -20 }}
                    animate={{ scale: 1, y: 0 }}
                    key={i}
                    className="w-12 h-9 border-2 border-white/60 rounded overflow-hidden shadow-md bg-black/40"
                  >
                    <img src={photo} alt={`Pose ${i + 1}`} className="w-full h-full object-cover" />
                  </motion.div>
                ))}
              </div>
            )}

            <div className={`absolute bottom-4 left-4 right-4 backdrop-blur-sm border-2 rounded-xl px-4 py-2 flex items-center justify-between z-30 shadow-neo-sm ${isTraditional ? 'bg-zinc-900/95 text-white border-zinc-700' : 'bg-cream-50/90 text-cream-900 border-cream-900'}`}>
              <span className={`font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${isTraditional ? 'text-white' : 'text-cream-900'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                {isActive ? `Photo ${photoIndex + 1} of ${photoCount}` : 'Ready to shoot (Press Space)'}
              </span>
              <span className={`font-mono text-xs font-bold ${isTraditional ? 'text-white/80' : 'text-cream-900'}`}>
                {photosTaken.length} / {photoCount} captured
              </span>
            </div>
          </>
        )}
      </div>

      {permissionState === 'granted' && (
        <div className="flex flex-col items-center justify-center gap-5 p-5 bg-white border-3 border-cream-900 rounded-3xl shadow-neo w-full lg:w-72 flex-shrink-0">
          {!isActive && (
            <div className="flex flex-col items-center gap-2 w-full">
              <span className={`text-xs font-black uppercase tracking-wider ${isTraditional ? 'text-zinc-500' : 'text-cream-800/80'}`}>
                Countdown Delay
              </span>
              <div className="flex justify-center gap-1.5 p-1 bg-cream-100/50 border-2 border-cream-900 rounded-xl w-full">
                {[3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      playClick();
                      setCountdownDuration(sec);
                    }}
                    className={`flex-1 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      countdownDuration === sec
                        ? 'bg-pastelpink-300 text-cream-900 border-2 border-cream-900 shadow-neo-sm translate-x-[-1px] translate-y-[-1px]'
                        : 'text-cream-800 hover:bg-cream-200/50 border-2 border-transparent'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isActive ? (
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={startPhotoSession}
                className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-pastelpink-200 text-cream-900 border-3 border-cream-900 rounded-xl font-bold text-base uppercase tracking-wide hover:bg-pastelpink-300 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group cursor-pointer"
              >
                <Camera className="w-5 h-5 transition-transform group-hover:rotate-12" />
                Start Session
              </button>
              <p className="text-[10px] font-mono text-center text-cream-400 uppercase">
                ✦ Press Spacebar to shoot ✦
              </p>
            </div>
          ) : (
            <div className="w-full py-3 bg-cream-100 border-2 border-cream-900 rounded-xl font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-2 text-sm text-center text-cream-700">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Shoot in progress
            </div>
          )}
        </div>
      )}
    </div>
  );
};
