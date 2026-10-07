/**
 * prep31 Spit Up: source-derived sprites / hardware OAM / matrices / palettes / tasks vs the accepted corpora (tools/compare/evidence/spit-up-{player,opponent}-{1,2,3}-dense.json.gz)
 * and the prep29 alternates (spitUpProbe.py output).  The spit-up corpus schema has no `spriteOrder`: the OAM order is derived (SortSprites: priority << 8 |
 * subpriority ascending, then larger oam.y first, stable) from per-sprite subpriorities (K: battler subpriority, orbs / splats from their template offsets).
 * usage: npx vite-node tools/integration/prep31SpitUpCheck.ts [alt.json:player|opponent:counter ...] [--out=out.json] [--neg=oam|lag|palette]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import redOrbAsset from "../../src/animation/assets/spit-up-red-orb.json" with { type: "json" };
import hitsplatAsset from "../../src/assets/gen/battle-anim-hitsplat.json" with { type: "json" };
import { assembleSpitUpHardwareOam, attackerX2, deformState, spitUpRows, spitUpSprites, spitUpTasks, targetX2, type SpitUpKnown31 } from "./prep31SpitUpModel.ts";
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
export const loadDoc = (p: string): Json => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")); };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
const bgr = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
export const raw = (s: Json) => { const b = Buffer.from(s.raw, "hex"); return { x: b.readInt16LE(0x20), y: b.readInt16LE(0x22), x2: b.readInt16LE(0x24), y2: b.readInt16LE(0x26), invisible: !!(b.readUInt16LE(0x3e) >> 2 & 1), sub: b.readUInt8(0x43) }; };
/** K: StorePointerInVars(gSpitUpDeformMonAffineAnimCmds) halves as signed s16 (ROM address 0x085c_e3e0 -> -7200, 2140). */
const DEFORM_PTR = [-7200, 2140] as const;
const NEG = process.argv.find((a) => a.startsWith("--neg="))?.slice(6);
export const PAL = { orb: ((redOrbAsset as Json).art.palette as Json[]).map(bgr), impact: ((hitsplatAsset as Json).palette as Json[]).map(bgr) };
export function knownFor(doc: Json, side: "player" | "opponent", counter: 1 | 2 | 3): { k: SpitUpKnown31; subs: Map<string, number> } {
  const rows: Json[] = doc.frames, r0 = rows[0]!, row1 = rows[1]!, ab = r0.attackerBattler, tb = r0.targetBattler;
  const bat = (b: number) => r0.sprites.find((s: Json) => s.template === "gMultiuseSpriteTemplate" && s.data[0] === b);
  const A = bat(ab), Tg = bat(tb), first = (t: string) => { for (const r of rows) { const s = r.sprites.find((x: Json) => x.template === t); if (s) return s; } throw new Error(t); };
  const orb = first("gSpitUpOrbSpriteTemplate"), splat = first("gFlashingHitSplatSpriteTemplate"), xs = side === "player" ? 1 : -1;
  const a2 = (s: Json) => ({ tile: s.attr[2] & 0x3ff, bank: s.attr[2] >> 12 & 0xf, prio: s.attr[2] >> 10 & 3 });
  // A: yDelta = the attacker pic y_offset; the smallest value reproducing y2 on every deform-task row (all rows agree in every window)
  const deform = rows.flatMap((r) => r.tasks.filter((t: Json) => t.func.symbol === "AnimTask_SpitUpDeformMon").map((t: Json) => [t.data[11], raw(r.sprites.find((s: Json) => s.slot === A.slot)).y2]));
  let yDelta = 0; for (; yDelta < 40; yDelta += 1) { const v = 64 - 2 * yDelta; if (deform.every(([ys, y2]: number[]) => Math.trunc((v - Math.min(Math.trunc((v << 8) / ys!), 128)) / 2) === y2)) break; }
  const k: SpitUpKnown31 = { counter, attackerSide: side, healthboxAttr: row1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: [0, 1, 60, 61, 62, 63], dummyAttr: attrOf(row1.hardwareOam[127]),
    attackerSlot: A.slot, targetSlot: Tg.slot, attackerAttr: A.attr, targetAttr: Tg.attr, attackerMatrix: rows[8]!.sprites.find((s: Json) => s.slot === A.slot).matrixNum,
    attackerXY: { x: raw(A).x, y: raw(A).y }, targetXY: { x: raw(Tg).x, y: raw(Tg).y },
    attackerAnchor: { x: raw(orb).x, y: raw(orb).y }, targetAnchor: { x: raw(splat).x + 12 * xs, y: raw(splat).y - 10 }, yDelta,
    occupiedSlots: r0.sprites.map((s: Json) => s.slot), matrixBitmap: r0.allocators.matrixBitmap, orb: a2(orb), impact: a2(splat) };
  return { k, subs: new Map([["attacker", raw(A).sub], ["target", raw(Tg).sub], ["orb", raw(orb).sub], ["splat", raw(splat).sub]]) };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** SortSprites order (stable): previous order, re-sorted by priority << 8 | subpriority, then larger signed oam.y first. */
/** L: the activation 64-slot sSpriteOrder positions of the free slots a burst takes (production: the host order carried by carryLiveSpriteOrder).
 *  The spit-up corpus schema has no spriteOrder; the lent order used here is "slots < 13 ascending, slots >= 13 descending" (`--lend=slot` = all ascending). */
const LEND = process.argv.find((a) => a.startsWith("--lend="))?.slice(7) ?? "measured";
const seedRank = (slot: number) => (LEND === "slot" || slot < 13 ? slot : 1000 - slot);
function orderFor(rows: number, k: SpitUpKnown31, subs: Map<string, number>): number[][] {
  const out: number[][] = []; let prev: number[] = [];
  for (let s = 0; s < rows; s += 1) {
    const live = spitUpSprites(s, k), d = deformState(s, k);
    const key = new Map<number, [number, number]>();
    const ay = d.active ? (k.attackerXY.y + d.y2 - 64) & 0xff : (d.ended ? (k.attackerXY.y - 32) : k.attackerAttr[0] & 0xff);
    key.set(k.attackerSlot, [2 << 8 | subs.get("attacker")!, ay]); key.set(k.targetSlot, [2 << 8 | subs.get("target")!, k.targetAttr[0] & 0xff]);
    for (const sp of live) key.set(sp.slot, [sp.kind === "orb" ? 2 << 8 | subs.get("orb")! : 2 << 8 | subs.get("splat")!, sp.kind === "orb" ? (sp.y + sp.y2 - 8) & 0xff : (sp.y - 16) & 0xff]);
    const sy = (y: number) => (y >= 160 ? y - 256 : y);
    if (spitUpRows(k).bursts.includes(s)) { out.push([...k.healthboxSlots, ...prev]); continue; }   // the burst frame completes (and sorts) on the next row
    const order = [...prev.filter((x) => key.has(x)), ...[...key.keys()].filter((x) => !prev.includes(x)).sort((p, q) => seedRank(p) - seedRank(q))];
    order.sort((p, q) => key.get(p)![0] - key.get(q)![0] || sy(key.get(q)![1]) - sy(key.get(p)![1]));
    out.push([...k.healthboxSlots, ...order]); prev = order;
  }
  return out;
}
export function checkWindow(name: string, doc: Json, side: "player" | "opponent", counter: 1 | 2 | 3) {
  const rows: Json[] = doc.frames, { k: k0, subs } = knownFor(doc, side, counter);
  const k = NEG === "oam" ? { ...k0, attackerAnchor: { x: k0.attackerAnchor.x + 1, y: k0.attackerAnchor.y } } : k0;
  const T = spitUpRows(k), order = orderFor(rows.length, k, subs);
  const out: Json = { name, counter, rows: rows.length, modelRows: T.rows, entries: 0, entryMatch: 0, oamRowsExact: 0, oamMultisetRowsExact: 0, matrixRowsExact: 0, badRows: [] as number[], examples: [] as string[], fields: {},
    anchors: { attacker: k.attackerAnchor, target: k.targetAnchor, yDelta: k.yDelta, attackerMatrix: k.attackerMatrix, lag: { task: T.taskLag, sprite: T.spriteLag } } };
  const bump = (f: string, ok: boolean, r: number, extra?: string) => { out.fields[f] ??= { exact: 0, rows: 0 }; out.fields[f].rows += 1; if (ok) out.fields[f].exact += 1; else { out.fields[f].bad ??= []; if (out.fields[f].bad.length < 8) out.fields[f].bad.push(extra ? `${r}:${extra}` : r); } };
  for (let age = 1; age < rows.length; age += 1) {
    const got = assembleSpitUpHardwareOam(age, k, (s) => order[Math.max(s, 0)]!); let ok = true; const exp: string[] = rows[age]!.hardwareOam;
    for (let i = 0; i < 128; i += 1) { out.entries += 1; if (got.oam[i] === exp[i]) out.entryMatch += 1; else { ok = false; if (out.examples.length < 8) out.examples.push(`${age}/${i}: want ${exp[i]} got ${got.oam[i]}`); } }
    if (ok) out.oamRowsExact += 1; else if (out.badRows.length < 24) out.badRows.push(age);
    if (same([...got.oam].sort(), [...exp].sort())) out.oamMultisetRowsExact += 1;
    if (same(got.matrices, rows[age]!.hardwareMatrices)) out.matrixRowsExact += 1;
  }
  const orbBank = 16 + k.orb.bank, impBank = 16 + k.impact.bank;
  const unf = [...rows[0]!.unfadedPalette], fad = [...rows[0]!.fadedPalette]; let prevHw = [...rows[0]!.hardwarePalette];
  for (let r = 0; r < rows.length; r += 1) { const want = rows[r]!;
    const ws = want.sprites.filter((s: Json) => /SpitUpOrb|FlashingHitSplat/.test(s.template)).map((s: Json) => { const d = raw(s); return { slot: s.slot, x: d.x, y: d.y, x2: d.x2, y2: d.y2, invisible: d.invisible, m: s.matrixNum }; });
    const gs = spitUpSprites(r, k).map((s) => ({ slot: s.slot, x: s.x, y: s.y, x2: s.x2, y2: s.y2, invisible: s.invisible, m: s.matrixNum }));
    if (T.bursts.includes(r)) {   // T: the burst row is a partial snapshot (VBlank lands inside AnimateSprites); record how many sprites match the "first 4 stepped" choice
      out.partial ??= []; out.partial.push({ row: r, sprites: ws.length, matching: ws.filter((w: Json, i: number) => same(w, gs[i])).length,
        stepped: ws.filter((w: Json) => w.x2 !== 0 || w.y2 !== 0).length }); bump("spritesOutsidePartialRows", true, r); }
    else bump("spritesOutsidePartialRows", same(ws, gs), r, same(ws, gs) ? undefined : `${JSON.stringify(ws).slice(0, 240)}|${JSON.stringify(gs).slice(0, 240)}`);
    const A = raw(want.sprites.find((s: Json) => s.slot === k.attackerSlot)), d = deformState(r, k);
    bump("attacker", A.x2 === attackerX2(r) && A.y2 === d.y2, r, `${A.x2},${A.y2}/${attackerX2(r)},${d.y2}`);
    bump("targetX2", raw(want.sprites.find((s: Json) => s.slot === k.targetSlot)).x2 === targetX2(r, T.shakeTarget), r);
    // palettes: loadspritegfx RED_ORB_2 row 1 / IMPACT row 4 (unfaded == faded that row, hardware one row later)
    if (r === 1) for (let c = 0; c < 16; c += 1) unf[orbBank * 16 + c] = fad[orbBank * 16 + c] = (NEG === "palette" ? (PAL.orb[c] ?? 0) ^ 1 : PAL.orb[c] ?? 0);
    if (r === 4) for (let c = 0; c < 16; c += 1) unf[impBank * 16 + c] = fad[impBank * 16 + c] = PAL.impact[c]!;
    const pb = (a: number[], b: number[]) => { const bad: number[] = []; for (let i = 0; i < 512; i += 1) if (a[i] !== b[i]) bad.push(i); return bad; };
    const bu = pb(want.unfadedPalette, unf), bf = pb(want.fadedPalette, fad), bh = pb(want.hardwarePalette, r === 0 ? want.hardwarePalette : prevHw);
    bump("unfadedPalette", !bu.length, r, `${bu.length}@${bu[0]}`); bump("fadedPalette", !bf.length, r, `${bf.length}@${bf[0]}`); bump("hardwarePalette", !bh.length, r, `${bh.length}@${bh[0]}`);
    prevHw = r === 0 ? [...want.hardwarePalette] : [...fad];
    bump("registers", same(want.registers, rows[0]!.registers), r);
    const wt = want.tasks.map((t: Json) => ({ slot: t.slot, callback: t.func.symbol, data: t.data })), gt = spitUpTasks(r, k, DEFORM_PTR);
    bump("tasks", same(wt, gt), r, same(wt, gt) ? undefined : `${JSON.stringify(wt).slice(0, 200)}|${JSON.stringify(gt).slice(0, 200)}`);
  }
  return out;
}
if (!process.env.PREP31_LIB) {
  const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), results: Json[] = [];
  for (const c of [1, 2, 3] as const) for (const side of ["player", "opponent"] as const) results.push(checkWindow(`accepted-${side}-${c}`, loadDoc(resolve(root, `tools/compare/evidence/spit-up-${side}-${c}-dense.json.gz`)), side, c));
  for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, side, c] = spec.split(":"); results.push(checkWindow(file!.split("/").pop()!.replace(/-r1\.json$/, ""), loadDoc(file!), side as "player" | "opponent", Number(c) as 1 | 2 | 3)); }
  for (const r of results) console.log(r.name, `rows ${r.rows}/${r.modelRows} oam ${r.oamRowsExact}/${r.rows - 1} multiset ${r.oamMultisetRowsExact} (${r.entryMatch}/${r.entries}) mat ${r.matrixRowsExact}/${r.rows - 1}`, Object.entries(r.fields).map(([f, v]: any) => `${f} ${v.exact}/${v.rows}`).join(" "), process.env.VERBOSE ? JSON.stringify({ bad: r.badRows, ex: r.examples, f: Object.fromEntries(Object.entries(r.fields).map(([f, v]: any) => [f, v.bad])) }) : "");
  if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
}
export function orderForWindow(doc: Json, side: "player" | "opponent", counter: 1 | 2 | 3): number[][] { const { k, subs } = knownFor(doc, side, counter); return orderFor(doc.frames.length, k, subs); }
