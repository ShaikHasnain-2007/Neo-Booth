import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, SwitchCamera, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBeep, playShutter, playClick } from '../utils/audioEngine';

interface PoseRetakeModalProps {
  poseIndex: number;
  totalPoses: number;
  onRetakeComplete: (newPhoto: string, index: number, newBurst?: string[]) => void;
  onClose: () => void;
}

export const PoseRetakeModal: React.FC<PoseRetakeModalProps> = ({
  poseIndex,
  totalPoses,
  onRetakeComplete,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retakeBurstRef = useRef<string[]>([]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setErrorMessage('');
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setPermissionState('granted');
    } catch (err: unknown) {
      console.error('Camera access error in retake:', err);
      setPermissionState('denied');
      const errorObj = err as Error;
      setErrorMessage(
        errorObj.name === 'NotAllowedError'
          ? 'Camera access denied. Please enable permissions in your browser.'
          : 'Could not access camera.'
      );
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      void startCamera();
    }, 0);

    return () => {
      clearTimeout(initTimer);
      stopCamera();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (burstIntervalRef.current) clearInterval(burstIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [facingMode, startCamera, stopCamera]);

  useEffect(() => {
    if (permissionState === 'granted' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => console.error('Video play failed:', err));
    }
  }, [permissionState]);

  const capturePhoto = (): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const videoW = video.videoWidth || 800;
    const videoH = video.videoHeight || 600;

    const videoAspectRatio = videoW / videoH;
    const targetAspectRatio = 800 / 600;

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

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, 800, 600);
    return canvas.toDataURL('image/png');
  };

  const handleStartCountdown = () => {
    playClick();
    setCountdown(3);
    playBeep(800, 0.08);
    retakeBurstRef.current = [];

    if (burstIntervalRef.current) clearInterval(burstIntervalRef.current);
    burstIntervalRef.current = setInterval(() => {
      const frame = capturePhoto();
      if (frame) {
        retakeBurstRef.current.push(frame);
        if (retakeBurstRef.current.length > 8) {
          retakeBurstRef.current.shift();
        }
      }
    }, 110);

    let count = 3;
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

        setCountdown(null);
        setShowFlash(true);
        playShutter();

        const photo = capturePhoto();

        timerRef.current = setTimeout(() => {
          setShowFlash(false);
          if (photo) {
            stopCamera();
            const finalBurst = retakeBurstRef.current.length >= 2 
              ? [...retakeBurstRef.current, photo] 
              : [photo];
            onRetakeComplete(photo, poseIndex, finalBurst);
          }
        }, 250);
      }
    }, 1000);
  };

  const toggleFacing = () => {
    playClick();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white border-3 border-cream-900 rounded-3xl p-5 md:p-6 shadow-neo-lg flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b-2 border-cream-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pastelpink-200 border-2 border-cream-900 flex items-center justify-center rotate-3 shadow-neo-sm">
              <Camera className="w-4 h-4 text-cream-900" />
            </div>
            <div>
              <h3 className="text-base font-bold uppercase text-cream-900">
                Retake Pose #{poseIndex + 1}
              </h3>
              <p className="text-[10px] font-mono uppercase tracking-wider text-cream-500">
                Replacing 1 photo out of {totalPoses}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-cream-100 hover:bg-cream-200 border-2 border-cream-900 flex items-center justify-center text-cream-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative w-full aspect-[4/3] bg-black border-3 border-cream-900 rounded-2xl overflow-hidden mb-4">
          {permissionState === 'prompt' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <RefreshCw className="w-8 h-8 animate-spin text-pastelpink-400 mb-2" />
              <p className="text-xs font-mono uppercase">Opening camera...</p>
            </div>
          )}

          {permissionState === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
              <AlertTriangle className="w-10 h-10 text-pastelpink-400 mb-2" />
              <p className="text-xs text-cream-200 mb-3">{errorMessage}</p>
              <button
                onClick={() => void startCamera()}
                className="px-4 py-1.5 bg-white text-cream-900 border-2 border-cream-900 rounded-lg font-bold text-xs uppercase"
              >
                Retry
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
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Switcher Button */}
              <button
                onClick={toggleFacing}
                className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white border border-white/40 rounded-lg text-xs flex items-center gap-1 backdrop-blur-sm z-30 cursor-pointer"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span className="text-[9px] font-mono">{facingMode === 'user' ? 'Front' : 'Back'}</span>
              </button>

              {/* Flash Screen */}
              <AnimatePresence>
                {showFlash && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 bg-white z-50 pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Countdown Overlay */}
              <AnimatePresence>
                {countdown !== null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 z-40"
                  >
                    <motion.span
                      key={countdown}
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.6, opacity: 0 }}
                      className="text-8xl font-mono font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] select-none"
                    >
                      {countdown}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3 border-2 border-cream-900 bg-white font-bold text-xs uppercase rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleStartCountdown}
            disabled={countdown !== null || permissionState !== 'granted'}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-pastelpink-200 hover:bg-pastelpink-300 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase text-sm shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            {countdown !== null ? 'Capturing...' : 'Snap Retake (3s)'}
          </button>
        </div>
      </div>
    </div>
  );
};
