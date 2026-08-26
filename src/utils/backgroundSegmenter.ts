import type { ImageSegmenter, MPMask } from '@mediapipe/tasks-vision';
import type { VirtualBackdropId, CropDimensions } from '../types/photobooth';

let cachedSegmenter: ImageSegmenter | null = null;
let isSegmenterInitializing = false;

// Offscreen canvases for fast high-framerate compositing
let personCanvas: HTMLCanvasElement | null = null;
let personCtx: CanvasRenderingContext2D | null = null;
let maskCanvas: HTMLCanvasElement | null = null;
let maskCtx: CanvasRenderingContext2D | null = null;

export async function initSelfieSegmenter(): Promise<ImageSegmenter | null> {
  if (cachedSegmenter) return cachedSegmenter;
  if (isSegmenterInitializing) return null;

  isSegmenterInitializing = true;
  try {
    const vision = await import('@mediapipe/tasks-vision');
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
    );

    cachedSegmenter = await vision.ImageSegmenter.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });

    isSegmenterInitializing = false;
    return cachedSegmenter;
  } catch (err) {
    console.warn('GPU Selfie Segmenter initialization failed, falling back to CPU:', err);
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
      );
      cachedSegmenter = await vision.ImageSegmenter.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
      isSegmenterInitializing = false;
      return cachedSegmenter;
    } catch (cpuErr) {
      console.error('Selfie Segmenter failed to load:', cpuErr);
      isSegmenterInitializing = false;
      return null;
    }
  }
}

/**
 * Draws custom procedural Y2K and Retro backdrops
 */
function drawBackdropGraphics(
  ctx: CanvasRenderingContext2D,
  backdrop: VirtualBackdropId,
  w: number,
  h: number,
  customImg: HTMLImageElement | null
) {
  ctx.save();

  switch (backdrop) {
    case 'y2k-bliss': {
      // Windows 95 / XP Bliss Hill
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      skyGrad.addColorStop(0, '#1c74d9');
      skyGrad.addColorStop(0.5, '#4a95eb');
      skyGrad.addColorStop(1, '#a1ccf7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Fluffy clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(w * 0.25, h * 0.2, w * 0.2, h * 0.08, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.7, h * 0.28, w * 0.25, h * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();

      // Green Hills
      const hillGrad = ctx.createLinearGradient(0, h * 0.48, 0, h);
      hillGrad.addColorStop(0, '#56b82a');
      hillGrad.addColorStop(0.4, '#3e9c1c');
      hillGrad.addColorStop(1, '#256d0d');
      ctx.fillStyle = hillGrad;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.55);
      ctx.bezierCurveTo(w * 0.35, h * 0.45, w * 0.65, h * 0.52, w, h * 0.48);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'cyberpunk-tokyo': {
      // Cyber Tokyo Synthwave Skyline
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a001a');
      grad.addColorStop(0.5, '#26004d');
      grad.addColorStop(0.75, '#800080');
      grad.addColorStop(1, '#ff007f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Neon horizon grid lines
      ctx.strokeStyle = 'rgba(0, 255, 240, 0.4)';
      ctx.lineWidth = 1.5;
      for (let y = h * 0.65; y <= h; y += (y - h * 0.6) * 0.4 + 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x <= w; x += w / 8) {
        ctx.beginPath();
        ctx.moveTo(w / 2, h * 0.65);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      break;
    }

    case 'retro-laser': {
      // 90s School Portrait Laser Grid
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 50, w * 0.5, h * 0.5, w * 0.7);
      bgGrad.addColorStop(0, '#3a0066');
      bgGrad.addColorStop(0.7, '#120024');
      bgGrad.addColorStop(1, '#05000a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Laser beams
      const colors = ['#ff007f', '#00f0ff', '#ff0033', '#39ff14', '#ffff00'];
      for (let i = 0; i < 9; i++) {
        ctx.save();
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 2.5;
        ctx.shadowColor = colors[i % colors.length];
        ctx.shadowBlur = 12;
        ctx.beginPath();
        const startX = (w * 0.1) + (i * w * 0.1);
        ctx.moveTo(startX, 0);
        ctx.lineTo(w - startX, h);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'sakura-pastel': {
      // Sakura Cherry Blossoms
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#ffd1dc');
      grad.addColorStop(0.5, '#ffe4e1');
      grad.addColorStop(1, '#f8c8dc');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Floating sakura petals
      ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
      for (let i = 0; i < 18; i++) {
        const px = (Math.sin(i * 99) * 0.5 + 0.5) * w;
        const py = (Math.cos(i * 77) * 0.5 + 0.5) * h;
        const size = 12 + (i % 6) * 3;
        ctx.beginPath();
        ctx.ellipse(px, py, size, size * 0.6, (i * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'vaporwave-sunset': {
      // Vaporwave Sunset & Palm Silhouette
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#10002b');
      grad.addColorStop(0.4, '#3c096c');
      grad.addColorStop(0.7, '#7b2cbf');
      grad.addColorStop(0.9, '#ff70a6');
      grad.addColorStop(1, '#ff9770');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Retro striped sun
      const sunY = h * 0.55;
      const sunR = w * 0.22;
      const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sunGrad.addColorStop(0, '#ffbe0b');
      sunGrad.addColorStop(1, '#fb5607');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(w / 2, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'minimal-studio': {
      // Editorial Photo Studio Radial Spotlight
      const grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.6, '#e4e4e7');
      grad.addColorStop(1, '#a1a1aa');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }

    case 'custom': {
      if (customImg && customImg.complete && customImg.naturalWidth > 0) {
        ctx.drawImage(customImg, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#18181B';
        ctx.fillRect(0, 0, w, h);
      }
      break;
    }

    case 'transparent':
    default: {
      // Clear for transparent cutout
      ctx.clearRect(0, 0, w, h);
      break;
    }
  }

  ctx.restore();
}

/**
 * High-speed 60FPS composite renderer that draws the virtual backdrop behind the user
 * using MediaPipe's segmented category mask.
 */
export function renderSegmentedComposite(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  mask: MPMask | null,
  backdrop: VirtualBackdropId,
  customImg: HTMLImageElement | null,
  crop: CropDimensions,
  isMirrored: boolean
) {
  const { sx, sy, sWidth, sHeight, targetW, targetH } = crop;

  // If no backdrop selected or mask is unavailable, render direct video feed
  if (backdrop === 'none' || !mask) {
    ctx.save();
    if (isMirrored) {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
    ctx.restore();
    return;
  }

  // 1. Draw Background Layer (Virtual Backdrop or DSLR Blur)
  if (backdrop === 'blur') {
    ctx.save();
    if (isMirrored) {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = 'blur(18px) brightness(95%)';
    ctx.drawImage(video, sx, sy, sWidth, sHeight, -20, -20, targetW + 40, targetH + 40);
    ctx.restore();
  } else {
    drawBackdropGraphics(ctx, backdrop, targetW, targetH, customImg);
  }

  // 2. Prepare Mask Canvas
  const maskWidth = mask.width || targetW;
  const maskHeight = mask.height || targetH;

  if (!maskCanvas) {
    maskCanvas = document.createElement('canvas');
    maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (maskCanvas.width !== maskWidth || maskCanvas.height !== maskHeight) {
    maskCanvas.width = maskWidth;
    maskCanvas.height = maskHeight;
  }

  if (maskCtx) {
    const maskData = mask.getAsUint8Array();
    const imgData = maskCtx.createImageData(maskWidth, maskHeight);
    const data = imgData.data;

    for (let i = 0; i < maskData.length; i++) {
      const isPerson = maskData[i] > 0;
      const idx = i * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = isPerson ? 255 : 0; // Person is opaque, background is 0
    }
    maskCtx.putImageData(imgData, 0, 0);
  }

  // 3. Prepare Isolated Person Foreground Canvas
  if (!personCanvas) {
    personCanvas = document.createElement('canvas');
    personCtx = personCanvas.getContext('2d');
  }
  if (personCanvas.width !== targetW || personCanvas.height !== targetH) {
    personCanvas.width = targetW;
    personCanvas.height = targetH;
  }

  if (personCtx && maskCanvas) {
    personCtx.clearRect(0, 0, targetW, targetH);
    personCtx.save();
    if (isMirrored) {
      personCtx.translate(targetW, 0);
      personCtx.scale(-1, 1);
    }
    personCtx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
    personCtx.restore();

    // Mask out the background
    personCtx.globalCompositeOperation = 'destination-in';
    personCtx.save();
    if (isMirrored) {
      personCtx.translate(targetW, 0);
      personCtx.scale(-1, 1);
    }
    personCtx.drawImage(maskCanvas, 0, 0, targetW, targetH);
    personCtx.restore();
    personCtx.globalCompositeOperation = 'source-over';

    // 4. Draw Foreground Person over Background
    ctx.drawImage(personCanvas, 0, 0, targetW, targetH);
  }
}
