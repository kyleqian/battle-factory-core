import { describe, expect, it } from "vitest";
import {
  projectBattleResolutionCommands, type BattleResolutionDisplayedField, type BattleResolutionPresentationCommand,
  type BattleResolutionSegment,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  battleResolutionCommandDuration, battleResolutionFieldBeforeCommand,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS, liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import { statsChangeParams, statsChangeSpan } from "../src/animation/statsChange.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { scanRoute } from "../tools/integration/sc106RouteScan.ts";
import { iu120Extra } from "./helpers/iu120Rows.ts";
import { SA125_BASE_STATUS_FRAMES, SA125_STATUS_ANIMATION_ROWS } from "./helpers/sa125Rows.ts";
import {
  OPPONENT_FAINT_REPLACEMENT_TURN_END_FRAMES, SWITCH_IN_SPAN_FRAMES, SWITCH_IN_WAITSTATE_HOLD_FRAMES,
} from "../src/engine/battleResolutionPresentation.ts";
import { opponentSwitchInDuration } from "../src/engine/switchInTail.ts";

/** snd145: a Scene ON opponent faint replacement's frames over the pre-snd145 fixed 91 + 11 span (species tail + turn-end hold). */
const snd145FaintReplacement = (species: number) => opponentSwitchInDuration(species) + OPPONENT_FAINT_REPLACEMENT_TURN_END_FRAMES
  - SWITCH_IN_SPAN_FRAMES - SWITCH_IN_WAITSTATE_HOLD_FRAMES;

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
// iu120 (docs/iu120-universal-rows.md): every live move body before an anchor adds its P + T universal rows (tests/helpers/iu120Rows.ts).
const P = "player" as const, O = "opponent" as const;
const iu = (...bodies: (readonly [number, "player" | "opponent", number?])[]) =>
  bodies.reduce((n, [id, side, times]) => n + iu120Extra(id, side) * (times ?? 1), 0);

/** trn181: the Scene ON action-transition pause frames before seed 0's first stats-change anchor (one pause, Dig's 14; trn181PinShift.ts 0 2). */
const TRN181_SEED0_PAUSES_BEFORE_FIRST_ANCHOR = 14;
/** chg161: the Dig charge turns seed 0's Scene ON route plays (each box 24 -> 8 frames). */
const CHG161_SEED0_ON_CHARGE_TURNS = 2;
describe("ordinary routes: one per path, Scene ON (base frames pinned on 52c181d54)", () => {
  it("status stat move, sharply (seed 0, slot 2: GRIMER Acid Armor, arg 40): command after the body, message +90", () => {
    const route = scanRoute(0, Array(8).fill(2), "on");
    const a = anchor(route, 0);
    expect(a).toMatchObject({ path: "status-move", argument: 40, battler: 0, prevEvent: "animation:MOVE_ANIMATION:151,0,0,0,0,0" });
    expect(a.before?.type).toBe("move-animation");
    // Base: the "GRIMER's DEFENSE sharply rose!" message (and its first glyph) started on frame 976.
    // iu120: + the opponent's Dig setup (91) and the Acid Armor (151) bodies before it.
    // chg161: - 16, the opponent Dig's charge-turn empty box (24 -> 8, docs/chg161-charge-turn-print.md).
    // msg175 (docs/msg175-used-message-duration.md): the used prints before it last their printable length (no 24-frame floor): - 2.
    // trn181 (docs/trn181-action-transition-on.md): + 14, the Scene ON action-transition pauses before it (tools/integration/trn181PinShift.ts 0 2).
    const shift = iu([91, O], [151, P]) - 16 - 2 + TRN181_SEED0_PAUSES_BEFORE_FIRST_ANCHOR;
    expect(a.statsChange).toEqual({ frame: 976 + shift, frames: 90 });
    // scf117: + 1 hold frame (the print executes on rel 91 and shows its first glyph on rel 92).
    expect(a.following).toMatchObject({ type: "message", frame: 976 + shift + 90 + 1, glyph: 976 + shift + 90 + 1 });
    // Base 6045 frames; 7 played stats changes (4 x 90 + 3 x 76) = +588; olnd113 (ISSUES #167): + the one source-pause used-move
    // hold this route crosses (STRINGID_BUTITFAILED, 36 at frame 4752; tools/integration/olnd113RouteHolds.ts). scf117: + 7 x 1 hold
    // frame + 1 frame of dismissal parity (the replay presses A on even frames in awaiting-message-dismiss; 7 is odd).
    // iu120: + every live body's universal rows (player 151 x3, 196 x4; opponent Dig 91 x4, 219, 204), - 2 frames of dismissal parity
    // (two later dismissals land one frame earlier relative to the timeline shifted by an odd 27 / 29 frames).
    // sgl138: + 8 + 9 = sgs134: the route's two gated Icy Wind secondaries (IsBattleSEPlaying, docs/sgs134-se-gate-other-requests.md).
    // snd145: + the Foe WOBBUFFET faint replacement's Scene ON species-keyed send-in tail + turn-end hold (158 vs the old 91 + 11).
    expect(route.frames).toBe(6045 + 588 + 36 + 7 + 1 + iu([91, O, 4], [151, P, 3], [196, P, 4], [219, O], [204, O]) - 2 + 8 + 9
      + snd145FaintReplacement(202) - 16 * CHG161_SEED0_ON_CHARGE_TURNS
      - 99 - 1 // pfr192: the one player faint replacement (readyAt 212 vs the fixed 311) + 1 frame of dismissal parity (odd 99).
      - 17 // msg175: the route's used prints last their printable length (no 24-frame floor).
      + 79 + 1); // trn181: the route's six Scene ON action-transition pauses (79 frames) + 1 frame of dismissal parity (odd 79).
  });

  it("status stat move, non-sharp (seed 3, slot 3: Sand-Attack on Foe MARSHTOMP, arg 27): message +76", () => {
    const route = scanRoute(3, Array(8).fill(3), "on");
    const a = anchor(route, 0);
    expect(a).toMatchObject({ path: "status-move", argument: 27, battler: 1, prevEvent: "animation:MOVE_ANIMATION:28,0,0,0,0,0" });
    expect(a.before?.type).toBe("move-animation");
    // iu120: + the Sand-Attack (28) body before it.
    // trn181: the first anchor has no pause before it (shift 0); the later ones below carry the pauses crossed.
    expect(a.statsChange).toEqual({ frame: 641 + iu([28, P]), frames: 76 });
    expect(a.following).toMatchObject({ type: "message", frame: 641 + iu([28, P]) + 76 + 1, glyph: 641 + iu([28, P]) + 76 + 1 });
    // olnd113 (ISSUES #167): + the source-pause used-move holds crossed before each anchor (36 each: ITDOESNTAFFECT at 812, ATTACKMISSED
    // at 1257, ITDOESNTAFFECT at 1705, ATTACKMISSED at 2150; the next one, 3116, is after the last anchor).
    expect(route.anchors.map((x) => x.following!.frame)).toEqual(
      // scf117: + 1 hold frame per crossed stats-change command (i + 1).
      // iu120: + the i + 1 Sand-Attack bodies (and, before the sixth, the opponent's Water Gun 55) crossed.
      [641, 974, 1310, 1643, 1979, 2421].map((f, i) => f + 76 * (i + 1) + [0, 36, 72, 108, 144, 144][i]! + (i + 1)
      // trn181: + the Scene ON action-transition pauses crossed before each anchor (14 each; 12 before the sixth; trn181PinShift.ts 3 3).
        + iu([28, P, i + 1]) + (i === 5 ? iu([55, O]) : 0) + [0, 14, 28, 42, 56, 68][i]!),
    );
  });

  it("secondary effect (seed 3, slot 1: Icy Wind's SPEED -1 on the player, arg 24): after the stat write, message +76", () => {
    const route = scanRoute(3, Array(8).fill(1), "on");
    const a = anchor(route, 0);
    expect(a).toMatchObject({ path: "secondary", argument: 24, battler: 0, prevEvent: "stat-stage-change:speed" });
    expect(a.before?.type).toBe("stat");
    // iu120: + the three live bodies before it (player 98 x2, opponent 317).
    // trn181: + 38, the Scene ON action-transition pauses before it (trn181PinShift.ts 3 1).
    const shift = iu([98, P, 2], [317, O]) + 38;
    expect(a.statsChange).toEqual({ frame: 1379 + shift, frames: 76 });
    expect(a.following).toMatchObject({ type: "message", frame: 1379 + shift + 76 + 1, glyph: 1379 + shift + 76 + 1 });
  });

  it("Intimidate (seed 6, slot 0: Foe GROWLITHE's Intimidate on DROWZE, arg 22): message +76", () => {
    const route = scanRoute(6, Array(8).fill(0), "on");
    const a = anchor(route, 0);
    expect(a).toMatchObject({ path: "intimidate", argument: 22, battler: 0, prevEvent: "stat-stage-change:attack" });
    // shp116 (shadow105): + 10, the two DROWZEE Confusion (93, N 5) bodies into the elevated Foe DUSTOX before it regain their idle lead
    // rows (lead row 0 now draws the enemy shadow instead of declining the lead); scf117: + 1 hold before the following print.
    // iu120: + the six live bodies before it (player 23, 93 x2; opponent 18, 60, 318).
    // snd145: + Foe GROWLITHE's own Scene ON species-keyed send-in tail (131 vs the old 91 + 11; Intimidate follows: no turn-end hold).
    const shift = iu([23, P], [18, O], [60, O], [93, P, 2], [318, O]) + opponentSwitchInDuration(58) - SWITCH_IN_SPAN_FRAMES
      - SWITCH_IN_WAITSTATE_HOLD_FRAMES
      - 10 // msg175 (docs/msg175-used-message-duration.md): the used prints before it last their printable length (no 24-frame floor): - 10.
      + 45 - 1 // trn181 (docs/trn181-action-transition-on.md): the Scene ON action-transition pauses before it (45; trn181PinShift.ts 6 0), - 1 frame of dismissal parity.
      + 46; // snd182 (docs/snd182-scene-on-forced-player-send-in-live.md): the Foe's Roar / Whirlwind drags out the player's DROWZEE at frame 849 (Scene ON forced player send-in: 137 + 11 = 148 vs the old 91 + 11 = 102).
    expect(a.statsChange).toEqual({ frame: 2694 + 10 + shift, frames: 76 });
    expect(a.following).toMatchObject({ type: "message", frame: 2694 + 10 + shift + 76 + 1, glyph: 2694 + 10 + shift + 76 + 1 });
    expect(a.following!.text).toContain("INTIMIDATE");
  });

  it("playstatchangeanimation (seed 13, slot 3: Tickle, multiple down1 on the player, arg 57): before the first stat write +76", () => {
    const route = scanRoute(13, Array(8).fill(3), "on");
    const a = anchor(route, 0);
    expect(a).toMatchObject({ path: "playstatchangeanimation", argument: 57, battler: 0, prevEvent: "animation:MOVE_ANIMATION:321,0,0,0,0,0" });
    expect(a.before?.type).toBe("move-animation");
    // olnd113 (ISSUES #167): + the two ATTACKMISSED used-move holds before it (39 at 1140, 40 at 1625) = +79.
    // iu120: + the four live bodies before it (player 205; opponent 55 x2, the Tickle 321).
    // msg175 (docs/msg175-used-message-duration.md): the used prints before it last their printable length (no 24-frame floor): - 13.
    // trn181: + 39, the Scene ON action-transition pauses before it (trn181PinShift.ts 13 3).
    const shift = iu([205, P], [55, O, 2], [321, O]) - 13 + 39;
    expect(a.statsChange).toEqual({ frame: 1929 + 79 + shift, frames: 76 });
    // One animation for the group: the stat write that follows (ATK) starts 76 frames later; DEF's write has no second command.
    // scf117: + 3 hold frames (setstatchanger + statbuffchange + jumpifbyte + printfromtable after rel 77: the ATK write's `stat`
    // starts on rel 80 and its message's first glyph on rel 82, the print + 1).
    expect(a.following).toMatchObject({ type: "stat", frame: 1929 + 79 + shift + 76 + 3 });
    // The route total: + the same 79, - 1 frame of dismissal parity (the replay presses A on even frames in awaiting-message-dismiss,
    // so after the odd 39-frame hold a later dismissal lands one frame earlier relative to the shifted timeline). scf117: + the
    // route's 6 holds (3 + 3 + 1 + 1 + 1 + 1 = 10) + 1 frame of dismissal parity.
    // iu120: + every live body's universal rows on the route.
    // sa125 (docs/sa125-status-animation-command.md): + the route's Scene ON status animations (CONFUSION x4, PRZ x2) and its one SA3
    // status command (Thunder Wave's PRZ write 32 -> 2), all after this anchor: 9177 -> 9625 (base / final measured).
    expect(route.frames).toBe(8557 + 456 + 79 - 1 + 10 + 1
      + iu([205, P, 6], [55, O, 3], [321, O, 2], [246, O], [341, O], [44, O], [260, O], [148, P, 2], [24, O, 4])
      + 4 * SA125_STATUS_ANIMATION_ROWS.CONFUSION! + 2 * SA125_STATUS_ANIMATION_ROWS.PRZ! - (SA125_BASE_STATUS_FRAMES - 2)
      // snd145: + the Foe NIDORINA faint replacement's send-in tail + turn-end hold (123 vs 102), - 1 frame of dismissal parity (odd 21).
      + snd145FaintReplacement(30) - 1
      - 46 // msg175: the route's used prints last their printable length (no 24-frame floor).
      + 109 + 1 // trn181: the route's seven Scene ON action-transition pauses (109 frames) + 1 frame of dismissal parity (odd 109).
      - 57); // pfr192: the route's player faint replacements (readyAt - 311; the keyed send-in clock).
  });

  it("live Double Team (seed 10, slot 2: YANMA, arg 21): no command, its 239-row window (tmr136) owns the banner; the message moves + 9", () => {
    const route = scanRoute(10, Array(8).fill(2), "on");
    const dt = route.anchors.filter((x) => x.prevEvent === "animation:MOVE_ANIMATION:104,0,0,0,0,0");
    expect(dt).toHaveLength(6);
    expect(dt.every((x) => x.statsChange === null && x.before?.type === "move-animation")).toBe(true);
    // tmr136 (ISSUES #166): the window holds 9 more rows (rel 69..77), so the message's first glyph lands on rel 78 as on the ROM
    // (the box changes on window age 239 in 12 / 12 dense direct-mGBA windows, tools/integration/fixtures/tmr136-live-receipt.json): + 9.
    expect(dt[0]!.following).toMatchObject({ type: "message", frame: 844 /* msg175: 846 -> 844, shorter used prints before it */, text: "YANMA’s evasiveness / rose!" });
    expect(dt[0]!.following!.frame - dt[0]!.before!.frame).toBe(239);
    // The opponent's Acid Armor (arg 40) in the same route does present: 3 x 90.
    expect(route.anchors.filter((x) => x.statsChange !== null).map((x) => x.statsChange!.frames)).toEqual([90, 90, 90]);
    // scf117: + 3 x 1 hold frame after the three Acid Armor commands.
    // iu120: + the opponent's live bodies (Barrier 112 x3, Headbutt 29 x2, Confusion 93 x2); Double Team 104 is masked (P 0, T 0).
    // tmr136: + 9 tail rows per live Double Team body (6 bodies).
    expect(route.frames).toBe(4600 + 270 + 3 + iu([112, O, 3], [29, O, 2], [93, O, 2], [104, P, 6]) + 6 * LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS
      - 16 // msg175: the route's used prints last their printable length (no 24-frame floor).
      + 104); // trn181: the route's eight Scene ON action-transition pauses (104 frames; the first Double Team anchor has none before it).
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
