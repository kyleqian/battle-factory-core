// cff230: writes our census-route frame (command `cmd`, row `k`) beside the oracle frame `romFrame` of `romDir`: node ... cff230Pair.ts seed romDir romFrame cmd k out.png
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { cff230Route } from "./cff230Route.ts";
const [seed, rom, romFrame, cmd, k, out] = [Number(process.argv[2]), process.argv[3]!, Number(process.argv[4]), Number(process.argv[5]), Number(process.argv[6]), process.argv[7]!];
const s = cff230Route(seed, true, 1).segments[0]!;
const o = s.frames[s.frames.findIndex((f) => f.command === cmd) + k]!;
const r = PNG.sync.read(readFileSync(`${rom}/frame-${String(romFrame).padStart(5, "0")}.png`));
const png = new PNG({ width: 480, height: 160 });
for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) for (let c = 0; c < 4; c++) {
  png.data[(y * 480 + x) * 4 + c] = o.rgba[(y * 240 + x) * 4 + c]!;
  png.data[(y * 480 + 240 + x) * 4 + c] = r.data[(y * 240 + x) * 4 + c]!;
}
writeFileSync(out, PNG.sync.write(png));
