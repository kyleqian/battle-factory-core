/**
 * prep32 Flatter per-row field check: registers (all 21), palettes (unfaded / faded / hardware) and the 38 confetti sprites (slot, x, y,
 * x2, y2, tile, data[0..3], presence) on every row from the burst-end row 67, from `prep32FlatterModel.ts` (activation Random2 + K + P).
 *   npx vite-node tools/integration/prep32FlatterCheck.ts [<dense.json[.gz]>:player|opponent ...] [--neg=seed|registers|palette] [--out=<file>]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import flatterAsset from "../../src/animation/assets/flatter.json" with { type: "json" };
import { ANIM_TAG_CONFETTI, BURST_AGE, confettiState, confettiSteps, flatterConfetti, flatterPalettes, flatterRegisters } from "./prep32FlatterModel.ts";

type Json = Record<string, any>;
const NEG = process.argv.find((a) => a.startsWith("--neg="))?.slice(6) ?? "";
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const words = (rgb: Json[]): number[] => rgb.map((c) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10);
/** P: spotlight / confetti palettes (src/animation/assets/flatter.json, mGBA 5 -> 8 bit expansion inverted). */
const SPOTLIGHT = words((flatterAsset as Json).spotlight.palette), CONFETTI = words((flatterAsset as Json).confetti.palette);
const load = (p: string): Json[] => (JSON.parse((p.endsWith(".gz") ? gunzipSync(readFileSync(p)) : readFileSync(p)).toString("utf8")) as Json).frames;

function checkWindow(path: string): Json {
  const rows = load(path), r0 = rows[0]!;
  const free = (r0.resourceAllocators.paletteTags as number[]).map((t, i) => [t, i] as const).filter(([t, i]) => t === 0xffff && i >= r0.resourceAllocators.reservedPaletteCount).map(([, i]) => i);   // AllocSpritePalette: first free tag slot >= gReservedSpritePaletteCount
  const loads = [{ row: 1, bank: free[0]!, words: NEG === "palette" ? SPOTLIGHT.map((w, i) => (i === 3 ? w ^ 1 : w)) : SPOTLIGHT }, { row: 4, bank: free[1]!, words: CONFETTI }];
  const regs0 = NEG === "registers" ? { ...r0.registers, bg3cnt: r0.registers.bg3cnt ^ 1 } : r0.registers;
  const m = flatterConfetti(NEG === "seed" ? (r0.animationRng ^ 1) >>> 0 : r0.animationRng, (rows[BURST_AGE - 1]!.sprites as Json[]).map((s) => s.slot));
  const tagIdx = (rows[BURST_AGE]!.resourceAllocators.tileTags as number[]).indexOf(ANIM_TAG_CONFETTI), tileBase = rows[BURST_AGE]!.resourceAllocators.tileRanges[tagIdx][0];
  const out: Json = { window: path.split("/").pop()!.replace(/(-r1)?\.json(\.gz)?$/, ""), rows: rows.length, paletteBanks: loads.map((l) => 16 + l.bank), tileBase, fields: {} };
  const bump = (f: string, ok: boolean, r: number) => { const e = (out.fields[f] ??= { exact: 0, rows: 0, bad: [] as number[] }); e.rows += 1; if (ok) e.exact += 1; else if (e.bad.length < 10) e.bad.push(r); };
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r]!, pal = flatterPalettes(r, { unfaded: r0.unfadedPalette, faded: r0.fadedPalette, hardware: r0.hardwarePalette }, loads);
    bump("registers", same(flatterRegisters(r, regs0), row.registers), r);
    bump("unfadedPalette", same(pal.unfaded, row.unfadedPalette), r); bump("fadedPalette", same(pal.faded, row.fadedPalette), r); bump("hardwarePalette", same(pal.hardware, row.hardwarePalette), r);
    if (r < BURST_AGE + 2) continue;   // rows 65 / 66 are burst snapshots (T: partial births), prep32FlatterWords.ts
    const exp = m.confetti.map((c) => { const s = confettiState(c, confettiSteps(r)); return s && [c.slot, s.x, s.y, s.x2, s.y2, tileBase + c.tileOffset, ...s.data]; }).filter(Boolean);
    const got = (row.sprites as Json[]).filter((s) => /FlatterConfetti/.test(s.callback.symbol)).map((s) => [s.slot, s.x, s.y, s.x2, s.y2, s.attr[2] & 0x3ff, ...s.data.slice(0, 4)]);
    bump("confetti(38 x slot,x,y,x2,y2,tile,data0..3)", same(exp, got), r);
  }
  out.allExact = Object.values(out.fields).every((f: any) => f.exact === f.rows);
  for (const f of Object.values(out.fields) as Json[]) if (!f.bad.length) delete f.bad;
  return out;
}
const args = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((a) => a.replace(/:(player|opponent)$/, ""));
const windows = (args.length ? args : ["tools/compare/evidence/flatter-player-dense-state.json.gz", "tools/compare/evidence/flatter-opponent-dense-state.json.gz"]).map(checkWindow);
const outPath = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
if (outPath) writeFileSync(outPath, `${JSON.stringify({ schema: "prep32-flatter-check/v1", neg: NEG || null, windows }, null, 1)}\n`);
for (const w of windows) console.log(w.window, w.rows, w.allExact ? "ALL EXACT" : JSON.stringify(Object.fromEntries(Object.entries(w.fields).filter(([, f]: any) => f.exact !== f.rows).map(([n, f]: any) => [n, `${f.exact}/${f.rows} ${f.bad.join(",")}`]))));
