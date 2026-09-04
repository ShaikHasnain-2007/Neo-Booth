import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function apiUploadPlugin(): Plugin {
  return {
    name: 'api-upload-handler',
    configureServer(server) {
      server.middlewares.use('/api/upload', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const chunks: Uint8Array[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const bodyText = Buffer.concat(chunks).toString('utf-8');
            const { image, filename } = JSON.parse(bodyText);
            const matches = image?.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
            if (!matches) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid data URL' }));
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
            const data = (await upstream.json()) as { image?: { url?: string } };
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ success: true, url: data?.image?.url }));
          } catch (err: unknown) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Upload failed' }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiUploadPlugin()],
});

