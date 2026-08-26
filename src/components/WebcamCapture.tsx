import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle2, SwitchCamera, Sparkles, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBeep, playShutter, playClick } from '../utils/audioEngine';
import { renderARFilters, getNoiseCanvases } from '../utils/arFilters';
import { initSelfieSegmenter, renderSegmentedComposite } from '../utils/backgroundSegmenter';
import { virtualBackdropsList } from '../constants/photobooth';
import type { FaceLandmarker, HandLandmarker, ImageSegmenter, MPMask } from '@mediapipe/tasks-vision';
import type { 
  ARFilter, 
  NormalizedLandmark, 
  PixelLandmark, 
  HeartParticle, 
  FilterImages,
  VirtualBackdropId 
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
  const lastMaskRef = useRef<MPMask | null>(null);

  const lastLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const lastHandmarksRef = useRef<NormalizedLandmark[][] | null>(null);
  const lastDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<ARFilter[]>([]);
  const [hasLandmarker, setHasLandmarker] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Virtual Backdrop & AI Eraser State
  const [selectedBackdrop, setSelectedBackdrop] = useState<VirtualBackdropId>('none');
  const [customBackdropUrl, setCustomBackdropUrl] = useState<string | null>(null);
  const customImgRef = useRef<HTMLImageElement | null>(null);
  const backdropFileInputRef = useRef<HTMLInputElement>(null);

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

  // Initialize MediaPipe Vision Tasks (Face Landmarker, Hand Landmarker, and Selfie Segmenter)
  useEffect(() => {
    let active = true;
    async function loadMediaPipe() {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        const [faceLandmarker, handLandmarker, segmenter] = await Promise.all([
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
          initSelfieSegmenter(),
        ]);

        if (active) {
          landmarkerRef.current = faceLandmarker;
          handLandmarkerRef.current = handLandmarker;
          segmenterRef.current = segmenter;
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
    void loadMediaPipe();
    return () => {
      active = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
      if (lastMaskRef.current) {
        lastMaskRef.current.close();
      }
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
      if (!isMountedRef.current) return;
      console.error('Webcam access error:', err);
      setPermissionState('denied');
      const errorObj = err as Error;
      setErrorMessage(
        errorObj.name === 'NotAllowedError'
          ? 'Camera access denied. Please enable camera permissions in your browser settings.'
          : 'Could not access camera. Please check if another app is using it.'
      );
    }
  }, [facingMode, stopWebcam]);

  // Handle camera mount and facingMode updates
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
      if (timerRef.current) clearTimeout(timerRef.current);
      if (burstIntervalRef.current) clearInterval(burstIntervalRef.current);
    };
  }, [startWebcam, stopWebcam]);

  // Connect MediaStream to video element once permissions are granted
  useEffect(() => {
    if (permissionState === 'granted' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => {
        console.error("Video element playback failed:", err);
      });
    }
  }, [permissionState]);

  // Live Canvas 60FPS Render Loop with AI Segmentation and AR Overlays
  useEffect(() => {
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

        // Run AI Background Segmentation if Virtual Backdrop is active
        const segmenter = segmenterRef.current;
        if (segmenter && selectedBackdrop !== 'none' && video.currentTime !== lastVideoTime) {
          try {
            segmenter.segmentForVideo(video, performance.now(), (result) => {
              if (result.categoryMask) {
                if (lastMaskRef.current) {
                  lastMaskRef.current.close();
                }
                lastMaskRef.current = result.categoryMask;
              }
            });
          } catch (segErr) {
            console.warn("Segmentation detection error:", segErr);
          }
        }

        // Render virtual background composite or direct camera
        renderSegmentedComposite(
          ctx,
          video,
          selectedBackdrop !== 'none' ? lastMaskRef.current : null,
          selectedBackdrop,
          customImgRef.current,
          { sx, sy, sWidth, sHeight, targetW, targetH },
          false
        );

        // Detect landmarks and apply AR overlay
        const landmarker = landmarkerRef.current;
        const handLandmarker = handLandmarkerRef.current;
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          
          if (landmarker) {
            try {
              const results = landmarker.detectForVideo(video, performance.now());
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
              const handResults = handLandmarker.detectForVideo(video, performance.now());
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
        }

        // Render AR Filters and Hand Gestures
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
            { sx, sy, sWidth, sHeight, targetW, targetH }
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
  }, [activeFilters, hasLandmarker, permissionState, selectedBackdrop, customBackdropUrl]);

  const captureFrame = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !streamRef.current) return null;
    return canvas.toDataURL('image/png');
  }, []);

  // Photoshoot sequence controller
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

  const handleCustomBackdropUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClick();
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCustomBackdropUrl(result);
      setSelectedBackdrop('custom');
      const img = new Image();
      img.src = result;
      customImgRef.current = img;
    };
    reader.readAsDataURL(file);
  };

  const toggleFilter = (filter: ARFilter) => {
    playClick();
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const isActive = phase !== 'idle';

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      {/* Hidden File Input for Custom Background Image Upload */}
      <input
        type="file"
        ref={backdropFileInputRef}
        onChange={handleCustomBackdropUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 w-full">
        <div className={`relative w-full max-w-2xl aspect-[4/3] border-4 rounded-2xl shadow-neo overflow-hidden transition-all duration-300 flex-shrink-0 ${isTraditional ? 'bg-black border-zinc-950' : 'bg-cream-900 border-cream-900'}`}>

          {permissionState === 'prompt' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-100 p-6">
              <RefreshCw className="w-12 h-12 mb-4 animate-spin text-pastelpink-400" />
              <p className="text-xl font-bold uppercase tracking-wider">Accessing Camera...</p>
            </div>
          )}

          {permissionState === 'granted' && isModelLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream-900/60 text-cream-100 p-6 z-40 backdrop-blur-md">
              <RefreshCw className="w-12 h-12 mb-4 animate-spin text-pastelpink-400" />
              <p className="text-xl font-bold uppercase tracking-wider text-center">Loading AI Studio & AR Engine...</p>
              <p className="text-[10px] text-cream-300 font-mono mt-2 uppercase tracking-widest">Calibrating background segmenter</p>
            </div>
          )}

          {permissionState === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-100 p-6 bg-red-950/20 backdrop-blur-sm">
              <AlertTriangle className="w-16 h-16 mb-4 text-pastelpink-400" />
              <h3 className="text-xl font-bold uppercase tracking-wider mb-2 text-pastelpink-400">Camera Access Blocked</h3>
              <p className="text-center text-sm text-cream-200 max-w-md mb-6">{errorMessage}</p>
              <button
                onClick={() => void startWebcam()}
                className="px-6 py-2 bg-cream-50 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase hover:bg-pastelpink-100 hover:text-pastelpink-500 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {permissionState === 'granted' && (
            <>
              {/* Hidden Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  e.currentTarget.play().catch(err => console.error("Video play failed:", err));
                }}
                className="hidden"
              />

              {/* Live Canvas Viewport */}
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className={`w-full h-full object-cover relative z-10 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              <div 
                style={{ textShadow: '1.5px 1.5px 2px rgba(0,0,0,0.95)' }}
                className="absolute inset-0 z-30 pointer-events-none p-4 flex flex-col justify-between font-mono text-[11px] text-white uppercase"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                      REC
                    </div>
                    <span className="text-[9px] opacity-75 font-semibold">0:02:14</span>
                  </div>
                  
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                      onClick={toggleCameraFacing}
                      title="Switch Camera (Front/Back)"
                      className="p-1.5 bg-black/60 hover:bg-black/80 border border-white/40 rounded-lg text-white text-xs flex items-center gap-1 shadow-sm backdrop-blur-sm cursor-pointer transition-all active:scale-95"
                    >
                      <SwitchCamera className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-mono">{facingMode === 'user' ? 'Front' : 'Back'}</span>
                    </button>

                    <div className="border border-white w-9 h-4 p-0.5 rounded-sm relative flex items-center gap-0.5">
                      <div className="bg-white h-full w-2.5" />
                      <div className="bg-white h-full w-2.5" />
                      <div className="absolute top-1 -right-1.5 w-1 h-2 bg-white rounded-r-sm" />
                    </div>
                    <span className="text-[9px] font-bold">85%</span>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex flex-col text-[9px] font-semibold opacity-85">
                    <span>AM 12:45</span>
                    <span>JUN. 09 2026</span>
                  </div>
                  
                  <div className="flex flex-col text-[9px] items-end font-bold opacity-80">
                    <span>▲ PLAY</span>
                    <span>SP</span>
                  </div>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 opacity-40">
                  <div className="w-full h-full border border-white/60 relative">
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/60" />
                    <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/60" />
                  </div>
                </div>
              </div>

              {/* Shutter Flash Animation */}
              <AnimatePresence>
                {showFlash && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-white z-50 pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Live Countdown Overlay */}
              <AnimatePresence>
                {phase === 'countdown' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-40 backdrop-blur-[2px]"
                  >
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

              {/* Intermission Overlay */}
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

              {/* Thumbnail Gallery of Taken Photos */}
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

        {/* Sidebar Controls */}
        {permissionState === 'granted' && (
          <div className="flex flex-col items-center justify-center gap-4 p-5 bg-white border-3 border-cream-900 rounded-3xl shadow-neo w-full lg:w-72 flex-shrink-0">
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

            {/* AR Fun Accessories Filter Bar */}
            {!isActive && (
              <div className="flex flex-col gap-2 w-full border-t-2 border-cream-100 pt-3">
                <span className="text-xs font-black uppercase tracking-wider text-cream-800/80 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pastelpink-500" />
                  AR Face Filters
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'heart-blush', name: 'Blush', emoji: '💖' },
                    { id: 'cyber-shades', name: 'Cyber', emoji: '🕶️' },
                    { id: 'macbook-hearts', name: 'Hearts', emoji: '💕' },
                    { id: 'aviators', name: 'Shades', emoji: '😎' },
                    { id: 'tulip', name: 'Tulip', emoji: '🌷' },
                    { id: 'beauty-makeup', name: 'Glow', emoji: '✨' },
                  ].map((filter) => {
                    const isSelected = activeFilters.includes(filter.id as ARFilter);
                    return (
                      <button
                        key={filter.id}
                        onClick={() => toggleFilter(filter.id as ARFilter)}
                        className={`flex flex-col items-center p-1.5 border-2 border-cream-900 rounded-xl font-mono text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-pastelpink-200 text-cream-900 shadow-neo-sm translate-x-[-1px] translate-y-[-1px]'
                            : 'bg-cream-50 text-cream-600 hover:bg-cream-100'
                        }`}
                      >
                        <span className="text-base">{filter.emoji}</span>
                        <span>{filter.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!isActive ? (
              <div className="w-full flex flex-col gap-2 border-t-2 border-cream-100 pt-3">
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

      {/* 🪄 Real-Time Virtual Backdrops & Background Eraser Drawer */}
      {permissionState === 'granted' && !isActive && (
        <div className="w-full max-w-4xl bg-white border-3 border-cream-900 rounded-2xl p-3.5 shadow-neo flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              AI Studio & Virtual Backdrops (No Green Screen)
            </span>
            <span className="text-[10px] font-mono text-cream-500 uppercase">
              Live AI Background Eraser
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {virtualBackdropsList.map((bg) => {
              const isSelected = selectedBackdrop === bg.id;
              return (
                <button
                  key={bg.id}
                  onClick={() => {
                    playClick();
                    if (bg.id === 'custom') {
                      backdropFileInputRef.current?.click();
                    } else {
                      setSelectedBackdrop(bg.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-cream-900 rounded-xl font-mono text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-200 text-emerald-950 shadow-neo-sm translate-x-[-1px] translate-y-[-1px]'
                      : 'bg-cream-50 text-cream-800 hover:bg-cream-100'
                  }`}
                >
                  <span className="text-sm">{bg.preview}</span>
                  <span>{bg.name}</span>
                  {bg.id === 'custom' && <Upload className="w-3 h-3 text-cream-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
