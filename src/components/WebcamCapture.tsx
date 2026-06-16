import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBeep, playShutter, playClick } from '../utils/audioEngine';

// MediaPipe facial landmark connections for procedural drawing
const OVAL_INDEXES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const LIPS_INDEXES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78];
const LEFT_EYE_INDEXES = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
const RIGHT_EYE_INDEXES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const LEFT_EYEBROW_INDEXES = [276, 283, 282, 295, 285, 336, 296, 334, 293, 300];
const RIGHT_EYEBROW_INDEXES = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const NOSE_INDEXES = [168, 6, 197, 195, 5, 4, 1, 19, 94, 2];

interface WebcamCaptureProps {
  onCaptureComplete: (photos: string[]) => void;
  photoCount: number;
  isTraditional?: boolean;
}

type CapturePhase = 'idle' | 'countdown' | 'flash' | 'intermission';
type ARFilter = 'none' | 'cyber-mesh' | 'retro-shades' | 'heart-blush';

function drawPath(ctx: CanvasRenderingContext2D, landmarks: any[], indexes: number[], close = false) {
  if (landmarks.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(landmarks[indexes[0]].x, landmarks[indexes[0]].y);
  for (let i = 1; i < indexes.length; i++) {
    const pt = landmarks[indexes[i]];
    if (pt) ctx.lineTo(pt.x, pt.y);
  }
  if (close) ctx.closePath();
  ctx.stroke();
}

function drawFilters(ctx: CanvasRenderingContext2D, landmarks: any[], filter: ARFilter) {
  if (filter === 'none') return;

  ctx.save();

  if (filter === 'cyber-mesh') {
    // Cyberpunk Neon Mesh Outline
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.85)'; // Neon Teal
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 255, 204, 0.6)';
    ctx.shadowBlur = 6;

    // Draw main contours
    drawPath(ctx, landmarks, OVAL_INDEXES, true);
    drawPath(ctx, landmarks, LIPS_INDEXES, true);
    drawPath(ctx, landmarks, LEFT_EYE_INDEXES, true);
    drawPath(ctx, landmarks, RIGHT_EYE_INDEXES, true);
    drawPath(ctx, landmarks, LEFT_EYEBROW_INDEXES, false);
    drawPath(ctx, landmarks, RIGHT_EYEBROW_INDEXES, false);
    drawPath(ctx, landmarks, NOSE_INDEXES, false);

    // Draw tracking nodes at key points
    ctx.fillStyle = 'rgba(255, 0, 128, 0.9)'; // Neon Pink nodes
    ctx.shadowColor = 'rgba(255, 0, 128, 0.8)';
    const nodeIndexes = [10, 152, 130, 359, 168, 4, 308, 78]; // Forehead, chin, outer eyes, nose bridge, mouth corners
    nodeIndexes.forEach(idx => {
      const pt = landmarks[idx];
      if (pt) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw little bracket/target crosshair overlay on eyes
        if (idx === 130 || idx === 359) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });
  }

  if (filter === 'retro-shades') {
    // Procedural Neon Y2K Cyber Visor / Glasses
    const noseBridge = landmarks[168];
    const leftEyeOuter = landmarks[130];
    const rightEyeOuter = landmarks[359];

    if (noseBridge && leftEyeOuter && rightEyeOuter) {
      const dx = rightEyeOuter.x - leftEyeOuter.x;
      const dy = rightEyeOuter.y - leftEyeOuter.y;
      const angle = Math.atan2(dy, dx);
      const eyeDistance = Math.sqrt(dx * dx + dy * dy);

      ctx.translate(noseBridge.x, noseBridge.y);
      ctx.rotate(angle);

      const w = eyeDistance * 1.95;
      const h = w * 0.35;

      // Draw Visor Body
      const gradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
      gradient.addColorStop(0, 'rgba(255, 0, 127, 0.85)'); // Hot Pink
      gradient.addColorStop(0.5, 'rgba(128, 0, 128, 0.7)'); // Deep Purple
      gradient.addColorStop(1, 'rgba(0, 0, 128, 0.85)'); // Midnight Blue

      ctx.fillStyle = gradient;
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.9)'; // Neon Teal Border
      ctx.lineWidth = 3.5;
      ctx.shadowColor = 'rgba(0, 255, 204, 0.8)';
      ctx.shadowBlur = 10;

      // Draw custom angular shape for Y2K visor
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, -h * 0.4); // Top-left
      ctx.lineTo(w * 0.5, -h * 0.4);  // Top-right
      ctx.lineTo(w * 0.45, h * 0.4);  // Bottom-right
      ctx.lineTo(w * 0.1, h * 0.4);   // Nose notch right
      ctx.lineTo(0, h * 0.15);         // Nose notch top center
      ctx.lineTo(-w * 0.1, h * 0.4);  // Nose notch left
      ctx.lineTo(-w * 0.45, h * 0.4); // Bottom-left
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw cool tech HUD details on visor
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0; // Disable shadow for details
      
      // Horizontal scanlines
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      for (let yOffset = -h; yOffset < h; yOffset += 6) {
        ctx.moveTo(-w, yOffset);
        ctx.lineTo(w, yOffset);
      }
      ctx.stroke();
      
      // Cyber diagonal slash highlight
      const highlightGrad = ctx.createLinearGradient(-w * 0.3, 0, w * 0.3, 0);
      highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      highlightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
      highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGrad;
      ctx.beginPath();
      ctx.moveTo(-w, -h);
      ctx.lineTo(-w * 0.2, -h);
      ctx.lineTo(w * 0.2, h);
      ctx.lineTo(-w, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  if (filter === 'heart-blush') {
    // Soft blush + procedurally drawn neon hearts on cheeks
    const leftCheek = landmarks[205];
    const rightCheek = landmarks[425];
    const nose = landmarks[4];
    const forehead = landmarks[10];

    // Calculate dynamic cheek circle radius based on face size
    let faceSize = 60;
    if (nose && forehead) {
      faceSize = Math.sqrt(Math.pow(nose.x - forehead.x, 2) + Math.pow(nose.y - forehead.y, 2)) * 0.6;
    }

    const drawHeart = (c_x: number, c_y: number, size: number) => {
      ctx.save();
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(c_x, c_y + topCurveHeight);
      
      // Left side curve
      ctx.bezierCurveTo(
        c_x - size / 2, c_y - topCurveHeight / 2,
        c_x - size / 2, c_y + topCurveHeight,
        c_x, c_y + size
      );
      
      // Right side curve
      ctx.bezierCurveTo(
        c_x + size / 2, c_y + topCurveHeight,
        c_x + size / 2, c_y - topCurveHeight / 2,
        c_x, c_y + topCurveHeight
      );
      
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 51, 153, 0.85)'; // Neon Pink
      ctx.shadowColor = 'rgba(255, 51, 153, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    };

    const drawSoftBlush = (c_x: number, c_y: number, r: number) => {
      const blushGrad = ctx.createRadialGradient(c_x, c_y, 0, c_x, c_y, r);
      blushGrad.addColorStop(0, 'rgba(255, 105, 180, 0.55)');
      blushGrad.addColorStop(0.5, 'rgba(255, 105, 180, 0.2)');
      blushGrad.addColorStop(1, 'rgba(255, 105, 180, 0)');
      
      ctx.fillStyle = blushGrad;
      ctx.beginPath();
      ctx.arc(c_x, c_y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    if (leftCheek) {
      drawSoftBlush(leftCheek.x, leftCheek.y, faceSize);
      drawHeart(leftCheek.x, leftCheek.y - faceSize * 0.35, faceSize * 0.55);
    }
    if (rightCheek) {
      drawSoftBlush(rightCheek.x, rightCheek.y, faceSize);
      drawHeart(rightCheek.x, rightCheek.y - faceSize * 0.35, faceSize * 0.55);
    }
  }

  ctx.restore();
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCaptureComplete, photoCount, isTraditional }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const landmarkerRef = useRef<any>(null);
  const lastLandmarksRef = useRef<any>(null);
  const lastDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [arFilter, setArFilter] = useState<ARFilter>('none');
  const [hasLandmarker, setHasLandmarker] = useState(false);

  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [countdown, setCountdown] = useState(3);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const photosRef = useRef<string[]>([]);
  const [photosTaken, setPhotosTaken] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    let active = true;
    async function loadMediaPipe() {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        const faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1
        });
        if (active) {
          landmarkerRef.current = faceLandmarker;
          setHasLandmarker(true);
          setIsModelLoading(false);
        }
      } catch (err) {
        console.error("Failed to load FaceLandmarker (AR filters disabled):", err);
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
    };
  }, []);

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

  // High performance canvas rendering loop with Face Mesh mapping
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

        // Aspect ratio crop (from camera stream 16:9 to photobooth 4:3)
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

        // Draw camera frame
        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);

        // Detect facial landmarks and apply overlay
        const landmarker = landmarkerRef.current;
        if (landmarker && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          
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

        // Render AR Filters using cached landmarks (ELIMINATES FLICKERING)
        const cachedLandmarks = lastLandmarksRef.current;
        const dims = lastDimensionsRef.current;
        if (cachedLandmarks && dims.width > 0 && dims.height > 0 && arFilter !== 'none') {
          const mappedLandmarks = cachedLandmarks.map((pt: any) => {
            const x_pixel = ((pt.x * dims.width) - sx) / sWidth * targetW;
            const y_pixel = ((pt.y * dims.height) - sy) / sHeight * targetH;
            return { x: x_pixel, y: y_pixel, z: pt.z };
          });
          drawFilters(ctx, mappedLandmarks, arFilter);
        }
      }

      animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [arFilter, hasLandmarker]);

  const captureFrame = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !streamRef.current) return null;
    // Captures the complete canvas context including the active AR filter!
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
              onClick={startWebcam}
              className="px-6 py-2 bg-cream-50 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase hover:bg-pastelpink-100 hover:text-pastelpink-500 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
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

            {/* Snapchat-Style AR Filter Lenses */}
            {!isActive && !isModelLoading && hasLandmarker && (
              <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-3 z-30">
                {[
                  { id: 'none', label: 'Off', icon: '🚫' },
                  { id: 'cyber-mesh', label: 'Mesh', icon: '🧬' },
                  { id: 'retro-shades', label: 'Shades', icon: '🕶️' },
                  { id: 'heart-blush', label: 'Blush', icon: '💖' },
                ].map((filt) => (
                  <button
                    key={filt.id}
                    onClick={() => {
                      playClick();
                      setArFilter(filt.id as ARFilter);
                    }}
                    title={filt.label}
                    className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center text-xl transition-all shadow-neo-sm hover:scale-105 active:scale-95 cursor-pointer z-30 ${
                      arFilter === filt.id
                        ? 'bg-pastelpink-300 text-cream-900 border-cream-900 scale-110 shadow-none translate-y-[2px] ring-2 ring-white/50'
                        : 'bg-cream-50/90 text-cream-800 border-cream-900 hover:bg-pastelpink-50'
                    }`}
                  >
                    <span>{filt.icon}</span>
                  </button>
                ))}
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
