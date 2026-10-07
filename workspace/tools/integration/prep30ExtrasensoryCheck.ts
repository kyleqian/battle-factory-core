/**
 * prep30 Extrasensory: source-derived OAM / matrices / registers / battleBg / palettes / tasks / scanline / VRAM-handle timeline vs the accepted corpora
 * (tools/compare/evidence/extrasensory-{player,opponent}-dense-state.json.gz) and fresh alternate probes (extrasensoryProbe.py output).
 * usage: npx vite-node tools/integration/prep30ExtrasensoryCheck.ts [alt.json:player|opponent ...] [--out=out.json] [--phase=flip] [--neg=palette|oam|scanline]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import psychicAsset from "../../src/assets/gen/battle-anim-psychic-bg.json" with { type: "json" };
import { assembleExtrasensoryHardwareOam, extrasensoryModel, xsRows, type XsKnown30 } from "./prep30ExtrasensoryModel.ts";
import { speciesName, yDelta, yWithElevation } from "./prep30Species.ts";
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
export const loadFrames = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
const bgr = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const NEG = process.argv.find((a) => a.startsWith("--neg="))?.slice(6);
const FLIP = process.argv.includes("--phase=flip");
export const measuredLateLag = (rows: Json[]) => rows.length === 162;
export function speciesOf(rows: Json[], side: "player" | "opponent") {
  const r0 = rows[0]!, att = side === "player" ? r0.parties.player[0] : r0.parties.opponent[0], tgt = side === "player" ? r0.parties.opponent[0] : r0.parties.player[0];
  return { attacker: att.species as number, target: tgt.species as number };
}
export function knownFor(rows: Json[], side: "player" | "opponent", lateLag = measuredLateLag(rows)): XsKnown30 {
  const r0 = rows[0]!, row1 = rows[1]!, b = r0.battlerSprites, sp = speciesOf(rows, side), tside = side === "player" ? "opponent" : "player";
  const bitmap = r0.resourceAllocators.matrixBitmap as number, used = new Set(r0.sprites.map((s: Json) => s.slot));
  let cloneSlot = 0; while (used.has(cloneSlot)) cloneSlot += 1;
  let cloneMatrix = 0; while (bitmap >> cloneMatrix & 1) cloneMatrix += 1;
  return { side, registers0: r0.registers, registersBody: row1.registers, palette0: r0.hardwarePalette, faded0: r0.fadedPalette, unfaded0: r0.unfadedPalette,
    psychicPalette: (psychicAsset as Json).palette.map(bgr),
    attacker: { slot: b.attacker.slot, x: b.attacker.x, y: b.attacker.y, attr: b.attacker.attr }, target: { slot: b.target.slot, x: b.target.x, y: b.target.y, x2: b.target.x2, y2: b.target.y2, attr: b.target.attr },
    targetBattler: r0.animationBattlers.target, attackerYDelta: yDelta(sp.attacker, side), targetYElevation: yWithElevation(sp.target, tside),
    healthboxAttr: row1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: row1.spriteOrder.slice(0, 6), dummyAttr: attrOf(row1.hardwareOam[127]),
    cloneSlot, cloneMatrix, scanline0: { state: r0.scanline.state, srcBuffer: r0.scanline.srcBuffer, dmaDest: r0.scanline.dmaDest, buffers: r0.scanlineBuffers },
    phase: { lateLag } };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function checkWindow(name: string, rows: Json[], side: "player" | "opponent") {
  const lateLag = FLIP ? !measuredLateLag(rows) : measuredLateLag(rows), known = knownFor(rows, side, lateLag), n = Math.min(rows.length, xsRows(known)), sp = speciesOf(rows, side);
  const out: Json = { name, species: [speciesName(sp.attacker), speciesName(sp.target)], rows: rows.length, modelRows: xsRows(known), phase: { lateLag, measured: measuredLateLag(rows) },
    anchors: { attackerYDelta: known.attackerYDelta, targetYElevation: known.targetYElevation, cloneSlot: known.cloneSlot, cloneMatrix: known.cloneMatrix },
    entries: 0, entryMatch: 0, oamRowsExact: 0, matrixRowsExact: 0, badRows: [] as number[], examples: [] as string[], fields: {} };
  const bump = (f: string, ok: boolean, r: number, extra?: string) => { out.fields[f] ??= { exact: 0, rows: 0 }; out.fields[f].rows += 1; if (ok) out.fields[f].exact += 1; else { out.fields[f].bad ??= []; if (out.fields[f].bad.length < 8) out.fields[f].bad.push(extra ? `${r}:${extra}` : r); } };
  for (let age = 1; age < n; age += 1) {
    const got = assembleExtrasensoryHardwareOam(age, NEG === "oam" ? { ...known, attackerYDelta: known.attackerYDelta + 4 } : known, (s) => rows[Math.max(s, 0)]!.spriteOrder); let ok = true; const exp: string[] = rows[age]!.hardwareOam;
    for (let i = 0; i < 128; i += 1) { out.entries += 1; if (got.oam[i] === exp[i]) out.entryMatch += 1; else { ok = false; if (out.examples.length < 6) out.examples.push(`${age}/${i}: want ${exp[i]} got ${got.oam[i]}`); } }
    if (ok) out.oamRowsExact += 1; else if (out.badRows.length < 24) out.badRows.push(age);
    if (same(got.matrices, rows[age]!.hardwareMatrices)) out.matrixRowsExact += 1;
  }
  const model = extrasensoryModel(NEG === "palette" ? { ...known, psychicPalette: known.psychicPalette.map((c) => c ^ 1) } : NEG === "scanline" ? { ...known, targetYElevation: known.targetYElevation + 1 } : known);
  const vramSeg = new Map<number, string>();
  for (let r = 0; r < n; r += 1) { const want = rows[r]!, got = model[r]!;
    const bad = Object.keys(want.registers).filter((key) => want.registers[key] !== got.registers[key]);
    bump("registers", !bad.length, r, bad.map((key) => `${key}=${want.registers[key]}/${got.registers[key]}`).join(","));
    const bbad = Object.keys(want.battleBg).filter((key) => want.battleBg[key] !== got.battleBg[key]); bump("battleBg", !bbad.length, r, bbad.map((key) => `${key}=${want.battleBg[key]}/${got.battleBg[key]}`).join(","));
    for (const f of ["hardwarePalette", "unfadedPalette", "fadedPalette"] as const) { const pb: number[] = []; for (let i = 0; i < 512; i += 1) if (want[f][i] !== got[f][i]) pb.push(i); bump(f, !pb.length, r, pb.length ? `${pb.length}@${pb[0]}` : undefined); }
    const ws = want.tasks.map((x: Json) => ({ slot: x.slot, callback: x.func.symbol, data: x.data })), tok = same(ws, got.tasks);
    bump("tasks", tok, r, tok ? undefined : JSON.stringify(ws.map((x: Json) => `${x.slot}:${x.callback.slice(-12)}:${x.data.slice(0, 6)}`)) + "|" + JSON.stringify(got.tasks.map((x) => `${x.slot}:${x.callback.slice(-12)}:${x.data.slice(0, 6)}`)));
    const sc = want.scanline, sok = sc.state === got.scanline.state && sc.srcBuffer === got.scanline.srcBuffer && sc.dmaDest === got.scanline.dmaDest;
    bump("scanlineState", sok, r, `${sc.state},${sc.srcBuffer},${sc.dmaDest}/${got.scanline.state},${got.scanline.srcBuffer},${got.scanline.dmaDest}`);
    const bufBad = [0, 1].flatMap((bi) => want.scanlineBuffers[bi].map((v: number, i: number) => (v === got.scanline.buffers[bi]![i] ? -1 : bi * 1000 + i)).filter((x: number) => x >= 0));
    bump("scanlineBuffers", !bufBad.length, r, `${bufBad.length}@${bufBad[0]}`);
    const sha = want.bgVram.allSha256 as string, seg = vramSeg.get(got.vram); if (seg === undefined) vramSeg.set(got.vram, sha);
    const prevSha = r > 0 ? rows[r - 1]!.bgVram.allSha256 : sha, edge = r > 0 && got.vram !== model[r - 1]!.vram;
    bump("vramHandle", (seg === undefined || seg === sha) && (edge ? sha !== prevSha : sha === prevSha), r, `label ${got.vram}`);
    const cs = want.sprites.find((s: Json) => s.slot === known.cloneSlot && s.template?.symbol === "gMultiuseSpriteTemplate" && s.matrixNum === known.cloneMatrix && r >= 94 && r <= 118);
    bump("cloneSprite", got.clone ? !!cs && cs.y2 === got.clone.y2 && cs.x2 === got.clone.x2 && cs.matrix[3] === got.clone.matrix : !cs, r, cs ? `${cs.y2},${cs.matrix[3]}/${got.clone?.y2},${got.clone?.matrix}` : "absent");
  }
  out.rowsCompared = n;
  return out;
}
export const ACCEPTED = (side: string) => resolve(root, `tools/compare/evidence/extrasensory-${side}-dense-state.json.gz`);
if (!process.env.PREP30_LIB) {
  const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), results: Json[] = [];
  for (const side of ["player", "opponent"] as const) results.push(checkWindow(`accepted-${side}`, loadFrames(ACCEPTED(side)), side));
  for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, side] = spec.split(":"); results.push(checkWindow(file!.split("/").pop()!.replace(/-r1\.json$/, ""), loadFrames(file!), side as "player" | "opponent")); }
  for (const r of results) console.log(r.name, `rows ${r.rows}/${r.modelRows} oam ${r.oamRowsExact}/${r.rowsCompared - 1} mat ${r.matrixRowsExact}/${r.rowsCompared - 1}`, Object.entries(r.fields).map(([f, v]: any) => `${f} ${v.exact}/${v.rows}${v.bad ? " " + JSON.stringify(v.bad.slice(0, 3)) : ""}`).join(" | "), JSON.stringify(r.phase), r.examples.slice(0, 2).join(" "));
  if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
}
