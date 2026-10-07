/**
 * prep30 Psywave: source-derived ring sprites / OAM / matrices / registers / palettes / tasks / VRAM-handle timeline vs the accepted corpora
 * (tools/compare/evidence/psywave-{player,opponent}-dense-state.json.gz) and fresh alternate probes (psywaveProbe.py output).
 * usage: npx vite-node tools/integration/prep30PsywaveCheck.ts [alt.json:player|opponent ...] [--out=out.json] [--phase=flip]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import psychicAsset from "../../src/assets/gen/battle-anim-psychic-bg.json" with { type: "json" };
import { assemblePsywaveHardwareOam, psywaveModel, pwRows, type PwKnown30 } from "./prep30PsywaveModel.ts";
import { coordX, picOffsetY, speciesName } from "./prep30Species.ts";
process.env.PREP30_LIB = "1";
const { loadFrames, speciesOf } = await import("./prep30ExtrasensoryCheck.ts");
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
const bgr = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const jasc = (p: string) => readFileSync(p, "utf8").trim().split(/\r?\n/).slice(3).map((l) => { const [r, g, b] = l.split(/\s+/).map(Number); return bgr({ r: r!, g: g!, b: b! }); });
const FLIP = process.argv.includes("--phase=flip");
export const measuredLateLagPw = (rows: Json[]) => rows.length === 205;
const RING = "gPsywaveRingSpriteTemplate", MODELLED_TASKS = new Set(["Task_FadeToBg", "SetPsychicBackground_Step", "AnimTask_RunSinAnimTimer"]);
export function knownForPw(rows: Json[], side: "player" | "opponent", lateLag = measuredLateLagPw(rows)): PwKnown30 {
  const r0 = rows[0]!, row1 = rows[1]!, b = r0.battlerSprites, sp = speciesOf(rows, side), tside = side === "player" ? "opponent" : "player";
  const ring = rows.flatMap((r) => r.sprites).find((s: Json) => s.template?.symbol === RING), bitmap = r0.resourceAllocators.matrixBitmap as number;
  return { side, registers0: r0.registers, registersBody: row1.registers, palette0: r0.hardwarePalette, faded0: r0.fadedPalette, unfaded0: r0.unfadedPalette,
    psychicPalette: (psychicAsset as Json).palette.map(bgr), ringPalette: jasc(resolve(root, "reference/pokeemerald/graphics/battle_anims/sprites/blue_ring.pal")),
    ringBank: ring.attr[2] >> 12 & 0xf, ringTile: ring.attr[2] & 0x3ff,
    attacker: { slot: b.attacker.slot, attr: b.attacker.attr }, target: { slot: b.target.slot, attr: b.target.attr },
    origin: { x: coordX(side) + (side === "player" ? 10 : -10), y: picOffsetY(sp.attacker, side) + 10 }, dest: { x: coordX(tside), y: picOffsetY(sp.target, tside) },
    occupiedSlots: r0.sprites.map((s: Json) => s.slot), freeMatrices: Array.from({ length: 32 }, (_, i) => i).filter((i) => !(bitmap >> i & 1)),
    healthboxAttr: row1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: row1.spriteOrder.slice(0, 6), dummyAttr: attrOf(row1.hardwareOam[127]), phase: { lateLag } };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function checkWindowPw(name: string, rows: Json[], side: "player" | "opponent") {
  const lateLag = FLIP ? !measuredLateLagPw(rows) : measuredLateLagPw(rows), known = knownForPw(rows, side, lateLag), model = psywaveModel(known), n = Math.min(rows.length, pwRows(known)), sp = speciesOf(rows, side);
  const out: Json = { name, species: [speciesName(sp.attacker), speciesName(sp.target)], rows: rows.length, modelRows: pwRows(known), phase: { lateLag, measured: measuredLateLagPw(rows) },
    anchors: { origin: known.origin, dest: known.dest }, entries: 0, entryMatch: 0, oamRowsExact: 0, matrixRowsExact: 0, badRows: [] as number[], examples: [] as string[], fields: {} };
  const bump = (f: string, ok: boolean, r: number, extra?: string) => { out.fields[f] ??= { exact: 0, rows: 0 }; out.fields[f].rows += 1; if (ok) out.fields[f].exact += 1; else { out.fields[f].bad ??= []; if (out.fields[f].bad.length < 8) out.fields[f].bad.push(extra ? `${r}:${extra}` : r); } };
  for (let age = 1; age < n; age += 1) {
    const got = assemblePsywaveHardwareOam(age, known, model, (s) => rows[Math.max(s, 0)]!.spriteOrder); let ok = true; const exp: string[] = rows[age]!.hardwareOam;
    for (let i = 0; i < 128; i += 1) { out.entries += 1; if (got.oam[i] === exp[i]) out.entryMatch += 1; else { ok = false; if (out.examples.length < 6) out.examples.push(`${age}/${i}: want ${exp[i]} got ${got.oam[i]}`); } }
    if (ok) out.oamRowsExact += 1; else if (out.badRows.length < 24) out.badRows.push(age);
    if (same(got.matrices, rows[age]!.hardwareMatrices)) out.matrixRowsExact += 1;
  }
  const vramSeg = new Map<number, string>(), targetBank = 256 + 16 * (known.target.attr[2] >> 12 & 0xf);
  for (let r = 0; r < n; r += 1) { const want = rows[r]!, got = model[r]!;
    const bad = Object.keys(want.registers).filter((key) => want.registers[key] !== got.registers[key]);
    bump("registers", !bad.length, r, bad.map((key) => `${key}=${want.registers[key]}/${got.registers[key]}`).join(","));
    for (const f of ["hardwarePalette", "unfadedPalette", "fadedPalette"] as const) { const pb: number[] = [], tb: number[] = [];
      for (let i = 0; i < 512; i += 1) if (want[f][i] !== got[f][i]) (i >= targetBank && i < targetBank + 16 ? tb : pb).push(i);
      bump(f, !pb.length, r, pb.length ? `${pb.length}@${pb[0]}` : undefined); bump(`${f}TargetBank`, !tb.length, r); }
    const ws = want.tasks.filter((x: Json) => MODELLED_TASKS.has(x.func.symbol)).map((x: Json) => ({ slot: x.slot, callback: x.func.symbol, data: x.data })), tok = same(ws, got.tasks);
    bump("tasks(modelled)", tok, r, tok ? undefined : JSON.stringify(ws.map((x: Json) => `${x.slot}:${x.callback.slice(-12)}:${x.data.slice(0, 6)}`)) + "|" + JSON.stringify(got.tasks.map((x) => `${x.slot}:${x.callback.slice(-12)}:${x.data.slice(0, 6)}`)));
    const wr = want.sprites.filter((s: Json) => s.template?.symbol === RING).map((s: Json) => ({ slot: s.slot, matrix: s.matrixNum, x: s.x, y: s.y, x2: s.x2, y2: s.y2, data: s.data.slice(0, 8), pa: s.matrix[0] })).sort((a: Json, b: Json) => a.slot - b.slot);
    const gr = got.rings.map((s) => ({ slot: s.slot, matrix: s.matrix, x: s.x, y: s.y, x2: s.x2, y2: s.y2, data: s.data, pa: s.pa })).sort((a, b) => a.slot - b.slot);
    bump("ringSprites", same(wr, gr), r, same(wr, gr) ? undefined : JSON.stringify(wr[0]) + "|" + JSON.stringify(gr[0]));
    const sha = want.bgVram.allSha256 as string, seg = vramSeg.get(got.vram); if (seg === undefined) vramSeg.set(got.vram, sha);
    const prevSha = r > 0 ? rows[r - 1]!.bgVram.allSha256 : sha, edge = r > 0 && got.vram !== model[r - 1]!.vram;
    bump("vramHandle", (seg === undefined || seg === sha) && (edge ? sha !== prevSha : sha === prevSha), r, `label ${got.vram}`);
  }
  out.rowsCompared = n;
  return out;
}
export const ACCEPTED_PW = (side: string) => resolve(root, `tools/compare/evidence/psywave-${side}-dense-state.json.gz`);
if (!process.env.PREP30_PW_LIB) {
  const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), results: Json[] = [];
  for (const side of ["player", "opponent"] as const) results.push(checkWindowPw(`accepted-${side}`, loadFrames(ACCEPTED_PW(side)), side));
  for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, side] = spec.split(":"); results.push(checkWindowPw(file!.split("/").pop()!.replace(/-r1\.json$/, ""), loadFrames(file!), side as "player" | "opponent")); }
  for (const r of results) console.log(r.name, `rows ${r.rows}/${r.modelRows} oam ${r.oamRowsExact}/${r.rowsCompared - 1} mat ${r.matrixRowsExact}/${r.rowsCompared - 1}`, Object.entries(r.fields).map(([f, v]: any) => `${f} ${v.exact}/${v.rows}${v.bad ? " " + JSON.stringify(v.bad.slice(0, 2)) : ""}`).join(" | "), JSON.stringify(r.phase), r.examples.slice(0, 2).join(" "));
  if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
}
