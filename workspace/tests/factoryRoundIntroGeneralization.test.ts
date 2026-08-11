import { describe, expect, it } from "vitest";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import {
  battleIntroSceneAssemblyDisplayLag,
  selectFrontierTransition,
} from "../src/engine/battleTransition.ts";
import { createFactoryBattleStartPresentationCommand } from "../src/engine/factoryBattleStartPresentation.ts";
import {
  factoryBattleStartIntroPhase,
  factoryBattleStartStatusSummaryMessageComplete,
} from "../src/engine/factoryBattleStartIntro.ts";
import { generatedBattleIntroSourceClock } from "../src/engine/battleScene.ts";
import {
  generatedRoundBattle6LukasRevealStage,
  generatedRoundBattle6LukasStatusSummaryMessageStage,
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

  it("pins LUKAS's complete source-relative summary boundary and status/fainted summary identity", () => {
    let state = generatedRoundBattle6LukasStatusSummaryMessageStage(
      createInitialState({ appRoute: "generated-orchestrator" }),
    );
    const initialIntro = state.factoryRoundBattleOrchestrator!.battleStartIntro!;
    expect(generatedBattleIntroSourceClock(
      initialIntro.elapsed,
      initialIntro.sceneAssemblyDisplayLag,
    )).toBe(1040);

    state = advanceFrames(state, 251);
    const beforeSettle = state.factoryRoundBattleOrchestrator!.battleStartIntro!;
    expect(generatedBattleIntroSourceClock(
      beforeSettle.elapsed,
      beforeSettle.sceneAssemblyDisplayLag,
    )).toBe(1291);
    expect(factoryBattleStartIntroPhase(beforeSettle)).toBe("awaiting-acknowledgement");
    expect(factoryBattleStartStatusSummaryMessageComplete(beforeSettle)).toBe(false);

    state = advanceFrames(state, 1);
    const settledIntro = state.factoryRoundBattleOrchestrator!.battleStartIntro!;
    expect(generatedBattleIntroSourceClock(
      settledIntro.elapsed,
      settledIntro.sceneAssemblyDisplayLag,
    )).toBe(1292);
    expect(factoryBattleStartStatusSummaryMessageComplete(settledIntro)).toBe(true);
    expect(settledIntro.command.battleIndex).toBe(5);
    expect(settledIntro.command.opponentTrainer).toMatchObject({
      trainerId: 121,
      name: "LUKAS",
    });
    expect(settledIntro.command.parties.player.map(({ setId }) => setId))
      .toEqual([267, 268, 269]);
    expect(settledIntro.command.parties.opponent.map(({ setId }) => setId))
      .toEqual([270, 341, 284]);
    expect(settledIntro.command.partySummaries.player).toEqual(ALL_HEALTHY_SUMMARY);
    expect(settledIntro.command.partySummaries.opponent).toEqual(ALL_HEALTHY_SUMMARY);

    const variedPlayer = [
      Object.freeze({ ...settledIntro.command.parties.player[0], status1: 0x40 }),
      Object.freeze({ ...settledIntro.command.parties.player[1], hp: 0, status1: 0 }),
      settledIntro.command.parties.player[2],
    ] as unknown as typeof settledIntro.command.parties.player;
    const variedOpponent = [
      settledIntro.command.parties.opponent[0],
      Object.freeze({ ...settledIntro.command.parties.opponent[1], status1: 0x20 }),
      Object.freeze({ ...settledIntro.command.parties.opponent[2], hp: 0, status1: 0 }),
    ] as unknown as typeof settledIntro.command.parties.opponent;
    const variedCommand = createFactoryBattleStartPresentationCommand({
      commandId: settledIntro.command.commandId,
      battleIndex: settledIntro.command.battleIndex,
      opponentTrainer: settledIntro.command.opponentTrainer,
      playerParty: variedPlayer,
      opponentParty: variedOpponent,
    });
    expect(variedCommand.partySummaries.player).toEqual([
      "status", "fainted", "healthy", "empty", "empty", "empty",
    ]);
    expect(variedCommand.partySummaries.opponent).toEqual([
      "healthy", "status", "fainted", "empty", "empty", "empty",
    ]);

    const beforeRender = structuredClone(state);
    const frameA = render(state);
    const frameB = render(state);
    expect(frameB).toEqual(frameA);
    expect(state).toEqual(beforeRender);
    expect(state.rngValue).toBe(beforeRender.rngValue);
    expect(state.factoryRoundBattleOrchestrator!.round.rules)
      .toEqual(beforeRender.factoryRoundBattleOrchestrator!.round.rules);
    expect(state.factoryRoundBattleOrchestrator!.round.rules.lastBattle).toBeNull();
    expect(state.factoryRoundBattleOrchestrator!.round.rules.lastSwap)
      .toEqual({ type: "decline" });
    expect(state.factoryRoundBattleOrchestrator!.round.rules.playerParty)
      .toEqual(beforeRender.factoryRoundBattleOrchestrator!.round.rules.playerParty);
    expect(state.factoryRoundBattleOrchestrator!.round.rules.currentOpponent.party)
      .toEqual(beforeRender.factoryRoundBattleOrchestrator!.round.rules.currentOpponent.party);
  });
});
