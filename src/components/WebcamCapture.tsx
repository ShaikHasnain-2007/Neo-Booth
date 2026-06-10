import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBeep, playShutter, playClick } from '../utils/audioEngine';

interface WebcamCaptureProps {
  onCaptureComplete: (photos: string[]) => void;
  photoCount: number;
  isTraditional?: boolean;
}

type CapturePhase = 'idle' | 'countdown' | 'flash' | 'intermission';

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCaptureComplete, photoCount, isTraditional }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState('');

  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [countdown, setCountdown] = useState(3);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const photosRef = useRef<string[]>([]);
  const [photosTaken, setPhotosTaken] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startWebcam = async () => {
    setErrorMessage('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setPermissionState('granted');
    } catch (err: any) {
      console.error('Webcam access error:', err);
      setPermissionState('denied');
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please enable camera permissions in your browser settings.'
          : 'Could not access camera. Please check if another app is using it.'
      );
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startWebcam();
    return () => {
      stopWebcam();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (permissionState === 'granted' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => {
        console.error("Video play failed in mount effect:", err);
      });
    }
  }, [permissionState]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return null;

    const canvas = document.createElement('canvas');
    const targetW = 800;
    const targetH = 600;
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    const videoAspectRatio = videoWidth / videoHeight;
    const targetAspectRatio = targetW / targetH;

    let sWidth = videoWidth;
    let sHeight = videoHeight;
    let sx = 0;
    let sy = 0;

    if (videoAspectRatio > targetAspectRatio) {
      sWidth = videoHeight * targetAspectRatio;
      sx = (videoWidth - sWidth) / 2;
    } else {
      sHeight = videoWidth / targetAspectRatio;
      sy = (videoHeight - sHeight) / 2;
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/png');
  }, []);

  const runCountdownForPhoto = useCallback((index: number) => {
    setPhotoIndex(index);
    setCountdown(countdownDuration);
    setPhase('countdown');

    let count = countdownDuration;
    playBeep(800, 0.08);
    
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

        const photo = captureFrame();

        timerRef.current = setTimeout(() => {
          setShowFlash(false);

          if (photo) {
            photosRef.current = [...photosRef.current, photo];
            setPhotosTaken([...photosRef.current]);
          }

          const nextIndex = index + 1;
          if (nextIndex < photoCount) {
            setPhase('intermission');
            timerRef.current = setTimeout(() => {
              runCountdownForPhoto(nextIndex);
            }, 2500);
          } else {
            setPhase('intermission');
            timerRef.current = setTimeout(() => {
              setPhase('idle');
              onCaptureComplete(photosRef.current);
            }, 1200);
          }
        }, 200);
      }
    }, 1000);
  }, [captureFrame, onCaptureComplete, countdownDuration, photoCount]);

  const startPhotoSession = () => {
    playClick();
    photosRef.current = [];
    setPhotosTaken([]);
    runCountdownForPhoto(0);
  };

  const isActive = phase !== 'idle';

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto">
      <div className={`relative w-full aspect-[4/3] border-4 rounded-2xl shadow-neo overflow-hidden transition-all duration-300 ${isTraditional ? 'bg-black border-zinc-950' : 'bg-cream-900 border-cream-900'}`}>

        {permissionState === 'prompt' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-100 p-6">
            <RefreshCw className="w-12 h-12 mb-4 animate-spin text-pastelpink-400" />
            <p className="text-xl font-bold uppercase tracking-wider">Accessing Camera...</p>
          </div>
        )}

        {permissionState === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-100 p-6 bg-red-950/20 backdrop-blur-sm">
            <AlertTriangle className="w-16 h-16 mb-4 text-pastelpink-400" />
            <h3 className="text-xl font-bold uppercase tracking-wider mb-2 text-pastelpink-400">Camera Access Blocked</h3>
            <p className="text-center text-sm text-cream-200 max-w-md mb-6">{errorMessage}</p>
            <button
              onClick={startWebcam}
              className="px-6 py-2 bg-cream-50 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase hover:bg-pastelpink-100 hover:text-pastelpink-500 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {permissionState === 'granted' && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={(e) => {
                e.currentTarget.play().catch(err => console.error("Video play failed:", err));
              }}
              className="w-full h-full object-cover scale-x-[-1] relative z-10"
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
                
                <div className="flex items-center gap-1">
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

              <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.03]" />
            </div>

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
                {isActive ? `Photo ${photoIndex + 1} of ${photoCount}` : 'Ready to shoot'}
              </span>
              <span className={`font-mono text-xs font-bold ${isTraditional ? 'text-white/80' : 'text-cream-900'}`}>
                {photosTaken.length} / {photoCount} captured
              </span>
            </div>
          </>
        )}
      </div>

      {permissionState === 'granted' && (
        <div className="mt-8 flex flex-col items-center gap-6 w-full">
          {!isActive && (
            <div className="flex flex-col items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider ${isTraditional ? 'text-zinc-400' : 'text-cream-800/80'}`}>
                Countdown Delay
              </span>
              <div className="flex gap-2 p-1.5 bg-cream-100/50 border-2 border-cream-900 rounded-xl">
                {[3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      playClick();
                      setCountdownDuration(sec);
                    }}
                    className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
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
            <button
              onClick={startPhotoSession}
              className="flex items-center gap-3 px-8 py-4 bg-pastelpink-200 text-cream-900 border-3 border-cream-900 rounded-2xl font-bold text-xl uppercase tracking-wide hover:bg-pastelpink-300 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group"
            >
              <Camera className="w-6 h-6 transition-transform group-hover:rotate-12" />
              Start Photo Session
            </button>
          ) : (
            <div className="px-6 py-3 bg-cream-100 border-2 border-cream-900 rounded-xl font-bold uppercase tracking-wider animate-pulse flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Photoshoot in progress...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
