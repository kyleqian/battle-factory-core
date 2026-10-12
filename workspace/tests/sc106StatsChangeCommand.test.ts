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
import { scanRoute } from "../tools/integration/sc106RouteScan.ts";

// sc106 (S10A, ISSUES #166 slice c; docs/sc106-stats-change-command.md): the `stats-change` presentation command at each kernel
// STATS_CHANGE `animation` event, 76 / 90 frames (stat101 receipts: playanimation -> next instruction 77 / 91 rows vs 1 without
// the animation), both scenes; none behind a Substitute doll; none right after a live Double Team body (its window owns the banner).
// Route anchors: the base frames are pinned literals measured on master 52c181d54 (tools/integration/sc106RouteScan.ts in a
// git-archive copy, receipt tools/integration/fixtures/sc106-live-receipt.json).

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

type Route = ReturnType<typeof scanRoute>;
const anchor = (route: Route, index: number) => route.anchors[index]!;

describe("ordinary routes: one per path, Scene ON (base frames pinned on 52c181d54)", () => {
  it("status stat move, sharply (seed 0, slot 2: GRIMER Acid Armor, arg 40): command after the body, message +90", () => {
    const route = scanRoute(0, Array(8).fill(2), "on");
    const a = anchor(route, 0);
    expect(a).toMatchObject({ path: "status-move", argument: 40, battler: 0, prevEvent: "animation:MOVE_ANIMATION:151,0,0,0,0,0" });
    expect(a.before?.type).toBe("move-animation");
    // Base: the "GRIMER's DEFENSE sharply rose!" message (and its first glyph) started on frame 976.
    expect(a.statsChange).toEqual({ frame: 976, frames: 90 });
    // scf117: + 1 hold frame (the print executes on rel 91 and shows its first glyph on rel 92).
    expect(a.following).toMatchObject({ type: "message", frame: 976 + 90 + 1, glyph: 976 + 90 + 1 });
    // Base 6045 frames; 7 played stats changes (4 x 90 + 3 x 76) = +588; olnd113 (ISSUES #167): + the one source-pause used-move
    // hold this route crosses (STRINGID_BUTITFAILED, 36 at frame 4752; tools/integration/olnd113RouteHolds.ts). scf117: + 7 x 1 hold
    // frame + 1 frame of dismissal parity (the replay presses A on even frames in awaiting-message-dismiss; 7 is odd).
    expect(route.frames).toBe(6045 + 588 + 36 + 7 + 1);
  });

  it("status stat move, non-sharp (seed 3, slot 3: Sand-Attack on Foe MARSHTOMP, arg 27): message +76", () => {
    const route = scanRoute(3, Array(8).fill(3), "on");
    const a = anchor(route, 0);
    expect(a).toMatchObject({ path: "status-move", argument: 27, battler: 1, prevEvent: "animation:MOVE_ANIMATION:28,0,0,0,0,0" });
    expect(a.before?.type).toBe("move-animation");
    expect(a.statsChange).toEqual({ frame: 641, frames: 76 });
    expect(a.following).toMatchObject({ type: "message", frame: 641 + 76 + 1, glyph: 641 + 76 + 1 });
    // olnd113 (ISSUES #167): + the source-pause used-move holds crossed before each anchor (36 each: ITDOESNTAFFECT at 812, ATTACKMISSED
    // at 1257, ITDOESNTAFFECT at 1705, ATTACKMISSED at 2150; the next one, 3116, is after the last anchor).
    expect(route.anchors.map((x) => x.following!.frame)).toEqual(
      // scf117: + 1 hold frame per crossed stats-change command (i + 1).
      [641, 974, 1310, 1643, 1979, 2421].map((f, i) => f + 76 * (i + 1) + [0, 36, 72, 108, 144, 144][i]! + (i + 1)),
    );
  });

  it("secondary effect (seed 3, slot 1: Icy Wind's SPEED -1 on the player, arg 24): after the stat write, message +76", () => {
    const route = scanRoute(3, Array(8).fill(1), "on");
    const a = anchor(route, 0);
    expect(a).toMatchObject({ path: "secondary", argument: 24, battler: 0, prevEvent: "stat-stage-change:speed" });
    expect(a.before?.type).toBe("stat");
    expect(a.statsChange).toEqual({ frame: 1379, frames: 76 });
    expect(a.following).toMatchObject({ type: "message", frame: 1379 + 76 + 1, glyph: 1379 + 76 + 1 });
  });

  it("Intimidate (seed 6, slot 0: Foe GROWLITHE's Intimidate on DROWZE, arg 22): message +76", () => {
    const route = scanRoute(6, Array(8).fill(0), "on");
    const a = anchor(route, 0);
    expect(a).toMatchObject({ path: "intimidate", argument: 22, battler: 0, prevEvent: "stat-stage-change:attack" });
    // shp116 (shadow105): + 10, the two DROWZEE Confusion (93, N 5) bodies into the elevated Foe DUSTOX before it regain their idle lead
    // rows (lead row 0 now draws the enemy shadow instead of declining the lead); scf117: + 1 hold before the following print.
    expect(a.statsChange).toEqual({ frame: 2694 + 10, frames: 76 });
    expect(a.following).toMatchObject({ type: "message", frame: 2694 + 10 + 76 + 1, glyph: 2694 + 10 + 76 + 1 });
    expect(a.following!.text).toContain("INTIMIDATE");
  });

  it("playstatchangeanimation (seed 13, slot 3: Tickle, multiple down1 on the player, arg 57): before the first stat write +76", () => {
    const route = scanRoute(13, Array(8).fill(3), "on");
    const a = anchor(route, 0);
    expect(a).toMatchObject({ path: "playstatchangeanimation", argument: 57, battler: 0, prevEvent: "animation:MOVE_ANIMATION:321,0,0,0,0,0" });
    expect(a.before?.type).toBe("move-animation");
    // olnd113 (ISSUES #167): + the two ATTACKMISSED used-move holds before it (39 at 1140, 40 at 1625) = +79.
    expect(a.statsChange).toEqual({ frame: 1929 + 79, frames: 76 });
    // One animation for the group: the stat write that follows (ATK) starts 76 frames later; DEF's write has no second command.
    // scf117: + 3 hold frames (setstatchanger + statbuffchange + jumpifbyte + printfromtable after rel 77: the ATK write's `stat`
    // starts on rel 80 and its message's first glyph on rel 82, the print + 1).
    expect(a.following).toMatchObject({ type: "stat", frame: 1929 + 79 + 76 + 3 });
    // The route total: + the same 79, - 1 frame of dismissal parity (the replay presses A on even frames in awaiting-message-dismiss,
    // so after the odd 39-frame hold a later dismissal lands one frame earlier relative to the shifted timeline). scf117: + the
    // route's 6 holds (3 + 3 + 1 + 1 + 1 + 1 = 10) + 1 frame of dismissal parity.
    expect(route.frames).toBe(8557 + 456 + 79 - 1 + 10 + 1);
  });

  it("live Double Team (seed 10, slot 2: YANMA, arg 21): no command, its 230-row window owns the banner; the message is unmoved", () => {
    const route = scanRoute(10, Array(8).fill(2), "on");
    const dt = route.anchors.filter((x) => x.prevEvent === "animation:MOVE_ANIMATION:104,0,0,0,0,0");
    expect(dt).toHaveLength(6);
    expect(dt.every((x) => x.statsChange === null && x.before?.type === "move-animation")).toBe(true);
    expect(dt[0]!.following).toMatchObject({ type: "message", frame: 837, text: "YANMA’s evasiveness / rose!" });
    expect(dt[0]!.following!.frame - dt[0]!.before!.frame).toBe(230);
    // The opponent's Acid Armor (arg 40) in the same route does present: 3 x 90.
    expect(route.anchors.filter((x) => x.statsChange !== null).map((x) => x.statsChange!.frames)).toEqual([90, 90, 90]);
    // scf117: + 3 x 1 hold frame after the three Acid Armor commands.
    expect(route.frames).toBe(4600 + 270 + 3);
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
    expect(fields.map((f) => liveMoveAnimationDuration(body.animation!, f))).toEqual([230, 230, 244, 244]);
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
