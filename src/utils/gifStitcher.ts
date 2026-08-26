import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { renderStitchedCanvas, getPhotoCountForLayout } from './canvasStitcher';
import type { StitchOptions, GifExportOptions } from '../types/photobooth';

export interface GifResult {
  blob: Blob;
  url: string;
  dataUrl: string;
  width: number;
  height: number;
  frameCount: number;
  sizeBytes: number;
}

/**
 * Creates synthetic retro micro-motion/wiggle frames for static or uploaded photos
 */
export async function createSyntheticBurstFromPhoto(
  photoDataUrl: string,
  frameCount = 6
): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const frames: string[] = [];
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(Array(frameCount).fill(photoDataUrl));
        return;
      }

      for (let i = 0; i < frameCount; i++) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        // Subtle vintage wiggle/breathing effect
        const angle = Math.sin((i / frameCount) * Math.PI * 2) * 0.003;
        const scale = 1.0 + Math.sin((i / frameCount) * Math.PI * 2) * 0.008;
        const dx = Math.cos((i / frameCount) * Math.PI * 2) * 2;
        const dy = Math.sin((i / frameCount) * Math.PI * 2) * 2;

        ctx.translate(canvas.width / 2 + dx, canvas.height / 2 + dy);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.restore();

        frames.push(canvas.toDataURL('image/jpeg', 0.92));
      }

      resolve(frames);
    };
    img.onerror = () => {
      resolve(Array(frameCount).fill(photoDataUrl));
    };
    img.src = photoDataUrl;
  });
}

/**
 * Stitches multi-pose live bursts into an animated boomerang GIF with all chosen layout styles,
 * frame colors, stickers, doodles, retro film grain, and timestamps.
 */
export async function stitchAnimatedGif(
  staticPhotos: string[],
  options: StitchOptions,
  gifOptions?: GifExportOptions,
  onProgress?: (percent: number) => void
): Promise<GifResult> {
  const neededPhotos = getPhotoCountForLayout(options.layout);
  const activePhotos = staticPhotos.slice(0, neededPhotos);

  if (activePhotos.length < neededPhotos) {
    throw new Error(`Need at least ${neededPhotos} photos for layout ${options.layout}`);
  }

  // Determine pose bursts (use recorded webcam bursts or generate synthetic motion)
  const poseBursts: string[][] = [];
  for (let p = 0; p < neededPhotos; p++) {
    const recordedBurst = options.poseBursts && options.poseBursts[p];
    if (recordedBurst && recordedBurst.length >= 2) {
      poseBursts.push(recordedBurst);
    } else {
      const synthetic = await createSyntheticBurstFromPhoto(activePhotos[p], 6);
      poseBursts.push(synthetic);
    }
  }

  const minBurstLength = Math.min(...poseBursts.map((b) => b.length));
  const rawFrameCount = Math.max(2, minBurstLength);

  // Generate Boomerang ping-pong sequence: 0, 1, 2, ..., N-1, N-2, ..., 1
  const boomerangIndices: number[] = [];
  for (let i = 0; i < rawFrameCount; i++) {
    boomerangIndices.push(i);
  }
  if (gifOptions?.boomerang !== false && rawFrameCount > 2) {
    for (let i = rawFrameCount - 2; i > 0; i--) {
      boomerangIndices.push(i);
    }
  }

  const totalFrames = boomerangIndices.length;
  const targetScale = gifOptions?.scale || 0.5; // Scale down for optimal GIF size and crisp rendering
  const frameDelay = gifOptions?.delay || (gifOptions?.fps ? Math.round(1000 / gifOptions.fps) : 100); // 100ms default (10fps)

  // Initialize gifenc encoder
  const gif = GIFEncoder();
  let scaledCanvas: HTMLCanvasElement | null = null;
  let scaledCtx: CanvasRenderingContext2D | null = null;

  for (let f = 0; f < totalFrames; f++) {
    const burstIdx = boomerangIndices[f];
    const framePoseImages = poseBursts.map((burst) => burst[burstIdx % burst.length] || burst[0]);

    // Render full photobooth strip for this frame
    const fullCanvas = await renderStitchedCanvas(framePoseImages, {
      ...options,
      downloadFormat: 'png',
    });

    const targetW = Math.round(fullCanvas.width * targetScale);
    const targetH = Math.round(fullCanvas.height * targetScale);

    if (!scaledCanvas) {
      scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = targetW;
      scaledCanvas.height = targetH;
      scaledCtx = scaledCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (scaledCtx) {
      scaledCtx.clearRect(0, 0, targetW, targetH);
      scaledCtx.drawImage(fullCanvas, 0, 0, targetW, targetH);

      const imgData = scaledCtx.getImageData(0, 0, targetW, targetH);
      const rgbaData = imgData.data;

      // Quantize RGBA pixels to 256-color palette with gifenc
      const palette = quantize(rgbaData, 256);
      const index = applyPalette(rgbaData, palette);

      gif.writeFrame(index, targetW, targetH, {
        palette,
        delay: frameDelay,
      });
    }

    if (onProgress) {
      onProgress(Math.round(((f + 1) / totalFrames) * 100));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);

  // Also convert bytes to dataUrl for immediate local preview/export
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return {
    blob,
    url,
    dataUrl,
    width: scaledCanvas?.width || 440,
    height: scaledCanvas?.height || 1400,
    frameCount: totalFrames,
    sizeBytes: bytes.byteLength,
  };
}
