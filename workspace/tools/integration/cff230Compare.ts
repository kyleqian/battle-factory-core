import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { cff230Route } from "./cff230Route.ts";
const [seed, rom, romStart, ourCmd, box] = [Number(process.argv[2]), process.argv[3]!, Number(process.argv[4]), Number(process.argv[5]), process.argv[6] ?? "0,40,110,72"];
const [bx, by, bw, bh] = box.split(",").map(Number) as [number, number, number, number];
const { segments } = cff230Route(seed, true, Number(process.argv[7] ?? 1));
const s = segments.find((x) => x.commands.some((c: any) => c.animation === "CASTFORM_CHANGE") || true)!;
const first = s.frames.findIndex((f) => f.command === ourCmd);
const rows: string[] = []; let tot = 0, peak = 0, differing = 0, n = 0;
for (let k = 0; k < 215; k++) {
  const o = s.frames[first + k]; if (!o) break;
  const p = `${rom}/frame-${String(romStart + k).padStart(5, "0")}.png`;
  let png; try { png = PNG.sync.read(readFileSync(p)); } catch { break; }
  let d = 0;
  for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) for (let c = 0; c < 3; c++) if (o.rgba[(y * 240 + x) * 4 + c] !== png.data[(y * 240 + x) * 4 + c]) { d++; break; }
  tot += d; peak = Math.max(peak, d); if (d > 0) differing += 1; n += 1; rows.push(`${k}:${d}`);
}
console.log(`total ${tot} peak ${peak} differingFrames ${differing}/${n}`); console.log(rows.join(" "));
