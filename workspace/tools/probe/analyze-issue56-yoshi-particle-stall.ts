// ISSUES #56 Q1 companion analysis for
// `dump-issue56-yoshi-materialize-oam.py`: reproduce only the source-derived
// ball-open particle compositor at YOSHI's frame-444 boundary.  It proves
// whether the observed pink materialize pixels are exposed/occluded by a
// particle sub-step, without changing `src/engine/**`.
//
// Run (the two PNGs are optional; supplying them prints a read-only overlap
// check against the frame-444 difference map):
//   node --experimental-strip-types tools/probe/analyze-issue56-yoshi-particle-stall.ts \\
//     <app-00444.png> <oracle-00444.png>
//
// The real app frame 444 has particle logical tick 13.  Its current
// Scene-OFF call site supplies `stallLag: 1`, so the current formula advances
// at logical 13; the RAM probe shows the real particle slots duplicate their
// frame-443 values at absolute 1615.  `stallLag: 0` is the one-frame-only
// candidate: logical 13 then renders exactly the logical-12 signature while
// logical 14 and later remain the current formula's values.

import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import particleAsset from "../../src/assets/gen/battle-anim-particles.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";

type ParticleAsset = {
  tileset: { tiles: number[][] };
  palette: { r: number; g: number; b: number }[];
  regularBallAnim: { tile: number; hFlip: boolean }[];
};

type Particle = {
  i: number;
  age: number;
  dx: number;
  dy: number;
};

type OpaquePixel = {
  i: number;
  age: number;
  tile: number;
  x: number;
  y: number;
  rgb: readonly [number, number, number];
};

const asset = particleAsset as ParticleAsset;
const ORIGIN = { x: 172, y: 55 };
const SPAWN_COUNT = 16;
const MAX_AGE = 24;
const LATE_SPAWN_START = 14;
const STALL_LOGICAL_TICK = 13;
const TARGET_COORDINATES = [
  [158, 40],
  [159, 40],
  [160, 40],
  [161, 40],
] as const;

function gbaSin(index: number, amplitude: number): number {
  const i = ((index % 256) + 256) % 256;
  return (amplitude * GBA_SINE_TABLE_256[i]!) >> 8;
}

function aliveParticles(logicalTick: number, stallLag: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < SPAWN_COUNT; i += 1) {
    let age = logicalTick - i;
    if (i >= LATE_SPAWN_START) {
      age -= 1;
    } else if (logicalTick >= STALL_LOGICAL_TICK + stallLag) {
      age -= 1;
    }
    if (age < 0 || age > MAX_AGE) continue;
    const angle = (i % 8) * 32;
    const radius = age === 0 ? 0 : 2 * (age - 1);
    particles.push({
      i,
      age,
      dx: gbaSin(angle, radius),
      dy: gbaSin(angle + 64, radius),
    });
  }
  return particles.sort((left, right) => {
    if (left.dy !== right.dy) return left.dy - right.dy;
    // Same special persistent slot tie as the generated Scene-OFF renderer.
    if ((left.i === 13 && right.i === 14) || (left.i === 14 && right.i === 13)) {
      return left.i - right.i;
    }
    return right.i - left.i;
  });
}

function opaqueParticlePixels(logicalTick: number, stallLag: number): Map<string, OpaquePixel> {
  const pixels = new Map<string, OpaquePixel>();
  for (const particle of aliveParticles(logicalTick, stallLag)) {
    const frame = asset.regularBallAnim[particle.age % asset.regularBallAnim.length]!;
    const tile = asset.tileset.tiles[frame.tile]!;
    for (let py = 0; py < 8; py += 1) {
      for (let px = 0; px < 8; px += 1) {
        const sourceX = frame.hFlip ? 7 - px : px;
        const paletteIndex = tile[py * 8 + sourceX]!;
        if (paletteIndex === 0) continue;
        const color = asset.palette[paletteIndex]!;
        const x = ORIGIN.x + particle.dx + px;
        const y = ORIGIN.y + particle.dy + py;
        pixels.set(`${x},${y}`, {
          i: particle.i,
          age: particle.age,
          tile: frame.tile,
          x,
          y,
          rgb: [color.r, color.g, color.b],
        });
      }
    }
  }
  return pixels;
}

function samePixels(left: Map<string, OpaquePixel>, right: Map<string, OpaquePixel>): boolean {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) {
    const other = right.get(key);
    if (!other || JSON.stringify(value) !== JSON.stringify(other)) return false;
  }
  return true;
}

function atCoordinates(pixels: Map<string, OpaquePixel>): Record<string, OpaquePixel | null> {
  return Object.fromEntries(
    TARGET_COORDINATES.map(([x, y]) => [`${x},${y}`, pixels.get(`${x},${y}`) ?? null]),
  );
}

function sameRgb(left: OpaquePixel | undefined, right: OpaquePixel | undefined): boolean {
  return left?.rgb[0] === right?.rgb[0]
    && left?.rgb[1] === right?.rgb[1]
    && left?.rgb[2] === right?.rgb[2];
}

function changedParticleCoordinates(
  left: Map<string, OpaquePixel>,
  right: Map<string, OpaquePixel>,
): Set<string> {
  const coordinates = new Set([...left.keys(), ...right.keys()]);
  return new Set([...coordinates].filter((coordinate) => !sameRgb(left.get(coordinate), right.get(coordinate))));
}

function pngMismatchCoordinates(appPath: string, oraclePath: string): Set<string> {
  const app = PNG.sync.read(readFileSync(appPath));
  const oracle = PNG.sync.read(readFileSync(oraclePath));
  if (app.width !== 240 || app.height !== 160 || oracle.width !== 240 || oracle.height !== 160) {
    throw new Error("expected two 240x160 PNGs");
  }
  const mismatch = new Set<string>();
  for (let pixel = 0; pixel < app.width * app.height; pixel += 1) {
    const offset = pixel * 4;
    if (
      app.data[offset] !== oracle.data[offset]
      || app.data[offset + 1] !== oracle.data[offset + 1]
      || app.data[offset + 2] !== oracle.data[offset + 2]
    ) {
      mismatch.add(`${pixel % app.width},${Math.floor(pixel / app.width)}`);
    }
  }
  return mismatch;
}

const before = opaqueParticlePixels(12, 1);
const current = opaqueParticlePixels(13, 1);
const candidate = opaqueParticlePixels(13, 0);
const following = opaqueParticlePixels(14, 1);
const candidateFollowing = opaqueParticlePixels(14, 0);
const changedParticles = changedParticleCoordinates(current, candidate);

let pngOverlap: Record<string, number> | undefined;
if (process.argv.length === 4) {
  const mismatches = pngMismatchCoordinates(process.argv[2]!, process.argv[3]!);
  const covered = [...mismatches].filter((coordinate) => changedParticles.has(coordinate));
  pngOverlap = {
    mismatchPixels: mismatches.size,
    particleChangedPixels: changedParticles.size,
    mismatchesAtChangedParticlePixels: covered.length,
    mismatchesOutsideChangedParticlePixels: mismatches.size - covered.length,
  };
} else if (process.argv.length !== 2) {
  throw new Error("expected zero arguments or <app-00444.png> <oracle-00444.png>");
}

console.log(JSON.stringify({
  logicalTick: 13,
  signatures: {
    previousFrameLogical12: { count: before.size, coordinates: atCoordinates(before) },
    currentFrame444StallLag1: { count: current.size, coordinates: atCoordinates(current) },
    candidateFrame444StallLag0: { count: candidate.size, coordinates: atCoordinates(candidate) },
  },
  falsifiableEqualities: {
    candidate444EqualsPrevious443: samePixels(candidate, before),
    candidate445EqualsCurrent445: samePixels(candidateFollowing, following),
  },
  pngOverlap,
}, null, 2));
