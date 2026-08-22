import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/**
 * Animated GIF & Boomerang Generator
 * Compiles pose bursts into a looping animated photobooth GIF strip.
 */
export async function createAnimatedGifFromCanvases(
  frameCanvases: HTMLCanvasElement[],
  delayMs = 160
): Promise<Blob> {
  if (!frameCanvases || frameCanvases.length === 0) {
    throw new Error('No frame canvases provided for GIF generation');
  }

  const gif = GIFEncoder();
  const width = frameCanvases[0].width;
  const height = frameCanvases[0].height;

  for (const canvas of frameCanvases) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Quantize 24-bit RGBA to 8-bit color palette (256 colors max for standard GIF)
    const palette = quantize(data, 256, { format: 'rgba4444' });
    const index = applyPalette(data, palette, 'rgba4444');

    gif.writeFrame(index, width, height, {
      palette,
      delay: delayMs,
      transparent: false,
    });
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes as BlobPart], { type: 'image/gif' });
}
