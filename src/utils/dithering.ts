/**
 * Floyd-Steinberg 1-Bit Error Diffusion Dithering Engine
 * Converts canvas image data to high-contrast monochrome for thermal receipt and pocket sticker printers.
 */

export function applyFloydSteinbergDithering(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert to grayscale 2D array with float precision for error diffusion
  const gray = new Float32Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Standard Luminance weights
    gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = gray[idx];
      const newVal = oldVal < 128 ? 0 : 255;
      gray[idx] = newVal;

      const error = oldVal - newVal;

      if (x + 1 < width) {
        gray[y * width + (x + 1)] += (error * 7) / 16;
      }
      if (x - 1 >= 0 && y + 1 < height) {
        gray[(y + 1) * width + (x - 1)] += (error * 3) / 16;
      }
      if (y + 1 < height) {
        gray[(y + 1) * width + x] += (error * 5) / 16;
      }
      if (x + 1 < width && y + 1 < height) {
        gray[(y + 1) * width + (x + 1)] += (error * 1) / 16;
      }
    }
  }

  // Write back to ImageData as monochrome RGB
  for (let i = 0; i < gray.length; i++) {
    const val = gray[i];
    const pixelIdx = i * 4;
    data[pixelIdx] = val;
    data[pixelIdx + 1] = val;
    data[pixelIdx + 2] = val;
    data[pixelIdx + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
}

export function createDitheredDataUrl(sourceCanvas: HTMLCanvasElement): string {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sourceCanvas.width;
  tempCanvas.height = sourceCanvas.height;
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return sourceCanvas.toDataURL();

  ctx.drawImage(sourceCanvas, 0, 0);
  applyFloydSteinbergDithering(ctx, tempCanvas.width, tempCanvas.height);
  return tempCanvas.toDataURL('image/png');
}
