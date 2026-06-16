# Master Replication Prompt for NEO.BOOTH Photobooth

You can copy the entire prompt below and paste it into a new conversation with Antigravity on your other computer. It contains every single file, configuration, and setup command required to build and run the photobooth website from scratch.

***

```markdown
Role: Senior Frontend Developer & UI/UX Expert
Task: Replicate the NEO.BOOTH Y2K Retro Photobooth website exactly from scratch in the current workspace.

Please follow these instructions step-by-step to create all project configuration files, components, stylesheet configurations, utility engines, and set up the development server.

---

### Step 1: Project Initialization & Dependency Installation

1. First, create or overwrite the project configurations to set up a Vite + React + TypeScript + PostCSS + TailwindCSS project.
2. Install the required dependencies:
   - `framer-motion` for transitions and animations
   - `lucide-react` for retro iconography
   - `qrcode.react` for future QR integrations
   - `tailwindcss` and `@tailwindcss/postcss` for Tailwind v4 utility styles
   - `autoprefixer` and `postcss` for CSS autoprefixing

Write the following configuration files:

#### File: `package.json`
```json
{
  "name": "photobooth",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "framer-motion": "^12.40.0",
    "lucide-react": "^1.17.0",
    "qrcode.react": "^4.2.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@tailwindcss/postcss": "^4.3.0",
    "@types/node": "^24.12.3",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "autoprefixer": "^10.5.0",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "postcss": "^8.5.15",
    "tailwindcss": "^4.3.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.59.2",
    "vite": "^8.0.12"
  }
}
```

#### File: `postcss.config.js`
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

#### File: `vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

#### File: `tsconfig.json`
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

#### File: `tsconfig.app.json`
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

#### File: `tsconfig.node.json`
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

#### File: `eslint.config.js`
```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
```

#### File: `.gitignore`
```text
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

.vercel
```

---

### Step 2: HTML & Stylesheet Configurations

Write the entry HTML page and CSS design token configurations for TailwindCSS v4 with the appropriate fonts, keyframes, custom grid layers, and scanlines.

#### File: `index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📸</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="NEO.BOOTH is a browser-based retro photobooth app featuring customizable color frames, Y2K aesthetics, live filters, date stamps, direct PNG download, and instant QR code saving." />
    <meta name="keywords" content="photobooth, retro, Y2K, camera, online photobooth, photo strip, React, Tailwind, canvas, qr code" />
    <meta name="author" content="Antigravity Dev" />
    <title>NEO.BOOTH // Interactive Y2K Retro Photobooth</title>
  </head>
  <body class="bg-cream-50">
    <div id="root" class="min-h-screen"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### File: `src/index.css`
```css
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Space+Grotesk:wght@400;500;700&display=swap');

@import "tailwindcss";

@theme {
  --font-sans: 'Space Grotesk', 'Inter', sans-serif;
  --font-mono: 'Share Tech Mono', 'Courier New', monospace;

  --color-sage-50: #f4f7f4;
  --color-sage-100: #e6ede6;
  --color-sage-200: #cfdec0;
  --color-sage-300: #a3be91;
  --color-sage-400: #7e9e6e;
  --color-sage-500: #628153;
  --color-sage-600: #4c6540;

  --color-pastelpink-50: #fff5f6;
  --color-pastelpink-100: #ffebeeff;
  --color-pastelpink-200: #ffd6de;
  --color-pastelpink-300: #ffa3b5;
  --color-pastelpink-400: #ff708d;
  --color-pastelpink-500: #ff3d66;

  --color-maroon-50: #faf2f3;
  --color-maroon-800: #5c0617;
  --color-maroon-900: #3d020d;

  --color-cream-50: #fbfbf9;
  --color-cream-100: #f5f4f0;
  --color-cream-200: #eae8e1;
  --color-cream-900: #1b1b19;

  --shadow-neo: 4px 4px 0px 0px rgba(0, 0, 0, 1);
  --shadow-neo-sm: 2px 2px 0px 0px rgba(0, 0, 0, 1);
  --shadow-neo-lg: 8px 8px 0px 0px rgba(0, 0, 0, 1);
  --shadow-neo-white: 4px 4px 0px 0px rgba(255, 255, 255, 1);
}

body {
  background-color: var(--color-cream-50);
  color: var(--color-cream-900);
  font-family: var(--font-sans);
  overflow-x: hidden;
}

::selection {
  background-color: var(--color-pastelpink-200);
  color: var(--color-pastelpink-500);
}

@keyframes flash-animation {
  0% {
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.camera-flash {
  animation: flash-animation 0.5s ease-out forwards;
}

.y2k-grid {
  background-image: 
    linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
}

.y2k-grid-dark {
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background-color: var(--color-cream-100);
}

::-webkit-scrollbar-thumb {
  background-color: var(--color-cream-900);
  border: 2px solid var(--color-cream-100);
}

.bg-scanlines {
  background: linear-gradient(
    rgba(18, 16, 16, 0) 50%, 
    rgba(0, 0, 0, 0.35) 50%
  );
  background-size: 100% 4px;
}
```

#### File: `src/main.tsx`
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

### Step 3: Application Utilities

Create the utilities directory and add the custom `audioEngine` (synthesized Web Audio API sound effects for shutter, countdown beeps, button clicks) and the `canvasStitcher` (custom HTML5 Canvas rendering engine for filters, overlays, stamps, stickers, chromatic aberration, film grain).

#### File: `src/utils/audioEngine.ts`
```typescript
let audioCtx: AudioContext | null = null;
let soundEnabled = true;

const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
};

export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};

export const playBeep = (freq = 800, duration = 0.1) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Audio play failed:', err);
  }
};

export const playClick = () => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (err) {
    console.warn('Audio play failed:', err);
  }
};

export const playShutter = () => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    const synthOsc = ctx.createOscillator();
    const synthGain = ctx.createGain();
    
    synthOsc.type = 'sine';
    synthOsc.frequency.setValueAtTime(3000, ctx.currentTime);
    synthOsc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.04);
    
    synthGain.gain.setValueAtTime(0.05, ctx.currentTime);
    synthGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    synthOsc.connect(synthGain);
    synthGain.connect(ctx.destination);

    noiseNode.start();
    synthOsc.start();
    
    noiseNode.stop(ctx.currentTime + 0.15);
    synthOsc.stop(ctx.currentTime + 0.04);
  } catch (err) {
    console.warn('Shutter sound play failed:', err);
  }
};
```

#### File: `src/utils/canvasStitcher.ts`
```typescript
export interface StickerInstance {
  id: string;
  type: string;
  text?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface StitchOptions {
  layout: 'vertical-4' | 'vertical-3' | 'vertical-2' | 'grid-6' | 'traditional-4';
  backgroundColor: string;
  filter: 'none' | 'grayscale' | 'sepia' | 'high-contrast' | 'vintage' | 'analog-film' | 'custom';
  customR?: number;
  customG?: number;
  customB?: number;
  customBrightness?: number;
  showDate: boolean;
  dateStr?: string;
  isMirrored?: boolean;
  downloadFormat: 'png' | 'jpg';
  pattern?: 'none' | 'checkerboard' | 'stars' | 'cherries' | 'hologradient';
  grainStrength?: number;
  chromaticOffset?: number;
  vhsOverlay?: boolean;
  stickers?: StickerInstance[];
}

export function getPhotoCountForLayout(layout: StitchOptions['layout']): number {
  switch (layout) {
    case 'vertical-2':
      return 2;
    case 'vertical-3':
      return 3;
    case 'grid-6':
      return 6;
    case 'vertical-4':
    case 'traditional-4':
    default:
      return 4;
  }
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

const applyFilterToContext = (
  ctx: CanvasRenderingContext2D,
  filter: StitchOptions['filter']
) => {
  switch (filter) {
    case 'grayscale':
      ctx.filter = 'grayscale(100%)';
      break;
    case 'sepia':
      ctx.filter = 'sepia(85%) contrast(95%) saturate(120%)';
      break;
    case 'high-contrast':
      ctx.filter = 'contrast(150%) brightness(90%) grayscale(100%)';
      break;
    case 'vintage':
      ctx.filter = 'contrast(110%) brightness(105%) saturate(130%) hue-rotate(-10deg)';
      break;
    case 'analog-film':
      ctx.filter = 'contrast(112%) brightness(108%) saturate(78%) sepia(30%) hue-rotate(14deg)';
      break;
    case 'none':
    default:
      ctx.filter = 'none';
      break;
  }
};

const getEmojiForSticker = (type: string): string | null => {
  switch (type) {
    case 'heart': return '💖';
    case 'star': return '⭐';
    case 'sparkles': return '✨';
    case 'cherry': return '🍒';
    case 'sunglasses': return '🕶️';
    case 'butterfly': return '🦋';
    case 'alien': return '👾';
    case 'flower': return '🌸';
    case 'lightning': return '⚡';
    case 'teddy': return '🧸';
    default: return null;
  }
};

const getBadgeTextForSticker = (type: string): string | null => {
  switch (type) {
    case 'badge-cute': return 'CUTE';
    case 'badge-y2k': return 'Y2K';
    case 'badge-cool': return 'COOL';
    case 'badge-baby': return 'BABY';
    default: return null;
  }
};

function applyCustomPixelAdjustments(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  options: StitchOptions
) {
  if (options.filter !== 'custom') return;

  const rVal = options.customR ?? 0;
  const gVal = options.customG ?? 0;
  const bVal = options.customB ?? 0;
  const rawBrightness = options.customBrightness ?? 0;

  try {
    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;
    const brightnessMult = 1.0 + (rawBrightness / 100) * 0.4;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] + rVal;
      let g = data[i + 1] + gVal;
      let b = data[i + 2] + bVal;

      r = r * brightnessMult;
      g = g * brightnessMult;
      b = b * brightnessMult;

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    ctx.putImageData(imgData, x, y);
  } catch (err) {
    console.error('Custom filter adjustment failed:', err);
  }

  if (rawBrightness > 0) {
    const glowStrength = rawBrightness / 100;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
      
      ctx.save();
      ctx.translate(x, y);
      ctx.filter = 'blur(16px) brightness(120%)';
      ctx.globalAlpha = glowStrength * 0.45;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
    }
  }
}

function isColorDark(hex: string): boolean {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return false;
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

const drawCheckerboard = (ctx: CanvasRenderingContext2D, w: number, h: number, swatchColor: string) => {
  const size = 60;
  ctx.save();
  ctx.fillStyle = swatchColor;
  ctx.fillRect(0, 0, w, h);
  
  ctx.fillStyle = isColorDark(swatchColor) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
        ctx.fillRect(x, y, size, size);
      }
    }
  }
  ctx.restore();
};

const drawStarShape = (ctx: CanvasRenderingContext2D, cx: number, cy: number, innerRadius: number, outerRadius: number, spikes = 4) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
};

const drawStars = (ctx: CanvasRenderingContext2D, w: number, h: number, swatchColor: string) => {
  ctx.save();
  ctx.fillStyle = swatchColor;
  ctx.fillRect(0, 0, w, h);
  
  const starColor = isColorDark(swatchColor) ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)';
  ctx.fillStyle = starColor;
  
  for (let y = 40; y < h; y += 120) {
    for (let x = 40; x < w; x += 120) {
      const shiftX = ((x * y) % 60) - 30;
      const shiftY = ((x + y) % 60) - 30;
      drawStarShape(ctx, x + shiftX, y + shiftY, 6, 15, 4);
    }
  }
  ctx.restore();
};

const drawSingleCherry = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  ctx.save();
  
  ctx.beginPath();
  ctx.strokeStyle = '#2D6A4F';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx - 10, cy + 15, cx - 15, cy + 25, cx - 15, cy + 30);
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx + 10, cy + 10, cx + 15, cy + 25, cx + 15, cy + 30);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = '#52B788';
  ctx.ellipse(cx - 5, cy + 8, 8, 4, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2D6A4F';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#D90429';
  ctx.beginPath();
  ctx.arc(cx - 15, cy + 34, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 15, cy + 34, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx - 12, cy + 30, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 18, cy + 30, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawCherries = (ctx: CanvasRenderingContext2D, w: number, h: number, swatchColor: string) => {
  ctx.save();
  ctx.fillStyle = swatchColor;
  ctx.fillRect(0, 0, w, h);
  
  for (let y = 60; y < h; y += 180) {
    for (let x = 60; x < w; x += 180) {
      const shiftX = ((x * y) % 80) - 40;
      const shiftY = ((x + y) % 80) - 40;
      drawSingleCherry(ctx, x + shiftX, y + shiftY);
    }
  }
  ctx.restore();
};

const drawHoloGradient = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#FFD6DE');
  grad.addColorStop(0.3, '#E6E6FA');
  grad.addColorStop(0.6, '#D4F0FC');
  grad.addColorStop(1, '#CFDEC0');
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};

const drawVHSOverlay = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px "Share Tech Mono", "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#FF3B30';
  ctx.beginPath();
  ctx.arc(60, 56, 8, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('REC', 78, 44);
  ctx.fillText('0:02:14', 60, 78);

  ctx.textAlign = 'right';
  ctx.fillText('▲ PLAY', w - 60, 44);
  ctx.fillText('SP', w - 60, 78);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.strokeRect(w - 200, 48, 40, 20);
  ctx.fillRect(w - 160, 54, 4, 8);
  ctx.fillRect(w - 196, 52, 10, 12);
  ctx.fillRect(w - 184, 52, 10, 12);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 1.5);
  }
  ctx.restore();
};

function applyChromaticAberration(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const original = new Uint8ClampedArray(data);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        const rx = Math.max(0, Math.min(w - 1, x - offset));
        const rIdx = (y * w + rx) * 4;
        data[idx] = original[rIdx];

        const bx = Math.max(0, Math.min(w - 1, x + offset));
        const bIdx = (y * w + bx) * 4;
        data[idx + 2] = original[bIdx + 2];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.error('Chromatic aberration failed:', err);
  }
}

function applyFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const factor = (strength / 100) * 35;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() * 2 - 1) * factor;
      
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.error('Film grain failed:', err);
  }
}

export async function stitchPhotos(
  images: string[],
  options: StitchOptions
): Promise<string> {
  const neededPhotos = getPhotoCountForLayout(options.layout);
  if (images.length < neededPhotos) {
    throw new Error(`Need at least ${neededPhotos} images to stitch for layout ${options.layout}`);
  }

  const loadedImages = await Promise.all(images.slice(0, neededPhotos).map(loadImage));

  const pW = 800;
  const pH = 600;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context');
  }

  const padding = 40;
  const gap = 30;
  const bottomExtra = options.showDate ? 130 : padding;

  const isTraditional = options.layout === 'traditional-4';
  const finalBgColor = isTraditional ? '#000000' : options.backgroundColor;

  if (isTraditional) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    switch (options.pattern) {
      case 'checkerboard':
        drawCheckerboard(ctx, canvas.width, canvas.height, finalBgColor);
        break;
      case 'stars':
        drawStars(ctx, canvas.width, canvas.height, finalBgColor);
        break;
      case 'cherries':
        drawCherries(ctx, canvas.width, canvas.height, finalBgColor);
        break;
      case 'hologradient':
        drawHoloGradient(ctx, canvas.width, canvas.height);
        break;
      case 'none':
      default:
        ctx.fillStyle = finalBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
    }
  }

  if (options.layout === 'grid-6') {
    canvas.width = pW * 2 + padding * 2 + gap;
    canvas.height = pH * 3 + padding * 2 + gap * 2 + bottomExtra;

    if (options.pattern === 'checkerboard') drawCheckerboard(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'stars') drawStars(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'cherries') drawCherries(ctx, canvas.width, canvas.height, finalBgColor);
    else if (options.pattern === 'hologradient') drawHoloGradient(ctx, canvas.width, canvas.height);
    else {
      ctx.fillStyle = finalBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (let i = 0; i < 6; i++) {
      const img = loadedImages[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = padding + col * (pW + gap);
      const y = padding + row * (pH + gap);

      ctx.save();
      if (options.isMirrored) {
        ctx.translate(x + pW, y);
        ctx.scale(-1, 1);
        applyFilterToContext(ctx, options.filter);
        ctx.drawImage(img, 0, 0, pW, pH);
      } else {
        ctx.translate(x, y);
        applyFilterToContext(ctx, options.filter);
        ctx.drawImage(img, 0, 0, pW, pH);
      }
      ctx.restore();

      if (options.filter === 'custom') {
        applyCustomPixelAdjustments(ctx, x, y, pW, pH, options);
      }

      if (options.filter === 'analog-film') {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(120, 160, 110, 0.06)';
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillRect(0, 0, pW, pH);
        ctx.restore();
      }
    }
  } else {
    const N = neededPhotos;
    canvas.width = pW + padding * 2;
    canvas.height = padding + pH * N + gap * (N - 1) + bottomExtra;

    if (isTraditional) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      switch (options.pattern) {
        case 'checkerboard':
          drawCheckerboard(ctx, canvas.width, canvas.height, finalBgColor);
          break;
        case 'stars':
          drawStars(ctx, canvas.width, canvas.height, finalBgColor);
          break;
        case 'cherries':
          drawCherries(ctx, canvas.width, canvas.height, finalBgColor);
          break;
        case 'hologradient':
          drawHoloGradient(ctx, canvas.width, canvas.height);
          break;
        case 'none':
        default:
          ctx.fillStyle = finalBgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;
      }
    }

    for (let i = 0; i < N; i++) {
      const img = loadedImages[i];
      const x = padding;
      const y = padding + i * (pH + gap);

      ctx.save();

      if (isTraditional) {
        const borderSize = 10;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - borderSize, y - borderSize, pW + borderSize * 2, pH + borderSize * 2);
      }

      if (options.isMirrored) {
        ctx.translate(x + pW, y);
        ctx.scale(-1, 1);
        applyFilterToContext(ctx, options.filter);
        ctx.drawImage(img, 0, 0, pW, pH);
      } else {
        ctx.translate(x, y);
        applyFilterToContext(ctx, options.filter);
        ctx.drawImage(img, 0, 0, pW, pH);
      }

      ctx.restore();

      if (options.filter === 'custom') {
        applyCustomPixelAdjustments(ctx, x, y, pW, pH, options);
      }

      if (options.filter === 'analog-film') {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(120, 160, 110, 0.06)';
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillRect(0, 0, pW, pH);
        ctx.restore();
      }
    }
  }

  if (options.showDate) {
    const today = new Date();
    const dateText = options.dateStr || today.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, ' . ');

    const timeStr = today.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const fullStamp = isTraditional 
      ? `Film No. ${Math.floor(Math.random() * 90000) + 10000}  |  ${dateText}  |  ${timeStr}`
      : `${dateText}  |  ${timeStr}`;

    ctx.save();
    const isDarkBg = isColorDark(finalBgColor);
    ctx.fillStyle = isDarkBg ? '#FFFFFF' : '#000000';
    ctx.font = 'bold 28px "Share Tech Mono", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const dateY = canvas.height - bottomExtra / 2;
    ctx.fillText(fullStamp, canvas.width / 2, dateY);
    ctx.restore();
  }

  if (options.stickers && options.stickers.length > 0) {
    for (const sticker of options.stickers) {
      const canvasX = (sticker.x / 100) * canvas.width;
      const canvasY = (sticker.y / 100) * canvas.height;

      ctx.save();
      ctx.translate(canvasX, canvasY);
      ctx.rotate((sticker.rotation * Math.PI) / 180);

      const emoji = getEmojiForSticker(sticker.type);
      const badgeText = sticker.text || getBadgeTextForSticker(sticker.type);

      if (emoji) {
        ctx.font = `${Math.round(64 * sticker.scale)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);
      } else if (badgeText) {
        ctx.font = `900 ${Math.round(48 * sticker.scale)}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10 * sticker.scale;
        ctx.lineJoin = 'round';
        ctx.strokeText(badgeText, 0, 0);

        if (sticker.type.startsWith('badge-cute')) ctx.fillStyle = '#FFD6DE';
        else if (sticker.type.startsWith('badge-y2k')) ctx.fillStyle = '#00FFCC';
        else if (sticker.type.startsWith('badge-cool')) ctx.fillStyle = '#CFDEC0';
        else if (sticker.type.startsWith('badge-baby')) ctx.fillStyle = '#FFE5B4';
        else ctx.fillStyle = '#FFFFFF';

        ctx.fillText(badgeText, 0, 0);
      }

      ctx.restore();
    }
  }

  if (options.vhsOverlay) {
    drawVHSOverlay(ctx, canvas.width, canvas.height);
  }

  if (options.chromaticOffset && options.chromaticOffset > 0) {
    applyChromaticAberration(ctx, canvas.width, canvas.height, options.chromaticOffset);
  }

  let finalGrain = options.grainStrength || 0;
  if (options.filter === 'analog-film' && finalGrain < 15) {
    finalGrain = 15;
  }
  if (finalGrain > 0) {
    applyFilmGrain(ctx, canvas.width, canvas.height, finalGrain);
  }

  if (options.downloadFormat === 'jpg') {
    return canvas.toDataURL('image/jpeg', 1.0);
  } else {
    return canvas.toDataURL('image/png');
  }
}
```

---

### Step 4: UI Components

Create the `src/components` folder and write three critical elements:
1. `WebcamCapture.tsx`: Camera interfacing component featuring customizable countdowns, snap playbacks, flash animations, grid scanlines overlay, and sound trigger integrations.
2. `CustomizationBar.tsx`: Core controller layout facilitating frame background selections (colors/patterns), pixel filter settings, grain + chromatic inputs, text badge creations, sound toggle keys, and stickers dashboard.
3. `ExportPanel.tsx`: Handles file conversions (lossless PNG vs JPEG 100% max quality) and instant local downloading.

#### File: `src/components/WebcamCapture.tsx`
```typescript
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBeep, playShutter, playClick } from '../utils/audioEngine';

interface WebcamCaptureProps {
  onCaptureComplete: (photos: string[]) => void;
  photoCount: number;
  isTraditional?: boolean;
}

type CapturePhase = 'idle' | 'countdown' | 'flash' | 'intermission';

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCaptureComplete, photoCount, isTraditional }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState('');

  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [countdown, setCountdown] = useState(3);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const photosRef = useRef<string[]>([]);
  const [photosTaken, setPhotosTaken] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startWebcam = async () => {
    setErrorMessage('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setPermissionState('granted');
    } catch (err: any) {
      console.error('Webcam access error:', err);
      setPermissionState('denied');
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please enable camera permissions in your browser settings.'
          : 'Could not access camera. Please check if another app is using it.'
      );
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startWebcam();
    return () => {
      stopWebcam();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (permissionState === 'granted' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => {
        console.error("Video play failed in mount effect:", err);
      });
    }
  }, [permissionState]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return null;

    const canvas = document.createElement('canvas');
    const targetW = 800;
    const targetH = 600;
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    const videoAspectRatio = videoWidth / videoHeight;
    const targetAspectRatio = targetW / targetH;

    let sWidth = videoWidth;
    let sHeight = videoHeight;
    let sx = 0;
    let sy = 0;

    if (videoAspectRatio > targetAspectRatio) {
      sWidth = videoHeight * targetAspectRatio;
      sx = (videoWidth - sWidth) / 2;
    } else {
      sHeight = videoWidth / targetAspectRatio;
      sy = (videoHeight - sHeight) / 2;
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/png');
  }, []);

  const runCountdownForPhoto = useCallback((index: number) => {
    setPhotoIndex(index);
    setCountdown(countdownDuration);
    setPhase('countdown');

    let count = countdownDuration;
    playBeep(800, 0.08);
    
    intervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playBeep(800, 0.08);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;

        setPhase('flash');
        setShowFlash(true);
        playShutter();

        const photo = captureFrame();

        timerRef.current = setTimeout(() => {
          setShowFlash(false);

          if (photo) {
            photosRef.current = [...photosRef.current, photo];
            setPhotosTaken([...photosRef.current]);
          }

          const nextIndex = index + 1;
          if (nextIndex < photoCount) {
            setPhase('intermission');
            timerRef.current = setTimeout(() => {
              runCountdownForPhoto(nextIndex);
            }, 2500);
          } else {
            setPhase('intermission');
            timerRef.current = setTimeout(() => {
              setPhase('idle');
              onCaptureComplete(photosRef.current);
            }, 1200);
          }
        }, 200);
      }
    }, 1000);
  }, [captureFrame, onCaptureComplete, countdownDuration, photoCount]);

  const startPhotoSession = () => {
    playClick();
    photosRef.current = [];
    setPhotosTaken([]);
    runCountdownForPhoto(0);
  };

  const isActive = phase !== 'idle';

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto">
      <div className={`relative w-full aspect-[4/3] border-4 rounded-2xl shadow-neo overflow-hidden transition-all duration-300 ${isTraditional ? 'bg-black border-zinc-950' : 'bg-cream-900 border-cream-900'}`}>

        {permissionState === 'prompt' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-100 p-6">
            <RefreshCw className="w-12 h-12 mb-4 animate-spin text-pastelpink-400" />
            <p className="text-xl font-bold uppercase tracking-wider">Accessing Camera...</p>
          </div>
        )}

        {permissionState === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-100 p-6 bg-red-950/20 backdrop-blur-sm">
            <AlertTriangle className="w-16 h-16 mb-4 text-pastelpink-400" />
            <h3 className="text-xl font-bold uppercase tracking-wider mb-2 text-pastelpink-400">Camera Access Blocked</h3>
            <p className="text-center text-sm text-cream-200 max-w-md mb-6">{errorMessage}</p>
            <button
              onClick={startWebcam}
              className="px-6 py-2 bg-cream-50 text-cream-900 border-2 border-cream-900 rounded-xl font-bold uppercase hover:bg-pastelpink-100 hover:text-pastelpink-500 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {permissionState === 'granted' && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={(e) => {
                e.currentTarget.play().catch(err => console.error("Video play failed:", err));
              }}
              className="w-full h-full object-cover scale-x-[-1] relative z-10"
            />

            <div 
              style={{ textShadow: '1.5px 1.5px 2px rgba(0,0,0,0.95)' }}
              className="absolute inset-0 z-30 pointer-events-none p-4 flex flex-col justify-between font-mono text-[11px] text-white uppercase"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                    REC
                  </div>
                  <span className="text-[9px] opacity-75 font-semibold">0:02:14</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <div className="border border-white w-9 h-4 p-0.5 rounded-sm relative flex items-center gap-0.5">
                    <div className="bg-white h-full w-2.5" />
                    <div className="bg-white h-full w-2.5" />
                    <div className="absolute top-1 -right-1.5 w-1 h-2 bg-white rounded-r-sm" />
                  </div>
                  <span className="text-[9px] font-bold">85%</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div className="flex flex-col text-[9px] font-semibold opacity-85">
                  <span>AM 12:45</span>
                  <span>JUN. 09 2026</span>
                </div>
                
                <div className="flex flex-col text-[9px] items-end font-bold opacity-80">
                  <span>▲ PLAY</span>
                  <span>SP</span>
                </div>
              </div>

              <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.03]" />
            </div>

            <AnimatePresence>
              {showFlash && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 bg-white z-50 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {phase === 'countdown' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 z-40"
                >
                  <p className="text-white text-sm font-bold uppercase tracking-widest mb-2 font-mono">
                    Pose {photoIndex + 1} of {photoCount}
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={countdown}
                      initial={{ opacity: 0, scale: 0.3 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.8 }}
                      transition={{ duration: 0.3 }}
                      className="text-[140px] font-mono font-black text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)] select-none leading-none"
                    >
                      {countdown}
                    </motion.span>
                  </AnimatePresence>
                  <p className="text-white/70 text-xs font-mono uppercase tracking-widest mt-4">
                    Get ready!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {phase === 'intermission' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/15 z-40"
                >
                  <motion.div
                    initial={{ scale: 0.5, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-9 h-9 text-white" />
                    </div>
                    <p className="text-white text-2xl font-bold uppercase tracking-wider">
                      Photo {photoIndex + 1} Saved!
                    </p>
                    {photoIndex + 1 < photoCount ? (
                      <p className="text-white/70 text-sm font-mono uppercase tracking-widest">
                        Get ready for pose {photoIndex + 2}...
                      </p>
                    ) : (
                      <p className="text-white/70 text-sm font-mono uppercase tracking-widest">
                        All done! Creating your strip...
                      </p>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {isActive && photosTaken.length > 0 && (
              <div className="absolute top-4 right-4 flex gap-2 z-30">
                {photosTaken.map((photo, i) => (
                  <motion.div
                    initial={{ scale: 0, y: -20 }}
                    animate={{ scale: 1, y: 0 }}
                    key={i}
                    className="w-12 h-9 border-2 border-white/60 rounded overflow-hidden shadow-md bg-black/40"
                  >
                    <img src={photo} alt={`Pose ${i + 1}`} className="w-full h-full object-cover" />
                  </motion.div>
                ))}
              </div>
            )}

            <div className={`absolute bottom-4 left-4 right-4 backdrop-blur-sm border-2 rounded-xl px-4 py-2 flex items-center justify-between z-30 shadow-neo-sm ${isTraditional ? 'bg-zinc-900/95 text-white border-zinc-700' : 'bg-cream-50/90 text-cream-900 border-cream-900'}`}>
              <span className={`font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${isTraditional ? 'text-white' : 'text-cream-900'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                {isActive ? `Photo ${photoIndex + 1} of ${photoCount}` : 'Ready to shoot'}
              </span>
              <span className={`font-mono text-xs font-bold ${isTraditional ? 'text-white/80' : 'text-cream-900'}`}>
                {photosTaken.length} / {photoCount} captured
              </span>
            </div>
          </>
        )}
      </div>

      {permissionState === 'granted' && (
        <div className="mt-8 flex flex-col items-center gap-6 w-full">
          {!isActive && (
            <div className="flex flex-col items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider ${isTraditional ? 'text-zinc-400' : 'text-cream-800/80'}`}>
                Countdown Delay
              </span>
              <div className="flex gap-2 p-1.5 bg-cream-100/50 border-2 border-cream-900 rounded-xl">
                {[3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      playClick();
                      setCountdownDuration(sec);
                    }}
                    className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
                      countdownDuration === sec
                        ? 'bg-pastelpink-300 text-cream-900 border-2 border-cream-900 shadow-neo-sm translate-x-[-1px] translate-y-[-1px]'
                        : 'text-cream-800 hover:bg-cream-200/50 border-2 border-transparent'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isActive ? (
            <button
              onClick={startPhotoSession}
              className="flex items-center gap-3 px-8 py-4 bg-pastelpink-200 text-cream-900 border-3 border-cream-900 rounded-2xl font-bold text-xl uppercase tracking-wide hover:bg-pastelpink-300 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group"
            >
              <Camera className="w-6 h-6 transition-transform group-hover:rotate-12" />
              Start Photo Session
            </button>
          ) : (
            <div className="px-6 py-3 bg-cream-100 border-2 border-cream-900 rounded-xl font-bold uppercase tracking-wider animate-pulse flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Photoshoot in progress...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### File: `src/components/CustomizationBar.tsx`
```typescript
import React, { useState } from 'react';
import { Calendar, FlipHorizontal, Eye, Smile, Trash2, Sliders, Volume2, VolumeX, Type, Layers, Check } from 'lucide-react';
import type { StitchOptions, StickerInstance } from '../utils/canvasStitcher';

interface CustomizationBarProps {
  options: StitchOptions;
  onChange: (options: StitchOptions) => void;
  stickers: StickerInstance[];
  selectedStickerId: string | null;
  onAddSticker: (type: string) => void;
  onUpdateSticker: (id: string, updates: Partial<StickerInstance>) => void;
  onDeleteSticker: (id: string) => void;
  onClearStickers: () => void;
  onAddCustomTextSticker: (text: string, style: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const colorSwatches = [
  { name: 'White', value: '#FFFFFF', class: 'bg-white border-cream-200' },
  { name: 'Pitch Black', value: '#18181B', class: 'bg-zinc-900 border-zinc-700' },
  { name: 'Maroon Red', value: '#5C0617', class: 'bg-[#5C0617] border-[#3D020D]' },
  { name: 'Pastel Pink', value: '#FFD6DE', class: 'bg-[#FFD6DE] border-[#FFA3B5]' },
  { name: 'Sage Green', value: '#CFDEC0', class: 'bg-[#CFDEC0] border-[#A3BE91]' },
];

export const filterOptions = [
  { id: 'none', name: 'Normal' },
  { id: 'grayscale', name: 'B&W Retro' },
  { id: 'sepia', name: 'Warm Sepia' },
  { id: 'high-contrast', name: 'Noir Contrast' },
  { id: 'vintage', name: 'Y2K Vintage' },
  { id: 'analog-film', name: 'Analog Film' },
  { id: 'custom', name: 'Custom Mix' },
] as const;

export const patternOptions = [
  { id: 'none', name: 'Solid Frame' },
  { id: 'checkerboard', name: 'Checkerboard' },
  { id: 'stars', name: 'Y2K Stars' },
  { id: 'cherries', name: 'Cherries' },
  { id: 'hologradient', name: 'Holo Gradient' },
] as const;

export const stickersList = [
  { id: 'heart', emoji: '💖', label: 'Heart', type: 'emoji' },
  { id: 'star', emoji: '⭐', label: 'Star', type: 'emoji' },
  { id: 'sparkles', emoji: '✨', label: 'Sparkle', type: 'emoji' },
  { id: 'cherry', emoji: '🍒', label: 'Cherry', type: 'emoji' },
  { id: 'sunglasses', emoji: '🕶️', label: 'Shades', type: 'emoji' },
  { id: 'butterfly', emoji: '🦋', label: 'Butterfly', type: 'emoji' },
  { id: 'alien', emoji: '👾', label: 'Alien', type: 'emoji' },
  { id: 'flower', emoji: '🌸', label: 'Flower', type: 'emoji' },
  { id: 'lightning', emoji: '⚡', label: 'Volt', type: 'emoji' },
  { id: 'teddy', emoji: '🧸', label: 'Teddy', type: 'emoji' },
];

export const badgeStylesList = [
  { id: 'badge-cute', name: 'Cute Pink', bg: '#FFD6DE' },
  { id: 'badge-y2k', name: 'Y2K Cyan', bg: '#00FFCC' },
  { id: 'badge-cool', name: 'Cool Sage', bg: '#CFDEC0' },
  { id: 'badge-baby', name: 'Baby Peach', bg: '#FFE5B4' },
];

export const CustomizationBar: React.FC<CustomizationBarProps> = ({
  options,
  onChange,
  stickers,
  selectedStickerId,
  onAddSticker,
  onUpdateSticker,
  onDeleteSticker,
  onClearStickers,
  onAddCustomTextSticker,
  soundEnabled,
  onToggleSound,
}) => {
  const [customText, setCustomText] = useState('');
  const [customTextStyle, setCustomTextStyle] = useState('badge-cute');

  const updateOption = <K extends keyof StitchOptions>(key: K, value: StitchOptions[K]) => {
    onChange({
      ...options,
      [key]: value,
    });
  };

  const selectedSticker = stickers.find((s) => s.id === selectedStickerId);
  const isTraditional = options.layout === 'traditional-4';
  const showColorPicker = !isTraditional && options.pattern !== 'hologradient';

  const getLayoutLabel = (layout: string) => {
    switch (layout) {
      case 'vertical-2': return '2-Pose Vertical Strip';
      case 'vertical-3': return '3-Pose Vertical Strip';
      case 'grid-6': return '6-Pose Grid Strip';
      case 'traditional-4': return 'Traditional Filmstrip';
      case 'vertical-4':
      default: return '4-Pose Vertical Strip';
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 bg-white border-3 border-cream-900 rounded-2xl shadow-neo max-h-[85vh] overflow-y-auto">
      <h3 className="text-xl font-bold uppercase tracking-wider border-b-2 border-cream-100 pb-2 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-pastelpink-500" />
          Customize Strip
        </span>
      </h3>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-mono uppercase tracking-widest text-cream-400">Current Layout</span>
        <div className="px-3 py-2 bg-cream-50 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase text-cream-900">
          {getLayoutLabel(options.layout)}
        </div>
      </div>

      {!isTraditional && (
        <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3">
          <span className="text-sm font-bold uppercase tracking-wider text-cream-600 flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Frame Design
          </span>
          
          <div className="flex flex-wrap gap-2">
            {patternOptions.map((pat) => (
              <button
                key={pat.id}
                onClick={() => updateOption('pattern', pat.id)}
                className={`px-3 py-1.5 border-2 border-cream-900 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer ${
                  options.pattern === pat.id
                    ? 'bg-cream-900 text-white shadow-none translate-x-[1px] translate-y-[1px]'
                    : 'bg-cream-50 hover:bg-cream-100'
                }`}
              >
                {pat.name}
              </button>
            ))}
          </div>

          {showColorPicker && (
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[10px] font-mono uppercase text-cream-400">Base Frame Color</span>
              <div className="flex flex-wrap gap-2.5">
                {colorSwatches.map((swatch) => (
                  <button
                    key={swatch.value}
                    onClick={() => updateOption('backgroundColor', swatch.value)}
                    title={swatch.name}
                    className={`w-8 h-8 rounded-full border-2 border-cream-900 shadow-neo-sm transition-all hover:scale-105 cursor-pointer ${swatch.class} ${
                      options.backgroundColor.toLowerCase() === swatch.value.toLowerCase()
                        ? 'ring-4 ring-pastelpink-300 scale-105'
                        : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t-2 border-cream-100 pt-3">
        <span className="text-sm font-bold uppercase tracking-wider text-cream-600">Photo Effects</span>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((filter) => (
            <button
              key={filter.id}
              onClick={() => updateOption('filter', filter.id)}
              className={`px-3 py-1.5 border-2 border-cream-900 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer ${
                options.filter === filter.id
                  ? 'bg-cream-900 text-white shadow-none translate-x-[1px] translate-y-[1px]'
                  : 'bg-cream-50 hover:bg-cream-100'
              }`}
            >
              {filter.name}
            </button>
          ))}
        </div>
      </div>

      {options.filter === 'custom' && (
        <div className="flex flex-col gap-3 p-3 bg-cream-50/50 border-2 border-cream-900 rounded-xl">
          <span className="text-xs font-mono uppercase tracking-widest text-cream-500">Custom Filter Sliders</span>
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
              <span className="text-red-500 font-bold">Red Tint</span>
              <span>{options.customR ?? 0}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={options.customR ?? 0}
              onChange={(e) => updateOption('customR', parseInt(e.target.value))}
              className="w-full accent-red-500 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
              <span className="text-green-600 font-bold">Green Tint</span>
              <span>{options.customG ?? 0}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={options.customG ?? 0}
              onChange={(e) => updateOption('customG', parseInt(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
              <span className="text-blue-500 font-bold">Blue Tint</span>
              <span>{options.customB ?? 0}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={options.customB ?? 0}
              onChange={(e) => updateOption('customB', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
              <span className="text-cream-950 font-bold">Brightness & Glow</span>
              <span>{options.customBrightness ?? 0}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={options.customBrightness ?? 0}
              onChange={(e) => updateOption('customBrightness', parseInt(e.target.value))}
              className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3">
        <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-pastelpink-500" />
          Lens & Glitch Filters
        </span>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-cream-600">
            <span>Film Grain / Noise</span>
            <span>{options.grainStrength}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={options.grainStrength || 0}
            onChange={(e) => updateOption('grainStrength', parseInt(e.target.value))}
            className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-cream-600">
            <span>3D Chromatic Offset</span>
            <span>{options.chromaticOffset || 0}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={options.chromaticOffset || 0}
            onChange={(e) => updateOption('chromaticOffset', parseInt(e.target.value))}
            className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <label className="flex items-center justify-between cursor-pointer group mt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cream-950">Stamp VHS Camcorder HUD</span>
          </div>
          <input
            type="checkbox"
            checked={!!options.vhsOverlay}
            onChange={(e) => updateOption('vhsOverlay', e.target.checked)}
            className="w-4 h-4 border-2 border-cream-900 rounded focus:ring-0 text-cream-900 accent-cream-900 cursor-pointer"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3">
        <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
          <Type className="w-4 h-4 text-pastelpink-500" />
          Create Text Sticker
        </span>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="TYPE STICKER TEXT..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (customText.trim()) {
                    onAddCustomTextSticker(customText, customTextStyle);
                    setCustomText('');
                  }
                }
              }}
              maxLength={15}
              className="flex-1 px-3 py-2 border-2 border-cream-900 rounded-xl text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-pink-500"
            />
            <button
              type="button"
              onClick={() => {
                if (customText.trim()) {
                  onAddCustomTextSticker(customText, customTextStyle);
                  setCustomText('');
                }
              }}
              disabled={!customText.trim()}
              className="px-4 py-2 bg-cream-900 text-white font-bold text-xs uppercase rounded-xl border-2 border-cream-900 hover:bg-cream-800 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Add
            </button>
          </div>
          
          <div className="flex gap-2 justify-between items-center bg-cream-50 p-2 border border-cream-200 rounded-xl">
            <span className="text-[10px] font-mono text-cream-400 uppercase">Style:</span>
            <div className="flex gap-1.5">
              {badgeStylesList.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCustomTextStyle(st.id)}
                  style={{ backgroundColor: st.bg }}
                  className={`w-5 h-5 rounded-full border border-black shadow-neo-sm relative flex items-center justify-center cursor-pointer`}
                >
                  {customTextStyle === st.id && (
                    <Check className="w-3 h-3 text-black font-black" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t-2 border-cream-100 pt-3">
        <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
          <Smile className="w-4 h-4 text-pastelpink-500" />
          Y2K Deco Stickers
        </span>

        <div className="grid grid-cols-5 gap-2 mt-1">
          {stickersList.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => onAddSticker(sticker.id)}
              title={sticker.label}
              className="w-10 h-10 border-2 border-cream-900 rounded-xl bg-cream-50 hover:bg-pastelpink-50 active:translate-y-[1px] flex items-center justify-center text-xl transition-all shadow-neo-sm cursor-pointer"
            >
              {sticker.emoji}
            </button>
          ))}
        </div>

        {selectedSticker ? (
          <div className="mt-2 p-3 bg-pastelpink-50 border-2 border-cream-900 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-cream-900">
              <span className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                Edit Selected
              </span>
              <button
                type="button"
                onClick={() => onDeleteSticker(selectedSticker.id)}
                className="text-red-600 hover:text-red-700 flex items-center gap-0.5 font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
                <span>Scale</span>
                <span>{selectedSticker.scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={selectedSticker.scale}
                onChange={(e) => onUpdateSticker(selectedSticker.id, { scale: parseFloat(e.target.value) })}
                className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cream-600">
                <span>Rotation</span>
                <span>{selectedSticker.rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={selectedSticker.rotation}
                onChange={(e) => onUpdateSticker(selectedSticker.id, { rotation: parseInt(e.target.value) })}
                className="w-full accent-cream-900 h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <p className="text-[10px] font-mono text-cream-400 mt-1 uppercase text-center leading-normal">
            ✦ Click a sticker to place it.<br />
            ✦ Drag it around on the preview strip.<br />
            ✦ Select it to resize or rotate.
          </p>
        )}

        {stickers.length > 0 && (
          <button
            onClick={onClearStickers}
            className="mt-2 w-full py-2 bg-white border-2 border-red-500 hover:bg-red-50 text-red-500 rounded-xl font-bold uppercase text-xs transition-all shadow-neo-sm hover:translate-y-[1px] cursor-pointer"
          >
            Clear All Stickers
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t-2 border-cream-100 pt-3 mt-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-cream-900 flex items-center gap-1.5">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-cream-400" />}
            Sound Effects (SFX)
          </span>
          <button
            onClick={onToggleSound}
            className={`px-3 py-1 border-2 border-cream-900 rounded-lg text-[10px] font-bold uppercase shadow-neo-sm hover:translate-y-[1px] transition-all cursor-pointer ${
              soundEnabled ? 'bg-pastelpink-200 text-cream-900' : 'bg-cream-100 text-cream-400'
            }`}
          >
            {soundEnabled ? 'On' : 'Muted'}
          </button>
        </div>

        <label className="flex items-center justify-between cursor-pointer group mt-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cream-600 group-hover:text-pastelpink-500 transition-colors" />
            <span className="text-sm font-bold uppercase tracking-wider text-cream-900">Show Date & Time</span>
          </div>
          <input
            type="checkbox"
            checked={options.showDate}
            onChange={(e) => updateOption('showDate', e.target.checked)}
            className="w-4 h-4 border-2 border-cream-900 rounded focus:ring-0 text-cream-900 accent-cream-900 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <FlipHorizontal className="w-4 h-4 text-cream-600 group-hover:text-pastelpink-500 transition-colors" />
            <span className="text-sm font-bold uppercase tracking-wider text-cream-900">Selfie Mirror Mode</span>
          </div>
          <input
            type="checkbox"
            checked={!!options.isMirrored}
            onChange={(e) => updateOption('isMirrored', e.target.checked)}
            className="w-4 h-4 border-2 border-cream-900 rounded focus:ring-0 text-cream-900 accent-cream-900 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
```

#### File: `src/components/ExportPanel.tsx`
```typescript
import React from 'react';
import { Download, Image, Check } from 'lucide-react';
import type { StitchOptions } from '../utils/canvasStitcher';

interface ExportPanelProps {
  options: StitchOptions;
  onChange: (options: StitchOptions) => void;
  dataUrl: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ options, onChange, dataUrl }) => {
  const isPng = options.downloadFormat === 'png';
  
  const setFormat = (format: 'png' | 'jpg') => {
    onChange({
      ...options,
      downloadFormat: format,
    });
  };

  const filename = `photobooth-${new Date().toISOString().slice(0, 10)}.${options.downloadFormat}`;

  return (
    <div className="flex flex-col gap-5 p-6 bg-white border-3 border-cream-900 rounded-2xl shadow-neo w-full">
      <h3 className="text-xl font-bold uppercase tracking-wider border-b-2 border-cream-100 pb-2 mb-1 flex items-center gap-2">
        <Image className="w-5 h-5 text-pastelpink-500" />
        Save Your Photos
      </h3>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-mono uppercase tracking-widest text-cream-400">Download Quality</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setFormat('png')}
            className={`flex flex-col items-start p-3 border-2 border-cream-900 rounded-xl transition-all font-sans text-left relative ${
              isPng 
                ? 'bg-pastelpink-50 shadow-none translate-x-[1px] translate-y-[1px]' 
                : 'bg-white hover:bg-cream-50 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-cream-900">
              PNG Format
              {isPng && <Check className="w-3.5 h-3.5 text-pastelpink-500" />}
            </div>
            <span className="text-[10px] font-mono text-cream-500 leading-normal mt-0.5">
              Lossless. Best sharpness for frames, stickers & text.
            </span>
          </button>

          <button
            onClick={() => setFormat('jpg')}
            className={`flex flex-col items-start p-3 border-2 border-cream-900 rounded-xl transition-all font-sans text-left relative ${
              !isPng 
                ? 'bg-pastelpink-50 shadow-none translate-x-[1px] translate-y-[1px]' 
                : 'bg-white hover:bg-cream-50 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-cream-900">
              JPG Format
              {!isPng && <Check className="w-3.5 h-3.5 text-pastelpink-500" />}
            </div>
            <span className="text-[10px] font-mono text-cream-500 leading-normal mt-0.5">
              100% Max Quality. Best photo realism. Smaller size.
            </span>
          </button>
        </div>
      </div>

      <a
        href={dataUrl}
        download={filename}
        className="flex items-center justify-center gap-3 w-full py-4 bg-cream-900 text-white border-2 border-cream-900 rounded-xl font-bold uppercase text-lg transition-all shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none cursor-pointer"
      >
        <Download className="w-5 h-5" />
        Download {options.downloadFormat.toUpperCase()} Strip
      </a>
    </div>
  );
};
```

---

### Step 5: Core App Logic

Write the `App.tsx` file inside the `src` directory to govern layout choosing screen transitions, live camera feed states, captured preview blocks, mouse/touch event tracking for draggable decoration badges/emojis, and state configurations.

#### File: `src/App.tsx`
```typescript
import { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { WebcamCapture } from './components/WebcamCapture';
import { CustomizationBar } from './components/CustomizationBar';
import { ExportPanel } from './components/ExportPanel';
import { stitchPhotos, getPhotoCountForLayout } from './utils/canvasStitcher';
import type { StitchOptions, StickerInstance } from './utils/canvasStitcher';
import { setSoundEnabled, playClick } from './utils/audioEngine';
import { motion, AnimatePresence } from 'framer-motion';

const layoutsList = [
  {
    id: 'vertical-4' as const,
    name: 'Layout A',
    poses: 4,
    description: '4 Pose Strip',
    style: 'vertical',
  },
  {
    id: 'vertical-3' as const,
    name: 'Layout B',
    poses: 3,
    description: '3 Pose Strip',
    style: 'vertical',
  },
  {
    id: 'vertical-2' as const,
    name: 'Layout C',
    poses: 2,
    description: '2 Pose Strip',
    style: 'vertical',
  },
  {
    id: 'grid-6' as const,
    name: 'Layout D',
    poses: 6,
    description: '6 Pose Grid',
    style: 'grid',
  },
  {
    id: 'traditional-4' as const,
    name: 'Traditional Photobooth Layout',
    poses: 4,
    description: '4 Pose Vertical',
    style: 'traditional',
  },
];

function App() {
  const [view, setView] = useState<'landing' | 'layout-select' | 'booth' | 'result'>('landing');
  const [photos, setPhotos] = useState<string[]>([]);
  const [stitchedPhoto, setStitchedPhoto] = useState<string>('');
  const [soundEnabled, setSoundEnabledState] = useState(true);
  
  const [options, setOptions] = useState<StitchOptions>({
    layout: 'vertical-4',
    backgroundColor: '#FFFFFF',
    filter: 'none',
    showDate: true,
    isMirrored: false,
    downloadFormat: 'png',
    pattern: 'none',
    grainStrength: 15,
    chromaticOffset: 0,
    vhsOverlay: false,
    customR: 0,
    customG: 0,
    customB: 0,
    customBrightness: 0,
  });

  const [stickers, setStickers] = useState<StickerInstance[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const neededPhotos = getPhotoCountForLayout(options.layout);
    if (photos.length === neededPhotos) {
      const generateStrip = async () => {
        try {
          const result = await stitchPhotos(photos, {
            ...options,
            stickers,
          });
          setStitchedPhoto(result);
        } catch (err) {
          console.error('Failed to stitch photos:', err);
        }
      };
      
      const timer = setTimeout(generateStrip, 50);
      return () => clearTimeout(timer);
    }
  }, [photos, options, stickers]);

  const handleCaptureComplete = (capturedPhotos: string[]) => {
    setPhotos(capturedPhotos);
    setView('result');
  };

  const resetSession = () => {
    playClick();
    setPhotos([]);
    setStitchedPhoto('');
    setStickers([]);
    setSelectedStickerId(null);
    setView('landing');
  };

  const addSticker = (type: string) => {
    playClick();
    const newSticker: StickerInstance = {
      id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  const addCustomTextSticker = (text: string, style: string) => {
    playClick();
    if (!text.trim()) return;
    const newSticker: StickerInstance = {
      id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: style,
      text: text.trim().toUpperCase(),
      x: 50,
      y: 50,
      scale: 1.2,
      rotation: 0,
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  const updateSticker = (id: string, updates: Partial<StickerInstance>) => {
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteSticker = (id: string) => {
    playClick();
    setStickers((prev) => prev.filter((s) => s.id !== id));
    if (selectedStickerId === id) {
      setSelectedStickerId(null);
    }
  };

  const clearStickers = () => {
    playClick();
    setStickers([]);
    setSelectedStickerId(null);
  };

  const handleStickerMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setSelectedStickerId(id);
    const container = previewContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;

    const startXPercent = sticker.x;
    const startYPercent = sticker.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      updateSticker(id, {
        x: Math.max(0, Math.min(100, startXPercent + deltaXPercent)),
        y: Math.max(0, Math.min(100, startYPercent + deltaYPercent)),
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleStickerTouchStart = (e: React.TouchEvent, id: string) => {
    setSelectedStickerId(id);
    const container = previewContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;

    const startXPercent = sticker.x;
    const startYPercent = sticker.y;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0];
      const deltaX = moveTouch.clientX - startX;
      const deltaY = moveTouch.clientY - startY;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      updateSticker(id, {
        x: Math.max(0, Math.min(100, startXPercent + deltaXPercent)),
        y: Math.max(0, Math.min(100, startYPercent + deltaYPercent)),
      });
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const getEmojiForSticker = (type: string): string | null => {
    switch (type) {
      case 'heart': return '💖';
      case 'star': return '⭐';
      case 'sparkles': return '✨';
      case 'cherry': return '🍒';
      case 'sunglasses': return '🕶️';
      case 'butterfly': return '🦋';
      case 'alien': return '👾';
      case 'flower': return '🌸';
      case 'lightning': return '⚡';
      case 'teddy': return '🧸';
      default: return null;
    }
  };

  const getBadgeTextForSticker = (type: string): string | null => {
    switch (type) {
      case 'badge-cute': return 'CUTE';
      case 'badge-y2k': return 'Y2K';
      case 'badge-cool': return 'COOL';
      case 'badge-baby': return 'BABY';
      default: return null;
    }
  };

  const handleToggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabledState(newState);
    setSoundEnabled(newState);
    playClick();
  };

  const isTraditionalSelected = options.layout === 'traditional-4';

  return (
    <div className="min-h-screen y2k-grid flex flex-col justify-between p-4 md:p-8 relative">

      <header className="w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between border-3 border-cream-900 bg-white p-4 rounded-2xl shadow-neo mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pastelpink-300 via-sage-300 to-maroon-800" />
        
        <div className="flex items-center gap-3 mt-1.5">
          <div className="w-10 h-10 rounded-xl bg-pastelpink-200 border-2 border-cream-900 flex items-center justify-center rotate-3 shadow-neo-sm">
            <Camera className="w-5 h-5 text-cream-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider m-0 leading-none flex items-center gap-1">
              NEO.BOOTH <span className="text-xs font-mono text-pastelpink-500 font-bold px-1.5 py-0.5 border border-pastelpink-300 rounded bg-pastelpink-50">v2.0</span>
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest text-cream-600 mt-1">
              ✦ Tokyo-Retro / Gen-Z Photobooth ✦
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0 font-mono text-xs font-bold uppercase">
          <button
            onClick={handleToggleSound}
            className={`flex items-center gap-1.5 px-3 py-1 border-2 border-cream-900 rounded-lg shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer ${
              soundEnabled ? 'bg-pastelpink-100 text-cream-900' : 'bg-cream-100 text-cream-500'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4" />
                Sound On
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                Muted
              </>
            )}
          </button>

          <span className="flex items-center gap-1 px-3 py-1 bg-sage-100 border-2 border-cream-900 rounded-lg shadow-neo-sm">
            <Sparkles className="w-3.5 h-3.5 text-sage-600 animate-spin" />
            Pure HTML5 Canvas
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto flex items-center justify-center py-4">
        <AnimatePresence mode="wait">

          {view === 'landing' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-2xl bg-white border-3 border-cream-900 rounded-3xl p-8 md:p-10 shadow-neo text-center relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-pastelpink-100 rounded-full blur-2xl opacity-60" />
              
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-cream-900 text-white rounded-full text-xs font-mono uppercase tracking-widest mb-6">
                ✦ No login required • Free forever ✦
              </div>

              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-cream-900 leading-none mb-6">
                Capture the Moment, <br />
                <span className="text-pastelpink-500 underline decoration-wavy decoration-pastelpink-300">Y2K Style.</span>
              </h2>

              <p className="text-cream-600 font-medium text-base md:text-lg max-w-md mx-auto mb-8">
                Welcome to the retro digital photo booth. Select your layout, snap consecutive photos, customize retro filters, place draggable stickers, and download.
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-10 text-left font-mono text-xs font-bold text-cream-700">
                <div className="flex items-center gap-2.5 p-3 bg-cream-50 border-2 border-cream-200 rounded-xl">
                  <span className="w-6 h-6 rounded-lg bg-pastelpink-200 flex items-center justify-center text-cream-900 text-xs">1</span>
                  Choose Layout & Poses
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-cream-50 border-2 border-cream-200 rounded-xl">
                  <span className="w-6 h-6 rounded-lg bg-sage-200 flex items-center justify-center text-cream-900 text-xs">2</span>
                  Stitch vertically/grid
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-cream-50 border-2 border-cream-200 rounded-xl">
                  <span className="w-6 h-6 rounded-lg bg-cream-200 flex items-center justify-center text-cream-900 text-xs">3</span>
                  Frame Patterns & VHS HUDs
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-cream-50 border-2 border-cream-200 rounded-xl">
                  <span className="w-6 h-6 rounded-lg bg-maroon-50 bg-opacity-50 flex items-center justify-center text-cream-900 text-xs">4</span>
                  Custom Text & Stickers
                </div>
              </div>

              <button
                onClick={() => {
                  playClick();
                  setView('layout-select');
                }}
                className="inline-flex items-center gap-3 px-10 py-5 bg-pastelpink-200 text-cream-900 border-3 border-cream-900 rounded-2xl font-bold text-2xl uppercase tracking-wide hover:bg-pastelpink-300 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group"
              >
                <Camera className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                Enter Photobooth
              </button>
            </motion.div>
          )}

          {view === 'layout-select' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-4xl bg-white border-3 border-cream-900 rounded-3xl p-8 shadow-neo text-center relative overflow-hidden"
            >
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-cream-900 mb-2">
                Choose your layout
              </h2>
              <p className="text-cream-500 font-medium text-sm mb-8">
                Select a layout for your photo session. You can choose from different styles and poses.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {layoutsList.map((lay) => {
                  const isSelected = options.layout === lay.id;
                  const isTraditional = lay.id === 'traditional-4';
                  
                  return (
                    <button
                      key={lay.id}
                      onClick={() => {
                        playClick();
                        setOptions(prev => ({ ...prev, layout: lay.id }));
                      }}
                      className={`flex flex-col items-center p-4 border-3 rounded-2xl transition-all shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none bg-cream-50/50 cursor-pointer ${
                        isSelected
                          ? 'border-pink-500 ring-4 ring-pink-300 ring-offset-2 scale-102 bg-white'
                          : 'border-cream-900 hover:bg-cream-100/30'
                      }`}
                    >
                      <div
                        className="w-full aspect-[1/3.3] rounded-lg border-2 border-cream-900 p-1.5 flex flex-col gap-1 overflow-hidden relative"
                        style={{ backgroundColor: isTraditional ? '#000000' : '#FFFFFF' }}
                      >
                        {isTraditional ? (
                          <>
                            {[...Array(lay.poses)].map((_, i) => (
                              <div key={i} className="flex-1 bg-zinc-800 border-[1.5px] border-white rounded-sm flex items-center justify-center">
                                <Camera className="w-4 h-4 text-white/40" />
                              </div>
                            ))}
                            <div className="h-2 w-full flex items-center justify-center">
                              <div className="w-8 h-0.5 bg-white/30 rounded-full" />
                            </div>
                          </>
                        ) : lay.style === 'grid' ? (
                          <div className="flex-1 grid grid-cols-2 gap-1">
                            {[...Array(6)].map((_, i) => (
                              <div key={i} className="bg-cream-200 rounded border border-cream-900/10 flex items-center justify-center">
                                <Camera className="w-3.5 h-3.5 text-cream-400" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            {[...Array(lay.poses)].map((_, i) => (
                              <div key={i} className="flex-1 bg-cream-200 rounded border border-cream-900/10 flex items-center justify-center">
                                <Camera className="w-4 h-4 text-cream-400" />
                              </div>
                            ))}
                            <div className="h-2 w-full flex items-center justify-center">
                              <div className="w-8 h-0.5 bg-cream-400/40 rounded-full" />
                            </div>
                          </>
                        )}
                      </div>

                      <span className="font-bold text-sm text-cream-900 mt-4 leading-tight">{lay.name}</span>
                      <span className="font-mono text-xs text-cream-500 mt-1">{lay.description}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    playClick();
                    setView('landing');
                  }}
                  className="px-6 py-3 border-2 border-cream-900 bg-white font-bold text-sm uppercase rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    playClick();
                    setView('booth');
                  }}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-pastelpink-200 text-cream-900 border-2 border-cream-900 rounded-xl font-bold text-lg uppercase tracking-wide hover:bg-pastelpink-300 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer"
                >
                  Proceed to Booth
                </button>
              </div>
            </motion.div>
          )}

          {view === 'booth' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex flex-col items-center gap-6"
            >
              <div className="flex items-center justify-between w-full max-w-2xl px-2">
                <button
                  onClick={() => {
                    playClick();
                    setView('layout-select');
                  }}
                  className="px-4 py-2 border-2 border-cream-900 bg-white font-bold text-xs uppercase rounded-xl shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                >
                  ← Back to Layouts
                </button>
                <span className="font-mono text-xs font-bold uppercase text-cream-500">
                  Step 2: Take Poses ({getPhotoCountForLayout(options.layout)} photos)
                </span>
              </div>
              <WebcamCapture 
                onCaptureComplete={handleCaptureComplete} 
                photoCount={getPhotoCountForLayout(options.layout)}
                isTraditional={isTraditionalSelected}
              />
            </motion.div>
          )}

          {view === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full flex flex-col lg:flex-row gap-8 items-start justify-center"
            >
              <div className="w-full lg:w-1/2 flex flex-col items-center gap-4">
                <div className="flex items-center justify-between w-full max-w-md px-2 lg:px-0">
                  <span className="font-mono text-xs font-bold uppercase text-cream-500">
                    Step 3: Edit & Add Stickers
                  </span>
                  <button
                    onClick={resetSession}
                    className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-cream-900 bg-white font-bold text-xs uppercase rounded-lg shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retake All
                  </button>
                </div>

                <div className="relative w-full max-w-md flex justify-center p-4 bg-[#eae8e1] border-3 border-cream-900 rounded-3xl shadow-neo-lg overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pastelpink-300 via-sage-300 to-maroon-800" />
                  
                  {stitchedPhoto ? (
                    <div 
                      ref={previewContainerRef}
                      onClick={() => setSelectedStickerId(null)}
                      className="relative w-fit max-w-full select-none cursor-default"
                    >
                      <motion.img
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        src={stitchedPhoto}
                        alt="Your Stitched Photo Strip"
                        className="max-h-[60vh] w-auto border-2 border-cream-900 rounded shadow-md pointer-events-none select-none block"
                      />

                      {stickers.map((sticker) => {
                        const isSelected = sticker.id === selectedStickerId;
                        const emoji = getEmojiForSticker(sticker.type);
                        const badgeText = sticker.text || getBadgeTextForSticker(sticker.type);

                        return (
                          <div
                            key={sticker.id}
                            style={{
                              position: 'absolute',
                              left: `${sticker.x}%`,
                              top: `${sticker.y}%`,
                              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                              cursor: 'grab',
                              zIndex: isSelected ? 40 : 20,
                            }}
                            onMouseDown={(e) => handleStickerMouseDown(e, sticker.id)}
                            onTouchStart={(e) => handleStickerTouchStart(e, sticker.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStickerId(sticker.id);
                            }}
                            className={`p-1 transition-shadow duration-100 ${
                              isSelected ? 'ring-3 ring-pink-500 rounded-md bg-white/20 backdrop-blur-[1px]' : ''
                            }`}
                          >
                            {emoji && (
                              <span className="text-4xl filter drop-shadow select-none pointer-events-none block">
                                {emoji}
                              </span>
                            )}
                            {badgeText && (
                              <span
                                className={`font-black text-xl select-none pointer-events-none px-2 py-0.5 border-2 border-black rounded-lg shadow-neo-sm font-sans tracking-wide block ${
                                  sticker.type.startsWith('badge-cute') ? 'bg-[#FFD6DE] text-cream-900' :
                                  sticker.type.startsWith('badge-y2k') ? 'bg-[#00FFCC] text-cream-900' :
                                  sticker.type.startsWith('badge-cool') ? 'bg-[#CFDEC0] text-cream-900' :
                                  'bg-[#FFE5B4] text-cream-900'
                                }`}
                              >
                                {badgeText}
                              </span>
                            )}

                            {isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSticker(sticker.id);
                                }}
                                className="absolute -top-3.5 -right-3.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md border-2 border-white cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-[300px] h-[500px] flex flex-col items-center justify-center gap-3 bg-white border-2 border-cream-900 rounded font-mono text-xs font-bold uppercase text-cream-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-pastelpink-400" />
                      Rendering Strip...
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-1/2 flex flex-col gap-6 max-w-md">
                <CustomizationBar 
                  options={options} 
                  onChange={setOptions} 
                  stickers={stickers}
                  selectedStickerId={selectedStickerId}
                  onAddSticker={addSticker}
                  onUpdateSticker={updateSticker}
                  onDeleteSticker={deleteSticker}
                  onClearStickers={clearStickers}
                  onAddCustomTextSticker={addCustomTextSticker}
                  soundEnabled={soundEnabled}
                  onToggleSound={handleToggleSound}
                />

                {stitchedPhoto && <ExportPanel options={options} onChange={setOptions} dataUrl={stitchedPhoto} />}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="w-full max-w-5xl mx-auto border-t-2 border-cream-200 mt-10 pt-4 flex items-center justify-center font-mono text-[10px] text-cream-400 uppercase tracking-widest">
        <span>✦ Made with love ✦ Neo.Booth Photobooth ✦</span>
      </footer>
    </div>
  );
}

export default App;
```

---

### Step 6: Installation and Start Verification

Once all the files have been created in the workspace:
1. Run `npm install` to install all dependencies from `package.json`.
2. Start the development server using `npm run dev`.
3. Provide the developer link to review the running app.
```
***
