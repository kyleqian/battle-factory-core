import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";

export type HiddenPowerChangeRow = readonly [age: number, changedPixels: number, minX: number, minY: number, maxX: number, maxY: number];

export function buildHiddenPowerChangeMap(densePath: string, rgbArchive: string): HiddenPowerChangeRow[] {
  const frames = JSON.parse(gunzipSync(readFileSync(densePath)).toString("utf8")).frames as { frame: number }[];
  const scratch = createScratchDir("hidden-power-change-map-");
  const untar = spawnSync("tar", ["-xzf", rgbArchive, "-C", scratch], { encoding: "utf8" });
  if (untar.status !== 0) throw new Error(untar.stderr);
  const rows: HiddenPowerChangeRow[] = [];
  let previous = readFileSync(join(scratch, `${String(frames[0]!.frame).padStart(5, "0")}.rgb`));
  for (let age = 1; age < frames.length; age += 1) {
    const current = readFileSync(join(scratch, `${String(frames[age]!.frame).padStart(5, "0")}.rgb`));
    let count = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
      const x = pixel % 240; const y = Math.floor(pixel / 240);
      count += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    rows.push([age, count, count ? minX : -1, count ? minY : -1, count ? maxX : -1, count ? maxY : -1]);
    previous = current;
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length !== 5) throw new Error("usage: hiddenPowerChangeMap.ts <dense.json.gz> <rgb.tar.gz> <output.json>");
  writeFileSync(process.argv[4]!, `${JSON.stringify({ schema: "hidden-power-normalized-change-map/v1", rows: buildHiddenPowerChangeMap(process.argv[2]!, process.argv[3]!) })}\n`);
}
