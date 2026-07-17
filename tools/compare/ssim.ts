// Structural comparison for the app-vs-oracle aid, modelled on GBA Eval's
// replay-scoring metric (gbaeval.com/blog/replay-scoring): block SSIM on the
// luma frame. Unlike a flat whole-frame pixel count, block SSIM localizes
// structural defects, so a wrong 16x16 sprite -- ~0.5% of the frame and
// invisible to the pixel metric -- shows up as low-SSIM blocks over the sprite.
//
// Simplifications vs GBA Eval, valid because the app and oracle render the SAME
// 4-level Game Boy palette (see diff.ts): no 5-bit re-quantization and no RGB
// conventions to reconcile -- the gray value IS the luma. We also keep it to
// plain single-scale, non-overlapping blocks (they found the Gaussian window
// and MS-SSIM gave no benefit on small pixel-art frames).
import { PNG } from "pngjs";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SsimResult {
  width: number;
  height: number;
  block: number;
  blocksW: number;
  blocksH: number;
  /** Per-block SSIM in row-major order (length blocksW*blocksH). */
  ssimMap: Float64Array;
  meanSSIM: number;
  /** Mean block defect (1-SSIM) after the perceptual floor. */
  meanDefect: number;
  minSSIM: number;
  worst: { bx: number; by: number; ssim: number };
  /** Mean SSIM over the blocks overlapping `box` (a region-of-interest score). */
  regionSSIM(box: Box): number;
}

// Classic SSIM constants (Wang et al.); L is the luma dynamic range.
const K1 = 0.01;
const K2 = 0.03;
const L = 255;
const C1 = (K1 * L) ** 2;
const C2 = (K2 * L) ** 2;

function toGray(png: Buffer): { w: number; h: number; a: Float64Array } {
  const img = PNG.sync.read(png);
  const a = new Float64Array(img.width * img.height);
  // GBA output is full color (unlike pokered-pewter's 4-level grayscale), so
  // compute real luma per pixel.
  for (let i = 0; i < a.length; i += 1) {
    const o = i * 4;
    a[i] = 0.299 * img.data[o] + 0.587 * img.data[o + 1] + 0.114 * img.data[o + 2];
  }
  return { w: img.width, h: img.height, a };
}

export function computeSSIM(
  refPng: Buffer,
  candPng: Buffer,
  opts: { block?: number; floor?: number } = {},
): SsimResult {
  const block = opts.block ?? 8; // 8px == one tile; inside GBA Eval's 4-20px sweet spot
  const floor = opts.floor ?? 0.15; // perceptual floor: sub-JND block defects count as 0
  const ref = toGray(refPng);
  const cand = toGray(candPng);
  if (ref.w !== cand.w || ref.h !== cand.h) {
    throw new Error(`frame size mismatch: ${ref.w}x${ref.h} vs ${cand.w}x${cand.h}`);
  }
  const { w: width, h: height } = ref;
  const blocksW = Math.floor(width / block);
  const blocksH = Math.floor(height / block);
  const ssimMap = new Float64Array(blocksW * blocksH);
  const n = block * block;

  let sumSSIM = 0;
  let sumDefect = 0;
  let minSSIM = Infinity;
  let worst = { bx: 0, by: 0, ssim: 1 };

  for (let by = 0; by < blocksH; by += 1) {
    for (let bx = 0; bx < blocksW; bx += 1) {
      let sx = 0;
      let sy = 0;
      let sxx = 0;
      let syy = 0;
      let sxy = 0;
      for (let dy = 0; dy < block; dy += 1) {
        const row = (by * block + dy) * width + bx * block;
        for (let dx = 0; dx < block; dx += 1) {
          const x = ref.a[row + dx];
          const y = cand.a[row + dx];
          sx += x;
          sy += y;
          sxx += x * x;
          syy += y * y;
          sxy += x * y;
        }
      }
      const mx = sx / n;
      const my = sy / n;
      const vx = sxx / n - mx * mx;
      const vy = syy / n - my * my;
      const vxy = sxy / n - mx * my;
      const luminance = (2 * mx * my + C1) / (mx * mx + my * my + C1);
      // c*s combined (avoids the sqrt for stddevs), per the SSIM simplification.
      const cs = (2 * vxy + C2) / (vx + vy + C2);
      const ssim = luminance * cs;
      ssimMap[by * blocksW + bx] = ssim;
      sumSSIM += ssim;
      const defect = Math.min(1, Math.max(0, 1 - ssim));
      sumDefect += defect >= floor ? defect : 0;
      if (ssim < minSSIM) {
        minSSIM = ssim;
        worst = { bx, by, ssim };
      }
    }
  }

  const count = blocksW * blocksH;
  const regionSSIM = (boxArg: Box): number => {
    let sum = 0;
    let m = 0;
    for (let by = 0; by < blocksH; by += 1) {
      for (let bx = 0; bx < blocksW; bx += 1) {
        const bx0 = bx * block;
        const by0 = by * block;
        const overlaps =
          bx0 < boxArg.x + boxArg.w && bx0 + block > boxArg.x && by0 < boxArg.y + boxArg.h && by0 + block > boxArg.y;
        if (overlaps) {
          sum += ssimMap[by * blocksW + bx];
          m += 1;
        }
      }
    }
    return m ? sum / m : 1;
  };

  return {
    width,
    height,
    block,
    blocksW,
    blocksH,
    ssimMap,
    meanSSIM: sumSSIM / count,
    meanDefect: sumDefect / count,
    minSSIM,
    worst,
    regionSSIM,
  };
}
