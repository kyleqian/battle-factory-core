// prep8: pixel sensitivity of the accepted order inputs. Renders the accepted config of each order-consuming move through the accepted renderer against the accepted raw RGB (full frame, ROM) with the
// order fields replaced by alternative orders (reverse / rotate / ascending-slot / production-provider-derived), both orientations. 0 residual pixels everywhere = the field is pixel-neutral on the accepted scenario.
//   node --experimental-strip-types tools/integration/prep8OrderPixels.ts > tools/integration/fixtures/prep8-order-pixels.json
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { acceptedConfig, MOVE_ID, EVIDENCE, sideOf } from "./prep8Accepted.mjs";
import { knownEntrySpriteOrderState, spriteOrderForSlots, spriteOrderWithOccupiedPrefix, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
const RES = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]);
const prov = knownEntrySpriteOrderState("battle-lab-ordinary-singles");
const PROV64 = spriteOrderWithOccupiedPrefix(prov, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)!;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
// collect [container, key] handles of numeric order fields
function orderHandles(o: any, out: any[] = []): any[] { if (Array.isArray(o)) o.forEach((x) => orderHandles(x, out)); else if (o && typeof o === "object") { for (const k of ["order", "persistentOrder"]) if (typeof o[k] === "number") out.push([o, k]); for (const v of Object.values(o)) if (typeof v === "object") orderHandles(v, out); } return out; }
function seedRef(c: any): [any, string] | null { const p = c.animationProfile ?? {}; if (Array.isArray(p.spriteOrderSeed)) return [p, "spriteOrderSeed"]; if (c.animationInputs && Array.isArray(c.animationInputs.spriteOrder)) return [c.animationInputs, "spriteOrder"]; if (Array.isArray(p.impactOrders)) return null; return null; }
const variantsFor = (move: string, base: any): Record<string, (c: any) => any> => {
  const v: Record<string, (c: any) => any> = {};
  const nh = orderHandles(base.animationProfile ?? {}).length;
  if (nh > 1) {
    v.reverseOrderValues = (c) => { const h = orderHandles(c.animationProfile), vals = h.map(([o, k]) => o[k]).reverse(); h.forEach(([o, k], i) => (o[k] = vals[i]!)); return c; };
    v.rotateOrderValues = (c) => { const h = orderHandles(c.animationProfile), vals = h.map(([o, k]) => o[k]); h.forEach(([o, k], i) => (o[k] = vals[(i + 1) % vals.length]!)); return c; };
    v.ascendingOrderValues = (c) => { const h = orderHandles(c.animationProfile), vals = h.map(([o, k]) => o[k]).sort((a, b) => a - b); h.forEach(([o, k], i) => (o[k] = vals[i]!)); return c; };
  }
  if (Array.isArray(base.animationProfile?.impactOrders)) {
    v.impactOrdersSwapped = (c) => { c.animationProfile.impactOrders = [...c.animationProfile.impactOrders].reverse(); return c; };
    v.impactOrdersProviderIndex = (c) => { c.animationProfile.impactOrders = c.animationProfile.impactSlots.map((s: number) => PROV64.indexOf(s)); return c; };
  }
  const sr = seedRef(base);
  if (sr) {
    const isFull = sr[0][sr[1]].length === 64;
    v.seedReverseFree = (c) => { const [o, k] = seedRef(c)!; const free = o[k].filter((s: number) => !RES.has(s)).reverse(); let i = 0; o[k] = o[k].map((s: number) => (RES.has(s) ? s : free[i++]!)); return c; };
    v.seedAscendingSlots = (c) => { const [o, k] = seedRef(c)!; const free = o[k].filter((s: number) => !RES.has(s)).sort((a: number, b: number) => a - b); let i = 0; o[k] = o[k].map((s: number) => (RES.has(s) ? s : free[i++]!)); return c; };
    v.seedProviderFirstBody = (c) => { const [o, k] = seedRef(c)!; o[k] = isFull ? [...PROV64] : spriteOrderForSlots(prov, o[k])!; return c; };
  }
  return v;
};
const out: any = { schema: "prep8-order-pixels/v1", note: "full-frame diff vs accepted raw RGB (HUD included: accepted fixtures); variants alter ONLY the order inputs", cases: [] };
const only = process.argv.slice(2);
for (const move of Object.keys(MOVE_ID)) for (const o of ["player-back", "opponent-front"] as const) {
  if (only.length && !only.includes(move)) continue;
  const ev = EVIDENCE[move as keyof typeof EVIDENCE], side = sideOf(o);
  const base = acceptedConfig(move, o).config as any; const vf = variantsFor(move, base);
  const rows = JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/${ev}-${side}-dense-state.json.gz`)).toString("utf8")).frames as any[];
  const scratch = createScratchDir(`pokebench-prep8-${ev}-${side}-`); execFileSync("tar", ["-xzf", `tools/compare/evidence/${ev}-${side}-raw-rgb.tar.gz`, "-C", scratch]);
  const find = (n: string) => { try { return readFileSync(`${scratch}/${n}`); } catch { return readFileSync(execFileSync("find", [scratch, "-name", n], { encoding: "utf8" }).trim().split("\n")[0]!); } };
  const rec: any = { move, orientation: o, rows: rows.length, variants: {} };
  for (const [name, f] of Object.entries({ accepted: (c: any) => c, ...vf })) {
    const stage = createSceneOnMovePresentation(f(clone(base)));
    const perAge: number[] = []; let total = 0;
    for (const [age, row] of rows.entries()) {
      const rgba = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } } as EngineState); const raw = find(`${String(row.frame).padStart(5, "0")}.rgb`);
      let d = 0; for (let p = 0; p < 240 * 160; p++) if (raw[p * 3] !== rgba[p * 4] || raw[p * 3 + 1] !== rgba[p * 4 + 1] || raw[p * 3 + 2] !== rgba[p * 4 + 2]) d++;
      perAge.push(d); total += d;
    }
    rec.variants[name] = { totalDiffPixels: total, framesWithDiff: perAge.filter((x) => x).length, firstDiffAges: perAge.map((x, i) => (x ? i : -1)).filter((i) => i >= 0).slice(0, 10) };
  }
  out.cases.push(rec); console.error(move, o, JSON.stringify(Object.fromEntries(Object.entries(rec.variants).map(([k, v]: any) => [k, v.totalDiffPixels]))));
}
console.log(JSON.stringify(out));
