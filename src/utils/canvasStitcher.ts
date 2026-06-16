export interface StickerInstance {
  id: string;
  type: string;
  text?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface StitchOptions {
  layout: 'vertical-4' | 'vertical-3' | 'vertical-2' | 'grid-6' | 'traditional-4';
  backgroundColor: string;
  filter: 'none' | 'grayscale' | 'sepia' | 'high-contrast' | 'vintage' | 'analog-film' | 'custom';
  customR?: number;
  customG?: number;
  customB?: number;
  customBrightness?: number;
  showDate: boolean;
  dateStr?: string;
  isMirrored?: boolean;
  downloadFormat: 'png' | 'jpg';
  pattern?: 'none' | 'checkerboard' | 'stars' | 'cherries' | 'hologradient';
  grainStrength?: number;
  chromaticOffset?: number;
  vhsOverlay?: boolean;
  stickers?: StickerInstance[];
}

export function getPhotoCountForLayout(layout: StitchOptions['layout']): number {
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
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
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

function isColorDark(hex: string): boolean {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return false;
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

const drawCheckerboard = (ctx: CanvasRenderingContext2D, w: number, h: number, swatchColor: string) => {
  const size = 60;
  ctx.save();
  ctx.fillStyle = swatchColor;
  ctx.fillRect(0, 0, w, h);
  
  ctx.fillStyle = isColorDark(swatchColor) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
        ctx.fillRect(x, y, size, size);
      }
    }
  }
  ctx.restore();
};

const drawStarShape = (ctx: CanvasRenderingContext2D, cx: number, cy: number, innerRadius: number, outerRadius: number, spikes = 4) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
};

const drawStars = (ctx: CanvasRenderingContext2D, w: number, h: number, swatchColor: string) => {
  ctx.save();
  ctx.fillStyle = swatchColor;
  ctx.fillRect(0, 0, w, h);
  
  const starColor = isColorDark(swatchColor) ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)';
  ctx.fillStyle = starColor;
  
  for (let y = 40; y < h; y += 120) {
    for (let x = 40; x < w; x += 120) {
      const shiftX = ((x * y) % 60) - 30;
      const shiftY = ((x + y) % 60) - 30;
      drawStarShape(ctx, x + shiftX, y + shiftY, 6, 15, 4);
    }
  }
  ctx.restore();
};

const drawSingleCherry = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  ctx.save();
  
  ctx.beginPath();
  ctx.strokeStyle = '#2D6A4F';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx - 10, cy + 15, cx - 15, cy + 25, cx - 15, cy + 30);
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx + 10, cy + 10, cx + 15, cy + 25, cx + 15, cy + 30);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = '#52B788';
  ctx.ellipse(cx - 5, cy + 8, 8, 4, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2D6A4F';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#D90429';
  ctx.beginPath();
  ctx.arc(cx - 15, cy + 34, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 15, cy + 34, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx - 12, cy + 30, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 18, cy + 30, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawCherries = (ctx: CanvasRenderingContext2D, w: number, h: number, swatchColor: string) => {
  ctx.save();
  ctx.fillStyle = swatchColor;
  ctx.fillRect(0, 0, w, h);
  
  for (let y = 60; y < h; y += 180) {
    for (let x = 60; x < w; x += 180) {
      const shiftX = ((x * y) % 80) - 40;
      const shiftY = ((x + y) % 80) - 40;
      drawSingleCherry(ctx, x + shiftX, y + shiftY);
    }
  }
  ctx.restore();
};

const drawHoloGradient = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#FFD6DE');
  grad.addColorStop(0.3, '#E6E6FA');
  grad.addColorStop(0.6, '#D4F0FC');
  grad.addColorStop(1, '#CFDEC0');
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};

const drawVHSOverlay = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px "Share Tech Mono", "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#FF3B30';
  ctx.beginPath();
  ctx.arc(60, 56, 8, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('REC', 78, 44);
  ctx.fillText('0:02:14', 60, 78);

  ctx.textAlign = 'right';
  ctx.fillText('▲ PLAY', w - 60, 44);
  ctx.fillText('SP', w - 60, 78);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.strokeRect(w - 200, 48, 40, 20);
  ctx.fillRect(w - 160, 54, 4, 8);
  ctx.fillRect(w - 196, 52, 10, 12);
  ctx.fillRect(w - 184, 52, 10, 12);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
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

export async function stitchPhotos(
  images: string[],
  options: StitchOptions
): Promise<string> {
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
  const bottomExtra = options.showDate ? 130 : padding;

  const isTraditional = options.layout === 'traditional-4';
  const finalBgColor = isTraditional ? '#000000' : options.backgroundColor;

  if (isTraditional) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    switch (options.pattern) {
      case 'checkerboard':
        drawCheckerboard(ctx, canvas.width, canvas.height, finalBgColor);
        break;
      case 'stars':
        drawStars(ctx, canvas.width, canvas.height, finalBgColor);
        break;
      case 'cherries':
        drawCherries(ctx, canvas.width, canvas.height, finalBgColor);
        break;
      case 'hologradient':
        drawHoloGradient(ctx, canvas.width, canvas.height);
        break;
      case 'none':
      default:
        ctx.fillStyle = finalBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
    }
  }

  if (options.layout === 'grid-6') {
    canvas.width = pW * 2 + padding * 2 + gap;
    canvas.height = pH * 3 + padding * 2 + gap * 2 + bottomExtra;

    if (options.pattern === 'checkerboard') drawCheckerboard(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'stars') drawStars(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'cherries') drawCherries(ctx, canvas.width, canvas.height, finalBgColor);
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

      if (options.filter === 'analog-film') {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(120, 160, 110, 0.06)';
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillRect(0, 0, pW, pH);
        ctx.restore();
      }
    }
  } else {
    const N = neededPhotos;
    canvas.width = pW + padding * 2;
    canvas.height = padding + pH * N + gap * (N - 1) + bottomExtra;

    if (isTraditional) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      switch (options.pattern) {
        case 'checkerboard':
          drawCheckerboard(ctx, canvas.width, canvas.height, finalBgColor);
          break;
        case 'stars':
          drawStars(ctx, canvas.width, canvas.height, finalBgColor);
          break;
        case 'cherries':
          drawCherries(ctx, canvas.width, canvas.height, finalBgColor);
          break;
        case 'hologradient':
          drawHoloGradient(ctx, canvas.width, canvas.height);
          break;
        case 'none':
        default:
          ctx.fillStyle = finalBgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;
      }
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
    ctx.font = 'bold 28px "Share Tech Mono", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const dateY = canvas.height - bottomExtra / 2;
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
        ctx.font = `${Math.round(64 * sticker.scale)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);
      } else if (badgeText) {
        ctx.font = `900 ${Math.round(48 * sticker.scale)}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10 * sticker.scale;
        ctx.lineJoin = 'round';
        ctx.strokeText(badgeText, 0, 0);

        if (sticker.type.startsWith('badge-cute')) ctx.fillStyle = '#FFD6DE';
        else if (sticker.type.startsWith('badge-y2k')) ctx.fillStyle = '#00FFCC';
        else if (sticker.type.startsWith('badge-cool')) ctx.fillStyle = '#CFDEC0';
        else if (sticker.type.startsWith('badge-baby')) ctx.fillStyle = '#FFE5B4';
        else ctx.fillStyle = '#FFFFFF';

        ctx.fillText(badgeText, 0, 0);
      }

      ctx.restore();
    }
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

  if (options.downloadFormat === 'jpg') {
    return canvas.toDataURL('image/jpeg', 1.0);
  } else {
    return canvas.toDataURL('image/png');
  }
}
