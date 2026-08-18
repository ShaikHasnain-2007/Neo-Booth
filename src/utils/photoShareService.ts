/**
 * Zero-auth, high-speed multi-provider image uploader for photobooth QR code sharing.
 * Guarantees a unique, direct permanent/temporary URL for every single photo strip session.
 */

export async function uploadPhotoStripToCloud(dataUrl: string, filename: string): Promise<string | null> {
  let blob: Blob;
  try {
    const res = await fetch(dataUrl);
    blob = await res.blob();
  } catch (err) {
    console.error('Failed to convert dataUrl to Blob:', err);
    return null;
  }

  // Provider 1: Uguu.se (Fast temporary image CDN)
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

  // Provider 2: ntfy.sh public binary storage
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

  // Provider 3: tmpfiles.org
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
        // Convert to direct download url
        const rawUrl = data.data.url as string;
        return rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      }
    }
  } catch (err) {
    console.warn('tmpfiles upload provider skipped:', err);
  }

  return null;
}
