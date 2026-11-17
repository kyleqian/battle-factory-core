// usage: node --experimental-strip-types --no-warnings tools/integration/adp1Cmp.ts <probe-dir> <fixture.json> [maskX0,Y0,X1,Y1] [pngDir]
// Fast iteration: compares liveView rows to the RGB frames of an existing adp1Probes.sh run (no fresh mGBA run); prints per-row residual + bbox.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join, basename } from "node:path";
import "../../src/engine/monPicPixelsInstall.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView } from "./liveAdapterFramebuffer.ts";

const [dir, fixturePath, maskArg, pngDir] = process.argv.slice(2);
const fixture = JSON.parse(readFileSync(fixturePath!, "utf8"));
const key = basename(fixturePath!, ".json").replace(/-b\d+$/, "");
const mask = maskArg && maskArg !== "-" ? maskArg.split(",").map(Number) as [number, number, number, number] : undefined;
const { startFrame, endFrame } = fixture.denseWindow;
let total = 0, exact = 0;
const lines: string[] = [];
for (let frame = startFrame; frame <= endFrame; frame++) {
  const name = `${String(frame).padStart(5, "0")}.rgb`;
  let rgb: Buffer;
  try { rgb = inflateSync(readFileSync(join(dir!, `${key}-rgb`, `${name}.z`))); } catch { rgb = readFileSync(join(dir!, `${key}-rgb`, name)); }
  const age = frame - startFrame;
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, liveView(fixture, age));
  let n = 0, x0 = 999, y0 = 999, x1 = -1, y1 = -1;
  for (let p = 0; p < 240 * 160; p++) {
    const x = p % 240, y = (p / 240) | 0;
    if (mask && x >= mask[0] && x <= mask[2] && y >= mask[1] && y <= mask[3]) continue;
    if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) {
      n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  total += n; if (!n) exact++;
  lines.push(`age ${age} f${frame} ${n}${n ? ` bbox ${x0},${y0}-${x1},${y1}` : ""}`);
  if (pngDir && n) {
    mkdirSync(pngDir, { recursive: true });
    const ppm = Buffer.concat([Buffer.from("P6\n480 160\n255\n"), Buffer.alloc(480 * 160 * 3)]);
    const off = 15;
    for (let p = 0; p < 240 * 160; p++) {
      const x = p % 240, y = (p / 240) | 0;
      for (let c = 0; c < 3; c++) { ppm[off + (y * 480 + x) * 3 + c] = rgb[p * 3 + c]!; ppm[off + (y * 480 + 240 + x) * 3 + c] = rgba[p * 4 + c]!; }
    }
    writeFileSync(join(pngDir, `${String(age).padStart(3, "0")}.ppm`), ppm);
  }
}
console.log(lines.join("\n"));
console.log(`rows ${endFrame - startFrame + 1} exact ${exact} residual ${total}`);
