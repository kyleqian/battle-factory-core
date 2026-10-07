/**
 * prep26 Revenge: source-derived OAM / matrices / registers / battleBg / palettes / tasks / x2 vs the accepted corpora
 * (tools/compare/evidence/revenge-{player,opponent}-dense-state.json.gz, 145 rows) and fresh alternate probes (revengeProbe.py output).
 * usage: npx vite-node tools/integration/prep26RevengeCheck.ts [alt.json:player|opponent ...] [--out=out.json] [--neg=palette|oam|registers]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import hitsplatAsset from "../../src/assets/gen/battle-anim-hitsplat.json" with { type: "json" };
import revengeAsset from "../../src/animation/assets/revenge-purple-scratch-swipe.json" with { type: "json" };
import { assembleRevengeHardwareOam, xsOf, type RevengeKnown26 } from "./prep26RevengeAssembler.ts";
import { revengeModel, type RevengeModelKnown26 } from "./prep26RevengeModel.ts";
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
export const loadFrames = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
const bgr = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const NEG = process.argv.find((a) => a.startsWith("--neg="))?.slice(6);
export function knownFor(rows: Json[], side: "player" | "opponent"): { oam: RevengeKnown26; model: RevengeModelKnown26 } {
  const r0 = rows[0]!, row1 = rows[1]!, b = r0.battlerSprites, xs = xsOf(side);
  const sp = (r: number, re: RegExp) => rows[r]!.sprites.find((s: Json) => re.test(s.template?.symbol ?? ""));
  const small = sp(7, /SmallScratch/), big = sp(82, /BigScratch/), splat = sp(99, /PersistHitSplat/);
  const tk = (sym: string) => rows.findIndex((r) => r.tasks.some((t: Json) => t.func.symbol === sym));
  const bitmap = r0.resourceAllocators.matrixBitmap as number, free = Array.from({ length: 32 }, (_, i) => i).filter((i) => !(bitmap >> i & 1));
  const oam: RevengeKnown26 = { attackerSide: side, healthboxAttr: row1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: row1.spriteOrder.slice(0, 6),
    attackerSlot: b.attacker.slot, targetSlot: b.target.slot, attackerAttr: b.attacker.attr, targetAttr: b.target.attr, targetIdle: { x2: b.target.x2, y2: b.target.y2 },
    attackerAnchor: { x: small.x - 10 * xs, y: small.y + 10 }, targetCoord: { x: big.x - 10 * xs, y: big.y + 10 }, targetPic: { x: splat.x + 10 * xs, y: splat.y + 8 },
    occupiedSlots: r0.sprites.map((s: Json) => s.slot), dummyAttr: attrOf(row1.hardwareOam[127]),
    scratch: { tile: small.attr[2] & 0x3ff, bank: small.attr[2] >> 12 & 0xf }, swipe: { tile: big.attr[2] & 0x3ff, bank: big.attr[2] >> 12 & 0xf }, impact: { tile: splat.attr[2] & 0x3ff, bank: splat.attr[2] >> 12 & 0xf },
    freeMatrices: free, monbgBirth: tk("Task_UpdateMonBg"), clearMonbg: tk("Task_ClearMonBg") };
  const monbg = side === "player" ? "bg1cnt" : "bg2cnt", t = b.target;
  const model: RevengeModelKnown26 = { rows: rows.length, registers0: r0.registers, bodyWin: { win0h: row1.registers.win0h, win0v: row1.registers.win0v },
    palette0: r0.hardwarePalette, faded0: r0.fadedPalette, unfaded0: r0.unfadedPalette, attackerBattler: r0.animationBattlers.attacker, targetBattler: r0.animationBattlers.target, targetSlot: t.slot,
    targetIdle: { x: t.x, y: t.y, x2: t.x2, y2: t.y2 }, scratchPalette: (revengeAsset as Json).purpleScratch.palette.map(bgr).concat(Array(16).fill(0)).slice(0, 16),
    impactPalette: (hitsplatAsset as Json).palette.map(bgr), bank: oam.scratch.bank, phase: { monbgCntRow: rows.findIndex((r, i) => i > 0 && r.registers[monbg] !== r0.registers[monbg]) }, oam };
  return { oam, model };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function checkWindow(name: string, rows: Json[], side: "player" | "opponent") {
  const { oam: known, model: mk } = knownFor(rows, side);
  const out: Json = { name, rows: rows.length, entries: 0, entryMatch: 0, oamRowsExact: 0, matrixRowsExact: 0, badRows: [] as number[], examples: [] as string[], fields: {}, phase: mk.phase };
  for (let age = 1; age < rows.length; age += 1) {
    const got = assembleRevengeHardwareOam(age, { known, spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder }); let ok = true; const exp: string[] = rows[age]!.hardwareOam;
    for (let i = 0; i < 128; i += 1) { out.entries += 1; if (got.oam[i] === exp[i]) out.entryMatch += 1; else { ok = false; if (out.examples.length < 6) out.examples.push(`${age}/${i}: want ${exp[i]} got ${got.oam[i]}`); } }
    if (ok) out.oamRowsExact += 1; else if (out.badRows.length < 24) out.badRows.push(age);
    if (same(got.matrices, rows[age]!.hardwareMatrices)) out.matrixRowsExact += 1;
  }
  const model = revengeModel(NEG === "palette" ? { ...mk, scratchPalette: mk.scratchPalette.map((c) => c ^ 1) } : mk);
  const bump = (f: string, ok: boolean, r: number, extra?: string) => { out.fields[f] ??= { exact: 0, rows: 0 }; out.fields[f].rows += 1; if (ok) out.fields[f].exact += 1; else { out.fields[f].bad ??= []; if (out.fields[f].bad.length < 8) out.fields[f].bad.push(extra ? `${r}:${extra}` : r); } };
  for (let r = 0; r < rows.length; r += 1) { const want = rows[r]!, got = model[r]!;
    const bad = Object.keys(want.registers).filter((key) => want.registers[key] !== got.registers[key]);
    bump("registers", !bad.length, r, bad.map((key) => `${key}=${want.registers[key]}/${got.registers[key]}`).join(","));
    const bbad = Object.keys(want.battleBg).filter((key) => want.battleBg[key] !== got.battleBg[key]); bump("battleBg", !bbad.length, r, bbad.map((key) => `${key}=${want.battleBg[key]}/${got.battleBg[key]}`).join(","));
    for (const f of ["hardwarePalette", "unfadedPalette", "fadedPalette"] as const) { const pb: number[] = []; for (let i = 0; i < 512; i += 1) if (want[f][i] !== got[f][i]) pb.push(i); bump(f, !pb.length, r, pb.length ? `${pb.length}@${pb[0]}` : undefined); }
    const ws = want.tasks.map((x: Json) => ({ slot: x.slot, callback: x.func.symbol, data: x.data })), tok = same(ws, got.tasks);
    bump("tasks", tok, r, tok ? undefined : JSON.stringify(ws.map((x: Json) => `${x.slot}:${x.callback.slice(0, 12)}:${x.data.slice(0, 5)}`)) + "|" + JSON.stringify(got.tasks.map((x) => `${x.slot}:${x.callback.slice(0, 12)}:${x.data.slice(0, 5)}`)));
    bump("targetX2", want.battlerSprites.target.x2 === got.targetX2, r, `${want.battlerSprites.target.x2}/${got.targetX2}`); }
  return out;
}
if (!process.env.PREP26_LIB) {
  const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), results: Json[] = [];
  for (const side of ["player", "opponent"] as const) results.push(checkWindow(`accepted-${side}`, loadFrames(resolve(root, `tools/compare/evidence/revenge-${side}-dense-state.json.gz`)), side));
  for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, side] = spec.split(":"); results.push(checkWindow(file!.split("/").pop()!.replace(/-r1\.json$/, ""), loadFrames(file!), side as "player" | "opponent")); }
  for (const r of results) console.log(r.name, `rows ${r.rows} oam ${r.oamRowsExact}/${r.rows - 1} mat ${r.matrixRowsExact}/${r.rows - 1}`, Object.entries(r.fields).map(([f, v]: any) => `${f} ${v.exact}/${v.rows}`).join(" "), JSON.stringify(r.phase));
  if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
}
