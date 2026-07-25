import { describe, expect, it } from "vitest";
import {
  resolveTurn5FaintWindowContent,
  resolveTurn5FaintWindowLines,
  stageTurn5FaintHitChain,
} from "../src/engine/turn5FaintPresentationStaging.ts";

describe("turn5FaintPresentationStaging (S10 presentation-seam checkpoint, gap 3 -- the staged leaf)", () => {
  it("runs the real ONIX ROCK_SLIDE -> GROVYLE hit chain to a genuine KO (hp-change to 0), not a forced faint", () => {
    const { events, battlers } = stageTurn5FaintHitChain();
    const koEvent = events.find((e) => e.kind === "hp-change" && e.to === 0);
    expect(koEvent).toMatchObject({ kind: "hp-change", battler: 1, from: 1, to: 0 });
    expect(battlers[1]).toEqual({ species: 278, side: 1 }); // SPECIES_GROVYLE
    expect(battlers[0]).toEqual({ species: 95, side: 0 }); // SPECIES_ONIX
  });

  it("the fainted branch's own printstring reaches STRINGID_TARGETFAINTED via the real registered opcode chain", () => {
    const { events } = stageTurn5FaintHitChain();
    const faintMessage = events.find(
      (e) => e.kind === "message" && e.provenance.sourceLabel === "BattleScript_FaintTarget",
    );
    expect(faintMessage).toMatchObject({ kind: "message", messageId: "STRINGID_TARGETFAINTED" });
  });

  it("resolveTurn5FaintWindowContent (the PC-to-window bridge, gap 7) identifies Grovyle as the fainted, opponent-side battler", () => {
    const resolution = resolveTurn5FaintWindowContent();
    expect(resolution.faintedBattler).toBe(1);
    expect(resolution.faintedSpecies).toBe(278);
    expect(resolution.faintedSide).toBe("opponent");
    expect(resolution.message.messageId).toBe("STRINGID_TARGETFAINTED");
  });

  it("resolveTurn5FaintWindowLines reproduces turn5-faint.json's own pixel-confirmed text end to end, from real kernel events -- no hardcoded literal", () => {
    // Ground truth: docs/battle-turn-notes.md §24's own pixel-confirmed
    // "Foe GROVYLE"/"fainted!" text for the committed turn5-faint.json
    // window (110/110) -- the exact literal battleScene.ts's own
    // TURN5_FAINTED_LINE1/2 hardcoded before this rung.
    expect(resolveTurn5FaintWindowLines()).toEqual(["Foe GROVYLE", "fainted!"]);
  });
});
