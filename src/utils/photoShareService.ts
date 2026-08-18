/**
 * Robust binary converter and multi-provider cloud uploader for photobooth QR code sharing.
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

  // Provider 1: Catbox.moe (Reliable permanent direct image hosting with CORS and valid image/png MIME)
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', blob, filename.endsWith('.png') ? filename : `${filename}.png`);

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form,
    });

    if (res.ok) {
      const url = (await res.text()).trim();
      if (url && url.startsWith('http')) {
        return url;
      }
    }
  } catch (err) {
    console.warn('Catbox upload provider skipped:', err);
  }

  // Provider 2: Uguu.se (Fast temporary image CDN)
  try {
    const form = new FormData();
    form.append('files[]', blob, filename);
    const res = await fetch('https://uguu.se/upload.php', {
      method: 'POST',
      body: form,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.files && data.files[0]?.url) {
        return data.files[0].url;
      }
    }
  } catch (err) {
    console.warn('Uguu upload provider skipped:', err);
  }

  // Provider 3: ntfy.sh public binary storage
  try {
    const randomTopic = 'neobooth_strip_' + Math.random().toString(36).substring(2, 9);
    const res = await fetch(`https://ntfy.sh/${randomTopic}`, {
      method: 'PUT',
      body: blob,
      headers: {
        Filename: filename,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.attachment && data.attachment.url) {
        return data.attachment.url;
      }
    }
  } catch (err) {
    console.warn('ntfy.sh upload provider skipped:', err);
  }

  return null;
}
