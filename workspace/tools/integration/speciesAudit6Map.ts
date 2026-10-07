/** speciesAudit6: dump ROM / live / diff PNG-able PPMs + row/col histogram of residual pixels at one age. usage: npx vite-node speciesAudit6Map.ts <fixture.json> <evidenceRunDir> <firstFrame> <age> <outPrefix> */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
const [fp, scratch, first, age, pre] = process.argv.slice(2);
const f = JSON.parse(readFileSync(resolve(fp!), "utf8")) as Fixture;
const live = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(live, liveView(f, Number(age)));
const rgb = readFileSync(join(scratch!, "rgb", `${String(Number(first) + Number(age)).padStart(5, "0")}.rgb`));
const mk = (g: (p: number) => number[]) => { const b = Buffer.alloc(240 * 160 * 3); for (let p = 0; p < 38400; p++) b.set(g(p), p * 3); return Buffer.concat([Buffer.from("P6\n240 160\n255\n"), b]); };
writeFileSync(`${pre}-rom.ppm`, mk(p => [rgb[p*3]!, rgb[p*3+1]!, rgb[p*3+2]!]));
writeFileSync(`${pre}-live.ppm`, mk(p => [live[p*4]!, live[p*4+1]!, live[p*4+2]!]));
const d = (p: number) => rgb[p*3] !== live[p*4] || rgb[p*3+1] !== live[p*4+1] || rgb[p*3+2] !== live[p*4+2];
writeFileSync(`${pre}-diff.ppm`, mk(p => d(p) ? [255, 0, 0] : [rgb[p*3]! >> 2, rgb[p*3+1]! >> 2, rgb[p*3+2]! >> 2]));
const rows = new Map<number, number>(); for (let p = 0; p < 38400; p++) if (d(p)) rows.set((p / 240) | 0, (rows.get((p / 240) | 0) ?? 0) + 1);
console.log("rows(y:n)", [...rows].map(([y, n]) => `${y}:${n}`).join(" "));
