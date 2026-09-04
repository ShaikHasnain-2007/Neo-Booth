export default async function handler(req, res) {
  // Set CORS headers so it can be called safely
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { image, filename } = req.body || {};
    if (!image) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'Invalid data URL format' });
      return;
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const blob = new Blob([buffer], { type: mimeType });

    const form = new FormData();
    form.append('key', '6d207e02198a847aa98d0a2a901485a5');
    form.append('action', 'upload');
    form.append('format', 'json');
    form.append('source', blob, filename || 'neobooth-strip.jpg');

    const upstream = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      body: form,
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status).json({ error: 'Upstream upload failed', details: errText });
      return;
    }

    const data = await upstream.json();
    if (data && data.image && data.image.url) {
      res.status(200).json({ success: true, url: data.image.url });
    } else {
      res.status(500).json({ error: 'Failed to extract URL', response: data });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
}
