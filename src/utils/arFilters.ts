import type { MutableRefObject } from 'react';
import type { 
  PixelLandmark, 
  NormalizedLandmark, 
  ARFilter, 
  FilterImages, 
  HeartParticle, 
  CropDimensions 
} from '../types/photobooth';

// Pre-generate static noise patterns for fast tiling overlay
const noiseCanvases: HTMLCanvasElement[] = [];

export function getNoiseCanvases(): HTMLCanvasElement[] {
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
        data[j + 1] = val;
        data[j + 2] = val;
        data[j + 3] = 22; // subtle opacity for grain (approx 8.6%)
      }
      nCtx.putImageData(imgData, 0, 0);
      noiseCanvases.push(c);
    }
  }
  return noiseCanvases;
}

export function drawHeart(
  ctx: CanvasRenderingContext2D,
  c_x: number,
  c_y: number,
  size: number,
  fillStyle: string,
  shadowColor?: string,
  shadowBlur = 0,
  rotation = 0
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

export function drawAviators(
  ctx: CanvasRenderingContext2D,
  landmarks: PixelLandmark[],
  img: HTMLImageElement | null
) {
  const noseBridge = landmarks[168];
  const leftEyeOuter = landmarks[130];
  const rightEyeOuter = landmarks[359];

  if (noseBridge && leftEyeOuter && rightEyeOuter && img && img.complete) {
    ctx.save();
    const dx = rightEyeOuter.x - leftEyeOuter.x;
    const dy = rightEyeOuter.y - leftEyeOuter.y;
    const angle = Math.atan2(dy, dx);
    const eyeDistance = Math.sqrt(dx * dx + dy * dy);

    ctx.translate(noseBridge.x, noseBridge.y);
    ctx.rotate(angle);

    // Lower glasses significantly to fit over the eyes
    ctx.translate(0, eyeDistance * 0.15);

    const w = eyeDistance * 1.8;
    const h = w * 0.4;

    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

export function drawCyberShades(
  ctx: CanvasRenderingContext2D,
  landmarks: PixelLandmark[]
) {
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
    ctx.translate(0, eyeDistance * 0.07);

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

    // Angular Y2K visor shape
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h * 0.4);
    ctx.lineTo(w * 0.5, -h * 0.4);
    ctx.lineTo(w * 0.45, h * 0.4);
    ctx.lineTo(w * 0.1, h * 0.4);
    ctx.lineTo(0, h * 0.15);
    ctx.lineTo(-w * 0.1, h * 0.4);
    ctx.lineTo(-w * 0.45, h * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tech HUD details
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.clip();

    ctx.beginPath();
    for (let yOffset = -h; yOffset < h; yOffset += 6) {
      ctx.moveTo(-w, yOffset);
      ctx.lineTo(w, yOffset);
    }
    ctx.stroke();

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
    ctx.restore();
  }
}

export function drawHeartBlush(
  ctx: CanvasRenderingContext2D,
  landmarks: PixelLandmark[]
) {
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

export function drawTulip(
  ctx: CanvasRenderingContext2D,
  landmarks: PixelLandmark[],
  img: HTMLImageElement | null
) {
  const templePoint = landmarks[103] || landmarks[109];
  const rightEar = landmarks[234] || landmarks[127];

  if (templePoint && rightEar && img && img.complete) {
    ctx.save();
    const nose = landmarks[4];
    const forehead = landmarks[10];
    let faceSize = 80;
    if (nose && forehead) {
      faceSize = Math.sqrt(Math.pow(nose.x - forehead.x, 2) + Math.pow(nose.y - forehead.y, 2)) * 0.6;
    }

    const leftEyeOuter = landmarks[130];
    const rightEyeOuter = landmarks[359];
    let angle = 0;
    if (leftEyeOuter && rightEyeOuter) {
      const dx = rightEyeOuter.x - leftEyeOuter.x;
      const dy = rightEyeOuter.y - leftEyeOuter.y;
      angle = Math.atan2(dy, dx);
    }

    const x = templePoint.x - (templePoint.x - rightEar.x) * 0.2;
    const y = templePoint.y + (rightEar.y - templePoint.y) * 0.1;

    ctx.translate(x, y);
    ctx.rotate(angle + 0.15);

    const w = faceSize * 1.05;
    const h = w;

    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

export function renderARFilters(
  ctx: CanvasRenderingContext2D,
  allFaces: PixelLandmark[][],
  activeFilters: ARFilter[],
  images: FilterImages,
  floatingHeartsRef: MutableRefObject<HeartParticle[]>,
  lastHandHeartSpawnTimeRef: MutableRefObject<number>,
  rawHandmarks: NormalizedLandmark[][] | null,
  dims: { width: number; height: number },
  crop: CropDimensions
) {
  ctx.save();

  if (activeFilters.length > 0 && allFaces.length > 0) {
    const activeGlasses = activeFilters.filter((f) => f === 'aviators' || f === 'cyber-shades');

    // 1. Render glasses on all detected people (split styles if multiple glasses are active)
    allFaces.forEach((faceLandmarks, faceIdx) => {
      if (activeGlasses.length === 1) {
        const style = activeGlasses[0];
        if (style === 'aviators') drawAviators(ctx, faceLandmarks, images.aviators);
        if (style === 'cyber-shades') drawCyberShades(ctx, faceLandmarks);
      } else if (activeGlasses.length >= 2) {
        // Person 1 (left) gets style 0, Person 2 (right) gets style 1
        const style = activeGlasses[faceIdx % activeGlasses.length];
        if (style === 'aviators') drawAviators(ctx, faceLandmarks, images.aviators);
        if (style === 'cyber-shades') drawCyberShades(ctx, faceLandmarks);
      }

      // 2. Render all other filters on EVERY detected person
      if (activeFilters.includes('heart-blush')) {
        drawHeartBlush(ctx, faceLandmarks);
      }
      if (activeFilters.includes('tulip')) {
        drawTulip(ctx, faceLandmarks, images.tulip);
      }
    });
  }

  // Floating Hearts Particle System (Forehead loop and Hand gestures)
  const primaryFace = allFaces.length > 0 ? allFaces[0] : null;
  const primaryForehead = primaryFace ? primaryFace[10] : null;
  const primaryNose = primaryFace ? primaryFace[4] : null;
  const defaultFaceSize = primaryForehead && primaryNose
    ? Math.sqrt(Math.pow(primaryNose.x - primaryForehead.x, 2) + Math.pow(primaryNose.y - primaryForehead.y, 2)) * 0.6
    : 80;

  const hearts = floatingHeartsRef.current;

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
      p.opacity -= 0.010;
    } else {
      p.yOffsetFactor -= p.speedFactor;
      p.wobblePhase += p.wobbleSpeed;
      p.rotation += p.rotationSpeed;

      if (p.scale < 1.0) {
        p.scale = Math.min(1.0, p.scale + 0.10);
      } else if (p.opacity < 0.35) {
        p.scale = Math.max(0.1, p.scale - 0.05);
      }
      p.opacity -= 0.018;
    }
  });

  floatingHeartsRef.current = hearts.filter(p => p.opacity > 0);

  // Two-hand heart gesture detection
  let gestureActive = false;
  let hand_x = 0;
  let hand_y = 0;
  let handSize = defaultFaceSize * 0.8;

  if (rawHandmarks && rawHandmarks.length >= 2) {
    const mapHandPoint = (pt: NormalizedLandmark) => {
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

  // Forehead particles (macbook-hearts filter) - spawned on all detected faces
  if (activeFilters.includes('macbook-hearts') && allFaces.length > 0) {
    allFaces.forEach((faceLandmarks, faceIdx) => {
      const forehead = faceLandmarks[10];
      const nose = faceLandmarks[4];
      if (forehead && nose) {
        const faceHearts = floatingHeartsRef.current.filter(p => p.originType !== 'hand' && p.faceIndex === faceIdx);
        if (faceHearts.length < 14 && Math.random() < 0.12) {
          floatingHeartsRef.current.push({
            originType: 'forehead',
            faceIndex: faceIdx,
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
    });
  }

  // Hand gesture heart emission
  if (gestureActive) {
    const now = performance.now();
    if (now - lastHandHeartSpawnTimeRef.current > 1000) {
      lastHandHeartSpawnTimeRef.current = now;

      if (floatingHeartsRef.current.length < 50) {
        floatingHeartsRef.current.push({
          originType: 'hand',
          x: hand_x,
          y: hand_y,
          speed: 1.8 + Math.random() * 0.8,
          size: handSize * (0.85 + Math.random() * 0.15),
          opacity: 1.0,
          colorHue: 345,
          wobbleSpeed: 0.02 + Math.random() * 0.02,
          wobbleAmt: 8 + Math.random() * 8,
          wobblePhase: Math.random() * Math.PI * 2,
          rotation: (Math.random() - 0.5) * 0.4,
          rotationSpeed: (Math.random() - 0.5) * 0.01,
          scale: 0.1,
          xOffsetFactor: 0,
          yOffsetFactor: 0,
          speedFactor: 0,
          sizeFactor: 0,
          wobbleAmount: 0
        });
      }
    }
  }

  // Draw particles
  floatingHeartsRef.current.forEach(p => {
    let c_x: number;
    let c_y: number;
    let size: number;

    if (p.originType === 'hand') {
      const wobbleX = Math.sin(p.wobblePhase) * (p.wobbleAmt || 10);
      c_x = (p.x || 0) + wobbleX;
      c_y = p.y || 0;
      size = (p.size || 30) * p.scale;
    } else {
      const targetFace = (p.faceIndex !== undefined && allFaces[p.faceIndex]) ? allFaces[p.faceIndex] : allFaces[0];
      if (!targetFace) return;
      const forehead = targetFace[10];
      const nose = targetFace[4];
      if (!forehead || !nose) return;

      const faceSize = Math.sqrt(Math.pow(nose.x - forehead.x, 2) + Math.pow(nose.y - forehead.y, 2)) * 0.6;
      const wobbleX = Math.sin(p.wobblePhase) * p.wobbleAmount;
      c_x = forehead.x + (p.xOffsetFactor + wobbleX) * faceSize;
      c_y = forehead.y + p.yOffsetFactor * faceSize;
      size = p.sizeFactor * faceSize * p.scale;
    }

    const isWineRed = p.originType === 'hand';
    const fillStyle = isWineRed
      ? `hsla(345, 85%, 28%, ${p.opacity})`
      : `hsla(${p.colorHue}, 100%, 68%, ${p.opacity * 0.70})`;
    const shadowColor = isWineRed
      ? `hsla(345, 85%, 20%, ${p.opacity * 0.60})`
      : `hsla(${p.colorHue}, 100%, 68%, ${p.opacity * 0.50})`;

    drawHeart(ctx, c_x, c_y, size, fillStyle, shadowColor, 8, p.rotation);
  });

  ctx.restore();
}
