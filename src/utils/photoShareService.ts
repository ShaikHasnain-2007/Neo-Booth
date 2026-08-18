/**
 * Reliable binary converter and high-speed multi-provider CORS cloud uploader for photobooth QR code sharing.
 */

// Convert dataURL to Ultra-High-Quality (98%) JPEG for crisp high-resolution photo strips and fast mobile delivery
export async function convertToHighQualityJpg(dataUrl: string, quality = 0.98): Promise<string> {
  if (dataUrl.startsWith('data:image/jpeg')) {
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
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
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
  let blob: Blob;
  try {
    // Convert to 98% Ultra-High-Quality JPEG for maximum visual fidelity and fast upload
    const optimizedJpgDataUrl = await convertToHighQualityJpg(dataUrl, 0.98);
    blob = dataUrlToBlob(optimizedJpgDataUrl);
  } catch (err) {
    console.warn('Optimization fallback:', err);
    try {
      blob = dataUrlToBlob(dataUrl);
    } catch {
      return null;
    }
  }

  const cleanFilename = filename.replace(/\.[^/.]+$/, '') + '.jpg';

  // Provider 1: ntfy.sh (Ultra-fast, CORS: *, returns direct image/jpeg with 100% byte integrity)
  try {
    const randomTopic = 'neobooth_photo_' + Math.random().toString(36).substring(2, 9);

    const res = await fetch(`https://ntfy.sh/${randomTopic}`, {
      method: 'PUT',
      body: blob,
      headers: {
        'Filename': cleanFilename,
        'Title': 'NEO.BOOTH Photo Strip',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.attachment && data.attachment.url) {
        return data.attachment.url;
      }
    }
  } catch (err) {
    console.warn('ntfy.sh upload provider failed:', err);
  }

  // Provider 2: tmpfiles.org
  try {
    const form = new FormData();
    form.append('file', blob, cleanFilename);
    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: form,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.data?.url) {
        const rawUrl = data.data.url as string;
        return rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      }
    }
  } catch (err) {
    console.warn('tmpfiles fallback skipped:', err);
  }

  return null;
}
