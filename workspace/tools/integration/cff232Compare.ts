// cff232: Scene OFF CASTFORM_CHANGE morph vs the Scene OFF ROM (battle-scene-off mechanicLab frames from cff232OffCapture.ts). One class:
// ours (census route, Scene OFF) from the anchor row against the ROM lab frames from `romStart`; reports differing px per row in the Castform
// box and in the text box, for the morph's 117 rows and for the prints either side.
//   node --experimental-strip-types --no-warnings tools/integration/cff232Compare.ts --class=player-ice-after-hail --rom=/tmp/cff232/hail-off [--scene=on]
import { readFileSync } from "node:fs";
// @ts-expect-error pngjs ships no type declarations in this repo
import { PNG } from "pngjs";
import { CFF232_CLASSES } from "./cff232Classes.ts";
import { cff230Route } from "./cff230Route.ts";

export const TEXT_BOX: [number, number, number, number] = [0, 112, 240, 48];
export const boxDiff = (a: ArrayLike<number>, b: ArrayLike<number>, [bx, by, bw, bh]: [number, number, number, number]) => {
  let n = 0;
  for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) for (let c = 0; c < 3; c++) if (a[(y * 240 + x) * 4 + c] !== b[(y * 240 + x) * 4 + c]) { n++; break; }
  return n;
};
export const romFrame = (dir: string, frame: number) => PNG.sync.read(readFileSync(`${dir}/frame-${String(frame).padStart(5, "0")}.png`)).data as Buffer;

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const klass = CFF232_CLASSES.find((c) => c.name === arg("class"))!;
  const scene = (arg("scene") ?? "off") as "on" | "off";
  const seg = cff230Route(klass.seed, true, 1, scene).segments[0]!;
  const anchor = seg.frames.findIndex((f) => f.command === klass.anchorCommand);
  const romFrom = klass.romCommandStart - klass.leadRows;
  const box = { total: 0, peak: 0, differing: 0 }, text = { total: 0, peak: 0, differing: 0 }; let n = 0;
  const rows: string[] = [];
  for (let k = 0; k < klass.leadRows + 117 + klass.tailRows; k++) {
    const o = seg.frames[anchor + k]; if (!o) break;
    const r = romFrame(arg("rom")!, romFrom + k);
    const b = boxDiff(o.rgba, r, klass.box), t = boxDiff(o.rgba, r, TEXT_BOX);
    for (const [m, v] of [[box, b], [text, t]] as const) { m.total += v; m.peak = Math.max(m.peak, v); if (v) m.differing++; }
    n++; if (b || t) rows.push(`${k - klass.leadRows}:${b}/${t}`);
  }
  console.log(`${klass.name} (${scene}) rows ${n} (row 0 = the morph command's first row)`);
  console.log(`castform box: total ${box.total} peak ${box.peak} differing ${box.differing}/${n}`);
  console.log(`text box:     total ${text.total} peak ${text.peak} differing ${text.differing}/${n}`);
  console.log(`box/text per differing row: ${rows.slice(0, 60).join(" ")}${rows.length > 60 ? " ..." : ""}`);
}
