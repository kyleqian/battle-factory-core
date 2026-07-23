import { describe, expect, it } from "vitest";
import { BATTLE2_OFF_TURN1_SCENARIO } from "../src/engine/battle2OffScenario.ts";
import { resolveBattleTurn } from "../src/engine/battleTurn.ts";
import {
  acknowledgeSceneOffCommand,
  advanceSceneOffAdapter,
  createBattleTurnPresentation,
  createSceneOffAdapter,
  pendingSceneOffCommand,
} from "../src/engine/sceneOffPresentation.ts";
import {
  advanceStagedBattleTurn,
  stageBattleTurn,
} from "../src/engine/stagedBattleTurn.ts";

function presentAtPace(pacing: number) {
  const resolved = resolveBattleTurn(BATTLE2_OFF_TURN1_SCENARIO);
  let presentation = createBattleTurnPresentation(resolved);
  let adapter = createSceneOffAdapter(pacing);
  let frames = 0;
  while (!presentation.inputReady) {
    const command = pendingSceneOffCommand(presentation)!;
    const advanced = advanceSceneOffAdapter(adapter, command);
    adapter = advanced.adapter;
    frames += 1;
    if (advanced.completion) {
      presentation = acknowledgeSceneOffCommand(
        presentation,
        advanced.completion.commandId,
      );
      adapter = createSceneOffAdapter(pacing);
    }
  }
  return { resolved, presentation, frames };
}

describe("Battle Scene OFF staged turn portability", () => {
  it("pins PP, HP, accuracy, status, and the complete 12-call RNG ledger", () => {
    const result = resolveBattleTurn(BATTLE2_OFF_TURN1_SCENARIO);
    expect(result.state).toMatchObject({
      rngValue: 3121225034,
      player: {
        hp: 117,
        status: "none",
        accuracyStage: 5,
        moves: { "ROCK SLIDE": 9 },
      },
      opponent: {
        hp: 63,
        status: "none",
        accuracyStage: 6,
        moves: { "SAND-ATTACK": 14 },
      },
    });
    expect(result.rngLedger.map((entry) => entry.after)).toEqual([
      2956382169, 2508258776, 575948139, 650807554,
      3011990093, 3762282812, 1648070399, 1361573126,
      3276769281, 3591608032, 2945441235, 3121225034,
    ]);
  });

  it("isolates logical outcome and RNG from presentation pacing", () => {
    const early = presentAtPace(1);
    const late = presentAtPace(4);
    expect(late.frames).toBe(early.frames * 4);
    expect(late.resolved).toEqual(early.resolved);
    expect(late.presentation.acknowledgedCommandIds)
      .toEqual(early.presentation.acknowledgedCommandIds);
  });

  it("rejects early/out-of-order completion and gates input through the menu ack", () => {
    let state = createBattleTurnPresentation(
      resolveBattleTurn(BATTLE2_OFF_TURN1_SCENARIO),
    );
    expect(state.inputReady).toBe(false);
    expect(() => acknowledgeSceneOffCommand(state, 2)).toThrow(/does not match/);

    while (state.commandIndex < state.commands.length - 1) {
      state = acknowledgeSceneOffCommand(
        state,
        pendingSceneOffCommand(state)!.commandId,
      );
      expect(state.inputReady).toBe(false);
    }
    expect(pendingSceneOffCommand(state)?.type).toBe("menu");
    state = acknowledgeSceneOffCommand(state, pendingSceneOffCommand(state)!.commandId);
    expect(state.inputReady).toBe(true);
    expect(pendingSceneOffCommand(state)).toBeNull();
  });

  it("keeps the staged next-input gate closed until every relative command completes", () => {
    let state = stageBattleTurn(BATTLE2_OFF_TURN1_SCENARIO);
    state = advanceStagedBattleTurn(state, false);
    expect(state.phase).toBe("awaitingConfirm");
    state = advanceStagedBattleTurn(state, true);
    expect(state.phase).toBe("presenting");
    expect(state.presentation?.resolved.state.rngValue).toBe(3121225034);
    while (state.phase === "presenting") {
      state = advanceStagedBattleTurn(state, false);
    }
    expect(state.phase).toBe("inputReady");
  });
});
