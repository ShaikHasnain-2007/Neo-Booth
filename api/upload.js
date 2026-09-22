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
    // Use ImgBB for clean, ad-free image hosting without redirects
    form.append('key', '32700e1215b22bbf58514eb5e76ccf31'); 
    form.append('image', matches[2]); // ImgBB accepts base64 directly
    form.append('name', filename || 'neobooth-strip');

    const upstream = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: form,
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status).json({ error: 'Upstream upload failed', details: errText });
      return;
    }

    const data = await upstream.json();
    const directUrl = data?.data?.url || data?.data?.display_url || data?.data?.image?.url;
    if (directUrl) {
      res.status(200).json({ success: true, url: directUrl });
    } else {
      res.status(500).json({ error: 'Failed to extract URL', response: data });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
}
