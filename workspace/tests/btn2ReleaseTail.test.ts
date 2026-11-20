// btn2 (ISSUES #223; docs/subp1m-battle-text-pause.md "btn2"): the rows from a button gate's release to the script's `moveendall` (ROM
// subp1m labs, both scenes), carried as extra turn-end rows after the print.  Fails without RELEASE_TO_MOVEEND_ROWS.
import { describe, expect, it } from "vitest";
import { RELEASE_TO_MOVEEND_ROWS, turnEndTimingAfterRelease } from "../src/engine/battleResolutionPresentation";
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
  it("pins the measured table (dragged out 5, Substitute damaged 10, Substitute faded 9 after its hold)", () => {
    expect(RELEASE_TO_MOVEEND_ROWS).toEqual({
      STRINGID_PKMNWASDRAGGEDOUT: 5, STRINGID_SUBSTITUTEDAMAGED: 10, STRINGID_PKMNSUBSTITUTEFADED: 9,
    });
  });

  for (const scene of ["off", "on"] as const) {
    it(`Roar's dragged-out print (seed 95, Scene ${scene.toUpperCase()}) is followed by an 8 + 5 row turn-end`, () => {
      expect(turnEndRowsAfter(95, scene, "STRINGID_PKMNWASDRAGGEDOUT", 0)).toBe(13);
    });

  }

  const printed = (messageId: string, promptGate: boolean) => ({
    commands: [{ type: "message", eventSequence: 7, promptGate, advance: "button", lines: ["x"], timing: { minimumFrames: 0, holdFrames: 0 } }, { type: "sprite-visibility" }, { type: "sprite-visibility" }] as any[],
    events: [{ sequence: 7, payload: { kind: "message", messageId } }] as any[],
  });
  it("the table rows extend the turn-end only for a gated print directly before it (Substitute damaged 18, faded 17, dragged out 13)", () => {
    for (const [id, minimumFrames] of [["STRINGID_SUBSTITUTEDAMAGED", 18], ["STRINGID_PKMNSUBSTITUTEFADED", 17], ["STRINGID_PKMNWASDRAGGEDOUT", 13]] as const) {
      const { commands, events } = printed(id, true);
      expect(turnEndTimingAfterRelease(commands, events)).toEqual({ minimumFrames });
      expect(turnEndTimingAfterRelease(printed(id, false).commands, events)).toEqual({ minimumFrames: 8 });
      expect(turnEndTimingAfterRelease([...commands, { type: "hp" } as any], events)).toEqual({ minimumFrames: 8 });
    }
    const other = printed("STRINGID_PKMNCANTUSEMOVETAUNT", true);
    expect(turnEndTimingAfterRelease(other.commands, other.events)).toEqual({ minimumFrames: 8 });
  });
});
