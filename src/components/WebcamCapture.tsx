import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBeep, playShutter, playClick } from '../utils/audioEngine';

// MediaPipe facial landmark connections for procedural drawing
const OVAL_INDEXES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const LIPS_INDEXES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78];

interface WebcamCaptureProps {
  onCaptureComplete: (photos: string[]) => void;
  photoCount: number;
  isTraditional?: boolean;
}

type CapturePhase = 'idle' | 'countdown' | 'flash' | 'intermission';
type ARFilter = 'aviators' | 'cyber-shades' | 'beauty-makeup' | 'heart-blush' | 'macbook-hearts' | 'noise';

// Pre-generate static noise patterns for fast tiling overlay
let noiseCanvases: HTMLCanvasElement[] = [];
function getNoiseCanvases() {
  if (noiseCanvases.length > 0) return noiseCanvases;
  if (typeof document === 'undefined') return [];
  const NOISE_SIZE = 128;
  for (let i = 0; i < 4; i++) {
    const c = document.createElement('canvas');
    c.width = NOISE_SIZE;
    c.height = NOISE_SIZE;
    const nCtx = c.getContext('2d');
    if (nCtx) {
      const imgData = nCtx.createImageData(NOISE_SIZE, NOISE_SIZE);
      const data = imgData.data;
      for (let j = 0; j < data.length; j += 4) {
        const val = Math.floor(Math.random() * 255);
        data[j] = val;
        data[j+1] = val;
        data[j+2] = val;
        data[j+3] = 22; // subtle opacity for grain (approx 8.6%)
      }
      nCtx.putImageData(imgData, 0, 0);
      noiseCanvases.push(c);
    }
  }
  return noiseCanvases;
}



function drawHeart(
  ctx: CanvasRenderingContext2D,
  c_x: number,
  c_y: number,
  size: number,
  fillStyle: string,
  shadowColor?: string,
  shadowBlur: number = 0,
  rotation: number = 0
) {
  ctx.save();
  ctx.translate(c_x, c_y);
  ctx.rotate(rotation);
  
  const r = size / 2;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.3);
  
  // Left half (smooth curves like standard emoji ❤️)
  ctx.bezierCurveTo(-r * 0.5, -r * 0.85, -r, -r * 0.4, -r, r * 0.1);
  ctx.bezierCurveTo(-r, r * 0.45, -r * 0.45, r * 0.85, 0, r);
  
  // Right half (smooth curves like standard emoji ❤️)
  ctx.bezierCurveTo(r * 0.45, r * 0.85, r, r * 0.45, r, r * 0.1);
  ctx.bezierCurveTo(r, -r * 0.4, r * 0.5, -r * 0.85, 0, -r * 0.3);
  
  ctx.closePath();

  ctx.fillStyle = fillStyle;
  if (shadowColor) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
  }
  ctx.fill();
  ctx.restore();
}

function drawFilters(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  activeFilters: ARFilter[],
  images: { aviators: HTMLImageElement | null },
  floatingHeartsRef: React.MutableRefObject<any[]>,
  lastHandHeartSpawnTimeRef: React.MutableRefObject<number>,
  rawHandmarks: any[][] | null,
  dims: { width: number; height: number },
  crop: { sx: number; sy: number; sWidth: number; sHeight: number; targetW: number; targetH: number }
) {
  ctx.save();

  // Draw selected face filters
  if (activeFilters.length > 0 && landmarks.length > 0) {
    // 1. Draw SVG Sunglasses Filters (Aviators)
    if (activeFilters.includes('aviators')) {
      const noseBridge = landmarks[168];
      const leftEyeOuter = landmarks[130];
      const rightEyeOuter = landmarks[359];

      const img = images.aviators;

      if (noseBridge && leftEyeOuter && rightEyeOuter && img && img.complete) {
        ctx.save();
        const dx = rightEyeOuter.x - leftEyeOuter.x;
        const dy = rightEyeOuter.y - leftEyeOuter.y;
        const angle = Math.atan2(dy, dx);
        const eyeDistance = Math.sqrt(dx * dx + dy * dy);

        ctx.translate(noseBridge.x, noseBridge.y);
        ctx.rotate(angle);

        // Lower glasses significantly to fit perfectly over the eyes
        ctx.translate(0, eyeDistance * 0.15);

        // Width and Height scaled precisely to head dimensions
        const w = eyeDistance * 1.8;
        const h = w * 0.4;

        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    // 2. Draw Cyber Shades Filter (Procedural Neon Cyber Visor)
    if (activeFilters.includes('cyber-shades')) {
      const noseBridge = landmarks[168];
      const leftEyeOuter = landmarks[130];
      const rightEyeOuter = landmarks[359];

      if (noseBridge && leftEyeOuter && rightEyeOuter) {
        ctx.save();
        const dx = rightEyeOuter.x - leftEyeOuter.x;
        const dy = rightEyeOuter.y - leftEyeOuter.y;
        const angle = Math.atan2(dy, dx);
        const eyeDistance = Math.sqrt(dx * dx + dy * dy);

        ctx.translate(noseBridge.x, noseBridge.y);
        ctx.rotate(angle);

        // Lift visor to align perfectly with the eyes
        ctx.translate(0, eyeDistance * 0.07);

        // Slightly smaller width and height for a perfect fit
        const w = eyeDistance * 1.6;
        const h = w * 0.35;

        // Draw Visor Body
        const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        gradient.addColorStop(0, 'rgba(255, 0, 128, 0.85)'); // Hot Pink
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

        // Horizontal scanlines & diagonal slash (both clipped to visor shape)
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

        ctx.restore(); // Restores clip state
        ctx.restore(); // Restores translate/rotate state
      }
    }

    // 4. Draw Beauty Makeup Filter
    if (activeFilters.includes('beauty-makeup')) {
      const leftCheek = landmarks[205];
      const rightCheek = landmarks[425];
      const nose = landmarks[4];
      const forehead = landmarks[10];

      let faceSize = 50;
      if (nose && forehead) {
        faceSize = Math.sqrt(Math.pow(nose.x - forehead.x, 2) + Math.pow(nose.y - forehead.y, 2)) * 0.65;
      }

      // A. Skin Smoothing: Clip to face shape and apply soft blur overlay
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(landmarks[OVAL_INDEXES[0]].x, landmarks[OVAL_INDEXES[0]].y);
      for (let i = 1; i < OVAL_INDEXES.length; i++) {
        ctx.lineTo(landmarks[OVAL_INDEXES[i]].x, landmarks[OVAL_INDEXES[i]].y);
      }
      ctx.closePath();
      ctx.clip();

      ctx.globalAlpha = 0.38; // Soft blending
      ctx.filter = 'blur(4.5px) saturate(102%) brightness(101%)';
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.restore();

      // B. Blended Cheek Blush
      const drawBlendedBlush = (c_x: number, c_y: number, r: number) => {
        const blushGrad = ctx.createRadialGradient(c_x, c_y, 0, c_x, c_y, r);
        blushGrad.addColorStop(0, 'rgba(255, 80, 110, 0.11)');
        blushGrad.addColorStop(0.5, 'rgba(255, 80, 110, 0.03)');
        blushGrad.addColorStop(1, 'rgba(255, 80, 110, 0)');

        ctx.fillStyle = blushGrad;
        ctx.beginPath();
        ctx.arc(c_x, c_y, r, 0, Math.PI * 2);
        ctx.fill();
      };

      if (leftCheek) drawBlendedBlush(leftCheek.x, leftCheek.y, faceSize * 0.7);
      if (rightCheek) drawBlendedBlush(rightCheek.x, rightCheek.y, faceSize * 0.7);

      // C. Realistic Lip Gloss (Rose-red tint)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(landmarks[LIPS_INDEXES[0]].x, landmarks[LIPS_INDEXES[0]].y);
      for (let i = 1; i < LIPS_INDEXES.length; i++) {
        ctx.lineTo(landmarks[LIPS_INDEXES[i]].x, landmarks[LIPS_INDEXES[i]].y);
      }
      ctx.closePath();

      ctx.fillStyle = 'rgba(244, 63, 94, 0.14)'; // Translucent rose-tint
      ctx.fill();
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw Cute Heart Blush Filter
    if (activeFilters.includes('heart-blush')) {
      const leftCheek = landmarks[205];
      const rightCheek = landmarks[425];
      const nose = landmarks[4];
      const forehead = landmarks[10];

      let faceSize = 60;
      if (nose && forehead) {
        faceSize = Math.sqrt(Math.pow(nose.x - forehead.x, 2) + Math.pow(nose.y - forehead.y, 2)) * 0.6;
      }

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
        drawHeart(ctx, leftCheek.x, leftCheek.y - faceSize * 0.35, faceSize * 0.55, 'rgba(255, 51, 153, 0.85)', 'rgba(255, 51, 153, 0.8)', 10);
      }
      if (rightCheek) {
        drawSoftBlush(rightCheek.x, rightCheek.y, faceSize);
        drawHeart(ctx, rightCheek.x, rightCheek.y - faceSize * 0.35, faceSize * 0.55, 'rgba(255, 51, 153, 0.85)', 'rgba(255, 51, 153, 0.8)', 10);
      }
    }
  }

  // ALWAYS Draw & Update Floating Hearts Particle System (Forehead loop and Hand gestures)
  const forehead = landmarks.length > 0 ? landmarks[10] : null;
  const nose = landmarks.length > 0 ? landmarks[4] : null;
  const faceSize = forehead && nose
    ? Math.sqrt(Math.pow(nose.x - forehead.x, 2) + Math.pow(nose.y - forehead.y, 2)) * 0.6
    : 80; // fallback face size in pixels

  const hearts = floatingHeartsRef.current;
  
  // Update state for all hearts (absolute hand particles and relative forehead particles)
  hearts.forEach(p => {
    if (p.originType === 'hand') {
      p.y = (p.y || 0) - (p.speed || 3);
      p.wobblePhase += p.wobbleSpeed;
      p.rotation += p.rotationSpeed;
      
      if (p.scale < 1.0) {
        p.scale = Math.min(1.0, p.scale + 0.08);
      } else if (p.opacity < 0.35) {
        p.scale = Math.max(0.1, p.scale - 0.05);
      }
      p.opacity -= 0.010; // float up and fade out absolute hand particles
    } else {
      p.yOffsetFactor -= p.speedFactor;
      p.wobblePhase += p.wobbleSpeed;
      p.rotation += p.rotationSpeed;
      
      if (p.scale < 1.0) {
        p.scale = Math.min(1.0, p.scale + 0.10);
      } else if (p.opacity < 0.35) {
        p.scale = Math.max(0.1, p.scale - 0.05);
      }
      p.opacity -= 0.018; // float up and fade out relative forehead particles
    }
  });

  // Filter out dead particles
  floatingHeartsRef.current = hearts.filter(p => p.opacity > 0);

  // Check for two-hand heart gesture (runs always!)
  let gestureActive = false;
  let hand_x = 0;
  let hand_y = 0;
  let handSize = faceSize * 0.8; // default hand size scaled relative to face

  if (rawHandmarks && rawHandmarks.length >= 2) {
    const mapHandPoint = (pt: any) => {
      const x_pixel = ((pt.x * dims.width) - crop.sx) / crop.sWidth * crop.targetW;
      const y_pixel = ((pt.y * dims.height) - crop.sy) / crop.sHeight * crop.targetH;
      return { x: x_pixel, y: y_pixel };
    };

    const hand1 = rawHandmarks[0];
    const hand2 = rawHandmarks[1];

    if (hand1 && hand2 && hand1[8] && hand2[8] && hand1[4] && hand2[4]) {
      const L_idx = mapHandPoint(hand1[8]);
      const R_idx = mapHandPoint(hand2[8]);
      const L_thb = mapHandPoint(hand1[4]);
      const R_thb = mapHandPoint(hand2[4]);

      // Geometric check for two-hand heart:
      // 1. Index fingertips are touching/close
      // 2. Thumb tips are touching/close
      // 3. Index tips are higher up than thumb tips
      // 4. Vertical volume exists between tips and thumbs
      const dist_index = Math.sqrt(Math.pow(L_idx.x - R_idx.x, 2) + Math.pow(L_idx.y - R_idx.y, 2));
      const dist_thumb = Math.sqrt(Math.pow(L_thb.x - R_thb.x, 2) + Math.pow(L_thb.y - R_thb.y, 2));
      const vert_diff = Math.max(L_thb.y, R_thb.y) - Math.min(L_idx.y, R_idx.y);

      if (dist_index < 70 && dist_thumb < 70 && vert_diff > 25 && L_idx.y < L_thb.y && R_idx.y < R_thb.y) {
        gestureActive = true;
        hand_x = (L_idx.x + R_idx.x + L_thb.x + R_thb.x) / 4;
        hand_y = (L_idx.y + R_idx.y + L_thb.y + R_thb.y) / 4;

        if (hand1[0] && hand1[9] && hand2[0] && hand2[9]) {
          const hand1_wrist = mapHandPoint(hand1[0]);
          const hand1_knuckle = mapHandPoint(hand1[9]);
          const size1 = Math.sqrt(Math.pow(hand1_wrist.x - hand1_knuckle.x, 2) + Math.pow(hand1_wrist.y - hand1_knuckle.y, 2));

          const hand2_wrist = mapHandPoint(hand2[0]);
          const hand2_knuckle = mapHandPoint(hand2[9]);
          const size2 = Math.sqrt(Math.pow(hand2_wrist.x - hand2_knuckle.x, 2) + Math.pow(hand2_wrist.y - hand2_knuckle.y, 2));

          handSize = (size1 + size2) / 2;
        }
      }
    }
  }

  // Spawn Forehead floating particles (if activeFilters has 'macbook-hearts' active)
  if (activeFilters.includes('macbook-hearts') && forehead && nose) {
    if (floatingHeartsRef.current.filter(p => p.originType !== 'hand').length < 18 && Math.random() < 0.12) {
      floatingHeartsRef.current.push({
        originType: 'forehead',
        xOffsetFactor: (Math.random() - 0.5) * 3.4,
        yOffsetFactor: -0.4 - Math.random() * 0.25,
        speedFactor: 0.024 + Math.random() * 0.022,
        sizeFactor: 0.35 + Math.random() * 0.18,
        opacity: 1.0,
        colorHue: 320 + Math.floor(Math.random() * 32),
        wobbleSpeed: 0.03 + Math.random() * 0.04,
        wobbleAmount: 0.12 + Math.random() * 0.18,
        wobblePhase: Math.random() * Math.PI * 2,
        rotation: (Math.random() - 0.5) * 0.8,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        scale: 0.1
      });
    }
  }

  // Spawn Hand Gesture particles (Exactly 1 heart per second, solid wine red, hand-sized)
  if (gestureActive) {
    const now = performance.now();
    if (now - lastHandHeartSpawnTimeRef.current > 1000) {
      lastHandHeartSpawnTimeRef.current = now;

      if (floatingHeartsRef.current.length < 50) {
        floatingHeartsRef.current.push({
          originType: 'hand',
          x: hand_x,
          y: hand_y,
          speed: 1.8 + Math.random() * 0.8, // gentle upward float speed (pixels per frame)
          size: handSize * (0.85 + Math.random() * 0.15), // solid hand-sized heart (proportional to hands size)
          opacity: 1.0,
          colorHue: 345, // Wine red hue base
          wobbleSpeed: 0.02 + Math.random() * 0.02,
          wobbleAmt: 8 + Math.random() * 8, // absolute pixel wobble width
          wobblePhase: Math.random() * Math.PI * 2,
          rotation: (Math.random() - 0.5) * 0.4, // slight initial tilt
          rotationSpeed: (Math.random() - 0.5) * 0.01,
          scale: 0.1,
          xOffsetFactor: 0,
          yOffsetFactor: 0,
          speedFactor: 0,
          sizeFactor: 0
        });
      }
    }
  }

  // Draw all active hearts
  floatingHeartsRef.current.forEach(p => {
    let c_x = 0;
    let c_y = 0;
    let size = 0;

    if (p.originType === 'hand') {
      const wobbleX = Math.sin(p.wobblePhase) * (p.wobbleAmt || 10);
      c_x = (p.x || 0) + wobbleX;
      c_y = p.y || 0;
      size = (p.size || 30) * p.scale;
    } else if (forehead && nose) {
      const wobbleX = Math.sin(p.wobblePhase) * p.wobbleAmount;
      c_x = forehead.x + (p.xOffsetFactor + wobbleX) * faceSize;
      c_y = forehead.y + p.yOffsetFactor * faceSize;
      size = p.sizeFactor * faceSize * p.scale;
    } else {
      return; // Skip if forehead coordinates are missing
    }

    const isWineRed = p.originType === 'hand';
    const fillStyle = isWineRed
      ? `hsla(345, 85%, 28%, ${p.opacity})` // Solid wine red
      : `hsla(${p.colorHue}, 100%, 68%, ${p.opacity * 0.70})`;
    const shadowColor = isWineRed
      ? `hsla(345, 85%, 20%, ${p.opacity * 0.60})`
      : `hsla(${p.colorHue}, 100%, 68%, ${p.opacity * 0.50})`;
    
    drawHeart(ctx, c_x, c_y, size, fillStyle, shadowColor, 8, p.rotation);
  });

  ctx.restore();
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCaptureComplete, photoCount, isTraditional }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const landmarkerRef = useRef<any>(null);
  const handLandmarkerRef = useRef<any>(null);
  const lastLandmarksRef = useRef<any>(null);
  const lastHandmarksRef = useRef<any>(null);
  const lastDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<ARFilter[]>([]);
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

  // Pre-loaded SVG glasses images
  const filterImagesRef = useRef<{ aviators: HTMLImageElement | null }>({
    aviators: null
  });

  // Floating heart particles state for MacBook photo effect
  const floatingHeartsRef = useRef<{
    xOffsetFactor: number;
    yOffsetFactor: number;
    speedFactor: number;
    sizeFactor: number;
    opacity: number;
    colorHue: number;
    wobbleSpeed: number;
    wobbleAmount: number;
    wobblePhase: number;
    rotation: number;
    rotationSpeed: number;
    scale: number;
    // Gesture parameters for hand-based heart emissions
    originType?: 'forehead' | 'hand';
    x?: number;
    y?: number;
    speed?: number;
    wobbleAmt?: number;
    size?: number;
  }[]>([]);

  const lastHandHeartSpawnTimeRef = useRef<number>(0);

  // Preload SVG assets on mount
  useEffect(() => {
    const img1 = new Image();
    img1.src = '/filters/aviators.svg';
    filterImagesRef.current.aviators = img1;
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
        
        // Load both models in parallel for maximum performance
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

        // Detect landmarks and apply overlay
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

        // Render AR Filters and Hand Gestures (runs always when camera is active)
        const cachedLandmarks = lastLandmarksRef.current;
        const dims = lastDimensionsRef.current;
        if (dims.width > 0 && dims.height > 0) {
          const mappedLandmarks = cachedLandmarks
            ? cachedLandmarks.map((pt: any) => {
                const x_pixel = ((pt.x * dims.width) - sx) / sWidth * targetW;
                const y_pixel = ((pt.y * dims.height) - sy) / sHeight * targetH;
                return { x: x_pixel, y: y_pixel, z: pt.z };
              })
            : [];
          drawFilters(
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

        // Draw Screen Overlays (e.g. Noise filter) that do not depend on landmarks
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
  }, [activeFilters, hasLandmarker]);

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

            {/* Snapchat-Style AR Filter Lenses (Interactive in idle and photoshoot intermission) */}
            {(phase === 'idle' || phase === 'intermission') && !isModelLoading && hasLandmarker && (
              <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-3 z-50">
                {[
                  { id: 'none', label: 'Off', icon: '🚫' },
                  { id: 'beauty-makeup', label: 'Beauty', icon: '✨' },
                  { id: 'cyber-shades', label: 'Shades', icon: '🕶️' },
                  { id: 'aviators', label: 'Aviator', icon: '👓' },
                  { id: 'heart-blush', label: 'Hearts', icon: '💖' },
                  { id: 'macbook-hearts', label: 'Float Hearts', icon: '💕' },
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
                              // Eyewear mutual exclusion
                              if (targetId === 'aviators') {
                                updated = updated.filter((id) => id !== 'cyber-shades');
                              } else if (targetId === 'cyber-shades') {
                                updated = updated.filter((id) => id !== 'aviators');
                              }
                              // Blush mutual exclusion
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
                      className={`w-12 h-12 flex-shrink-0 rounded-full border-2 flex flex-col items-center justify-center text-xl transition-all shadow-neo-sm hover:scale-105 active:scale-95 cursor-pointer z-50 ${
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
