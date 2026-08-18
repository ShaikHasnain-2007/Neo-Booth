/**
 * Reliable binary converter and high-speed multi-provider CORS cloud uploader for photobooth QR code sharing.
 */

// Convert dataURL directly to a pristine binary Blob without relying on browser fetch()
export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
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
    blob = dataUrlToBlob(dataUrl);
  } catch {
    return null;
  }

  // Provider 1: ntfy.sh (Ultra-fast, CORS: *, returns direct image/png with 100% byte integrity)
  try {
    const randomTopic = 'neobooth_photo_' + Math.random().toString(36).substring(2, 9);
    const cleanFilename = filename.endsWith('.png') ? filename : `${filename}.png`;

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
    form.append('file', blob, filename);
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
