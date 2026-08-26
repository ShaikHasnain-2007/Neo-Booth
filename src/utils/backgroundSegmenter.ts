import type { VirtualBackdropType, CropDimensions } from '../types/photobooth';

// Reusable offscreen buffers for high-performance zero-allocation masking
let maskCanvas: HTMLCanvasElement | null = null;
let maskCtx: CanvasRenderingContext2D | null = null;
let personCanvas: HTMLCanvasElement | null = null;
let personCtx: CanvasRenderingContext2D | null = null;
let maskImageData: ImageData | null = null;

function getBuffers(width: number, height: number) {
  if (!maskCanvas || maskCanvas.width !== width || maskCanvas.height !== height) {
    maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    maskImageData = maskCtx ? maskCtx.createImageData(width, height) : null;
  }

  if (!personCanvas || personCanvas.width !== width || personCanvas.height !== height) {
    personCanvas = document.createElement('canvas');
    personCanvas.width = width;
    personCanvas.height = height;
    personCtx = personCanvas.getContext('2d', { willReadFrequently: true });
  }

  return { maskCanvas, maskCtx, maskImageData, personCanvas, personCtx };
}

/**
 * Draws the procedural backdrop behind the segmented person
 */
export function drawVirtualBackdropBase(
  ctx: CanvasRenderingContext2D,
  backdropId: VirtualBackdropType,
  w: number,
  h: number,
  video?: HTMLVideoElement | null,
  cropDims?: CropDimensions
) {
  ctx.save();

  switch (backdropId) {
    case 'blur': {
      if (video && cropDims) {
        ctx.save();
        ctx.filter = 'blur(20px)';
        // Draw slightly oversized to prevent dark edge blur bleed
        const scale = 1.08;
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);
        ctx.drawImage(
          video,
          cropDims.sx,
          cropDims.sy,
          cropDims.sWidth,
          cropDims.sHeight,
          0,
          0,
          w,
          h
        );
        ctx.restore();

        // Darken overlay slightly for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = '#27272A';
        ctx.fillRect(0, 0, w, h);
      }
      break;
    }

    case 'retro-laser': {
      // 90s School Portrait Laser Grid
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.8);
      bgGrad.addColorStop(0, '#2b1055');
      bgGrad.addColorStop(0.6, '#0f051d');
      bgGrad.addColorStop(1, '#05010a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Neon Criss-Cross Lasers
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 12;

      // Cyan laser beams from top-left
      ctx.strokeStyle = '#00FFFF';
      ctx.shadowColor = '#00FFFF';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.1 * i, 0);
        ctx.lineTo(w, h * 0.25 * (i + 1));
        ctx.stroke();
      }

      // Magenta laser beams from top-right
      ctx.strokeStyle = '#FF007F';
      ctx.shadowColor = '#FF007F';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(w - w * 0.1 * i, 0);
        ctx.lineTo(0, h * 0.25 * (i + 1));
        ctx.stroke();
      }

      // Yellow neon cross lasers
      ctx.strokeStyle = '#FAFF00';
      ctx.shadowColor = '#FAFF00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.7);
      ctx.lineTo(w, h * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, h * 0.3);
      ctx.lineTo(w, h * 0.8);
      ctx.stroke();
      break;
    }

    case 'y2k-bliss': {
      // Windows 95 / XP Bliss Landscape
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
      skyGrad.addColorStop(0, '#0084FF');
      skyGrad.addColorStop(0.5, '#40B4FF');
      skyGrad.addColorStop(1, '#BBE5FF');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Soft clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(w * 0.25, h * 0.25, 45, 0, Math.PI * 2);
      ctx.arc(w * 0.32, h * 0.22, 60, 0, Math.PI * 2);
      ctx.arc(w * 0.4, h * 0.26, 40, 0, Math.PI * 2);
      ctx.fill();

      // Rolling Green Hill
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.55);
      ctx.bezierCurveTo(w * 0.3, h * 0.45, w * 0.7, h * 0.65, w, h * 0.5);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      const hillGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
      hillGrad.addColorStop(0, 'rgba(74, 222, 128, 0.6)');
      hillGrad.addColorStop(1, 'rgba(21, 128, 61, 0.9)');
      ctx.fillStyle = hillGrad;
      ctx.fill();
      break;
    }

    case 'cyberpunk-tokyo': {
      // Futuristic Cyberpunk Skyline
      const nightGrad = ctx.createLinearGradient(0, 0, 0, h);
      nightGrad.addColorStop(0, '#0B001A');
      nightGrad.addColorStop(0.6, '#1A0033');
      nightGrad.addColorStop(1, '#3B0066');
      ctx.fillStyle = nightGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant neon skyline buildings
      ctx.fillStyle = '#080012';
      const bldgWidths = [50, 70, 45, 80, 60, 75, 90, 55, 65, 80];
      let curX = 0;
      for (let i = 0; i < bldgWidths.length && curX < w; i++) {
        const bw = bldgWidths[i];
        const bh = h * (0.35 + ((i * 17) % 30) / 100);
        ctx.fillRect(curX, h - bh, bw, bh);

        // Neon windows
        ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 255, 204, 0.4)' : 'rgba(255, 46, 147, 0.4)';
        for (let wy = h - bh + 15; wy < h - 20; wy += 20) {
          for (let wx = curX + 8; wx < curX + bw - 8; wx += 14) {
            if ((wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 6, 8);
          }
        }
        ctx.fillStyle = '#080012';
        curX += bw + 8;
      }

      // Neon grid lines at bottom
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      for (let y = h * 0.75; y < h; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      break;
    }

    case 'sakura-blossom': {
      // Pastel Japanese Cherry Blossom
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#FFE4E6');
      grad.addColorStop(0.5, '#FED7AA');
      grad.addColorStop(1, '#FBCFE8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Floating sakura petals
      ctx.fillStyle = '#FB7185';
      const petals = [
        { x: 0.15, y: 0.2, r: 10, rot: 0.4 },
        { x: 0.35, y: 0.15, r: 8, rot: -0.6 },
        { x: 0.8, y: 0.25, r: 12, rot: 0.8 },
        { x: 0.9, y: 0.45, r: 9, rot: 0.2 },
        { x: 0.2, y: 0.75, r: 11, rot: -0.3 },
        { x: 0.85, y: 0.8, r: 10, rot: 0.5 },
      ];

      for (const p of petals) {
        ctx.save();
        ctx.translate(p.x * w, p.y * h);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'vaporwave-sunset': {
      // 80s Synthwave Sunset & Sun
      const synthGrad = ctx.createLinearGradient(0, 0, 0, h);
      synthGrad.addColorStop(0, '#0F051D');
      synthGrad.addColorStop(0.5, '#7928CA');
      synthGrad.addColorStop(0.75, '#FF0080');
      synthGrad.addColorStop(1, '#FAFF00');
      ctx.fillStyle = synthGrad;
      ctx.fillRect(0, 0, w, h);

      // Neon Sun
      const sunY = h * 0.5;
      const sunR = Math.min(w, h) * 0.28;
      const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sunGrad.addColorStop(0, '#FFF500');
      sunGrad.addColorStop(1, '#FF0055');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(w / 2, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();

      // Sun scanline slats
      ctx.fillStyle = '#7928CA';
      for (let sl = sunY - sunR * 0.2; sl < sunY + sunR; sl += 14) {
        const slatHeight = 4 + (sl - sunY) * 0.04;
        ctx.fillRect(w / 2 - sunR, sl, sunR * 2, slatHeight);
      }
      break;
    }

    case 'minimal-studio': {
      // High-key White/Grey Radial Studio
      const studioGrad = ctx.createRadialGradient(w / 2, h * 0.4, 30, w / 2, h * 0.5, w * 0.75);
      studioGrad.addColorStop(0, '#FFFFFF');
      studioGrad.addColorStop(0.65, '#E4E4E7');
      studioGrad.addColorStop(1, '#A1A1AA');
      ctx.fillStyle = studioGrad;
      ctx.fillRect(0, 0, w, h);
      break;
    }

    case 'purikura-pastel': {
      // Kawaii Pastel Hearts & Stars Studio
      const puriGrad = ctx.createLinearGradient(0, 0, w, h);
      puriGrad.addColorStop(0, '#FFD6DE');
      puriGrad.addColorStop(0.5, '#FFE5B4');
      puriGrad.addColorStop(1, '#CFDEC0');
      ctx.fillStyle = puriGrad;
      ctx.fillRect(0, 0, w, h);

      // Cute background sparkles
      ctx.fillStyle = '#FFFFFF';
      const sparkles = [
        { x: 0.12, y: 0.15, s: 12 },
        { x: 0.88, y: 0.18, s: 14 },
        { x: 0.25, y: 0.82, s: 10 },
        { x: 0.82, y: 0.78, s: 16 },
        { x: 0.5, y: 0.12, s: 15 },
      ];

      for (const sp of sparkles) {
        const sx = sp.x * w;
        const sy = sp.y * h;
        const ss = sp.s;
        ctx.beginPath();
        ctx.moveTo(sx, sy - ss);
        ctx.quadraticCurveTo(sx, sy, sx + ss, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy + ss);
        ctx.quadraticCurveTo(sx, sy, sx - ss, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy - ss);
        ctx.fill();
      }
      break;
    }

    case 'eraser-transparent': {
      // Pure Chroma Green Cutout
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, w, h);
      break;
    }

    case 'none':
    default: {
      if (video && cropDims) {
        ctx.drawImage(
          video,
          cropDims.sx,
          cropDims.sy,
          cropDims.sWidth,
          cropDims.sHeight,
          0,
          0,
          w,
          h
        );
      }
      break;
    }
  }

  ctx.restore();
}

/**
 * Composites the segmented person video foreground over the chosen virtual backdrop
 */
export function renderSegmentedUserWithBackdrop(
  targetCtx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  maskFloatArray: Float32Array,
  maskWidth: number,
  maskHeight: number,
  backdropId: VirtualBackdropType,
  targetW: number,
  targetH: number,
  cropDims: CropDimensions
) {
  const { maskCanvas: mCanvas, maskCtx: mCtx, maskImageData: mImgData, personCanvas: pCanvas, personCtx: pCtx } =
    getBuffers(maskWidth, maskHeight);

  if (!mCanvas || !mCtx || !mImgData || !pCanvas || !pCtx) return;

  // 1. Convert segmentation float mask to alpha channel
  const data = mImgData.data;
  const len = maskFloatArray.length;
  for (let i = 0; i < len; i++) {
    const alpha = maskFloatArray[i]; // 0.0 = background, 1.0 = person
    const idx = i * 4;
    data[idx] = 255;
    data[idx + 1] = 255;
    data[idx + 2] = 255;
    data[idx + 3] = Math.round(alpha * 255);
  }
  mCtx.putImageData(mImgData, 0, 0);

  // 2. Render person foreground cutout on offscreen canvas
  pCtx.clearRect(0, 0, maskWidth, maskHeight);
  pCtx.save();
  pCtx.drawImage(
    video,
    cropDims.sx,
    cropDims.sy,
    cropDims.sWidth,
    cropDims.sHeight,
    0,
    0,
    maskWidth,
    maskHeight
  );

  // Soft mask multiplication
  pCtx.globalCompositeOperation = 'destination-in';
  pCtx.drawImage(mCanvas, 0, 0, maskWidth, maskHeight);
  pCtx.restore();

  // 3. Draw virtual backdrop on main target canvas
  drawVirtualBackdropBase(targetCtx, backdropId, targetW, targetH, video, cropDims);

  // 4. Draw masked person on top of the virtual backdrop
  targetCtx.save();
  targetCtx.drawImage(pCanvas, 0, 0, targetW, targetH);
  targetCtx.restore();
}
