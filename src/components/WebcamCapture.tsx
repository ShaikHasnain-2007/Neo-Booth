import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle2, SwitchCamera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBeep, playShutter, playClick } from '../utils/audioEngine';
import { renderARFilters } from '../utils/arFilters';
import type { FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import type { 
  ARFilter, 
  NormalizedLandmark, 
  PixelLandmark, 
  HeartParticle, 
  FilterImages 
} from '../types/photobooth';
import { virtualBackdropsList } from '../constants/photobooth';

interface WebcamCaptureProps {
  onCaptureComplete: (photos: string[], burstFrames?: string[][]) => void;
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
  const lastLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const lastHandmarksRef = useRef<NormalizedLandmark[][] | null>(null);
  const lastDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<ARFilter[]>([]);
  const [hasLandmarker, setHasLandmarker] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const [selectedBackdrop, setSelectedBackdrop] = useState<string>('none');

  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [countdown, setCountdown] = useState(3);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const photosRef = useRef<string[]>([]);
  const burstFramesRef = useRef<string[][]>([]);
  const [photosTaken, setPhotosTaken] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Pre-loaded SVG glasses and tulip images
  const filterImagesRef = useRef<FilterImages>({
    aviators: null,
    tulip: null
  });

  // Floating heart particles state
  const floatingHeartsRef = useRef<HeartParticle[]>([]);
  const lastHandHeartSpawnTimeRef = useRef<number>(0);

  // Preload assets on mount
  useEffect(() => {
    const img1 = new Image();
    img1.src = '/filters/aviators.svg';
    filterImagesRef.current.aviators = img1;

    const img2 = new Image();
    img2.src = '/filters/tulip.png';
    filterImagesRef.current.tulip = img2;
  }, []);

  // Initialize MediaPipe FaceLandmarker and HandLandmarker
  useEffect(() => {
    let active = true;
    async function loadMediaPipe() {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        const [faceLandmarker, handLandmarker] = await Promise.all([
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
          })
        ]);

        if (active) {
          landmarkerRef.current = faceLandmarker;
          handLandmarkerRef.current = handLandmarker;
          setHasLandmarker(true);
          setIsModelLoading(false);
        }
      } catch (err) {
        console.error("Failed to load MediaPipe models (AR filters disabled):", err);
        if (active) {
          setIsModelLoading(false);
        }
      }
    }
    loadMediaPipe();
    return () => {
      active = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Webcam access error:', err);
      setPermissionState('denied');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Camera access was denied. Please allow permissions in your browser.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMessage('No camera found on your device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setErrorMessage('Camera is currently in use by another application.');
        } else {
          setErrorMessage('Could not connect to camera: ' + err.message);
        }
      } else {
        setErrorMessage('Failed to start camera.');
      }
    }
  }, [facingMode, stopWebcam]);

  useEffect(() => {
    isMountedRef.current = true;
    const startTimer = setTimeout(() => {
      void startWebcam();
    }, 0);
    return () => {
      isMountedRef.current = false;
      clearTimeout(startTimer);
      stopWebcam();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startWebcam, stopWebcam]);

  // Main high-frame-rate rendering loop with AR Landmark Tracking and Filter Layer
  useEffect(() => {
    let animationFrameId: number;
    let lastVideoTime = -1;

    const render = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          lastDimensionsRef.current = { width: video.videoWidth, height: video.videoHeight };
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // 1. Draw webcam video feed
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // 2. Perform MediaPipe Face and Hand landmark detection
          if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const nowInMs = performance.now();

            if (landmarkerRef.current) {
              try {
                const results = landmarkerRef.current.detectForVideo(video, nowInMs);
                if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                  lastLandmarksRef.current = results.faceLandmarks[0];
                } else {
                  lastLandmarksRef.current = null;
                }
              } catch (e) {
                console.warn('Face landmark tracking error:', e);
              }
            }

            if (handLandmarkerRef.current) {
              try {
                const handResults = handLandmarkerRef.current.detectForVideo(video, nowInMs);
                if (handResults.landmarks && handResults.landmarks.length > 0) {
                  lastHandmarksRef.current = handResults.landmarks;
                } else {
                  lastHandmarksRef.current = null;
                }
              } catch (e) {
                console.warn('Hand landmark tracking error:', e);
              }
            }
          }

          // 3. Render AR Filters on Canvas
          if (activeFilters.length > 0) {
            const pixelLandmarks: PixelLandmark[] = lastLandmarksRef.current
              ? lastLandmarksRef.current.map((lm) => ({
                  x: lm.x * canvas.width,
                  y: lm.y * canvas.height,
                  z: lm.z ? lm.z * canvas.width : undefined,
                }))
              : [];

            const crop = {
              sx: 0,
              sy: 0,
              sWidth: canvas.width,
              sHeight: canvas.height,
              targetW: canvas.width,
              targetH: canvas.height,
            };

            renderARFilters(
              ctx,
              pixelLandmarks,
              activeFilters,
              filterImagesRef.current,
              floatingHeartsRef,
              lastHandHeartSpawnTimeRef,
              lastHandmarksRef.current,
              { width: canvas.width, height: canvas.height },
              crop
            );
          }

          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeFilters]);

  // High-Resolution Cropped Snapshot from 4:3 Viewfinder
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    return canvas.toDataURL('image/png');
  }, []);

  // Photoshoot sequence controller with burst frame capture for animated GIFs
  const stepCountdownRef = useRef<(index: number) => void>(() => {});

  const runCountdownStep = useCallback((index: number) => {
    setPhotoIndex(index);
    setCountdown(countdownDuration);
    setPhase('countdown');

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

        setPhase('flash');
        setShowFlash(true);
        playShutter();

        const mainPhoto = captureFrame();
        const bursts: string[] = [];
        if (mainPhoto) bursts.push(mainPhoto);

        // Capture 5 rapid burst frames for GIF boomerang
        for (let b = 1; b <= 5; b++) {
          setTimeout(() => {
            const f = captureFrame();
            if (f) bursts.push(f);
          }, b * 70);
        }

        burstFramesRef.current[index] = bursts;

        timerRef.current = setTimeout(() => {
          setShowFlash(false);

          if (mainPhoto) {
            photosRef.current = [...photosRef.current, mainPhoto];
            setPhotosTaken([...photosRef.current]);
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
              onCaptureComplete(photosRef.current, burstFramesRef.current);
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
    burstFramesRef.current = [];
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
  const currentBgItem = virtualBackdropsList.find(b => b.id === selectedBackdrop);

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 w-full max-w-4xl mx-auto">
      <div 
        className={`relative w-full max-w-2xl aspect-[4/3] border-4 rounded-2xl shadow-neo overflow-hidden transition-all duration-300 flex-shrink-0 ${
          isTraditional ? 'bg-black border-zinc-950' : 'bg-cream-900 border-cream-900'
        }`}
        style={currentBgItem && currentBgItem.id !== 'none' ? { background: currentBgItem.bgValue } : {}}
      >

        {permissionState === 'prompt' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-100 p-6">
            <RefreshCw className="w-12 h-12 mb-4 animate-spin text-pastelpink-400" />
            <p className="text-xl font-bold uppercase tracking-wider">Accessing Camera...</p>
          </div>
        )}

        {permissionState === 'granted' && isModelLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream-900/60 text-cream-100 p-6 z-40 backdrop-blur-md">
            <RefreshCw className="w-12 h-12 mb-4 animate-spin text-pastelpink-400" />
            <p className="text-xl font-bold uppercase tracking-wider text-center">Loading AR Engine...</p>
            <p className="text-[10px] text-cream-300 font-mono mt-2 uppercase tracking-widest">Calibrating face tracker</p>
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
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-0"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />

            {/* Virtual Backdrop Selector Toolbar */}
            {(phase === 'idle' || phase === 'intermission') && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 p-1 bg-black/70 backdrop-blur-md rounded-2xl border-2 border-white/40 z-50 shadow-md">
                <span className="text-[9px] font-mono font-bold text-white px-1.5 uppercase">Backdrop</span>
                {virtualBackdropsList.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => {
                      playClick();
                      setSelectedBackdrop(bg.id);
                    }}
                    title={bg.name}
                    className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs transition-all cursor-pointer ${
                      selectedBackdrop === bg.id
                        ? 'border-pastelpink-400 bg-pastelpink-200 text-cream-900 scale-110 shadow-sm'
                        : 'border-white/20 bg-white/10 text-white hover:bg-white/25'
                    }`}
                  >
                    {bg.preview}
                  </button>
                ))}
              </div>
            )}

            {/* Top Bar Status / Flip Camera */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
              <button
                onClick={toggleCameraFacing}
                title="Switch Camera Facing"
                className="w-9 h-9 rounded-full bg-cream-50/90 hover:bg-white text-cream-900 border-2 border-cream-900 flex items-center justify-center shadow-neo-sm hover:translate-y-[1px] cursor-pointer transition-all"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </div>

            {/* AR Filter Carousel */}
            {(phase === 'idle' || phase === 'intermission') && !isModelLoading && hasLandmarker && (
              <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-2.5 z-50 px-2 overflow-x-auto">
                {[
                  { id: 'none', label: 'Off', icon: '🚫' },
                  { id: 'beauty-makeup', label: 'Beauty', icon: '✨' },
                  { id: 'cyber-shades', label: 'Shades', icon: '🕶️' },
                  { id: 'aviators', label: 'Aviator', icon: '👓' },
                  { id: 'heart-blush', label: 'Hearts', icon: '💖' },
                  { id: 'macbook-hearts', label: 'Float Hearts', icon: '💕' },
                  { id: 'tulip', label: 'Tulip', icon: '🌸' },
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
                              if (targetId === 'aviators') {
                                updated = updated.filter((id) => id !== 'cyber-shades');
                              } else if (targetId === 'cyber-shades') {
                                updated = updated.filter((id) => id !== 'aviators');
                              }
                              if (targetId === 'beauty-makeup') {
                                updated = updated.filter((id) => id !== 'heart-blush');
                              } else if (targetId === 'heart-blush') {
                                updated = updated.filter((id) => id !== 'beauty-makeup');
                              }
                              updated.push(targetId);
                              return updated;
                            }
                          });
                        }
                      }}
                      title={filt.label}
                      className={`w-11 h-11 flex-shrink-0 rounded-full border-2 flex flex-col items-center justify-center text-lg transition-all shadow-neo-sm hover:scale-105 active:scale-95 cursor-pointer z-50 ${
                        isSelected
                          ? 'bg-pastelpink-300 text-cream-900 border-cream-900 scale-110 shadow-none translate-y-[2px] ring-2 ring-white/50'
                          : 'bg-cream-50/90 text-cream-800 border-cream-900 hover:bg-pastelpink-50'
                      }`}
                    >
                      <span>{filt.icon}</span>
                    </button>
                  );
                })}
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
