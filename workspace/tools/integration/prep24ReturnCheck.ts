/**
 * prep24 Return (strongest): OAM + matrices assembler vs retained corpora and fresh alternates, 128 entries + 32 matrices per row.
 * usage: npx vite-node tools/integration/prep24ReturnCheck.ts [alt.json:player|opponent ...] [--out=out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { assembleReturnHardwareOam, type ReturnKnown24 } from "./prep24ReturnAssembler.ts";
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
export const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
export function knownFor(rows: Json[], side: "player" | "opponent"): ReturnKnown24 {
  const row1 = rows[1]!, A = rows[34]!.resourceAllocators, order = row1.spriteOrder as number[], b = rows[0]!.battlerSprites;
  const splat = rows[157]!.sprites.find((s: Json) => /HitSplat/.test(s.template?.symbol ?? ""));      // the (0, 0)-offset impact: x, y == the target pic anchor
  const anySplat = rows[34]!.sprites.find((s: Json) => /HitSplat/.test(s.template?.symbol ?? ""));
  const mu = new Set<number>(); for (let i = 0; i < 32; i += 1) if (A.matrixBitmap >> i & 1) mu.add(i);
  const first = rows[0]!.resourceAllocators.matrixBitmap as number;      // activation bitmap (reserved ids)
  const freeIds = Array.from({ length: 32 }, (_, i) => i).filter((i) => !(first >> i & 1));
  const tk = (sym: string) => rows.findIndex((r) => r.tasks.some((t: Json) => t.func.symbol === sym));
  return { healthboxAttr: row1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: order.slice(0, 6), attackerSlot: b.attacker.slot, targetSlot: b.target.slot,
    attackerAttr: b.attacker.attr, targetAttr: b.target.attr, attackerIdleY2: b.attacker.y2, targetIdle: { x2: b.target.x2, y2: b.target.y2 },
    impactTile: anySplat.attr[2] & 0x3ff, impactBank: anySplat.attr[2] >> 12 & 0xf, xSign: (side === "opponent" ? -1 : 1) as 1 | -1, impactMatrixBase: freeIds, occupiedSlots: rows[0]!.sprites.map((s: Json) => s.slot),
    dummyAttr: [0x00a0, 0x0130, 0x0c00], targetCenter: { x: splat.x, y: splat.y }, monbgBirth: tk("Task_UpdateMonBg"), clearMonbg: tk("Task_ClearMonBg") };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function checkWindow(name: string, rows: Json[], side: "player" | "opponent") {
  const known = knownFor(rows, side), out: Json = { name, rows: rows.length, entries: 0, entryMatch: 0, rowsExact: 0, matrixRowsExact: 0, badRows: [] as string[], examples: [] as string[], byClass: {} };
  for (let age = 1; age < rows.length; age += 1) {
    const got = assembleReturnHardwareOam(age, { known, rows: rows.length, spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder });
    let ok = true; const exp: string[] = rows[age]!.hardwareOam;
    for (let i = 0; i < 128; i += 1) { out.entries += 1; if (got.oam[i] === exp[i]) out.entryMatch += 1; else { ok = false;
      const cls = i < 9 ? "healthbox" : "other"; out.byClass[cls] = (out.byClass[cls] ?? 0) + 1;
      if (out.examples.length < 8) out.examples.push(`${age}/${i}: want ${exp[i]} got ${got.oam[i]}`); } }
    if (ok) out.rowsExact += 1; else if (out.badRows.length < 20) out.badRows.push(String(age));
    if (same(got.matrices, rows[age]!.hardwareMatrices)) out.matrixRowsExact += 1;
  }
  return out;
}
if (!process.env.PREP24_LIB) {
  const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), results: Json[] = [];
  for (const side of ["player", "opponent"] as const) results.push(checkWindow(`accepted-${side}`, load(resolve(root, `tools/compare/evidence/return-${side}-dense-state.json.gz`)), side));
  for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, side] = spec.split(":"); results.push(checkWindow(file!.split("/").pop()!.replace(/-r1\.json$/, ""), load(file!), side as "player" | "opponent")); }
  console.log(JSON.stringify(results, null, 1));
  if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
}
