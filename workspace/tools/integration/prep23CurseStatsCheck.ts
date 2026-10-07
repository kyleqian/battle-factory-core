/**
 * prep23: stats-branch Curse model vs corpora / alternates, field by field per row.
 * usage: npx vite-node tools/integration/prep23CurseStatsCheck.ts <name>:<corpus.json[.gz]>:<player|opponent> ... [--out=receipt.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { curseStatsRow } from "./prep23CurseStats.ts";
import { knownFor } from "./prep23CurseStatsKnown.ts";
type Json = Record<string, any>;
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
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
