import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, SwitchCamera, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBeep, playShutter, playClick } from '../utils/audioEngine';
import { initSelfieSegmenter, renderSegmentedComposite } from '../utils/backgroundSegmenter';
import { virtualBackdropsList } from '../constants/photobooth';
import type { ImageSegmenter, MPMask } from '@mediapipe/tasks-vision';
import type { VirtualBackdropId } from '../types/photobooth';

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

  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const lastMaskRef = useRef<MPMask | null>(null);

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  // Virtual Backdrop in Retake Modal
  const [selectedBackdrop, setSelectedBackdrop] = useState<VirtualBackdropId>('none');
  const customImgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retakeBurstRef = useRef<string[]>([]);

  // Initialize Segmenter
  useEffect(() => {
    let isMounted = true;
    initSelfieSegmenter().then((seg) => {
      if (isMounted) segmenterRef.current = seg;
    });
    return () => {
      isMounted = false;
      if (lastMaskRef.current) {
        lastMaskRef.current.close();
      }
    };
  }, []);

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

  // Live Canvas Render Loop with Virtual Backdrop
  useEffect(() => {
    let animId: number;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastVideoTime = -1;

    const loop = () => {
      const videoW = video.videoWidth || 0;
      const videoH = video.videoHeight || 0;

      if (video.readyState >= 2 && videoW > 0 && videoH > 0) {
        const targetW = 800;
        const targetH = 600;
        ctx.clearRect(0, 0, targetW, targetH);

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

        const segmenter = segmenterRef.current;
        if (segmenter && selectedBackdrop !== 'none' && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            segmenter.segmentForVideo(video, performance.now(), (res) => {
              if (res.categoryMask) {
                if (lastMaskRef.current) lastMaskRef.current.close();
                lastMaskRef.current = res.categoryMask;
              }
            });
          } catch (err) {
            console.warn('Retake segmentation error:', err);
          }
        }

        renderSegmentedComposite(
          ctx,
          video,
          selectedBackdrop !== 'none' ? lastMaskRef.current : null,
          selectedBackdrop,
          customImgRef.current,
          { sx, sy, sWidth, sHeight, targetW, targetH },
          false
        );
      }

      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animId);
  }, [permissionState, selectedBackdrop]);

  const capturePhoto = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
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

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClick();
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedBackdrop('custom');
      const img = new Image();
      img.src = result;
      customImgRef.current = img;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Hidden Custom File Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCustomUpload}
        accept="image/*"
        className="hidden"
      />

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

        {/* Viewport */}
        <div className="relative w-full aspect-[4/3] bg-cream-900 border-3 border-cream-900 rounded-2xl overflow-hidden shadow-neo-sm mb-3">
          {permissionState === 'denied' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-cream-100">
              <AlertTriangle className="w-8 h-8 text-pastelpink-400 mb-2" />
              <p className="text-xs">{errorMessage}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="hidden" />
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              <button
                onClick={toggleFacing}
                className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 border border-white/40 rounded-lg text-white text-xs flex items-center gap-1 shadow-sm backdrop-blur-sm cursor-pointer"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span className="text-[9px] font-mono">{facingMode === 'user' ? 'Front' : 'Back'}</span>
              </button>

              {/* Flash */}
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

              {/* Countdown */}
              <AnimatePresence>
                {countdown !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-40 backdrop-blur-[2px]"
                  >
                    <span className="text-8xl font-mono font-black text-white drop-shadow-md select-none leading-none">
                      {countdown}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* 🪄 Backdrop Picker Strip */}
        <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none">
          {virtualBackdropsList.slice(0, 8).map((bg) => (
            <button
              key={bg.id}
              onClick={() => {
                playClick();
                if (bg.id === 'custom') fileInputRef.current?.click();
                else setSelectedBackdrop(bg.id);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 border-2 border-cream-900 rounded-lg font-mono text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedBackdrop === bg.id
                  ? 'bg-emerald-200 text-emerald-950 shadow-neo-sm translate-x-[-1px]'
                  : 'bg-cream-50 text-cream-700 hover:bg-cream-100'
              }`}
            >
              <span>{bg.preview}</span>
              <span>{bg.name}</span>
            </button>
          ))}
        </div>

        {/* Action Button */}
        <div className="w-full flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-cream-900 bg-white font-bold text-xs uppercase rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStartCountdown}
            disabled={countdown !== null || permissionState !== 'granted'}
            className="flex-2 flex items-center justify-center gap-2 py-3 bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-pastelpink-300 shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Snap Pose #{poseIndex + 1}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
