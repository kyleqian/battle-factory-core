import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/engine/core.ts";
import { createFactoryLobbyFreeRoamState } from "../src/engine/factoryLobbyFreeRoam.ts";
import { runSeed } from "../tools/soak/randomRoundSoakDriver.ts";

const lobbyStart = (seed: number) => ({
  ...createInitialState({ battleScene: seed % 2 === 0 ? "off" : "on" }),
  lobbyFreeRoam: createFactoryLobbyFreeRoamState(),
});

describe("nch231: soak lobby new-challenge option", () => {
  it("default: reaching the Lobby ends the run OK, exactly as before", () => {
    const result = runSeed(0, { stateFactory: lobbyStart, maxFrames: 5_000, renderEvery: 0 });
    expect(result.outcome).toBe("OK");
    expect(result.frames).toBe(1);
    expect(result.lobbyNewChallenges).toBeUndefined();
  });

  it.each([0, 1])("newChallengeFromLobby: presses A at the attendant and plays the next challenge (seed %i)", (seed) => {
    const result = runSeed(seed, {
      stateFactory: lobbyStart,
      newChallengeFromLobby: true,
      policy: "winning",
      maxFrames: 6_000,
      renderEvery: 8,
    });
    expect(result.outcome).toBe("OK");
    expect(result.lobbyNewChallenges).toBe(1);
    expect(result.frames).toBeGreaterThan(1_000);
  });
});
