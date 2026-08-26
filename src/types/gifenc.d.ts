declare module 'gifenc' {
  export interface GIFEncoderOptions {
    auto?: boolean;
    initialCapacity?: number;
  }

  export interface WriteFrameOptions {
    palette?: number[][];
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
  }

  export interface GIFEncoderInstance {
    writeFrame: (
      index: Uint8Array | number[],
      width: number,
      height: number,
      opts?: WriteFrameOptions
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
    reset: () => void;
  }

  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoderInstance;
  export function quantize(rgba: Uint8ClampedArray | Uint8Array | number[], maxColors?: number): number[][];
  export function applyPalette(rgba: Uint8ClampedArray | Uint8Array | number[], palette: number[][]): Uint8Array;
}
