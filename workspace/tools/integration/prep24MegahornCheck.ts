/**
 * prep24 Megahorn: model (registers / battleBg / palette / tasks) vs retained corpora and fresh alternates, field by field per row.
 * usage: npx vite-node tools/integration/prep24MegahornCheck.ts [alt.json:player|opponent ...] [--out=out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import hornAsset from "../../src/animation/assets/mega-horn-horn-hit-2.json" with { type: "json" };
import drillAsset from "../../src/animation/assets/horn-drill.json" with { type: "json" };
import hitsplatAsset from "../../src/assets/gen/battle-anim-hitsplat.json" with { type: "json" };
import { megahornModel, type MegahornKnown24 } from "./prep24MegahornModel.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
export const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const bgr = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const asPal = (a: Json[]) => a.map(bgr);
const phaseOf = (rows: Json[], side: "player" | "opponent") => { const monbg = side === "player" ? "bg1cnt" : "bg2cnt";
  const cntRow = rows.findIndex((r, i) => i > 0 && r.registers[monbg] !== rows[0]!.registers[monbg]);
  const fin = rows.findIndex((r, i) => i > 156 && r.registers.bldy === 15);
  return { monbgCntRow: cntRow as 7 | 8, endLate: fin === 159 }; };
export function knownFor(rows: Json[], side: "player" | "opponent"): MegahornKnown24 {
  const r0 = rows[0]!, A = rows[100]!.resourceAllocators, pal = (tag: number) => rows[100]!.paletteTags.indexOf(tag);
  const t = r0.battlerSprites.target, tb = r0.animationBattlers.target;
  return { attackerSide: side, rows: rows.length, registers0: r0.registers, palette0: r0.hardwarePalette, unfaded0: r0.unfadedPalette,
    attackerSlot: r0.battlerSprites.attacker.slot, targetSlot: t.slot, targetBattler: tb,
    phase: phaseOf(rows, side),
    targetIdle: { x: t.x, y: t.y, x2: t.x2, y2: t.y2 }, hornBank: pal(10153) + 16, impactBank: pal(10135) + 16,
    hornPalette: asPal((hornAsset as Json).hornHit2.palette), impactPalette: asPal((hitsplatAsset as Json).palette), drillPalette: asPal((drillAsset as Json).drill.palette) };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function checkWindow(name: string, rows: Json[], side: "player" | "opponent") {
  const model = megahornModel(knownFor(rows, side)), out: Json = { name, rows: rows.length, fields: {}, firstMismatch: {} };
  const bump = (f: string, ok: boolean, r: number, extra?: string) => { out.fields[f] ??= { exact: 0, rows: 0 }; out.fields[f].rows += 1; if (ok) out.fields[f].exact += 1; else { out.fields[f].bad ??= []; if (out.fields[f].bad.length < 12) out.fields[f].bad.push(extra ? `${r}:${extra}` : r); } };
  const sorted = (t: Json[]) => t.map((x) => ({ slot: x.slot, callback: x.func.symbol, data: x.data }));
  for (let r = 0; r < rows.length; r += 1) {
    const want = rows[r]!, got = model[r]!;
    const regKeys = Object.keys(want.registers), bad = regKeys.filter((key) => want.registers[key] !== got.registers[key]);
    bump("registers", !bad.length, r, bad.map((key) => `${key}=${want.registers[key]}/${got.registers[key]}`).join(","));
    for (const key of regKeys) { out.regs ??= {}; out.regs[key] ??= 0; if (want.registers[key] === got.registers[key]) out.regs[key] += 1; }
    const bbad = Object.keys(want.battleBg).filter((key) => want.battleBg[key] !== got.battleBg[key]);
    bump("battleBg", !bbad.length, r, bbad.map((key) => `${key}=${want.battleBg[key]}/${got.battleBg[key]}`).join(","));
    const pbad: number[] = []; for (let i = 0; i < 512; i += 1) if (want.hardwarePalette[i] !== got.hardwarePalette[i]) pbad.push(i);
    bump("hardwarePalette", !pbad.length, r, pbad.length ? `${pbad.length}@${pbad[0]}` : undefined);
    const ubad: number[] = []; for (let i = 0; i < 512; i += 1) if (want.unfadedPalette[i] !== got.unfadedPalette[i]) ubad.push(i);
    bump("unfadedPalette", !ubad.length, r, ubad.length ? `${ubad.length}@${ubad[0]}` : undefined);
    const ws = sorted(want.tasks), ok = same(ws, got.tasks);
    bump("tasks", ok, r, ok ? undefined : JSON.stringify(ws.map((x: Json) => `${x.slot}:${x.callback}:${x.data.slice(0, 8)}`)) + "|" + JSON.stringify(got.tasks.map((x) => `${x.slot}:${x.callback}:${x.data.slice(0, 8)}`)));
    bump("targetX2Y2", want.battlerSprites.target.x2 === got.target.x2 && want.battlerSprites.target.y2 === got.target.y2, r, `${want.battlerSprites.target.x2},${want.battlerSprites.target.y2}/${got.target.x2},${got.target.y2}`);
  }
  return out;
}
if (!process.env.PREP24_LIB) {
  const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6);
  const results: Json[] = [];
  for (const side of ["player", "opponent"] as const) results.push(checkWindow(`accepted-${side}`, load(resolve(root, `tools/compare/evidence/mega-horn-${side}-dense-state.json.gz`)), side));
  for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, side] = spec.split(":"); results.push(checkWindow(`${file!.split("/").pop()!.replace(/-r1\.json$/, "")}`, load(file!), side as "player" | "opponent")); }
  console.log(JSON.stringify(results, null, 1));
  if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
}
