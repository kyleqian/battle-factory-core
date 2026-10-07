/**
 * prep26 Ice Ball: source-derived sprite program / OAM / matrices / registers / battleBg / palettes / tasks vs the accepted corpora
 * (tools/compare/fixtures/ice-ball/{player,opponent}-dense.json.gz, 5 bodies each) and fresh alternate probes (iceBallProbe.py output).
 * usage: npx vite-node tools/integration/prep26IceBallCheck.ts [alt.json:player|opponent ...] [--out=out.json] [--neg=lag|words|palette|oam]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import iceBallAsset from "../../src/animation/assets/ice-ball.json" with { type: "json" };
import crystalAsset from "../../src/assets/gen/battle-anim-ice-crystals.json" with { type: "json" };
import icyWindAsset from "../../src/animation/assets/icy-wind.json" with { type: "json" };
import { assembleIceBallHardwareOam, type IceBallKnown26 } from "./prep26IceBallAssembler.ts";
import { iceBallModel, type IceBallModelKnown26 } from "./prep26IceBallModel.ts";
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
export const loadBodies = (p: string): Json[][] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).bodies; };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
const bgr = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const NEG = process.argv.find((a) => a.startsWith("--neg="))?.slice(6);
export const stalls = (rows: Json[]) => rows.flatMap((r, i) => i > 0 && r.animationRng === rows[i - 1]!.animationRng ? [i] : []);
export function knownFor(rows: Json[], side: "player" | "opponent", counter: number): { oam: IceBallKnown26; model: IceBallModelKnown26 } {
  const r0 = rows[0]!, row1 = rows[1]!, ab = r0.animationBattlers, bySlot = (r: Json, s: number) => r.sprites.find((x: Json) => x.slot === s);
  const chunk = (r: Json) => r.sprites.find((s: Json) => s.template?.symbol === "gIceBallChunkSpriteTemplate"), shard = rows[37]!.sprites.find((s: Json) => s.template?.symbol === "gIceBallImpactShardSpriteTemplate");
  const sign = side === "player" ? 1 : -1, c8 = chunk(rows[8]!), c7 = chunk(rows[7]!);
  const attackerSlot = ab.spriteIds[ab.attacker], targetSlot = ab.spriteIds[ab.target];
  const lag = stalls(rows).map((r) => (NEG === "lag" ? r + 3 : r));
  const oam: IceBallKnown26 = { counter: counter as 0, attackerSide: side, healthboxAttr: row1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: row1.spriteOrder.slice(0, 6),
    attackerSlot, targetSlot, attackerAttr: bySlot(r0, attackerSlot).attr, targetAttr: bySlot(r0, targetSlot).attr,
    attackerPic: { x: c7.x - 15 * sign, y: c7.y }, targetPic: { x: shard.x + 12 * sign, y: shard.y + 16 },
    occupiedSlots: r0.sprites.map((s: Json) => s.slot), chunkTile: (c8.attr[2] & 0x3ff), chunkBank: c8.attr[2] >> 12 & 0xf,
    crystalTile: (shard.attr[2] & 0x3ff) - 6, crystalBank: shard.attr[2] >> 12 & 0xf,
    chunkMatrix: (() => { let m = 0; while (r0.allocators.matrixBitmap >> m & 1) m += 1; return m; })(), dummyAttr: attrOf(row1.hardwareOam[127]), rng0: NEG === "words" ? r0.animationRng ^ 1 : r0.animationRng, lagRows: lag, taskLagRows: lag.map((r) => r - 1) };
  const pal = (a: any[]) => a.map(bgr);
  const model: IceBallModelKnown26 = { rows: rows.length, registers0: r0.registers, registersBody: row1.registers, palette0: r0.hardwarePalette, faded0: r0.fadedPalette, unfaded0: r0.unfadedPalette,
    chunkPalette: pal((iceBallAsset as Json).chunk.palette), crystalPalette: pal((crystalAsset as Json).palette), icePalette: pal((icyWindAsset as Json).background.palette),
    oam };
  return { oam, model };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function checkBody(name: string, rows: Json[], side: "player" | "opponent", counter: number) {
  const { oam: known, model: mk } = knownFor(rows, side, counter);
  const out: Json = { name, rows: rows.length, lagRows: known.lagRows, entries: 0, entryMatch: 0, oamRowsExact: 0, matrixRowsExact: 0, badRows: [] as number[], examples: [] as string[], fields: {} };
  for (let age = 1; age < rows.length; age += 1) {
    const got = assembleIceBallHardwareOam(age, { known, spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder }); let ok = true; const exp: string[] = rows[age]!.hardwareOam;
    for (let i = 0; i < 128; i += 1) { out.entries += 1; if (got.oam[i] === exp[i]) out.entryMatch += 1; else { ok = false; if (out.examples.length < 6) out.examples.push(`${age}/${i}: want ${exp[i]} got ${got.oam[i]}`); } }
    if (ok) out.oamRowsExact += 1; else if (out.badRows.length < 24) out.badRows.push(age);
    if (same(got.matrices, rows[age]!.hardwareMatrices)) out.matrixRowsExact += 1;
  }
  const model = iceBallModel(NEG === "palette" ? { ...mk, icePalette: mk.icePalette.map((c) => c ^ 1), chunkPalette: mk.chunkPalette.map((c) => c ^ 1) } : mk);
  const bump = (f: string, ok: boolean, r: number, extra?: string) => { out.fields[f] ??= { exact: 0, rows: 0 }; out.fields[f].rows += 1; if (ok) out.fields[f].exact += 1; else { out.fields[f].bad ??= []; if (out.fields[f].bad.length < 8) out.fields[f].bad.push(extra ? `${r}:${extra}` : r); } };
  const ownedOf = (r: Json, sym: string) => r.sprites.filter((s: Json) => s.template?.symbol === sym);
  for (let r = 0; r < rows.length; r += 1) { const want = rows[r]!, got = model[r]!;
    const bad = Object.keys(want.registers).filter((key) => want.registers[key] !== got.registers[key]);
    bump("registers", !bad.length, r, bad.map((key) => `${key}=${want.registers[key]}/${got.registers[key]}`).join(","));
    const bbad = Object.keys(want.battleBg).filter((key) => want.battleBg[key] !== got.battleBg[key]); bump("battleBg", !bbad.length, r, bbad.join(","));
    for (const f of ["hardwarePalette", "unfadedPalette", "fadedPalette"] as const) { const pb: number[] = []; for (let i = 0; i < 512; i += 1) if (want[f][i] !== got[f][i]) pb.push(i); bump(f, !pb.length, r, pb.length ? `${pb.length}@${pb[0]}` : undefined); }
    const ws = want.tasks.map((x: Json) => ({ slot: x.slot, callback: x.func.symbol, data: x.data })), tok = same(ws, got.tasks);
    bump("tasks", tok, r, tok ? undefined : JSON.stringify(ws.map((x: Json) => `${x.slot}:${x.callback.slice(0, 12)}:${x.data.slice(0, 4)}`)) + "|" + JSON.stringify(got.tasks.map((x) => `${x.slot}:${x.callback.slice(0, 12)}:${x.data.slice(0, 4)}`)));
    const wc = ownedOf(want, "gIceBallChunkSpriteTemplate")[0], gc = got.chunk;
    bump("chunk", wc ? !!gc && wc.x2 === gc.x2 && wc.y2 === gc.y2 && wc.callback.symbol === gc.callback && same(wc.data.slice(0, gc.data.length), gc.data) : !gc, r, wc ? `${wc.x2},${wc.y2},${wc.callback.symbol}/${gc?.x2},${gc?.y2}` : "extra");
    const wsh = ownedOf(want, "gIceBallImpactShardSpriteTemplate"), gsh = got.shards;
    bump("shards", wsh.length === gsh.length && wsh.every((s: Json) => { const g = gsh.find((x) => x.slot === s.slot); return g && g.x2 === s.x2 && g.y2 === s.y2 && same(g.data.slice(0, 5), s.data.slice(0, 5)); }), r, `${wsh.length}/${gsh.length}`);
    bump("targetX2", want.sprites.find((s: Json) => s.slot === known.targetSlot).x2 === got.targetX2, r, `${want.sprites.find((s: Json) => s.slot === known.targetSlot).x2}/${got.targetX2}`);
  }
  return out;
}
if (!process.env.PREP26_LIB) {
  const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), results: Json[] = [];
  for (const side of ["player", "opponent"] as const) loadBodies(resolve(root, `tools/compare/fixtures/ice-ball/${side}-dense.json.gz`)).forEach((rows, i) => results.push(checkBody(`accepted-${side}-b${i + 1}`, rows, side, i)));
  for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, side] = spec.split(":"); loadBodies(file!).forEach((rows, i) => results.push(checkBody(`${file!.split("/").pop()!.replace(/-r1\.json$/, "")}-b${i + 1}`, rows, side as "player" | "opponent", i))); }
  for (const r of results) console.log(r.name, `rows ${r.rows} oam ${r.oamRowsExact}/${r.rows - 1} mat ${r.matrixRowsExact}/${r.rows - 1} entries ${r.entryMatch}/${r.entries}`, Object.entries(r.fields).map(([f, v]: any) => `${f} ${v.exact}/${v.rows}`).join(" "), "lag", JSON.stringify(r.lagRows));
  if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
  else if (process.env.VERBOSE) console.log(JSON.stringify(results, null, 1));
}
