// snd182 (docs/snd182-scene-on-forced-player-send-in-live.md): production's "X was dragged out!" first-glyph frame against the ROM for every
// snd179 probe case (rom-rows-r1/r2, rom-rows-attackers-r1/r2: sent-in species / nature / the ROM's measured txtStart - ball), before
// (the pre-snd182 Scene ON player send-in: 91 + 11) and after (switchInTiming's forced Scene ON branch). The first glyph is read off the
// production RENDER (renderBattleResolutionLiveView of the constructed segment: message region y >= 112 first differs from the settled
// field after the switch-in), not from the duration constant. 0 = exact.
//   node --experimental-strip-types --no-warnings tools/integration/snd182Rows.ts <out.json> [--base-only]
import { readFileSync, writeFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import {
  FORCED_RETURN_TO_BALL_HOLD_FRAMES, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES, SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming,
} from "../../src/engine/battleResolutionPresentation.ts";
import { calculateHpStat } from "../../src/engine/stats.ts";
import * as tail from "../../src/engine/switchInTail.ts";

const [outPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dir = "tools/integration/fixtures/snd179";
const stats = (id: number) => speciesStats.species.find((s) => s.id === id)!;
const name = (id: number) => stats(id).name.replace(/^SPECIES_/, "");
const mon = (b: 0 | 1, species: number, partyIndex: 0 | 1, personality: number) => {
  const maxHP = calculateHpStat(stats(species).baseHp, 3, 255, 50);
  return Object.freeze({
    species, name: name(species), side: b === 0 ? "player" as const : "trainer" as const, battler: b, partyIndex, level: 50, hp: maxHP, maxHP,
    gender: "male" as const, personality, status: "none" as const, moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
};
const message = (seq: number, lines: string[]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
  noCursor: false, timing: { minimumFrames: 24, holdFrames: 0 } });

/** Elapsed (from the switch-in start) of the first message-region frame that differs from the switch-in's last frame. */
function firstGlyph(species: number, nature: number, after: boolean): { duration: number; firstGlyph: number } {
  const field = Object.freeze({ player: mon(0, 292, 0, 0), opponent: mon(1, 228, 0, 0) });
  const incoming = mon(0, species, 1, nature);
  const timing = after ? switchInTiming(0, species, true, incoming.name, true, nature) : switchInTiming(0, species, true, incoming.name, false, nature);
  const settleHoldFrames = SWITCH_IN_WAITSTATE_HOLD_FRAMES;
  const duration = timing.minimumFrames + settleHoldFrames;
  const commands = [
    message(1, ["Foe HOUNDOUR used", "ROAR!"]),
    Object.freeze({ type: "switch-out", eventSequence: 3, battler: 0, timing: { minimumFrames: FORCED_RETURN_TO_BALL_HOLD_FRAMES }, skipAnimation: true, targetAtRest: true }),
    Object.freeze({ type: "sprite-visibility", eventSequence: 4, battler: 0, visible: false, recall: true, timing: { minimumFrames: FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES } }),
    Object.freeze({ type: "switch-in", eventSequence: 5, battler: 0, fromPartyIndex: 0, toPartyIndex: 1, incoming, incomingStatus1: 0, timing, settleHoldFrames,
      ...(after ? { healthboxSlideElapsed: tail.sceneOffPlayerForcedSwitchInHealthboxSlideElapsed(species), sendInVisualDelay: tail.sceneOffPlayerForcedSwitchInVisualDelay(species) } : {}) }),
    message(6, [`${name(species)} was`, "dragged out!"]),
  ];
  const spans = commands.map((c: any) => c.type === "switch-in" ? duration : c.timing.minimumFrames);
  const sendInT = spans[1]! + spans[2]!;
  const draw = (t: number) => {
    let index = 1; let e = t;
    while (index < commands.length - 1 && e >= spans[index]!) { e -= spans[index]!; index += 1; }
    const view = createBattleResolutionPresentationRenderView({
      field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0, commandIndex: index,
      lifecycle: { phase: "presenting", phaseElapsed: e }, confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
    } as never);
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, view);
    return fb.subarray(112 * 240 * 4);
  };
  const last = draw(sendInT + duration - 1);
  for (let t = sendInT + duration - 1; t < sendInT + duration + 40; t += 1) {
    const f = draw(t);
    if (f.some((v, i) => v !== last[i])) return { duration, firstGlyph: t - sendInT };
  }
  throw new Error(`no message glyph for species ${species}`);
}

const out: unknown[] = [];
let exactAfter = 0; let exactBefore = 0; let total = 0; let identical = 0;
for (const [r1, r2] of [["rom-rows-r1.json", "rom-rows-r2.json"], ["rom-rows-attackers-r1.json", "rom-rows-attackers-r2.json"]] as const) {
  const a = JSON.parse(readFileSync(`${dir}/${r1}`, "utf8")) as any[];
  const b = JSON.parse(readFileSync(`${dir}/${r2}`, "utf8")) as any[];
  a.forEach((row, i) => {
    const species = row.case.species as number; const nature = (row.case.nature ?? 6) as number;
    const after = firstGlyph(species, nature, true); const before = firstGlyph(species, nature, false);
    const same = row.sha256 === b[i].sha256 && row.message === b[i].message;
    total += 1; if (same) identical += 1;
    if (after.firstGlyph - row.message === 0) exactAfter += 1;
    if (before.firstGlyph - row.message === 0) exactBefore += 1;
    out.push({ file: r1, id: row.id, species, name: name(species), nature, attacker: row.species[1], romMessage: row.message, romR2Same: same,
      before: before.firstGlyph, beforeDelta: before.firstGlyph - row.message, after: after.firstGlyph, afterDelta: after.firstGlyph - row.message });
    console.log(`${row.id}: ROM ${row.message}, before ${before.firstGlyph} (${before.firstGlyph - row.message >= 0 ? "+" : ""}${before.firstGlyph - row.message}), after ${after.firstGlyph} (${after.firstGlyph - row.message >= 0 ? "+" : ""}${after.firstGlyph - row.message})`);
  });
}
console.log(`${total} cases: before exact ${exactBefore}, after exact ${exactAfter}, ROM r1 == r2 ${identical}`);
writeFileSync(outPath!, JSON.stringify({ total, exactBefore, exactAfter, romR1EqualsR2: identical, rows: out }, null, 1) + "\n");
