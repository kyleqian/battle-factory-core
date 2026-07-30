import { describe, expect, it } from "vitest";
import evidence from "./fixtures/battle-command-generated-off-evidence.json" with { type: "json" };
import scenario from "../tools/battle-lab/mechanic-battle-command-generated-off.json" with { type: "json" };
import trace from "../tools/compare/traces/battle-command-generated-off.json" with { type: "json" };

describe("generated Scene-OFF battle-command evidence checkpoint", () => {
  it("uses a complete honest mechanic-lab party builder for the staged field", () => {
    expect(scenario).toMatchObject({
      schemaVersion: 1,
      mode: "mechanicLab",
      profile: "battle-scene-off",
      trainerId: 17,
      seed: 2423399196,
    });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    for (const party of [
      scenario.overrides.parties.player,
      scenario.overrides.parties.opponent,
    ]) {
      for (const member of party) {
        expect(member.moves).toHaveLength(4);
        expect(member.ppUps).toHaveLength(4);
        expect(Object.keys(member.ivs)).toHaveLength(6);
        expect(Object.keys(member.evs)).toHaveLength(6);
        expect(member).toHaveProperty("abilitySlot");
        expect(member).toHaveProperty("personality");
      }
    }
    expect(scenario.overrides.parties.player[0]).toMatchObject({
      species: evidence.honestInitialField.playerSpecies,
      moves: evidence.honestInitialField.playerMoves,
    });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({
      species: evidence.honestInitialField.opponentSpecies,
      moves: evidence.honestInitialField.opponentMoves,
    });
  });

  it("pins the complete dense acceptance without thinning", () => {
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.acceptance).toEqual({
      matchedClaimed: 128,
      captureCount: 128,
      traceCommitted: true,
    });
    expect(evidence.diagnosticDenseWindow).toMatchObject({
      startFrame: 8,
      endFrame: 135,
      captureCount: 128,
      matched: 128,
      mismatched: 0,
      matchingPrefix: { startFrame: 8, endFrame: 135, count: 128 },
      firstDivergence: null,
    });
    expect(evidence.oracleRoute).toMatchObject({
      confirmFrame: 34,
      faintedOpponentFrame: 519,
      nextSettledCommandFrame: 820,
      nextOpponentSpecies: 88,
    });
    expect(scenario.trace.captureFrames).toContain(
      evidence.oracleRoute.nextSettledCommandFrame,
    );
    expect(trace.oracleProfile).toBe("battle-scene-off");
    expect(trace.oracleBattleLab.scenario)
      .toBe("../../battle-lab/mechanic-battle-command-generated-off.json");
    expect(trace.captureFrames).toEqual(
      Array.from({ length: 128 }, (_, index) => index + 8),
    );
  });
});
