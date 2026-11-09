/**
 * curse-live: field-by-field check of the PRODUCTION live Curse inputs (liveMoveAnimationPresentation -> CURSE config) against
 * a retained dense corpus of the same window (hardware OAM, registers, gBattle_BG*, hardware palette, live tasks), plus the
 * live-renderer framebuffer against that corpus's raw RGB. The corpus is read here for verification only.
 *   npx vite-node tools/integration/curseLiveCheck.ts <fixture.json>:<corpus.json[.gz]>:<rgbDir|tar=path> ... [--out=receipt.json]
 */
import { execFileSync } from "node:child_process";
import "../../src/engine/monPicPixelsInstall.ts";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** Palette words the CURSE stats renderer reads: BG banks 2-4 (battle background) and the battler OBJ banks 16 / 17 (the only
 * drawn objects). The assets-only composite leaves the text / window / healthbox banks the controller composes itself at 0. */
const consumed = (palette: readonly number[]) => [...palette.slice(32, 80), ...palette.slice(256, 288)];
const find = (dir: string, name: string): string | null => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { const r = find(p, name); if (r) return r; } else if (e.name === name) return p;
  }
  return null;
};
const args = process.argv.slice(2), out = args.find((a) => a.startsWith("--out="))?.slice(6);
const results: Json[] = [];
for (const spec of args.filter((a) => !a.startsWith("--"))) {
  const [fixturePath, corpus, rgbSpec] = spec.split(":") as [string, string, string];
  const fixture = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Fixture;
  const rows = load(corpus);
  let dir = rgbSpec, scratch: string | null = null;
  if (rgbSpec.startsWith("tar=")) { dir = scratch = createScratchDir("curse-live-check-"); execFileSync("tar", ["-xzf", resolve(root, rgbSpec.slice(4)), "-C", dir]); }
  const count = { oam: 0, regs: 0, bbg: 0, pal: 0, tasks: 0, px: 0 }; const miss: Record<string, number[]> = { oam: [], regs: [], bbg: [], pal: [], tasks: [], px: [] };
  let residual = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const view = liveView(fixture, age), effect = view.effect as Json, row = rows[age]!;
    const state = liveMoveAnimationPresentation(effect.request, view.field, age, undefined, effect.spriteAllocatorInput,
      effect.spriteOrderInput, undefined, effect.battlerX2Input);
    if (!state) throw new Error(`${fixturePath}: adapter declined at age ${age}`);
    const inputs = (state.config as Json).animationInputs;
    const tasks = row.tasks.map((t: Json) => ({ slot: t.slot, callback: t.func?.symbol ?? "", data: t.data }));
    const checks: [keyof typeof count, boolean][] = [
      ["oam", age === 0 || same(inputs.buffers.hardwareOam, row.hardwareOam)], ["regs", same(inputs.registers, row.registers)],
      ["bbg", same(inputs.battleBg, row.battleBg)], ["pal", same(consumed(inputs.palette.hardware), consumed(row.hardwarePalette))],
      ["tasks", same(inputs.liveTasks, tasks)]];
    for (const [k, ok] of checks) { if (ok) count[k] += 1; else if (miss[k]!.length < 8) miss[k]!.push(age); }
    const file = find(dir, `${String(row.frame).padStart(5, "0")}.rgb`);
    if (!file) throw new Error(`missing RGB ${row.frame}`);
    const raw = readFileSync(file);
    if (createHash("sha256").update(raw).digest("hex") !== row.sha256) throw new Error("RGB drift");
    const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(fb, view);
    let d = 0; for (let p = 0; p < 38400; p += 1) if (fb[p * 4] !== raw[p * 3] || fb[p * 4 + 1] !== raw[p * 3 + 1] || fb[p * 4 + 2] !== raw[p * 3 + 2]) d += 1;
    residual += d; if (!d) count.px += 1; else if (miss.px!.length < 8) miss.px!.push(age);
  }
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  const r = { fixture: fixturePath, rows: rows.length, ...count, residualPixels: residual, firstMisses: miss };
  console.log(JSON.stringify(r)); results.push(r);
}
if (out) writeFileSync(out, `${JSON.stringify(results, null, 1)}\n`);
