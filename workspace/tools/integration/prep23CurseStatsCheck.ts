/**
 * prep23: stats-branch Curse model vs corpora / alternates, field by field per row.
 * usage: npx vite-node tools/integration/prep23CurseStatsCheck.ts <name>:<corpus.json[.gz]>:<player|opponent> ... [--out=receipt.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { curseStatsRow, type CurseStatsKnown, type Oam3 } from "./prep23CurseStats.ts";
type Json = Record<string, any>;
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string): Oam3 => [word(e, 0), word(e, 4), word(e, 8)];
export function knownFor(rows: Json[], side: "player" | "opponent"): CurseStatsKnown {
  const r0 = rows[0]!, r1 = rows[1]!, att = r0.battlerSprites.attacker, tgt = r0.battlerSprites.target;
  const attackerSprite = r0.sprites.find((s: Json) => s.slot === att.slot);
  return { side, healthboxAttr: r1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: r1.spriteOrder.slice(0, 6), dummyAttr: [0x00a0, 0x0130, 0x0c00],
    attackerSlot: att.slot, targetSlot: r0.animationBattlers.spriteIds[side === "player" ? 1 : 0], attackerAttr: att.attr, targetAttr: r0.sprites.find((s: Json) => s.slot === r0.animationBattlers.spriteIds[side === "player" ? 1 : 0]).attr,
    attackerX: attackerSprite.x, attackerY: attackerSprite.y, occupiedSlots: r0.sprites.map((s: Json) => s.slot),
    activationRegisters: r0.registers, bodyRegisters: r1.registers, activationPalette: r0.hardwarePalette, attackerObjBank: att.attr[2] >> 12, hardwareMatrices: r1.hardwareMatrices,
    spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder };
}
export function checkWindow(name: string, rows: Json[], side: "player" | "opponent") {
  const k = knownFor(rows, side);
  const cnt: Json = { name, rows: rows.length, oamRowsExact: 0, oamRows: 0, tasksExact: 0, regsExact: 0, palExact: 0, matExact: 0, mismatch: {} as Record<string, number[]> };
  const bad = (cls: string, row: number) => { (cnt.mismatch[cls] ??= []).push(row); };
  for (let a = 0; a < rows.length; a += 1) {
    const m = curseStatsRow(a, k), row = rows[a]!;
    if (m.hardwareOam) { cnt.oamRows += 1; if (JSON.stringify(m.hardwareOam) === JSON.stringify(row.hardwareOam)) cnt.oamRowsExact += 1; else bad("hardwareOam", a); }
    const t = row.tasks.map((x: Json) => ({ slot: x.slot, callback: x.func?.symbol ?? "", data: x.data.slice(0, 16) }));
    if (JSON.stringify(m.tasks) === JSON.stringify(t)) cnt.tasksExact += 1; else bad("tasks", a);
    if (JSON.stringify(m.registers) === JSON.stringify(row.registers)) cnt.regsExact += 1; else bad("registers", a);
    if (JSON.stringify(m.hardwarePalette) === JSON.stringify(row.hardwarePalette)) cnt.palExact += 1; else bad("hardwarePalette", a);
    if (JSON.stringify(m.hardwareMatrices) === JSON.stringify(row.hardwareMatrices)) cnt.matExact += 1; else bad("hardwareMatrices", a);
  }
  return cnt;
}
if (process.argv.slice(2).some((x) => x.includes(":"))) {
  const args = process.argv.slice(2), out = args.find((x) => x.startsWith("--out="))?.slice(6);
  const res = args.filter((x) => !x.startsWith("--")).map((spec) => { const [name, file, side] = spec.split(":"); return checkWindow(name!, load(file!), side as never); });
  for (const r of res) console.log(JSON.stringify({ ...r, mismatch: Object.fromEntries(Object.entries(r.mismatch).map(([c, v]) => [c, `${(v as number[]).length}: ${(v as number[]).slice(0, 14).join(",")}`])) }));
  if (out) writeFileSync(out, `${JSON.stringify(res, null, 1)}\n`);
}
