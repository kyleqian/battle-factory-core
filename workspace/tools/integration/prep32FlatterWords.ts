/**
 * prep32 Flatter (260): the 114 confetti Random2 words pinned from the activation gRng2Value, checked against every confetti of a window,
 * and the confetti birth split measured as T (draws completed at each burst snapshot) with its reach into the display buffers.
 *
 * Rule (source: Move_FLATTER 19 x `call CreateFlatterConfetti` = 38 createsprite with delay 0, battle_anim_effects_3.c:3033 AnimFlatterConfetti
 * run once by CreateSpriteAndAnimate): gRng2Value at activation (row 0) steps once per main-loop iteration (RfuMain1) for ages 1..65; the
 * script's confetti burst then draws 3 words per confetti, 114 words back to back, in source order (attacker, target, attacker, ...):
 *   w = (s = s * 0x41c64e6d + 0x6073) >>> 16;  tile += w0 % 12;  data[0] = 0x5e0 +/- (w1 & 0x1ff);  data[1] = 0x480 +/- (w2 & 0xff)
 * Slots: lowest free in creation order; x = -8 (attacker) / 248 (target), y = 104; tile base = the ANIM_TAG_CONFETTI tile range.
 *   npx vite-node tools/integration/prep32FlatterWords.ts [<dense.json[.gz]> ...] [--neg=seed|steps] [--out=<file>]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { ANIM_TAG_CONFETTI, BURST_AGE, flatterConfetti, step } from "./prep32FlatterModel.ts";

type Json = Record<string, any>;
const NEG = process.argv.find((a) => a.startsWith("--neg="))?.slice(6) ?? "";
const load = (p: string): Json[] => (JSON.parse((p.endsWith(".gz") ? gunzipSync(readFileSync(p)) : readFileSync(p)).toString("utf8")) as Json).frames;
const isConf = (s: Json): boolean => s.callback.symbol === "AnimFlatterConfetti_Step";   // a VBlank inside AnimFlatterConfetti (callback not yet stored) = partial snapshot (T)
export function checkWindow(path: string): Json {
  const rows = load(path), r0 = rows[0]!, pre = rows[BURST_AGE - 1]!;
  const seed = NEG === "seed" ? (r0.animationRng ^ 1) >>> 0 : r0.animationRng;
  const occupied = (pre.sprites as Json[]).map((s) => s.slot);
  const m = flatterConfetti(seed, occupied, NEG === "steps" ? BURST_AGE - 1 : BURST_AGE);
  const alloc = pre.resourceAllocators, tagIdx = (alloc.tileTags as number[]).indexOf(ANIM_TAG_CONFETTI);
  const tileBase = tagIdx >= 0 ? alloc.tileRanges[tagIdx][0] : -1;
  // every confetti at its first row (birth snapshot, data[3] = 0, no step yet) and at the first stepped row (67: one step)
  let exactBirth = 0, exactStep = 0; const bad: string[] = [];
  const firstRow = new Map<number, number>();
  rows.forEach((row, r) => { for (const s of row.sprites as Json[]) if (isConf(s) && !firstRow.has(s.slot) && r >= BURST_AGE && r <= BURST_AGE + 2) firstRow.set(s.slot, r); });
  for (const c of m.confetti) {
    const r = firstRow.get(c.slot), sp = r === undefined ? null : (rows[r]!.sprites as Json[]).find((s) => s.slot === c.slot)!;
    const x = c.side === 0 ? -8 : 248;
    const exp = sp && sp.data[3] === 0
      ? [x, 104, 0, 0, tileBase + c.tileOffset, c.data0, c.data1, c.side, 0]
      : [x, 104, c.side === 0 ? c.data0 >> 8 : -(c.data0 >> 8), -(c.data1 >> 8), tileBase + c.tileOffset, Math.max(c.data0 - 22, 0), c.data1 - 48, c.side, 1];
    const got = sp ? [sp.x, sp.y, sp.x2, sp.y2, sp.attr[2] & 0x3ff, sp.data[0], sp.data[1], sp.data[2], sp.data[3]] : null;
    if (JSON.stringify(exp) === JSON.stringify(got)) { if (sp!.data[3] === 0) exactBirth += 1; else exactStep += 1; } else if (bad.length < 6) bad.push(`slot${c.slot}@${r}:${JSON.stringify(got)}!=${JSON.stringify(exp)}`);
  }
  // T: draws completed at each burst snapshot (animationRng = activation + 65 RfuMain1 steps + k confetti draws)
  let s65 = r0.animationRng >>> 0; for (let i = 0; i < BURST_AGE; i += 1) s65 = step(s65);
  const drawsAt = (v: number): number => { let s = s65; for (let k = 0; k <= 200; k += 1) { if (s === (v >>> 0)) return k; s = step(s); } return -1; };
  const cuts = [BURST_AGE, BURST_AGE + 1, BURST_AGE + 2].map((r) => drawsAt(rows[r]!.animationRng));
  const births = [BURST_AGE, BURST_AGE + 1, BURST_AGE + 2].map((r, i) => (rows[r]!.sprites as Json[]).filter(isConf).length - (i ? (rows[r - 1]!.sprites as Json[]).filter(isConf).length : 0));
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const burstRows = [BURST_AGE, BURST_AGE + 1, BURST_AGE + 2];
  return {
    window: path.split("/").pop()!.replace(/(-r1)?\.json(\.gz)?$/, ""), rows: rows.length, activationRandom2: r0.animationRng, words: m.words.length,
    wordsSha: m.words.reduce((h, w) => (Math.imul(h, 31) + w) >>> 0, 7), tileBase, confetti: 38, exactBirthSnapshot: exactBirth, exactFirstStep: exactStep, bad,
    rngAfterBurstMatches: rows[BURST_AGE + 2]!.animationRng >>> 0 === m.after,
    split: { birthsPerRow: births, drawsCompletedAtSnapshot: cuts, vblankInsideCallback: cuts.slice(0, 2).some((k) => k % 3 !== 0) },
    splitReachesDisplay: {
      softwareOamChangesInBurst: burstRows.filter((r) => !same(rows[r]!.softwareOam, rows[r - 1]!.softwareOam)),
      hardwareOamChangesAfterFirstBurstRow: burstRows.slice(1).filter((r) => !same(rows[r]!.hardwareOam, rows[r - 1]!.hardwareOam)),
      hardwarePaletteChangesInBurst: burstRows.filter((r) => !same(rows[r]!.hardwarePalette, rows[r - 1]!.hardwarePalette)),
      registerChangesInBurst: burstRows.filter((r) => !same(rows[r]!.registers, rows[r - 1]!.registers)),
      hardwareMatrixChangesInBurst: burstRows.filter((r) => !same(rows[r]!.hardwareMatrices, rows[r - 1]!.hardwareMatrices)),
    },
  };
}
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const windows = (args.length ? args : ["tools/compare/evidence/flatter-player-dense-state.json.gz", "tools/compare/evidence/flatter-opponent-dense-state.json.gz"]).map(checkWindow);
const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
if (out) writeFileSync(out, `${JSON.stringify({ schema: "prep32-flatter-words/v1", neg: NEG || null, windows }, null, 1)}\n`);
for (const w of windows) console.log(w.window, `birth ${w.exactBirthSnapshot} + step ${w.exactFirstStep} / 38`, `rngAfter ${w.rngAfterBurstMatches}`, JSON.stringify(w.split), JSON.stringify(w.splitReachesDisplay), w.bad.join(" "));
