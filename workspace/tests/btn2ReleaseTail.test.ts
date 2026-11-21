// btn2 (ISSUES #223; docs/subp1m-battle-text-pause.md "btn2"): the rows from a button gate's release to the script's `moveendall` (ROM
// subp1m labs, both scenes), carried as extra turn-end rows after the print.  Fails without RELEASE_TO_MOVEEND_ROWS.
import { describe, expect, it } from "vitest";
import { PROMPT_SCROLL_ROWS, RELEASE_TO_MOVEEND_ROWS, messageCommandTypedRows, turnEndTimingAfterRelease } from "../src/engine/battleResolutionPresentation";
import { GATE_ACCEPT_LEAD_ROWS, isBattleResolutionButtonMessageAcceptable, isBattleResolutionButtonMessageReady } from "../src/engine/battleResolutionPresentationRender";
import { currentMessage, playCensusBattleUntil, stopAtGatedMessage } from "./helpers/btn1Battle";

const turnEndRowsAfter = (seed: number, scene: "on" | "off", messageId: string, piece: number): number | null => {
  const { cursor, found } = playCensusBattleUntil(seed, scene, stopAtGatedMessage(messageId, piece));
  expect(found).toBe(true);
  const resolution = currentMessage(cursor.state())!.resolution;
  const commands = resolution.segments[resolution.segmentIndex].commands as any[];
  const index = resolution.commandIndex as number;
  const rest = commands.slice(index + 1);
  const turnEnd = rest.find((command) => command.type === "turn-end");
  if (turnEnd === undefined || rest.some((c) => c.type !== "sprite-visibility" && c.type !== "turn-end" && !(c.type === "message" && c.promptGate))) return null;
  return turnEnd.timing.minimumFrames;
};

describe("btn2: release-to-moveendall rows (ROM, both scenes)", () => {
  // msg2: dragged out counts from the engine's release row (the probe's press row + 1): 4 (ROM pictures: the box clears 14 rows after
  // the press, fcm1 catcher 33 / 33; docs/msg2-roar-wish-messages.md).
  it("pins the measured table (dragged out 4, Substitute damaged 10, Substitute faded 9 after its hold)", () => {
    expect(RELEASE_TO_MOVEEND_ROWS).toEqual({
      STRINGID_PKMNWASDRAGGEDOUT: 4, STRINGID_SUBSTITUTEDAMAGED: 10, STRINGID_PKMNSUBSTITUTEFADED: 9,
    });
  });

  for (const scene of ["off", "on"] as const) {
    it(`Roar's dragged-out print (seed 95, Scene ${scene.toUpperCase()}) is followed by an 8 + 4 row turn-end`, () => {
      expect(turnEndRowsAfter(95, scene, "STRINGID_PKMNWASDRAGGEDOUT", 0)).toBe(12);
    });

  }

  const printed = (messageId: string, promptGate: boolean) => ({
    commands: [{ type: "message", eventSequence: 7, promptGate, advance: "button", lines: ["x"], timing: { minimumFrames: 0, holdFrames: 0 } }, { type: "sprite-visibility" }, { type: "sprite-visibility" }] as any[],
    events: [{ sequence: 7, payload: { kind: "message", messageId } }] as any[],
  });
  it("the table rows extend the turn-end only for a gated print directly before it (Substitute damaged 18, faded 17, dragged out 12)", () => {
    for (const [id, minimumFrames] of [["STRINGID_SUBSTITUTEDAMAGED", 18], ["STRINGID_PKMNSUBSTITUTEFADED", 17], ["STRINGID_PKMNWASDRAGGEDOUT", 12]] as const) {
      const { commands, events } = printed(id, true);
      expect(turnEndTimingAfterRelease(commands, events)).toEqual({ minimumFrames });
      expect(turnEndTimingAfterRelease(printed(id, false).commands, events)).toEqual({ minimumFrames: 8 });
      expect(turnEndTimingAfterRelease([...commands, { type: "hp" } as any], events)).toEqual({ minimumFrames: 8 });
    }
    const other = printed("STRINGID_PKMNCANTUSEMOVETAUNT", true);
    expect(turnEndTimingAfterRelease(other.commands, other.events)).toEqual({ minimumFrames: 8 });
  });
});

// ROM (btn2 labs btn2-static / btn2-trick, both scenes, A held at P=500): Static's `\\l` scrolls on rows P+1..P+5 (scrollDistance 16,12,8,4,0), typing resumes
// at P+6 and the script releases at P+33 = (first row after the press, P+1) + 5 scroll + 25 glyphs + 2; the 64-row waitmessage follows.  Trick's `\\p` clears
// with no delay: the second page's printer starts on P+1 and the script releases 2 rows after its last glyph.
describe("btn2: Static's `\\l` scroll and Trick's `\\p` clear are the ROM's rows (measured; no change needed)", () => {
  const pieces = (seed: number, messageId: string) => {
    const { cursor, found } = playCensusBattleUntil(seed, "off", stopAtGatedMessage(messageId, 0));
    expect(found).toBe(true);
    const resolution = currentMessage(cursor.state())!.resolution;
    const commands = resolution.segments[resolution.segmentIndex].commands as any[];
    return { first: commands[resolution.commandIndex], rest: commands[resolution.commandIndex + 1] };
  };
  it("Static: 5 scroll rows, then the 25-glyph line, release at the first row + 32, then 64 rows", () => {
    expect(PROMPT_SCROLL_ROWS).toBe(5);
    const { rest } = pieces(200, "STRINGID_PKMNWASPARALYZEDBY");
    expect(rest.leadFrames).toBe(5);
    expect(messageCommandTypedRows(rest) + 2).toBe(33 - 1);
    expect(rest.timing.holdFrames).toBe(64);
  });
  it("Trick: the second page starts with no clear delay and no kept text", () => {
    const { rest } = pieces(177, "STRINGID_PKMNOBTAINEDXYOBTAINEDZ");
    expect(rest.leadFrames ?? 0).toBe(0);
    expect(rest.startChars ?? 0).toBe(0);
  });
});

// ROM (subp1m-roar / hpf4m-subhit / btn2-static, Scene OFF): A at P is accepted iff P >= the print row + the glyph count (dragged out 319 =
// 292 + 27, Substitute damaged 420 = 382 + 38, Static `\\l` 240); a press one row earlier is not remembered.  The engine's print row is the ROM's + 1
// (text image lag), so a gated piece accepts from phaseElapsed = typedRows - 1.  Fails without GATE_ACCEPT_LEAD_ROWS.
describe("btn2: the gate accepts from the row its last glyph is on screen (ROM edge)", () => {
  const stateAt = (promptGate: boolean, phaseElapsed: number) => ({
    segmentIndex: 0, commandIndex: 0, lifecycle: { phase: "presenting", phaseElapsed },
    segments: [{ commands: [{ type: "message", advance: "button", promptGate, lines: ["Foe RATTATA was", "dragged out!"], timing: { minimumFrames: 0, holdFrames: 0 } }] }],
  }) as any;
  it("pins the lead and the accept / ready rows", () => {
    const T = messageCommandTypedRows(stateAt(true, 0).segments[0].commands[0]);
    expect(GATE_ACCEPT_LEAD_ROWS).toBe(2);
    expect(isBattleResolutionButtonMessageAcceptable(stateAt(true, T - 2))).toBe(false);
    expect(isBattleResolutionButtonMessageAcceptable(stateAt(true, T - 1))).toBe(true);
    expect(isBattleResolutionButtonMessageReady(stateAt(true, T - 1))).toBe(false);
    expect(isBattleResolutionButtonMessageReady(stateAt(true, T))).toBe(false);
    expect(isBattleResolutionButtonMessageReady(stateAt(true, T + 1))).toBe(true);
  });
  it("a button message with no gate (faint, trainer intro) keeps typedRows + 1", () => {
    const T = messageCommandTypedRows(stateAt(false, 0).segments[0].commands[0]);
    expect(isBattleResolutionButtonMessageAcceptable(stateAt(false, T))).toBe(false);
    expect(isBattleResolutionButtonMessageAcceptable(stateAt(false, T + 1))).toBe(true);
  });
});

describe("btn2: the orchestrator hands the released print's cursor phase to the render (ROM: frozen until the next print / clear)", () => {
  for (const scene of ["off", "on"] as const) {
    it(`Substitute damaged (seed 177, Scene ${scene.toUpperCase()}): a press after the cursor showed records its age`, () => {
      const { cursor, found } = playCensusBattleUntil(177, scene, stopAtGatedMessage("STRINGID_SUBSTITUTEDAMAGED", 0));
      expect(found).toBe(true);
      const resolutionOf = () => cursor.state().battleResolutionPresentation as any;
      const typed = messageCommandTypedRows(currentMessage(cursor.state())!.command);
      for (let row = 0; row < typed + 7; row += 1) cursor.step([]);
      expect(resolutionOf().lifecycle.phase).toBe("awaiting-message-dismiss");
      const before = resolutionOf();
      const elapsed = before.lifecycle.phaseElapsed as number;
      cursor.step(["A"]);
      const after = resolutionOf();
      expect(after.commandIndex).toBe(before.commandIndex + 1);
      expect(after.releasedWaitCursor).toEqual({ segmentIndex: before.segmentIndex, commandIndex: before.commandIndex, age: elapsed - typed - 1 });
      expect(elapsed - typed - 1).toBeGreaterThanOrEqual(5);
    });
  }
});
