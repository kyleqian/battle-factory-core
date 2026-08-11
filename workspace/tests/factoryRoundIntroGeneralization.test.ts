import { describe, expect, it } from "vitest";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import {
  battleIntroSceneAssemblyDisplayLag,
  selectFrontierTransition,
} from "../src/engine/battleTransition.ts";
import {
  generatedRoundBattle6LukasRevealStage,
  generatedRoundRevealProofStage,
} from "../tools/compare/factoryRoundIntroGeneralizationStage.ts";

const ALL_HEALTHY_SUMMARY = [
  "healthy", "healthy", "healthy", "empty", "empty", "empty",
] as const;

function advanceFrames<T extends ReturnType<typeof createInitialState>>(
  initial: T,
  frames: number,
): T {
  let state = initial;
  for (let frame = 0; frame < frames; frame += 1) {
    state = tick(state, new Set()) as T;
  }
  return state;
}

describe("noncanonical generated-round intro generalization", () => {
  it("freezes Battle 6 LUKAS from the ordinary controller corpus and renders its full reveal owner purely", () => {
    let state = generatedRoundBattle6LukasRevealStage(
      createInitialState({ appRoute: "generated-orchestrator" }),
    );
    const orchestrator = state.factoryRoundBattleOrchestrator!;
    const intro = orchestrator.battleStartIntro!;
    const command = intro.command;
    const transition = selectFrontierTransition(orchestrator.round.rules.rngValue);

    expect(orchestrator.round.rules).toMatchObject({
      phase: "presentingBattleStart",
      battleIndex: 5,
      lastBattle: null,
      lastSwap: { type: "decline" },
    });
    expect(orchestrator.opponentGenerations.map(({ trainerId }) => trainerId))
      .toEqual([109, 133, 129, 135, 122, 121]);
    expect(command.opponentTrainer).toMatchObject({
      trainerId: 121,
      name: "LUKAS",
    });
    expect(command.parties.player.map(({ setId }) => setId))
      .toEqual([267, 268, 269]);
    expect(command.parties.opponent.map(({ setId }) => setId))
      .toEqual([270, 341, 284]);
    expect(command.partySummaries.player).toEqual(ALL_HEALTHY_SUMMARY);
    expect(command.partySummaries.opponent).toEqual(ALL_HEALTHY_SUMMARY);
    expect(transition.presentation.tableIndex).toBe(3);
    expect(battleIntroSceneAssemblyDisplayLag(transition.presentation)).toBe(0);
    expect(intro.sceneAssemblyDisplayLag).toBe(0);
    expect(state.rngValue).toBe(transition.rngValue);

    // Source tick 1140 is inside BattleIntroSlide3's dynamic reveal. Repeated
    // full-engine renders must consume only the frozen command/receipt.
    state = advanceFrames(state, 100);
    const before = structuredClone(state);
    const frameA = render(state);
    const frameB = render(state);
    expect(frameB).toEqual(frameA);
    expect(state).toEqual(before);
    expect(state.factoryRoundBattleOrchestrator!.round.rules)
      .toEqual(before.factoryRoundBattleOrchestrator!.round.rules);
    expect(state.factoryRoundBattleOrchestrator!.battleStartIntro!.command.parties)
      .toEqual(before.factoryRoundBattleOrchestrator!.battleStartIntro!.command.parties);
    expect(state.rngValue).toBe(before.rngValue);
  });

  it("uses the same seam for a distinct generated Battle 1 RICARDO identity", () => {
    let state = generatedRoundRevealProofStage(
      createInitialState({ appRoute: "generated-orchestrator" }),
      0,
    );
    const command = state.factoryRoundBattleOrchestrator!.battleStartIntro!.command;
    expect(command.battleIndex).toBe(0);
    expect(command.opponentTrainer).toMatchObject({
      trainerId: 109,
      name: "RICARDO",
    });
    expect(command.parties.opponent.map(({ setId }) => setId))
      .toEqual([349, 353, 292]);
    expect(command.partySummaries.player).toEqual(ALL_HEALTHY_SUMMARY);

    state = advanceFrames(state, 100);
    const before = structuredClone(state);
    expect(render(state)).toEqual(render(state));
    expect(state).toEqual(before);
  });
});
