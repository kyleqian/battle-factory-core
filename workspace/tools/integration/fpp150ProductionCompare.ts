// fpp150 (ISSUES #139 R3, docs/fpp150-focus-punch-prepass.md): fps147's 7 dense Scene ON B_ANIM_FOCUS_PUNCH_SETUP windows
// (fps147Run.sh, direct mGBA, r1 == r2) compared THROUGH THE PRODUCTION RENDER PATH: a resolution segment
//   [empty box message, general-animation {battler, FOCUS_PUNCH_SETUP_COMMAND_FRAMES}, "…is tightening its focus!" message]
// rendered by createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView (battleScene.ts
// generalAnimationRenderView). Frame map: general-animation command age a = ROM row X + 1 + a = rel a - 1 (fps147 §4d).
// The constructed field is not the ROM's whole screen (HP, text), so production's frame P(rel) is transplanted onto the ROM's
// row rel -1 wherever it differs from production's own frame without the effect R(rel) (sar131ProductionCompare's method):
// C(rel) = ROM(-1) except where P != R. C == ROM(rel) needs every pixel production changes (shake, red blend, particles,
// elevated-shadow hide) to equal the ROM's and every ROM change on the row to be one production makes. Scored full screen on
// rel -1 .. 122 (the command's 124 rows); rel 123 .. 128 (the next message command) with the message band (y >= 112) apart.
//   node --experimental-strip-types --no-warnings tools/integration/fpp150ProductionCompare.ts <fps147-dump-dir> <out.json>
//     [--x2=none|species] [--neg=age+1|wrong-side|no-effect]
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { FOCUS_PUNCH_SETUP_COMMAND_FRAMES } from "../../src/engine/battleResolutionPresentation.ts";

const args = process.argv.slice(2);
const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const x2Mode = args.find((a) => a.startsWith("--x2="))?.slice(5) ?? "species";
const [rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string];
const F = "tools/integration/fixtures/fps147";
const FRAME = 240 * 160 * 3;
const BOX_Y = 112;
const rom = JSON.parse(readFileSync(`${F}/rom-windows.json`, "utf8")) as { windows: Record<string, any> };
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);

const result: Record<string, unknown> = {};
let windows = 0, clean = 0;
const digest = createHash("sha256");
for (const [key, w] of Object.entries(rom.windows)) {
  windows++;
  const parties = JSON.parse(readFileSync(`${F}/scenarios/${w.scenario}`, "utf8")).overrides.parties;
  const make = (b: 0 | 1, mon: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: mon.gender, status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, parties.player[0]), opponent: make(1, parties.opponent[0]) });
  const battler = (neg === "wrong-side" ? 1 - w.battler : w.battler) as 0 | 1;
  const message = (seq: number, lines: [string, string]) => Object.freeze({ type: "message", eventSequence: seq, lines,
    advance: "automatic", noCursor: false, timing: { minimumFrames: 3, holdFrames: 0 } });
  const command = Object.freeze({ type: "general-animation", eventSequence: 2, battler, animation: "FOCUS_PUNCH_SETUP",
    timing: { minimumFrames: FOCUS_PUNCH_SETUP_COMMAND_FRAMES } });
  const commands = [message(1, ["", ""]), command, message(3, ["TIGHTENING", "FOCUS"])];
  const x2Input = x2Mode === "none" ? undefined : Object.freeze({ zeroed: Object.freeze([]) });
  const viewOf = (commandIndex: number, age: number) => createBattleResolutionPresentationRenderView({
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex, lifecycle: { phase: "presenting", phaseElapsed: age }, confirmHandoff: null, opponentTrainer: null,
    sourceDecision: { kind: "use-move" }, fadeTick: 0, ...(x2Input === undefined ? {} : { liveMoveBattlerX2Input: x2Input }),
  } as never);
  /** ROM row rel: general-animation command age rel + 1 (age+1 control: rel + 2). */
  const viewAt = (rel: number) => {
    const age = rel + 1 + (neg === "age+1" ? 1 : 0);
    if (age < 0) return viewOf(0, 2);
    if (age < FOCUS_PUNCH_SETUP_COMMAND_FRAMES) return viewOf(1, age);
    return viewOf(2, age - FOCUS_PUNCH_SETUP_COMMAND_FRAMES);
  };
  const draw = (view: ReturnType<typeof viewOf>) => {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, view);
    return fb;
  };
  const raw = readFileSync(`${rawDir}/${key}.rgb`);
  const firstRel = w.rows[0].rel as number;
  const frameAt = (rel: number) => raw.subarray((rel - firstRel) * FRAME, (rel - firstRel + 1) * FRAME);
  const base = frameAt(-1);
  let px = 0, rows = 0, tailPx = 0, tailBand = 0, animatedRows = 0;
  const perRow: [number, number][] = [];
  for (const r of w.rows) {
    if (r.rel < -1) continue;
    const view = viewAt(r.rel);
    const p = draw(neg === "no-effect" ? { ...view, effect: null } : view);
    const o = draw({ ...view, effect: null });
    const c = new Uint8Array(base);
    let changed = 0;
    for (let i = 0; i < 240 * 160; i++) {
      if (p[i * 4] !== o[i * 4] || p[i * 4 + 1] !== o[i * 4 + 1] || p[i * 4 + 2] !== o[i * 4 + 2]) {
        c[i * 3] = p[i * 4]!; c[i * 3 + 1] = p[i * 4 + 1]!; c[i * 3 + 2] = p[i * 4 + 2]!; changed++;
      }
    }
    if (changed > 0) animatedRows++;
    const f = frameAt(r.rel);
    let full = 0, band = 0;
    for (let k = 0; k < 240 * 160; k++) {
      if (c[k * 3] !== f[k * 3] || c[k * 3 + 1] !== f[k * 3 + 1] || c[k * 3 + 2] !== f[k * 3 + 2]) {
        full++;
        if (Math.floor(k / 240) >= BOX_Y) band++;
      }
    }
    if (r.rel <= 122) { rows++; px += full; perRow.push([r.rel, full]); } else { tailPx += full - band; tailBand += band; }
  }
  if (px === 0 && tailPx === 0) clean++;
  digest.update(`${key}:${JSON.stringify(perRow)}\n`);
  result[key] = { side: w.side, battler: w.battler, species: { player: field.player.name, opponent: field.opponent.name }, R: w.R,
    scoredRows: rows, px, rowsWithProductionPixels: animatedRows, after: { px: tailPx, messageBandPx: tailBand },
    badRows: perRow.filter((x) => x[1] > 0).slice(0, 12) };
  console.log(key, `rows ${rows}: ${px} px (production-drawn rows ${animatedRows}); after ${tailPx} px (+ band ${tailBand})`);
}
const summary = { neg: neg ?? null, x2: x2Mode, windows, zeroPxWindows: clean, perRowDigest: digest.digest("hex").slice(0, 16) };
writeFileSync(outPath, JSON.stringify({ schema: "fpp150-production-compare/v1", summary, result }, null, 1) + "\n");
console.log(JSON.stringify(summary));
