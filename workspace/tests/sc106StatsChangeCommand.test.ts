import { describe, expect, it } from "vitest";
import {
  projectBattleResolutionCommands, type BattleResolutionDisplayedField, type BattleResolutionPresentationCommand,
  type BattleResolutionSegment,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  battleResolutionCommandDuration, battleResolutionFieldBeforeCommand,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import { statsChangeParams, statsChangeSpan } from "../src/animation/statsChange.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";

// sc106 (S10A, ISSUES #166 slice c; docs/sc106-stats-change-command.md): the `stats-change` presentation command at each kernel
// STATS_CHANGE `animation` event, 76 / 90 frames (stat101 receipts: playanimation -> next instruction 77 / 91 rows vs 1 without
// the animation), both scenes; none behind a Substitute doll; none right after a live Double Team body (its window owns the banner).
// cln242: the six "ordinary routes" cases (per-path command / following-print frame pins and whole-route frame totals, hand-shifted
// on every upstream frame change) were deleted; the census delta (lsd194Census.sh + rst197CensusDelta.py) covers stats-change command
// frames per route. tools/integration/sc106RouteScan.ts stays (docs/sc106-stats-change-command.md still cites it).

const statsChange = (battler: 0 | 1, argument: number) => Object.freeze({
  type: "stats-change", eventSequence: 1, battler, argument,
  timing: { minimumFrames: statsChangeSpan(statsChangeParams(argument)!).addedRows },
}) as BattleResolutionPresentationCommand;

describe("the stats-change command's duration", () => {
  it("is the reducer's added rows: 76 non-sharp / 90 sharply, any battler, any field", () => {
    const field = {} as BattleResolutionDisplayedField;
    expect(battleResolutionCommandDuration(statsChange(0, 16), field)).toBe(76);
    expect(battleResolutionCommandDuration(statsChange(1, 41), field)).toBe(90);
    expect(battleResolutionCommandDuration(statsChange(0, 55), field)).toBe(76);
    expect(battleResolutionCommandDuration(statsChange(1, 58), field)).toBe(90);
    // A completed stats-change leaves the displayed field as it was (no doll / HP / status change).
    const sentinel = Object.freeze({ player: {}, opponent: {} }) as unknown as BattleResolutionDisplayedField;
    expect(battleResolutionFieldBeforeCommand(sentinel, [statsChange(0, 16)], 1)).toBe(sentinel);
  });
});

const segmentWith = (seed: number, slot: 0 | 1 | 2 | 3, predicate: (segment: BattleResolutionSegment) => boolean) => {
  let found: BattleResolutionSegment | null = null;
  generatedCommandAnimationReplay(seed, "on", Array(8).fill(slot), 0, true, true, (state) => {
    const r = state.battleResolutionPresentation;
    if (found || !r) return;
    found = r.segments.find(predicate) ?? null;
  });
  return found as unknown as BattleResolutionSegment;
};
const project = (segment: BattleResolutionSegment, field: BattleResolutionDisplayedField) => projectBattleResolutionCommands(
  segment.events, segment.beforeRules.rulesContext, segment.afterRules.rulesContext, field, null);
const withDoll = (field: BattleResolutionDisplayedField, side: "player" | "opponent") =>
  Object.freeze({ ...field, [side]: Object.freeze({ ...field[side], substituteDoll: true as const }) });
const keys = (commands: readonly BattleResolutionPresentationCommand[]) =>
  commands.filter((c) => c.type !== "stats-change").map((c) => `${c.type}:${"eventSequence" in c ? c.eventSequence : ""}`);
const hasStatsChange = (segment: BattleResolutionSegment) => segment.events.some((e) =>
  e.payload.kind === "animation" && e.payload.animationId === "STATS_CHANGE");

describe("the Substitute and Double Team rules on production segments", () => {
  it("behind a Substitute (the battler shown as the doll at the command's start): no command, every other command unchanged", () => {
    // The production segment of seed 0 / slot 2's first Acid Armor (GRIMER raises its own DEFENSE).
    const segment = segmentWith(0, 2, hasStatsChange);
    const visible = project(segment, segment.field);
    expect(visible.filter((c) => c.type === "stats-change")).toMatchObject([{ battler: 0, argument: 40, timing: { minimumFrames: 90 } }]);
    const behind = project(segment, withDoll(segment.field, "player"));
    expect(behind.some((c) => c.type === "stats-change")).toBe(false);
    expect(keys(behind)).toEqual(keys(visible));
    // The other battler's doll does not matter.
    expect(project(segment, withDoll(segment.field, "opponent")).filter((c) => c.type === "stats-change")).toHaveLength(1);
  });

  it("Double Team: no command after a body with a live duration (any field where the user is not the doll); the doll rule covers the rest", () => {
    const segment = segmentWith(10, 2, (s) => hasStatsChange(s)
      && s.commands.some((c) => c.type === "move-animation" && c.animation?.moveId === 104));
    const evasion = (c: BattleResolutionPresentationCommand) => c.type === "stats-change" && c.argument === 21;
    const body = segment.commands.find((c) => c.type === "move-animation" && c.animation?.moveId === 104)!;
    if (body.type !== "move-animation") throw new Error("no Double Team body");
    expect(body.battler).toBe(0);
    // Double Team targets its own user: only the USER shown as the doll changes its duration (swap / decline). Every field in
    // which the user is not the doll keeps the live 230-row window, which already contains the stats change.
    const fields = [segment.field, withDoll(segment.field, "opponent"), withDoll(segment.field, "player"),
      withDoll(withDoll(segment.field, "player"), "opponent")];
    // The user shown as the doll: the Substitute swap composite (liveSubstituteSwap.ts) around the same body; never null.
    // tmr136: the doll-free window is 230 + 9 tail rows (rel 69..77); the swap composite frames the ROM body and is unchanged.
    expect(fields.map((f) => liveMoveAnimationDuration(body.animation!, f))).toEqual([239, 239, 244, 244]);
    for (const f of fields) {
      const commands = project(segment, f);
      expect(commands.some(evasion)).toBe(false);
      expect(keys(commands)).toEqual(keys(segment.commands));
    }
    // The same segment with a non-Double-Team body in its place (Minimize's arg 21 after a body that does not own the banner)
    // presents the command: the exemption is keyed on the body, not on the argument.
    const minimized = segment.events.map((e) => e.payload.kind === "animation" && e.payload.animationId === "MOVE_ANIMATION"
      && e.payload.arguments[0] === "104" ? { ...e, payload: { ...e.payload, arguments: ["107", ...e.payload.arguments.slice(1)] } } : e);
    const other = projectBattleResolutionCommands(minimized, segment.beforeRules.rulesContext, segment.afterRules.rulesContext,
      segment.field, null);
    const at = other.findIndex(evasion);
    expect(other[at]).toMatchObject({ battler: 0, argument: 21, timing: { minimumFrames: 76 } });
    expect(other[at - 1]).toMatchObject({ type: "move-animation", animation: { moveId: 107 } });
  });
});

describe("Scene ON / OFF gameplay parity (the OFF route gets the command too)", () => {
  const rulesWithoutSceneMarker = (v: { rules: any }) => {
    const rc = v.rules.rulesContext;
    return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
  };
  for (const [seed, slot, onCount, offCount] of [[0, 2, 7, 7], [13, 3, 6, 6]] as const) {
    it(`seed ${seed}, slot ${slot}: identical boundaries / RNG; ${onCount} ON / ${offCount} OFF stats-change commands`, () => {
      const on = generatedCommandAnimationReplay(seed, "on", Array(8).fill(slot), 0, true, true);
      const off = generatedCommandAnimationReplay(seed, "off", Array(8).fill(slot), 0, true, true);
      expect(on.commands.filter((c) => c.type === "stats-change")).toHaveLength(onCount);
      expect(off.commands.filter((c) => c.type === "stats-change")).toHaveLength(offCount);
      expect(on.stalled).toBe(off.stalled);
      expect(off.boundaries).toHaveLength(on.boundaries.length);
      for (let i = 0; i < on.boundaries.length; i += 1) {
        expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
        expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
        expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
      }
    });
  }
});
