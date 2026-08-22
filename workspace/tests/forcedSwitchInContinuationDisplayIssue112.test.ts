/**
 * ISSUES #112 -- `resolution handoff battler 0 display does not match the
 * genuine next boundary` (`factoryRoundBattleOrchestrator.ts`'s own
 * `settledCommandForResolutionHandoff` consistency check).
 *
 * The forced-party selector's renderer owns exactly the command prefix through
 * the SELECTED battler's typed `switch-in`: the party screen, the "Go!" text,
 * and the send-out animation. The `presenting-switch-in` branch used to resume
 * the ordinary lifecycle at the segment's LAST `switch-in` instead, committing
 * every typed switch-in and silently discarding whatever sat between them.
 *
 * One player confirmation can resume a fainted-actions scan that then runs the
 * rest of the turn inside the SAME immutable receipt. Soak seed 108 battle 1
 * turn 8 is exactly that: after the player's replacement enters, the segment
 * still holds "The sandstorm rages." + 9 HP of sandstorm damage on the
 * incoming mon, the opposing active's poison faint, and only THEN the
 * opponent's own automatic `switch-in`. The player's healthbox never received
 * that 9-HP command, so the action-menu handoff found displayed 66 vs genuine
 * 57 and threw. The check is correct and stays fatal; the producer now resumes
 * at the selected switch-in's own index so every later command -- including a
 * later opposing switch-in -- crosses the ordinary display ledger.
 */
import { describe, expect, it } from "vitest";
import { runSeed } from "../tools/soak/randomRoundSoakDriver.ts";

describe("ISSUES #112 -- forced send-out continuation keeps the display ledger whole", () => {
  it("seed 108 presents the post-send-out sandstorm/faint tail instead of desyncing the healthbox", () => {
    // Battle 1 turn 8's handoff previously threw at frame 338,124.
    const result = runSeed(108, { policy: "full", maxFrames: 340_000, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /resolution handoff battler \d+ display does not match the genuine next boundary/,
    );
    expect(result.outcome).toBe("OK");
    expect(result.frames).toBeGreaterThan(338_124);
  });
});
