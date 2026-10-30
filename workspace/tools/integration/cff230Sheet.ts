// cff230: contact sheet of oracle PNGs (frame-NNNNN.png in a directory), optionally cropped.
//   node --experimental-strip-types --no-warnings tools/integration/cff230Sheet.ts --dir=D --frames=472:800:12 --out=x.png [--crop=x,y,w,h] [--cols=6]
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const [a, b, s] = arg("frames")!.split(":").map(Number);
const frames: number[] = []; for (let f = a!; f <= b!; f += s!) frames.push(f);
const [cx, cy, cw, ch] = (arg("crop") ?? "0,0,240,160").split(",").map(Number) as [number, number, number, number];
const cols = Number(arg("cols") ?? 6);
const rows = Math.ceil(frames.length / cols);
const out = new PNG({ width: cols * cw, height: rows * ch });
out.data.fill(255);
frames.forEach((f, k) => {
  const png = PNG.sync.read(readFileSync(`${arg("dir")}/frame-${String(f).padStart(5, "0")}.png`));
  const ox = (k % cols) * cw, oy = Math.floor(k / cols) * ch;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) for (let c = 0; c < 4; c++) out.data[((oy + y) * out.width + ox + x) * 4 + c] = png.data[((cy + y) * png.width + cx + x) * 4 + c]!;
});
writeFileSync(arg("out")!, PNG.sync.write(out));
console.log(frames.join(","));
