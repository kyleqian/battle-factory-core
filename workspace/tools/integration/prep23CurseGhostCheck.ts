/**
 * prep23: ghost-branch Curse model vs corpora / alternates (field by field per row).
 * usage: npx vite-node tools/integration/prep23CurseGhostCheck.ts <name>:<corpus.json[.gz]>:<player|opponent> ... [--out=receipt.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import curseAsset from "../../src/animation/assets/curse.json" with { type: "json" };
import { curseGhostRow, type CurseGhostKnown } from "./prep23CurseGhost.ts";
import type { Oam3 } from "./prep23CurseStats.ts";
type Json = Record<string, any>;
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string): Oam3 => [word(e, 0), word(e, 4), word(e, 8)];
const bgr555 = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
export function ghostKnownFor(rows: Json[], side: "player" | "opponent"): CurseGhostKnown {
  const r0 = rows[0]!, r1 = rows[1]!, ids = r0.animationBattlers.spriteIds as number[], A = ids[side === "player" ? 0 : 1]!, D = ids[side === "player" ? 1 : 0]!;
  const spr = (r: Json, slot: number) => r.sprites.find((s: Json) => s.slot === slot);
  const nailRow = rows.find((r) => r.sprites.some((s: Json) => s.template?.symbol === "gCurseNailSpriteTemplate"))!, ghostRow = rows.find((r) => r.sprites.some((s: Json) => s.template?.symbol === "gCurseGhostSpriteTemplate"))!;
  const nail = nailRow.sprites.find((s: Json) => s.template?.symbol === "gCurseNailSpriteTemplate"), ghost = ghostRow.sprites.find((s: Json) => s.template?.symbol === "gCurseGhostSpriteTemplate");
  const tiles = (r: Json, tag: number) => { const i = r.tileTags.slice(0, 64).indexOf(tag); return r.resourceAllocators.tileRanges[i][0]; };
  const banks = (r: Json, tag: number) => r.paletteTags.indexOf(tag);
  return { side, healthboxAttr: r1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: r1.spriteOrder.slice(0, 6), dummyAttr: [0x00a0, 0x0130, 0x0c00],
    attackerSlot: A, targetSlot: D, attackerAttr: spr(r0, A).attr, targetAttr: spr(r0, D).attr, attackerX: spr(r0, A).x, attackerY: spr(r0, A).y, targetX: spr(r0, D).x, targetY: spr(r0, D).y,
    nailAnchor: { x: nail.x - (side === "player" ? 24 : -24), y: nail.y }, ghostAnchor: { x: ghost.x, y: ghost.y },
    nailTileBase: tiles(nailRow, 10199), nailBank: banks(nailRow, 10199) , ghostTileBase: tiles(ghostRow, 10200), ghostBank: banks(ghostRow, 10200), sprite3: nail.slot,
    activationRegisters: r0.registers, bodyRegisters: r1.registers, hardwareMatrices: r1.hardwareMatrices, activationPalette: r0.hardwarePalette,
    nailPalette: (curseAsset as any).nail.palette.map(bgr555), ghostPalette: (curseAsset as any).ghost.palette.map(bgr555), spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder };
}
export function checkGhost(name: string, rows: Json[], side: "player" | "opponent") {
  const k = ghostKnownFor(rows, side);
  const cnt: Json = { name, rows: rows.length, oamRows: 0, oamRowsExact: 0, tasksExact: 0, regsExact: 0, bbgExact: 0, palExact: 0, mismatch: {} as Record<string, number[]> };
  const bad = (c: string, r: number) => { (cnt.mismatch[c] ??= []).push(r); };
  for (let a = 0; a < rows.length; a += 1) {
    const m = curseGhostRow(a, k), row = rows[a]!;
    if (m.hardwareOam) { cnt.oamRows += 1; if (JSON.stringify(m.hardwareOam) === JSON.stringify(row.hardwareOam)) cnt.oamRowsExact += 1; else bad("hardwareOam", a); }
    const t = row.tasks.map((x: Json) => ({ slot: x.slot, callback: (x.func?.symbol ?? "") , data: x.data.slice(0, 16) }));
    if (JSON.stringify(m.tasks) === JSON.stringify(t)) cnt.tasksExact += 1; else bad("tasks", a);
    if (JSON.stringify(m.registers) === JSON.stringify(row.registers)) cnt.regsExact += 1; else bad("registers", a);
    if (JSON.stringify(m.battleBg) === JSON.stringify(row.battleBg)) cnt.bbgExact += 1; else bad("battleBg", a);
    if (JSON.stringify(m.hardwarePalette) === JSON.stringify(row.hardwarePalette)) cnt.palExact += 1; else bad("hardwarePalette", a);
  }
  return cnt;
}
if (process.argv.slice(2).some((x) => x.includes(":"))) {
  const args = process.argv.slice(2), out = args.find((x) => x.startsWith("--out="))?.slice(6);
  const res = args.filter((x) => !x.startsWith("--")).map((spec) => { const [name, file, side] = spec.split(":"); return checkGhost(name!, load(file!), side as never); });
  for (const r of res) console.log(JSON.stringify({ ...r, mismatch: Object.fromEntries(Object.entries(r.mismatch).map(([c, v]) => [c, `${(v as number[]).length}: ${(v as number[]).slice(0, 16).join(",")}`])) }));
  if (out) writeFileSync(out, `${JSON.stringify(res, null, 1)}\n`);
}
