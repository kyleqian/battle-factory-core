import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderBattleResolutionLiveView } from "/Users/kyle/Developer/pokebench/pokeemerald-factory-core/workspace/.worktrees/integration-20261005-024310/workspace/src/engine/battleScene.ts";
import { liveView } from "/Users/kyle/Developer/pokebench/pokeemerald-factory-core/workspace/.worktrees/integration-20261005-024310/workspace/tools/integration/liveAdapterFramebuffer.ts";
const [fp, dir, age, x0, x1, y0, y1] = process.argv.slice(2);
const fixture = JSON.parse(readFileSync(resolve(fp), "utf8"));
const c = JSON.parse(readFileSync(join(dir, "live-comparison.json"), "utf8"));
const row = c.comparisons.find((r: any) => r.age === Number(age));
const rgb = readFileSync(join(dir, "rgb", `${String(row.frame).padStart(5, "0")}.rgb`));
const rgba = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(rgba, liveView(fixture, Number(age)));
const pal = new Map<string, string>(); const ch = (k: string) => { if (!pal.has(k)) pal.set(k, "0123456789abcdefghijklmnopqrstuvwxyz"[pal.size] ?? "?"); return pal.get(k)!; };
for (let y = Number(y0); y <= Number(y1); y++) { let a = "", b = "";
  for (let x = Number(x0); x <= Number(x1); x++) { const p = y * 240 + x; a += ch(`${rgb[p*3]},${rgb[p*3+1]},${rgb[p*3+2]}`); b += ch(`${rgba[p*4]},${rgba[p*4+1]},${rgba[p*4+2]}`); }
  console.log(String(y).padStart(3), a, "|", b); }
console.log([...pal].map(([k, v]) => `${v}=${k}`).join(" "));
