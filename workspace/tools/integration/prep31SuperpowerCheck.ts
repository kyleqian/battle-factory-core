/**
 * prep31 Superpower: source-derived sprites / hardware OAM / matrices / registers / battleBg / palettes / tasks / target x2 vs the accepted corpora
 * (tools/compare/evidence/superpower-{player,opponent}-dense-state.json.gz, 248 rows) and fresh alternate probes (superpowerProbe.py output).
 * usage: npx vite-node tools/integration/prep31SuperpowerCheck.ts [alt.json:player|opponent ...] [--out=out.json] [--neg=oam|palette|registers|phase]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import superpowerAsset from "../../src/animation/assets/superpower-rock-orb-fire.json" with { type: "json" };
import { assembleSuperpowerHardwareOam, superpowerModel, superpowerSprites, SP, type SuperpowerKnown31, type SuperpowerModelKnown31 } from "./prep31SuperpowerModel.ts";
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
export const loadFrames = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
const bgr = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const NEG = process.argv.find((a) => a.startsWith("--neg="))?.slice(6);
const art = (superpowerAsset as Json).resources;
export const PALETTES = { orb: art.circleOfLight.art.palette.map(bgr), meteor: art.meteor.art.palette.map(bgr), rock: art.flatRock.art.palette.map(bgr) } as { orb: number[]; meteor: number[]; rock: number[] };
export function knownFor(rows: Json[], side: "player" | "opponent"): { oam: SuperpowerKnown31; model: SuperpowerModelKnown31 } {
  const r0 = rows[0]!, row1 = rows[1]!, b = r0.battlerSprites;
  const first = (re: RegExp) => { for (const r of rows) { const s = r.sprites.find((x: Json) => re.test(x.template?.symbol ?? "")); if (s) return s; } throw new Error(`no ${re}`); };
  const orb = first(/SuperpowerOrb/), rock = first(/SuperpowerRock/), fire = first(/SuperpowerFireball/);
  const step2 = rows.flatMap((r) => r.sprites).find((x: Json) => x.callback?.symbol === "AnimSuperpowerRock_Step2");
  const bitmap = r0.resourceAllocators.matrixBitmap as number; let freeMatrix = 0; while (bitmap >> freeMatrix & 1) freeMatrix += 1;
  const a2 = (s: Json) => ({ tile: s.attr[2] & 0x3ff, bank: s.attr[2] >> 12 & 0xf, prio: s.attr[2] >> 10 & 3 });
  const idle = (s: Json) => ({ x: s.x, y: s.y, x2: s.x2, y2: s.y2 });
  const oam: SuperpowerKnown31 = { attackerSide: side, healthboxAttr: row1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: row1.spriteOrder.slice(0, 6), dummyAttr: attrOf(row1.hardwareOam[127]),
    attackerSlot: b.attacker.slot, targetSlot: b.target.slot, attackerAttr: b.attacker.attr, targetAttr: b.target.attr, attackerIdle: idle(b.attacker), targetIdle: idle(b.target),
    attackerAnchor: { x: orb.x, y: orb.y }, targetAnchor: { x: orb.x + step2.data[0], y: orb.y + step2.data[1] },
    occupiedSlots: r0.sprites.map((s: Json) => s.slot), freeMatrix,
    orb: a2(orb), rock: { ...a2(rock), tile: (rock.attr[2] & 0x3ff) - 4 }, meteor: a2(fire) };
  const bg = side === "player" ? "bg2" : "bg1";   // T: the monbg BGnCNT / HOFS write row (10 or 11; read from the first HOFS change, BGnCNT may already hold the monbg value)
  const model: SuperpowerModelKnown31 = { rows: rows.length, registers0: r0.registers, bodyWin: { win0h: row1.registers.win0h, win0v: row1.registers.win0v },
    palette0: r0.hardwarePalette, faded0: r0.fadedPalette, unfaded0: r0.unfadedPalette, attackerBattler: r0.animationBattlers.attacker, targetBattler: r0.animationBattlers.target,
    orbPalette: PALETTES.orb, meteorPalette: PALETTES.meteor, rockPalette: PALETTES.rock,
    phase: { monbgCntRow: rows.findIndex((r, i) => i > 0 && r.registers[`${bg}hofs`] !== r0.registers[`${bg}hofs`]) }, oam };
  return { oam, model };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** `--order=derived`: SortSprites (sprite.c:372) instead of the lent corpus spriteOrder: priority << 8 | subpriority ascending, then larger signed
 *  oam.y first (y >= 160 -> y - 256; affine-double 64x64: y > 128 -> y - 256), stable over the previous order; new sprites enter in slot order.
 *  Subpriorities (K) are the sprites' own (battlers, orb, rocks, fireball: first corpus row of each). */
export function derivedOrder(rows: Json[], k: SuperpowerKnown31): number[][] {
  const subOf = (re: RegExp) => { for (const r of rows) { const s = r.sprites.find((x: Json) => re.test(x.template?.symbol ?? "")); if (s) return s.subpriority as number; } return 0; };
  const sub = { orb: subOf(/SuperpowerOrb/), rock: subOf(/SuperpowerRock/), fire: subOf(/SuperpowerFireball/) }, b = rows[0]!.battlerSprites;
  const head: number[] = rows[1]!.spriteOrder.slice(0, 6), out: number[][] = []; let prev: number[] = [];
  for (let st = 0; st < rows.length; st += 1) {
    const key = new Map<number, [number, number]>(), sy = (y: number, dbl = false) => { let v = y & 0xff; if (v >= 160) v -= 256; if (dbl && v > 128) v -= 256; return v; };
    key.set(k.attackerSlot, [(k.attackerAttr[2] >> 10 & 3) << 8 | b.attacker.subpriority, sy(k.attackerAttr[0])]); key.set(k.targetSlot, [(k.targetAttr[2] >> 10 & 3) << 8 | b.target.subpriority, sy(k.targetAttr[0])]);
    for (const sp of superpowerSprites(st, k)) {
      if (sp.kind === "orb") key.set(sp.slot, [k.orb.prio << 8 | sub.orb, sy(sp.y + sp.y2 - 64, true)]);
      if (sp.kind === "rock") key.set(sp.slot, [k.rock.prio << 8 | sub.rock, sy(sp.y - 8)]);
      if (sp.kind === "fireball") key.set(sp.slot, [k.meteor.prio << 8 | sub.fire, sy(sp.y + sp.y2 - 32)]); }
    const order = [...prev.filter((x) => key.has(x)), ...[...key.keys()].filter((x) => !prev.includes(x)).sort((p, q) => p - q)];
    order.sort((p, q) => key.get(p)![0] - key.get(q)![0] || key.get(q)![1] - key.get(p)![1]);
    out.push([...head, ...order]); prev = order;
  }
  return out;
}
const ORDER = process.argv.find((a) => a.startsWith("--order="))?.slice(8) ?? "lent";
const OWNED = /Superpower|ShakeMonOrPlatform/;
export function checkWindow(name: string, rows: Json[], side: "player" | "opponent") {
  const { oam: known0, model: mk0 } = knownFor(rows, side);
  const known = NEG === "oam" ? { ...known0, attackerAnchor: { x: known0.attackerAnchor.x + 1, y: known0.attackerAnchor.y } } : known0;
  const mk = NEG === "palette" ? { ...mk0, orbPalette: mk0.orbPalette.map((c) => c ^ 1) } : NEG === "phase" ? { ...mk0, phase: { monbgCntRow: mk0.phase.monbgCntRow === 10 ? 11 : 10 } }
    : NEG === "registers" ? { ...mk0, bodyWin: { win0h: mk0.bodyWin.win0h + 1, win0v: mk0.bodyWin.win0v } } : mk0;
  const out: Json = { name, rows: rows.length, entries: 0, entryMatch: 0, oamRowsExact: 0, matrixRowsExact: 0, badRows: [] as number[], examples: [] as string[], fields: {}, phase: mk.phase,
    anchors: { attacker: known.attackerAnchor, target: known.targetAnchor, freeMatrix: known.freeMatrix } };
  const bump = (f: string, ok: boolean, r: number, extra?: string) => { out.fields[f] ??= { exact: 0, rows: 0 }; out.fields[f].rows += 1; if (ok) out.fields[f].exact += 1; else { out.fields[f].bad ??= []; if (out.fields[f].bad.length < 8) out.fields[f].bad.push(extra ? `${r}:${extra}` : r); } };
  const derived = ORDER === "derived" ? derivedOrder(rows, known) : null; out.order = ORDER;
  for (let age = 1; age < rows.length; age += 1) {
    const got = assembleSuperpowerHardwareOam(age, known, (s) => derived ? derived[Math.max(s, 0)]! : rows[Math.max(s, 0)]!.spriteOrder); let ok = true; const exp: string[] = rows[age]!.hardwareOam;
    for (let i = 0; i < 128; i += 1) { out.entries += 1; if (got.oam[i] === exp[i]) out.entryMatch += 1; else { ok = false; if (out.examples.length < 6) out.examples.push(`${age}/${i}: want ${exp[i]} got ${got.oam[i]}`); } }
    if (ok) out.oamRowsExact += 1; else if (out.badRows.length < 24) out.badRows.push(age);
    if (same(got.matrices, rows[age]!.hardwareMatrices)) out.matrixRowsExact += 1;
  }
  const model = superpowerModel(mk);
  for (let r = 0; r < rows.length; r += 1) { const want = rows[r]!, got = model[r]!;
    const ws = want.sprites.filter((s: Json) => OWNED.test(s.template?.symbol ?? "")).map((s: Json) => ({ slot: s.slot, x: s.x, y: s.y, x2: s.x2, y2: s.y2, callback: s.callback.symbol, data: s.data.slice(0, 4) }));
    const gs = superpowerSprites(r, known).map((s) => ({ slot: s.slot, x: s.x, y: s.y, x2: s.x2, y2: s.y2, callback: s.callback, data: s.data.slice(0, 4) }));
    const sok = same(ws, gs); bump("sprites", sok, r, sok ? undefined : `${JSON.stringify(ws).slice(0, 300)}|${JSON.stringify(gs).slice(0, 300)}`);
    const bad = Object.keys(want.registers).filter((key) => want.registers[key] !== got.registers[key]);
    bump("registers", !bad.length, r, bad.map((key) => `${key}=${want.registers[key]}/${got.registers[key]}`).join(","));
    const bbad = Object.keys(want.battleBg).filter((key) => want.battleBg[key] !== got.battleBg[key]); bump("battleBg", !bbad.length, r, bbad.map((key) => `${key}=${want.battleBg[key]}/${got.battleBg[key]}`).join(","));
    for (const f of ["hardwarePalette", "unfadedPalette", "fadedPalette"] as const) { const pb: number[] = []; for (let i = 0; i < 512; i += 1) if (want[f][i] !== got[f][i]) pb.push(i); bump(f, !pb.length, r, pb.length ? `${pb.length}@${pb[0]}` : undefined); }
    const wt = want.tasks.map((x: Json) => ({ slot: x.slot, callback: x.func.symbol, data: x.data })), tok = same(wt, got.tasks);
    bump("tasks", tok, r, tok ? undefined : JSON.stringify(wt.map((x: Json) => `${x.slot}:${x.callback.slice(0, 14)}:${x.data.slice(0, 7)}`)) + "|" + JSON.stringify(got.tasks.map((x) => `${x.slot}:${x.callback.slice(0, 14)}:${x.data.slice(0, 7)}`)));
    bump("targetX2", want.battlerSprites.target.x2 === got.targetX2, r, `${want.battlerSprites.target.x2}/${got.targetX2}`); }
  void SP;
  return out;
}
if (!process.env.PREP31_LIB) {
  const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), results: Json[] = [];
  for (const side of ["player", "opponent"] as const) results.push(checkWindow(`accepted-${side}`, loadFrames(resolve(root, `tools/compare/evidence/superpower-${side}-dense-state.json.gz`)), side));
  for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, side] = spec.split(":"); results.push(checkWindow(file!.split("/").pop()!.replace(/-r1\.json$/, ""), loadFrames(file!), side as "player" | "opponent")); }
  for (const r of results) console.log(r.name, `rows ${r.rows} oam ${r.oamRowsExact}/${r.rows - 1} (${r.entryMatch}/${r.entries}) mat ${r.matrixRowsExact}/${r.rows - 1}`, Object.entries(r.fields).map(([f, v]: any) => `${f} ${v.exact}/${v.rows}`).join(" "), JSON.stringify(r.phase), process.env.VERBOSE ? JSON.stringify({ bad: r.badRows, ex: r.examples, f: Object.fromEntries(Object.entries(r.fields).map(([f, v]: any) => [f, v.bad])) }) : "");
  if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
}
