export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PixelLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface StickerInstance {
  id: string;
  type: string;
  text?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export type LayoutType = 'vertical-4' | 'vertical-3' | 'vertical-2' | 'grid-6' | 'traditional-4';
export type FilterType = 'none' | 'grayscale' | 'sepia' | 'high-contrast' | 'vintage' | 'analog-film' | 'custom';
export type PatternType = 'none' | 'checkerboard' | 'stars' | 'cherries' | 'hologradient';
export type ARFilter = 'aviators' | 'cyber-shades' | 'beauty-makeup' | 'heart-blush' | 'macbook-hearts' | 'noise' | 'tulip';

export interface DoodlePoint {
  x: number;
  y: number;
}

export interface DoodlePath {
  id: string;
  points: DoodlePoint[];
  color: string;
  size: number;
  glow: boolean;
}

export interface StitchOptions {
  layout: LayoutType;
  backgroundColor: string;
  filter: FilterType;
  customR?: number;
  customG?: number;
  customB?: number;
  customBrightness?: number;
  showDate: boolean;
  dateStr?: string;
  isMirrored?: boolean;
  downloadFormat: 'png' | 'jpg';
  pattern?: PatternType;
  grainStrength?: number;
  chromaticOffset?: number;
  vhsOverlay?: boolean;
  stickers?: StickerInstance[];
  doodles?: DoodlePath[];
}

export interface HeartParticle {
  originType?: 'forehead' | 'hand';
  xOffsetFactor: number;
  yOffsetFactor: number;
  speedFactor: number;
  sizeFactor: number;
  opacity: number;
  colorHue: number;
  wobbleSpeed: number;
  wobbleAmount: number;
  wobblePhase: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  x?: number;
  y?: number;
  speed?: number;
  wobbleAmt?: number;
  size?: number;
}

export interface CropDimensions {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
  targetW: number;
  targetH: number;
}

export interface FilterImages {
  aviators: HTMLImageElement | null;
  tulip: HTMLImageElement | null;
}
