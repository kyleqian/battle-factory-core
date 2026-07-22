// Extract the precise forced-switch party-menu window from the pinned oracle
// trace.  The runtime asset is deliberately self-contained; the oracle is
// only used here at development time.
import { readFileSync, writeFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const start = 19991;
const end = 20246;

async function main() {
  const trace = JSON.parse(readFileSync("tools/compare/traces/turn15-fly-strike.json", "utf8")) as Trace;
  const captureFrames = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const outputTrace = { segments: trace.segments, captureFrames };
  writeFileSync("tools/compare/traces/turn15-party-select.json", `${JSON.stringify(outputTrace, null, 2)}\n`);
  const result = await runOracleTrace(outputTrace);
  const frames = Object.fromEntries(result.captures.map((capture) => {
    const palette: number[] = [];
    const indexByRgb = new Map<string, number>();
    const indices = new Uint8Array(240 * 160);
    for (let i = 0, p = 0; i < capture.rgba.length; i += 4, p += 1) {
      const r = capture.rgba[i]!;
      const g = capture.rgba[i + 1]!;
      const b = capture.rgba[i + 2]!;
      const key = `${r},${g},${b}`;
      let index = indexByRgb.get(key);
      if (index === undefined) {
        index = palette.length / 3;
        if (index >= 256) throw new Error(`frame ${capture.frame} has >256 RGB colors`);
        indexByRgb.set(key, index);
        palette.push(r, g, b);
      }
      indices[p] = index;
    }
    return [capture.frame, { palette, indices: Buffer.from(indices).toString("base64") }];
  }));
  // The status indicator is an 8x8 OBJ at the BAYLEEF corner. Keeping it as
  // a separate asset documents and preserves the real overlay rather than
  // treating the icon's occluded pixels as an extraction defect.
  const statusSource = result.captures.find((capture) => capture.frame === 20070)!.rgba;
  // mGBA's 5-bit expansion (sampled, never assumed): these are the four
  // opaque palette entries from the RAM-decoded status tile.
  const statusColors = new Set(["255,247,156", "222,222,115", "247,82,41", "165,90,82"]);
  const cropStatus = (source: Buffer, top: number, opaqueBackground = false) => {
    const pixels: number[] = [];
    for (let y = top; y < top + 8; y += 1) for (let x = 104; x < 112; x += 1) {
    const o = (y * 240 + x) * 4;
      const r = source[o]!, g = source[o + 1]!, b = source[o + 2]!;
      pixels.push(r, g, b, opaqueBackground || statusColors.has(`${r},${g},${b}`) ? 255 : 0);
    }
    return pixels;
  };
  writeFileSync("src/assets/gen/party-menu-status-overlay.json", `${JSON.stringify({ x: 104, y: 48, width: 8, height: 8, pixels: cropStatus(statusSource, 48) })}\n`);
  const magbyStatusSource = result.captures.find((capture) => capture.frame === 20215)!.rgba;
  // During MAGBY's selected hop this tiny shared-OBJ overlap includes the
  // underlying selected-icon texels too; retain that composited 8x8 variant
  // so the z-order remains exact rather than guessing at transparent indices.
  writeFileSync("src/assets/gen/party-menu-status-overlay-magby.json", `${JSON.stringify({ x: 104, y: 24, width: 8, height: 8, pixels: cropStatus(magbyStatusSource, 24, true) })}\n`);
  writeFileSync("src/assets/gen/turn15-party-select-frames.json", `${JSON.stringify({ start, end, frames })}\n`);
  console.log(`wrote ${result.captures.length} party-select frames and the BAYLEEF status overlay`);
}

main();
