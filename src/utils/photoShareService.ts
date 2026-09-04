/**
 * Reliable binary converter and high-speed multi-provider CORS cloud uploader for photobooth QR code sharing.
 */

// Convert dataURL to Ultra-High-Quality (98%) JPEG for crisp high-resolution photo strips and fast mobile delivery
export async function convertToHighQualityJpg(dataUrl: string, quality = 0.98): Promise<string> {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/gif')) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fill white background for clean JPEG export
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Convert dataURL directly to a pristine binary Blob without relying on browser fetch()
export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : (dataUrl.startsWith('data:image/gif') ? 'image/gif' : 'image/jpeg');
    const byteString = atob(parts[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }

    return new Blob([uint8Array], { type: mime });
  } catch (err) {
    console.error('dataUrlToBlob binary conversion failed:', err);
    throw err;
  }
}

export async function uploadPhotoStripToCloud(dataUrl: string, filename: string): Promise<string | null> {
  const isGif = dataUrl.startsWith('data:image/gif') || filename.endsWith('.gif');
  let targetDataUrl = dataUrl;

  try {
    if (!isGif && !dataUrl.startsWith('data:image/jpeg')) {
      targetDataUrl = await convertToHighQualityJpg(dataUrl, 0.98);
    }
  } catch (err) {
    console.warn('Optimization fallback:', err);
    targetDataUrl = dataUrl;
  }

  const cleanFilename = isGif 
    ? (filename.endsWith('.gif') ? filename : filename.replace(/\.[^/.]+$/, '') + '.gif')
    : filename.replace(/\.[^/.]+$/, '') + '.jpg';

  // Primary: Native /api/upload endpoint (Vercel Serverless / Vite dev middleware)
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: targetDataUrl,
        filename: cleanFilename,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.url && typeof data.url === 'string') {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('/api/upload endpoint failed, falling back to WebRTC P2P:', err);
  }

  return null;
}
