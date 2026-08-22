import type { StickerInstance, StitchOptions, LayoutType, DoodlePath } from '../types/photobooth';
import { applyFloydSteinbergDithering } from './dithering';
import { createAnimatedGifFromCanvases } from './gifEncoder';
export type { StickerInstance, StitchOptions };

const imageCache = new Map<string, HTMLImageElement>();

export const clearImageCache = () => {
  imageCache.clear();
};

export function getPhotoCountForLayout(layout: LayoutType): number {
  switch (layout) {
    case 'vertical-2':
      return 2;
    case 'vertical-3':
      return 3;
    case 'grid-6':
      return 6;
    case 'vertical-4':
    case 'traditional-4':
    default:
      return 4;
  }
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (e) => reject(e);
  });
};

const applyFilterToContext = (
  ctx: CanvasRenderingContext2D,
  filter: StitchOptions['filter']
) => {
  switch (filter) {
    case 'grayscale':
      ctx.filter = 'grayscale(100%)';
      break;
    case 'sepia':
      ctx.filter = 'sepia(85%) contrast(95%) saturate(120%)';
      break;
    case 'high-contrast':
      ctx.filter = 'contrast(150%) brightness(90%) grayscale(100%)';
      break;
    case 'vintage':
      ctx.filter = 'contrast(110%) brightness(105%) saturate(130%) hue-rotate(-10deg)';
      break;
    case 'analog-film':
      ctx.filter = 'contrast(112%) brightness(108%) saturate(78%) sepia(30%) hue-rotate(14deg)';
      break;
    case 'none':
    default:
      ctx.filter = 'none';
      break;
  }
};

const getEmojiForSticker = (type: string): string | null => {
  switch (type) {
    case 'heart': return '💖';
    case 'star': return '⭐';
    case 'sparkles': return '✨';
    case 'cherry': return '🍒';
    case 'sunglasses': return '🕶️';
    case 'butterfly': return '🦋';
    case 'alien': return '👾';
    case 'flower': return '🌸';
    case 'lightning': return '⚡';
    case 'teddy': return '🧸';
    case 'ribbon': return '🎀';
    case 'fire': return '🔥';
    case 'kiss': return '💋';
    case 'crown': return '👑';
    default: return null;
  }
};

const getBadgeTextForSticker = (type: string): string | null => {
  switch (type) {
    case 'badge-cute': return 'CUTE';
    case 'badge-y2k': return 'Y2K';
    case 'badge-cool': return 'COOL';
    case 'badge-baby': return 'BABY';
    default: return null;
  }
};

function applyCustomPixelAdjustments(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  options: StitchOptions
) {
  if (options.filter !== 'custom') return;

  const rVal = options.customR ?? 0;
  const gVal = options.customG ?? 0;
  const bVal = options.customB ?? 0;
  const rawBrightness = options.customBrightness ?? 0;

  try {
    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;
    const brightnessMult = 1.0 + (rawBrightness / 100) * 0.4;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] + rVal;
      let g = data[i + 1] + gVal;
      let b = data[i + 2] + bVal;

      r = r * brightnessMult;
      g = g * brightnessMult;
      b = b * brightnessMult;

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    ctx.putImageData(imgData, x, y);
  } catch (err) {
    console.error('Custom filter adjustment failed:', err);
  }

  if (rawBrightness > 0) {
    const glowStrength = rawBrightness / 100;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
      
      ctx.save();
      ctx.translate(x, y);
      ctx.filter = 'blur(16px) brightness(120%)';
      ctx.globalAlpha = glowStrength * 0.45;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
    }
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number, baseColor: string) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);
  
  const size = 32;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
        ctx.fillRect(x, y, size, size);
      }
    }
  }
}

function drawStarsPattern(ctx: CanvasRenderingContext2D, w: number, h: number, baseColor: string) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  const starCount = Math.floor((w * h) / 12000);
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < starCount; i++) {
    const x = ((i * 137.5) % w);
    const y = ((i * 263.3) % h);
    ctx.fillText('✦', x, y);
  }
  ctx.restore();
}

function drawCherriesPattern(ctx: CanvasRenderingContext2D, w: number, h: number, baseColor: string) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  const cherrySpacing = 110;
  ctx.save();
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.35;

  for (let y = 30; y < h; y += cherrySpacing) {
    for (let x = 30; x < w; x += cherrySpacing) {
      ctx.fillText('🍒', x, y);
    }
  }
  ctx.restore();
}

function drawHoloGradient(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#FFD6DE');
  grad.addColorStop(0.25, '#E0C3FC');
  grad.addColorStop(0.5, '#8EC5FC');
  grad.addColorStop(0.75, '#CFDEC0');
  grad.addColorStop(1, '#FFE5B4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function isColorDark(hexColor: string): boolean {
  if (hexColor.startsWith('#')) {
    const c = hexColor.substring(1);
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma < 120;
  }
  return false;
}

const drawVHSOverlay = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.save();
  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 36px "Share Tech Mono", monospace';
  ctx.shadowColor = '#00FF66';
  ctx.shadowBlur = 10;
  ctx.fillText('PLAY ►', 50, 80);
  ctx.fillText('SP 0:00:24', 50, 130);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 1.5);
  }
  ctx.restore();
};

function applyChromaticAberration(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const original = new Uint8ClampedArray(data);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        const rx = Math.max(0, Math.min(w - 1, x - offset));
        const rIdx = (y * w + rx) * 4;
        data[idx] = original[rIdx];

        const bx = Math.max(0, Math.min(w - 1, x + offset));
        const bIdx = (y * w + bx) * 4;
        data[idx + 2] = original[bIdx + 2];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.error('Chromatic aberration failed:', err);
  }
}

function applyFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const factor = (strength / 100) * 35;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() * 2 - 1) * factor;
      
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.error('Film grain failed:', err);
  }
}

const drawDoodles = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  doodles: DoodlePath[]
) => {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const doodle of doodles) {
    if (doodle.points.length < 2) continue;

    ctx.save();
    ctx.strokeStyle = doodle.color;
    ctx.lineWidth = Math.max(3, (doodle.size / 100) * Math.min(w, h));

    if (doodle.glow) {
      ctx.shadowColor = doodle.color;
      ctx.shadowBlur = Math.max(8, doodle.size * 2);
    }

    ctx.beginPath();
    const first = doodle.points[0];
    ctx.moveTo((first.x / 100) * w, (first.y / 100) * h);

    for (let i = 1; i < doodle.points.length; i++) {
      const pt = doodle.points[i];
      ctx.lineTo((pt.x / 100) * w, (pt.y / 100) * h);
    }

    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
};

export async function renderStitchCanvas(
  images: string[],
  options: StitchOptions
): Promise<HTMLCanvasElement> {
  const neededPhotos = getPhotoCountForLayout(options.layout);
  if (images.length < neededPhotos) {
    throw new Error(`Need at least ${neededPhotos} images to stitch for layout ${options.layout}`);
  }

  const loadedImages = await Promise.all(images.slice(0, neededPhotos).map(loadImage));

  const pW = 800;
  const pH = 600;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context');
  }

  const padding = 40;
  const gap = 30;
  
  // Allocate bottom extra space for date and custom typography captions
  const hasCaption = options.captionText && options.captionText.trim().length > 0;
  const bottomExtra = (options.showDate || hasCaption) ? (hasCaption && options.showDate ? 170 : 130) : padding;

  const isTraditional = options.layout === 'traditional-4';
  const finalBgColor = isTraditional ? '#000000' : options.backgroundColor;

  if (options.layout === 'grid-6') {
    canvas.width = pW * 2 + padding * 2 + gap;
    canvas.height = pH * 3 + padding * 2 + gap * 2 + bottomExtra;

    if (options.pattern === 'checkerboard') drawCheckerboard(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'stars') drawStarsPattern(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'cherries') drawCherriesPattern(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'hologradient') drawHoloGradient(ctx, canvas.width, canvas.height);
    else {
      ctx.fillStyle = finalBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (let i = 0; i < 6; i++) {
      const img = loadedImages[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = padding + col * (pW + gap);
      const y = padding + row * (pH + gap);

      ctx.save();
      if (options.isMirrored) {
        ctx.translate(x + pW, y);
        ctx.scale(-1, 1);
        applyFilterToContext(ctx, options.filter);
        ctx.drawImage(img, 0, 0, pW, pH);
      } else {
        ctx.translate(x, y);
        applyFilterToContext(ctx, options.filter);
        ctx.drawImage(img, 0, 0, pW, pH);
      }
      ctx.restore();

      if (options.filter === 'custom') {
        applyCustomPixelAdjustments(ctx, x, y, pW, pH, options);
      }
    }
  } else {
    const N = neededPhotos;
    canvas.width = pW + padding * 2;
    canvas.height = pH * N + padding * 2 + gap * (N - 1) + bottomExtra;

    if (options.pattern === 'checkerboard') drawCheckerboard(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'stars') drawStarsPattern(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'cherries') drawCherriesPattern(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'hologradient') drawHoloGradient(ctx, canvas.width, canvas.height);
    else {
      ctx.fillStyle = finalBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (let i = 0; i < N; i++) {
      const img = loadedImages[i];
      const x = padding;
      const y = padding + i * (pH + gap);

      ctx.save();

      if (isTraditional) {
        const borderSize = 10;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - borderSize, y - borderSize, pW + borderSize * 2, pH + borderSize * 2);
      }

      if (options.isMirrored) {
        ctx.translate(x + pW, y);
        ctx.scale(-1, 1);
        applyFilterToContext(ctx, options.filter);
        ctx.drawImage(img, 0, 0, pW, pH);
      } else {
        ctx.translate(x, y);
        applyFilterToContext(ctx, options.filter);
        ctx.drawImage(img, 0, 0, pW, pH);
      }

      ctx.restore();

      if (options.filter === 'custom') {
        applyCustomPixelAdjustments(ctx, x, y, pW, pH, options);
      }

      if (options.filter === 'analog-film') {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(120, 160, 110, 0.06)';
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillRect(0, 0, pW, pH);
        ctx.restore();
      }
    }
  }

  // 1. Render Custom Typography & Captions
  if (hasCaption && options.captionText) {
    ctx.save();
    const isDarkBg = isColorDark(finalBgColor);
    const captionColor = options.captionColor || (isDarkBg ? '#FFFFFF' : '#1C1917');
    ctx.fillStyle = captionColor;

    const fontStyle = options.captionFont || 'bubble';
    switch (fontStyle) {
      case 'matrix':
        ctx.font = '900 34px "Share Tech Mono", monospace';
        break;
      case 'bubble':
        ctx.font = '900 38px "Space Grotesk", sans-serif';
        break;
      case 'gothic':
        ctx.font = 'bold 34px "Georgia", serif';
        break;
      case 'handwritten':
        ctx.font = 'italic bold 38px "Caveat", cursive, sans-serif';
        break;
      case 'pixel':
        ctx.font = '900 28px "Courier New", monospace';
        break;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const captionY = options.showDate 
      ? canvas.height - bottomExtra + 45 
      : canvas.height - bottomExtra / 2;

    ctx.fillText(options.captionText.toUpperCase(), canvas.width / 2, captionY);
    ctx.restore();
  }

  // 2. Render Date & Time Stamp
  if (options.showDate) {
    const today = new Date();
    const dateText = options.dateStr || today.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, ' . ');

    const timeStr = today.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const fullStamp = isTraditional 
      ? `Film No. ${Math.floor(Math.random() * 90000) + 10000}  |  ${dateText}  |  ${timeStr}`
      : `${dateText}  |  ${timeStr}`;

    ctx.save();
    const isDarkBg = isColorDark(finalBgColor);
    ctx.fillStyle = isDarkBg ? '#FFFFFF' : '#000000';
    ctx.font = 'bold 26px "Share Tech Mono", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const dateY = hasCaption 
      ? canvas.height - bottomExtra + 115 
      : canvas.height - bottomExtra / 2;

    ctx.fillText(fullStamp, canvas.width / 2, dateY);
    ctx.restore();
  }

  if (options.stickers && options.stickers.length > 0) {
    for (const sticker of options.stickers) {
      const canvasX = (sticker.x / 100) * canvas.width;
      const canvasY = (sticker.y / 100) * canvas.height;

      ctx.save();
      ctx.translate(canvasX, canvasY);
      ctx.rotate((sticker.rotation * Math.PI) / 180);

      const emoji = getEmojiForSticker(sticker.type);
      const badgeText = sticker.text || getBadgeTextForSticker(sticker.type);

      if (emoji) {
        const baseSize = canvas.width * 0.11;
        const fontSize = Math.round(baseSize * sticker.scale);
        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);
      } else if (badgeText) {
        const baseSize = canvas.width * 0.068;
        const fontSize = Math.round(baseSize * sticker.scale);
        
        ctx.font = `900 ${fontSize}px "Space Grotesk", "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textMetrics = ctx.measureText(badgeText);
        const textWidth = textMetrics.width;
        const textHeight = fontSize * 0.7; 

        const padX = fontSize * 0.35;
        const padY = fontSize * 0.15;
        const rectWidth = textWidth + padX * 2;
        const rectHeight = textHeight + padY * 2;
        const rx = fontSize * 0.3;

        const x = -rectWidth / 2;
        const y = -rectHeight / 2;

        const shadowOffset = Math.max(3, canvas.width * 0.007) * sticker.scale;
        ctx.fillStyle = '#000000';
        drawRoundedRect(ctx, x + shadowOffset, y + shadowOffset, rectWidth, rectHeight, rx);
        ctx.fill();

        if (sticker.type.startsWith('badge-cute')) ctx.fillStyle = '#FFD6DE';
        else if (sticker.type.startsWith('badge-y2k')) ctx.fillStyle = '#00FFCC';
        else if (sticker.type.startsWith('badge-cool')) ctx.fillStyle = '#CFDEC0';
        else if (sticker.type.startsWith('badge-baby')) ctx.fillStyle = '#FFE5B4';
        else ctx.fillStyle = '#FFFFFF';

        drawRoundedRect(ctx, x, y, rectWidth, rectHeight, rx);
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(2, canvas.width * 0.005) * sticker.scale;
        drawRoundedRect(ctx, x, y, rectWidth, rectHeight, rx);
        ctx.stroke();

        ctx.fillStyle = '#1C1917';
        ctx.fillText(badgeText, 0, 0);
      }

      ctx.restore();
    }
  }

  if (options.doodles && options.doodles.length > 0) {
    drawDoodles(ctx, canvas.width, canvas.height, options.doodles);
  }

  if (options.vhsOverlay) {
    drawVHSOverlay(ctx, canvas.width, canvas.height);
  }

  if (options.chromaticOffset && options.chromaticOffset > 0) {
    applyChromaticAberration(ctx, canvas.width, canvas.height, options.chromaticOffset);
  }

  let finalGrain = options.grainStrength || 0;
  if (options.filter === 'analog-film' && finalGrain < 15) {
    finalGrain = 15;
  }
  if (finalGrain > 0) {
    applyFilmGrain(ctx, canvas.width, canvas.height, finalGrain);
  }

  if (options.ditherMode === 'floyd-steinberg') {
    applyFloydSteinbergDithering(ctx, canvas.width, canvas.height);
  }

  return canvas;
}

export async function stitchPhotos(
  images: string[],
  options: StitchOptions
): Promise<string> {
  const canvas = await renderStitchCanvas(images, options);

  if (options.downloadFormat === 'jpg') {
    return canvas.toDataURL('image/jpeg', 1.0);
  } else {
    return canvas.toDataURL('image/png');
  }
}

// 4x6" Standard Photo Paper Dual-Strip Generator
export async function stitchDualPrintSheet(singleStripDataUrl: string): Promise<string> {
  const img = await loadImage(singleStripDataUrl);
  const canvas = document.createElement('canvas');
  // 4x6 inch standard photo paper ratio (1200 x 1800 px at 300 DPI)
  canvas.width = 1200;
  canvas.height = 1800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return singleStripDataUrl;

  // Crisp photo paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = 40;
  const availableWidth = (canvas.width - margin * 3) / 2;
  const availableHeight = canvas.height - margin * 2;

  const scale = Math.min(availableWidth / img.naturalWidth, availableHeight / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const yOffset = (canvas.height - drawH) / 2;

  const col1X = margin + (availableWidth - drawW) / 2;
  const col2X = margin * 2 + availableWidth + (availableWidth - drawW) / 2;

  // Draw Left Strip
  ctx.drawImage(img, col1X, yOffset, drawW, drawH);

  // Draw Right Strip
  ctx.drawImage(img, col2X, yOffset, drawW, drawH);

  // Draw Center Scissor Cut Line
  const centerX = canvas.width / 2;
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, margin);
  ctx.lineTo(centerX, canvas.height - margin);
  ctx.stroke();

  // Scissor icon annotations
  ctx.fillStyle = '#555555';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✂', centerX, margin + 25);
  ctx.fillText('✂', centerX, canvas.height / 2);
  ctx.fillText('✂', centerX, canvas.height - margin - 25);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

// Looping Animated GIF Generator from Burst Frames
export async function generateAnimatedGif(
  burstFrames: string[][],
  options: StitchOptions
): Promise<Blob> {
  const maxFrames = Math.max(...burstFrames.map((b) => (b ? b.length : 1)), 1);
  const frameSequence: number[] = [];
  for (let i = 0; i < maxFrames; i++) frameSequence.push(i);
  // Ping-pong bounce loop
  for (let i = maxFrames - 2; i > 0; i--) frameSequence.push(i);

  const canvases: HTMLCanvasElement[] = [];

  for (const fIdx of frameSequence) {
    const currentPhotos = burstFrames.map((b) => {
      if (!b || b.length === 0) return '';
      return b[fIdx % b.length] || b[0];
    });

    const c = await renderStitchCanvas(currentPhotos, options);
    // Downscale for smooth, fast GIF compilation (e.g. 480px width)
    const gifCanvas = document.createElement('canvas');
    const scale = Math.min(1, 480 / c.width);
    gifCanvas.width = Math.round(c.width * scale);
    gifCanvas.height = Math.round(c.height * scale);
    const gCtx = gifCanvas.getContext('2d');
    if (gCtx) {
      gCtx.drawImage(c, 0, 0, gifCanvas.width, gifCanvas.height);
      canvases.push(gifCanvas);
    }
  }

  return createAnimatedGifFromCanvases(canvases, 160);
}
