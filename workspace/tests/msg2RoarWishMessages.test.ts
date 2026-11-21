// msg2 (docs/msg2-roar-wish-messages.md): ROAR / WHIRLWIND's "{X} was dragged out!" and WISH's "{X}'s WISH came true!", pinned to the
// ROM frames of the fcm1 frame-catcher runs (.integration/evidence/fcm1/final/<run>/, ROM side = the real ROM in mGBA).
//
// WISH: Cmd_trywish 1 buffers the wisher's nickname (gWishFutureKnock.wishMonId, battle_script_commands.c:9300,9309); ROM s89-on-wc
// "Foe ILLUMISE's WISH came true!" with DRAGONAIR in (ours named DRAGONAIR). BattleScript_WishButFullHp's `pause B_WAIT_TIME_SHORT`
// before "X's HP is full!": ROM 100 rows from the wish print's last glyph to the HP-full print, ours 66 (7 / 7 catcher rounds).
// ROAR: the print and its wait were already the ROM's (25 rows to the arrow, held until a press). After the press the ROM's box clears
// 14 rows later (33 / 33 catcher prints before the turn end; ours 15), at once when the press lands on an arrow redraw row (2 / 2; fnt1's
// rule, docs/fnt1-fainted-box-clear.md, checked here on this print), and a dragged-in Intimidate / Trace script starts its own rows after
// the release (ours printed 51 / 42 rows early: s36-off-ws, s89-off-ws, s118-off-wc).  Census seeds (tests/helpers/btn1Battle.ts) stage
// the same scripts; the kernel's events are not changed.
import { describe, expect, it } from "vitest";
import {
  ANCHORLESS_PRE_PRINT_PAUSE_LABELS,
  DRAGGED_OUT_ENTRY_SCRIPT_RELEASE_ROWS,
  RELEASE_TO_MOVEEND_ROWS,
  anchorlessPrePrintPauseFrames,
  messageCommandTypedRows,
} from "../src/engine/battleResolutionPresentation";
import { DOWN_ARROW_REDRAW_PERIOD, createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender";
import { currentMessage, playCensusBattleUntil } from "./helpers/btn1Battle";
import type { FactoryRoundBattleOrchestratorState } from "../src/engine/factoryRoundBattleOrchestrator";

type Scene = "on" | "off";
const resolutionOf = (state: FactoryRoundBattleOrchestratorState) => state.battleResolutionPresentation as any;

/** The first WISH that comes true on a battler other than the wisher (the next print names the battler in the slot). */
function stopAtMovedWish() {
  return (state: FactoryRoundBattleOrchestratorState): boolean => {
    const message = currentMessage(state);
    if (message?.messageId !== "STRINGID_PKMNWISHCAMETRUE" || message.resolution.lifecycle.phaseElapsed !== 0) return false;
    const segment = message.resolution.segments[message.resolution.segmentIndex];
    const next = segment.commands.slice(message.resolution.commandIndex + 1).find((command: any) => command.type === "message");
    const wisher = (message.command.lines[0] as string).replace(/’s WISH$/, "");
    return next !== undefined && !(next.lines.join(" ") as string).startsWith(wisher);
  };
}

function movedWish(seed: number, scene: Scene) {
  const { cursor, found } = playCensusBattleUntil(seed, scene, stopAtMovedWish());
  expect(found).toBe(true);
  const message = currentMessage(cursor.state())!;
  const segment = message.resolution.segments[message.resolution.segmentIndex];
  const rest = segment.commands.slice(message.resolution.commandIndex + 1) as any[];
  const nextIndex = rest.findIndex((command) => command.type === "message");
  const event = segment.events.find((candidate: any) => candidate.sequence === message.command.eventSequence);
  return { command: message.command, between: rest.slice(0, nextIndex), next: rest[nextIndex], event };
}

describe("msg2: WISH names the Pokemon that made the wish (Cmd_trywish's wishMonId), not the one now in the slot", () => {
  it("foe side, HP full: Foe ESPEON wished, DONPHAN is in (seed 39, both scenes)", () => {
    for (const scene of ["off", "on"] as const) {
      const wish = movedWish(39, scene);
      expect(wish.command.lines).toEqual(["Foe ESPEON’s WISH", "came true!"]);
      expect(wish.event.payload.substitutions).toEqual(["Foe ESPEON"]);
      expect(wish.next.lines).toEqual(["Foe DONPHAN’s", "HP is full!"]);
    }
  });
  it("player side, HP full: WIGGLYTUFF wished, LAIRON is in (seed 41)", () => {
    const wish = movedWish(41, "off");
    expect(wish.command.lines).toEqual(["WIGGLYTUFF’s WISH", "came true!"]);
    expect(wish.next.lines).toEqual(["LAIRON’s", "HP is full!"]);
  });
  it("foe side, heal: Foe XATU wished, Foe RAICHU regains health (seed 100)", () => {
    const wish = movedWish(100, "off");
    expect(wish.command.lines).toEqual(["Foe XATU’s WISH", "came true!"]);
    expect(wish.next.lines).toEqual(["Foe RAICHU regained", "health!"]);
  });
  it("player side, heal: XATU wished, GYARADOS regains health (seed 403)", () => {
    const wish = movedWish(403, "off");
    expect(wish.command.lines).toEqual(["XATU’s WISH", "came true!"]);
    expect(wish.next.lines).toEqual(["GYARADOS regained", "health!"]);
  });
});

describe("msg2: BattleScript_WishButFullHp's pause B_WAIT_TIME_SHORT before \"X's HP is full!\"", () => {
  it("is an anchorless pre-print row of 32 + 2 = 34 (ROM: 100 rows from the wish print's last glyph, ours were 66)", () => {
    expect(ANCHORLESS_PRE_PRINT_PAUSE_LABELS).toContain("BattleScript_WishButFullHp");
    for (const scene of ["off", "on"] as const) {
      const wish = movedWish(39, scene);
      expect(wish.command.timing.holdFrames).toBe(64);
      expect(wish.between.map((command: any) => [command.type, command.timing.minimumFrames])).toEqual([["move-animation", 34]]);
      expect(anchorlessPrePrintPauseFrames({ provenance: { sourceLabel: "BattleScript_WishButFullHp", programCounter: wish.event.provenance.programCounter + 3 } } as never)).toBe(34);
      // Wish print start -> HP-full print start: its glyphs + 64 + 34 (ROM s89-on-wc: 29 glyphs, 161,726 -> 161,853 = 127 rows).
      expect(messageCommandTypedRows(wish.command) + wish.command.timing.holdFrames + 34).toBe(messageCommandTypedRows(wish.command) + 98);
    }
  });
});

/** The first dragged-out print of `seed` followed by `followedBy` (by default: the turn end). */
function stopAtDraggedOut(followedBy = "turn-end") {
  return (state: FactoryRoundBattleOrchestratorState): boolean => {
    const message = currentMessage(state);
    if (message?.messageId !== "STRINGID_PKMNWASDRAGGEDOUT" || message.command.promptGate !== true) return false;
    if (message.resolution.lifecycle.phase !== "presenting" || message.resolution.lifecycle.phaseElapsed !== 0) return false;
    const rest = message.resolution.segments[message.resolution.segmentIndex].commands.slice(message.resolution.commandIndex + 1) as any[];
    return rest.find((command) => command.type !== "sprite-visibility")?.type === followedBy;
  };
}

/**
 * That dragged-out gate, stepped so that the next tick's press lands on the printer's wait frame `k` (fnt1's convention: G = the frame
 * the last glyph shows, the press on G + 1 + k; k -1 = a press on G itself).  The frame shown now is G + k, at phaseElapsed typed - 1 + k.
 */
function draggedOutBeforePress(seed: number, scene: Scene, k: number, followedBy?: string) {
  const { cursor, found } = playCensusBattleUntil(seed, scene, stopAtDraggedOut(followedBy));
  expect(found).toBe(true);
  const command = currentMessage(cursor.state())!.command;
  const typed = messageCommandTypedRows(command);
  while (resolutionOf(cursor.state()).lifecycle.phaseElapsed < typed - 1 + k) cursor.step([]);
  expect(resolutionOf(cursor.state()).lifecycle.phaseElapsed).toBe(typed - 1 + k);
  return { cursor, command };
}

describe("msg2: ROAR / WHIRLWIND, after the dragged-out press", () => {
  it("the release tail to moveendall is 4 rows from the engine's release row (btn2 counted 5 from the probe's press row)", () => {
    expect(RELEASE_TO_MOVEEND_ROWS.STRINGID_PKMNWASDRAGGEDOUT).toBe(4);
  });
  // seed 95: the player's HITMONCHAN dragged out (the ROM's 33 cases are all this side); seed 15: Foe TORKOAL (no ROM window).
  for (const [seed, scene] of [[95, "off"], [95, "on"], [15, "off"]] as const) {
    it(`before the turn end the box clears 14 rows after the press (ROM 33 / 33; seed ${seed}, Scene ${scene.toUpperCase()})`, () => {
      const { cursor, command } = draggedOutBeforePress(seed, scene, 5);
      cursor.step(["A"]);
      expect(resolutionOf(cursor.state()).releasedWaitCursor).toMatchObject({ age: 4 });
      expect(resolutionOf(cursor.state()).releasedWaitCursor.clear).toBeUndefined();
      let rows = 0;
      while (resolutionOf(cursor.state())?.lifecycle.phase !== "next-command-handoff") {
        // the print and the arrow frozen at its press-time phase stay up until the turn's end clears the box
        const view = createBattleResolutionPresentationRenderView(resolutionOf(cursor.state()));
        expect(view.message?.lines).toEqual(command.lines);
        expect(view.waitCursor).toEqual({ age: 4 });
        cursor.step([]);
        rows += 1;
      }
      expect(rows).toBe(14);
    });
  }
  it("fnt1's wait on this print: not taken on G, taken from G + 1; the arrow from G + 2, a new phase every 9 frames (ROM s186-on-ws b20: 289,207 / 289,216 / 289,225)", () => {
    const { cursor, command } = draggedOutBeforePress(95, "off", -1);
    cursor.step(["A"]);
    expect(currentMessage(cursor.state())?.command).toBe(command);
    const ages: (number | null)[] = [];
    for (let frame = 0; frame <= 20; frame += 1) {
      cursor.step([]);
      ages.push(createBattleResolutionPresentationRenderView(resolutionOf(cursor.state())).waitCursor?.age ?? null);
    }
    // frames G + 1 .. G + 21: no arrow on G + 1, then age 0.. (its phase floor(age / 9): G + 2, G + 11, G + 20)
    expect(ages).toEqual([null, ...Array.from({ length: 20 }, (_, n) => n)]);
  });
  it("a press on an arrow redraw frame (wait frame 0, 9, 18, ...) blanks the box from the next frame (ROM 2 / 2 dragged-out prints)", () => {
    expect(DOWN_ARROW_REDRAW_PERIOD).toBe(9);
    for (const [k, cleared] of [[0, true], [1, false], [2, false], [8, false], [9, true], [10, false], [18, true]] as const) {
      const { cursor, command } = draggedOutBeforePress(95, "off", k);
      cursor.step(["A"]);
      const released = resolutionOf(cursor.state()).releasedWaitCursor;
      expect(released.age).toBe(k - 1);
      expect(released.clear === "pending").toBe(cleared);
      // The press frame still shows the print (the ROM's DMA of the cleared window lands at that frame's VBlank).
      const pressRow = createBattleResolutionPresentationRenderView(resolutionOf(cursor.state()));
      expect(pressRow.message?.lines).toEqual(command.lines);
      cursor.step([]);
      const nextRow = createBattleResolutionPresentationRenderView(resolutionOf(cursor.state()));
      if (cleared) {
        expect(nextRow.message).toBeNull();
        expect(nextRow.waitCursor).toBeNull();
      } else {
        expect(nextRow.message?.lines).toEqual(command.lines);
        expect(nextRow.waitCursor).toEqual({ age: k - 1 });
      }
    }
  });
});

describe("msg2: a dragged-in Intimidate runs its script after the release", () => {
  const afterPress = (seed: number, scene: Scene) => {
    const { cursor } = draggedOutBeforePress(seed, scene, 5, "move-animation");
    const resolution = resolutionOf(cursor.state());
    const commands = resolution.segments[resolution.segmentIndex].commands as any[];
    const gate = resolution.commandIndex as number;
    cursor.step(["A"]);
    let rows = 0;
    while (currentMessage(cursor.state())?.messageId !== "STRINGID_PKMNCUTSATTACKWITH") { cursor.step([]); rows += 1; }
    return { tail: commands.slice(gate + 1, gate + 6), rows };
  };
  it("player side (seed 51, SALAMENCE): a hold of the script's 41 lead rows + 9, the stat row to the STATS_CHANGE animation; the print 132 rows after the press as on the ROM", () => {
    expect(DRAGGED_OUT_ENTRY_SCRIPT_RELEASE_ROWS).toBe(9);
    for (const scene of ["off", "on"] as const) {
      const { tail, rows } = afterPress(51, scene);
      expect(tail.map((command) => [command.type, command.timing.minimumFrames])).toEqual([
        ["sprite-visibility", 1], ["sprite-visibility", 1], ["move-animation", 41 + 9], ["stat", 3], ["stats-change", 76],
      ]);
      expect(tail[2].actionTransition === true).toBe(scene === "on");
      // ROM s36-off-ws / s89-off-ws: press -> "X's INTIMIDATE cuts ..." 132 rows (its second glyph 133); ours were 81.
      expect(rows).toBe(132);
    }
  });
  it("foe side (seed 116, Foe MASQUERAIN): the same hold (no ROM window for this side)", () => {
    const { tail } = afterPress(116, "off");
    expect(tail.map((command) => [command.type, command.timing.minimumFrames])).toEqual([
      ["sprite-visibility", 1], ["sprite-visibility", 1], ["move-animation", 41 + 9], ["stat", 3], ["stats-change", 76],
    ]);
  });
});
