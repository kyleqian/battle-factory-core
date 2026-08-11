// Pixel-forensics helper for one frame pair (a discrepancy dissector).
//
// Usage: npm run inspect-frame -- <a.png> <b.png> [options]
//          --out DIR      artifact directory (default: fresh tools/compare/out/inspect-*)
//          --pad N        crop padding around the overall diff bbox (default 4)
//          --samples N    differing-pixel value samples to print (default 8)
//          --clusters N   max 8-connected clusters to print (default 16)
//
// Prints the strict diff count, overall bbox, per-cluster bboxes (separating
// independent defect families numerically — prefer these over visual contact
// sheets for boundary pinning), and RGB samples from both sides; writes the
// red-highlight diff plus bbox crops of A, B, and the diff as PNGs. Exits 1
// when the frames differ, 0 on an exact match — same convention as compare.
// Replaces the throwaway PNG-diff/crop scripts workers kept rebuilding
// (PAPERCUTS 2026-07-31).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  boundsForPixelIndices,
  clusterPixelIndices,
  formatPixelBounds,
  type PixelBounds,
} from "./diffBounds.ts";

const USAGE =
  "usage: npm run inspect-frame -- <a.png> <b.png> "
  + "[--out DIR] [--pad N] [--samples N] [--clusters N]";

interface InspectOptions {
  aPath: string;
  bPath: string;
  outDir?: string;
  pad: number;
  samples: number;
  clusters: number;
}

function parseArgs(args: readonly string[]): InspectOptions {
  const positional: string[] = [];
  const options: Partial<InspectOptions> = {};
  const numeric = (flag: string, value: string | undefined): number => {
    if (value === undefined || !/^\d+$/.test(value)) {
      throw new Error(`${flag} needs a non-negative integer`);
    }
    return Number(value);
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    const valued = (flag: string): string | undefined => {
      if (argument === flag) {
        index += 1;
        return args[index];
      }
      if (argument.startsWith(`${flag}=`)) return argument.slice(flag.length + 1);
      return undefined;
    };
    const out = valued("--out");
    if (out !== undefined) {
      options.outDir = out;
      continue;
    }
    const pad = argument.startsWith("--pad") ? valued("--pad") : undefined;
    if (pad !== undefined) {
      options.pad = numeric("--pad", pad);
      continue;
    }
    const samples = argument.startsWith("--samples") ? valued("--samples") : undefined;
    if (samples !== undefined) {
      options.samples = numeric("--samples", samples);
      continue;
    }
    const clusters = argument.startsWith("--clusters") ? valued("--clusters") : undefined;
    if (clusters !== undefined) {
      options.clusters = numeric("--clusters", clusters);
      continue;
    }
    if (argument.startsWith("-")) throw new Error(`unknown option: ${argument}`);
    positional.push(argument);
  }
  if (positional.length !== 2) throw new Error("exactly two PNG paths are required");
  return {
    aPath: positional[0]!,
    bPath: positional[1]!,
    pad: 4,
    samples: 8,
    clusters: 16,
    ...options,
  };
}

let cli: InspectOptions;
try {
  cli = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(USAGE);
  process.exit(2);
}

const a = PNG.sync.read(readFileSync(cli.aPath));
const b = PNG.sync.read(readFileSync(cli.bPath));
if (a.width !== b.width || a.height !== b.height) {
  console.error(
    `frame size mismatch: ${cli.aPath} ${a.width}x${a.height} vs ${cli.bPath} ${b.width}x${b.height}`,
  );
  process.exit(2);
}
const { width, height } = a;

const mismatched: number[] = [];
for (let pixel = 0; pixel < width * height; pixel += 1) {
  const offset = pixel * 4;
  if (
    a.data[offset] !== b.data[offset]
    || a.data[offset + 1] !== b.data[offset + 1]
    || a.data[offset + 2] !== b.data[offset + 2]
  ) {
    mismatched.push(pixel);
  }
}

console.log(`A: ${cli.aPath}`);
console.log(`B: ${cli.bPath}`);
if (mismatched.length === 0) {
  console.log(`exact match (${width}x${height})`);
  process.exit(0);
}

const bounds = boundsForPixelIndices(mismatched, width)!;
const pct = ((100 * mismatched.length) / (width * height)).toFixed(2);
console.log(
  `DIFF ${mismatched.length}px (${pct}%) bbox=${formatPixelBounds(bounds)} `
  + `(${bounds.maxX - bounds.minX + 1}x${bounds.maxY - bounds.minY + 1} of ${width}x${height})`,
);

const clusters = clusterPixelIndices(mismatched, width);
console.log(`clusters (8-connected, largest first): ${clusters.length}`);
for (const [index, cluster] of clusters.slice(0, cli.clusters).entries()) {
  console.log(
    `  #${index + 1} ${cluster.pixelCount}px bbox=${formatPixelBounds(cluster.bounds)}`,
  );
}
if (clusters.length > cli.clusters) {
  console.log(`  ...and ${clusters.length - cli.clusters} more (raise --clusters)`);
}

if (cli.samples > 0) {
  console.log(`samples (x,y: A rgb -> B rgb), first ${Math.min(cli.samples, mismatched.length)}:`);
  for (const pixel of mismatched.slice(0, cli.samples)) {
    const offset = pixel * 4;
    console.log(
      `  (${pixel % width},${Math.floor(pixel / width)}): `
      + `${a.data[offset]},${a.data[offset + 1]},${a.data[offset + 2]} -> `
      + `${b.data[offset]},${b.data[offset + 1]},${b.data[offset + 2]}`,
    );
  }
}

// Artifacts: full red-highlight diff plus padded bbox crops of both sides.
const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:T]/g, "-");
const outDir = cli.outDir
  ?? join("tools", "compare", "out", `inspect-${stamp}-${process.pid}`);
mkdirSync(outDir, { recursive: true });

const highlight = new PNG({ width, height });
a.data.copy(highlight.data);
for (const pixel of mismatched) {
  const offset = pixel * 4;
  highlight.data[offset] = 255;
  highlight.data[offset + 1] = 0;
  highlight.data[offset + 2] = 0;
  highlight.data[offset + 3] = 255;
}

function cropOf(source: PNG, box: PixelBounds, pad: number): PNG {
  const x0 = Math.max(0, box.minX - pad);
  const y0 = Math.max(0, box.minY - pad);
  const x1 = Math.min(width - 1, box.maxX + pad);
  const y1 = Math.min(height - 1, box.maxY + pad);
  const crop = new PNG({ width: x1 - x0 + 1, height: y1 - y0 + 1 });
  PNG.bitblt(source, crop, x0, y0, crop.width, crop.height, 0, 0);
  return crop;
}

const artifacts: Array<[string, PNG]> = [
  ["diff.png", highlight],
  ["a-crop.png", cropOf(a, bounds, cli.pad)],
  ["b-crop.png", cropOf(b, bounds, cli.pad)],
  ["diff-crop.png", cropOf(highlight, bounds, cli.pad)],
];
for (const [name, png] of artifacts) {
  writeFileSync(join(outDir, name), PNG.sync.write(png));
}
console.log(`artifacts -> ${outDir} (diff.png, a-crop.png, b-crop.png, diff-crop.png)`);
process.exit(1);
