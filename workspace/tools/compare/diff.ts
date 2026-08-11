import { PNG } from "pngjs";
import {
  boundsForPixelIndices,
  type PixelBounds,
} from "./diffBounds.ts";

export interface FrameDiff {
  width: number;
  height: number;
  diffPixels: number;
  totalPixels: number;
  /** Inclusive bounds of all differing pixels, or null for an exact match. */
  bounds: PixelBounds | null;
  /** Oracle frame with mismatching pixels highlighted in red. */
  diffPng: Buffer;
}

// Both sides must render the same RGB888 output (the oracle emits raw
// framebuffer color; the app renders GBA 15-bit color expanded the same way),
// so pixels are directly comparable with no color normalization step. Nail
// down the 15->24 bit expansion in the roadmap's first stage before trusting strict diffs.
export function diffPngs(oraclePng: Buffer, appPng: Buffer): FrameDiff {
  const oracle = PNG.sync.read(oraclePng);
  const app = PNG.sync.read(appPng);
  if (oracle.width !== app.width || oracle.height !== app.height) {
    throw new Error(`frame size mismatch: oracle ${oracle.width}x${oracle.height} vs app ${app.width}x${app.height}`);
  }
  const { width, height } = oracle;
  const out = new PNG({ width, height });
  const mismatchedPixels: number[] = [];
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    const matches =
      oracle.data[o] === app.data[o] &&
      oracle.data[o + 1] === app.data[o + 1] &&
      oracle.data[o + 2] === app.data[o + 2];
    if (matches) {
      out.data[o] = oracle.data[o];
      out.data[o + 1] = oracle.data[o + 1];
      out.data[o + 2] = oracle.data[o + 2];
      out.data[o + 3] = 255;
    } else {
      mismatchedPixels.push(i);
      out.data[o] = 255;
      out.data[o + 1] = 0;
      out.data[o + 2] = 0;
      out.data[o + 3] = 255;
    }
  }
  return {
    width,
    height,
    diffPixels: mismatchedPixels.length,
    totalPixels: width * height,
    bounds: boundsForPixelIndices(mismatchedPixels, width),
    diffPng: PNG.sync.write(out),
  };
}
