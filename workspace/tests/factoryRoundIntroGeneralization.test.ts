import { describe, expect, it } from "vitest";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import {
  battleIntroSceneAssemblyDisplayLag,
  selectFrontierTransition,
} from "../src/engine/battleTransition.ts";
import { createFactoryBattleStartPresentationCommand } from "../src/engine/factoryBattleStartPresentation.ts";
import {
  advanceFactoryBattleStartIntro,
  factoryBattleStartIntroPhase,
  factoryBattleStartStatusSummaryMessageComplete,
  type FactoryBattleStartIntroState,
} from "../src/engine/factoryBattleStartIntro.ts";
import {
  generatedBattleIntroSourceClock,
  generatedBattleStartCommandReady,
  isGeneratedBattleIntroInputReady,
} from "../src/engine/battleScene.ts";
import {
  generatedRoundBattle6LukasRevealStage,
  generatedRoundBattle6LukasStatusSummaryMessageStage,
  generatedRoundBattle7NolandGoldRevealStage,
  generatedRoundBattle7NolandRevealStage,
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

  it("reaches battleIndex 6 -- the Frontier Brain -- and constructs a real battle-start command without throwing", () => {
    const state = generatedRoundRevealProofStage(
      createInitialState({ appRoute: "generated-orchestrator" }),
      6,
    );
    const orchestrator = state.factoryRoundBattleOrchestrator!;
    const command = orchestrator.battleStartIntro!.command;

    expect(orchestrator.round.rules).toMatchObject({
      phase: "presentingBattleStart",
      battleIndex: 6,
    });
    expect(command.battleIndex).toBe(6);
    expect(command.opponentTrainer).toMatchObject({
      trainerId: 1022,
      name: "NOLAND",
      className: "FACTORY HEAD",
      trainerPic: "TRAINER_PIC_FACTORY_HEAD_NOLAND",
    });
    expect(orchestrator.round.rules.currentOpponent.frontierBrain).toEqual({ status: "silver" });
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

  it("pins LUKAS's stock-ROM acknowledgement rebase and the #55-blocked opponent release boundary", () => {
    let state = generatedRoundBattle6LukasStatusSummaryMessageStage(
      createInitialState({ appRoute: "generated-orchestrator" }),
    );
    const initial = structuredClone(state);

    // The factoryLegal pre-checkpoint driver holds A on absolute frames
    // 1543-1544. Relative to the reveal offset (1151), the generic app
    // lifecycle must receive its NEW-key edge on frame 390: the source
    // controller accepts the held edge two display callbacks later. A held
    // second frame is not another new key and cannot replace the receipt.
    state = advanceFrames(state, 389);
    state = tick(state, new Set(["A"]));
    const accepted = state.factoryRoundBattleOrchestrator!.battleStartIntro!;
    expect(accepted.acknowledgedElapsed).toBe(381);
    expect(accepted.elapsed).toBe(381);

    state = tick(state, new Set(["A"]));
    const held = state.factoryRoundBattleOrchestrator!.battleStartIntro!;
    expect(held.acknowledgedElapsed).toBe(381);
    expect(held.elapsed).toBe(382);
    state = tick(state, new Set());
    expect(state.factoryRoundBattleOrchestrator!.battleStartIntro!.acknowledgedElapsed)
      .toBe(381);

    // App 461 / oracle absolute 1612 is the already-settled #56 display-tail
    // frame. The intended new phase begins on app 462 (absolute 1613) and
    // ends when the ROM clears the opponent controller on app 511
    // (absolute 1662), immediately before the player send-out dispatch.
    state = advanceFrames(state, 461 - 392);
    const tail = state.factoryRoundBattleOrchestrator!.battleStartIntro!;
    expect(generatedBattleIntroSourceClock(
      tail.elapsed,
      tail.sceneAssemblyDisplayLag,
    )).toBe(1500);
    expect(factoryBattleStartIntroPhase(tail)).toBe("opponent-release");

    state = tick(state, new Set());
    const cleanStart = state.factoryRoundBattleOrchestrator!.battleStartIntro!;
    expect(generatedBattleIntroSourceClock(
      cleanStart.elapsed,
      cleanStart.sceneAssemblyDisplayLag,
    )).toBe(1501);
    expect(factoryBattleStartIntroPhase(cleanStart)).toBe("opponent-release");

    const beforeRender = structuredClone(state);
    expect(render(state)).toEqual(render(state));
    expect(state).toEqual(beforeRender);

    state = advanceFrames(state, 511 - 462);
    const controllerComplete = state.factoryRoundBattleOrchestrator!.battleStartIntro!;
    expect(generatedBattleIntroSourceClock(
      controllerComplete.elapsed,
      controllerComplete.sceneAssemblyDisplayLag,
    )).toBe(1550);
    expect(factoryBattleStartIntroPhase(controllerComplete)).toBe("opponent-release");

    const command = controllerComplete.command;
    expect(command.opponentTrainer).toMatchObject({ trainerId: 121, name: "LUKAS" });
    expect(command.parties.player.map(({ setId, speciesName }) => ({ setId, speciesName })))
      .toEqual([
        { setId: 267, speciesName: "SPECIES_DELCATTY" },
        { setId: 268, speciesName: "SPECIES_SABLEYE" },
        { setId: 269, speciesName: "SPECIES_LICKITUNG" },
      ]);
    expect(command.parties.opponent.map(({ setId, speciesName }) => ({ setId, speciesName })))
      .toEqual([
        { setId: 270, speciesName: "SPECIES_WEEPINBELL" },
        { setId: 341, speciesName: "SPECIES_HITMONTOP" },
        { setId: 284, speciesName: "SPECIES_HAUNTER" },
      ]);
    expect(command.partySummaries.player).toEqual(ALL_HEALTHY_SUMMARY);
    expect(command.partySummaries.opponent).toEqual(ALL_HEALTHY_SUMMARY);

    // Two fresh legal-ROM runs produce personality 1547933549 / female for
    // set 270. The generic clean-stream controller produces the same set,
    // nature, stats, and ability but a male personality. This is #55's
    // explicitly unwired ambient-VBlank construction clock, not a renderer
    // discriminator that this bounded proof may fit or override.
    expect(command.parties.opponent[0]).toMatchObject({
      setId: 270,
      species: 70,
      personality: 4074577324,
      gender: "male",
      hp: 129,
      maxHP: 129,
    });
    expect(command.parties.opponent[0].personality).not.toBe(1547933549);
    expect(command.parties.opponent[0].gender).not.toBe("female");

    expect(state.rngValue).toBe(initial.rngValue);
    expect(state.factoryRoundBattleOrchestrator!.round.rules)
      .toEqual(initial.factoryRoundBattleOrchestrator!.round.rules);
    expect(state.factoryRoundBattleOrchestrator!.round.rules.lastBattle).toBeNull();
    expect(state.factoryRoundBattleOrchestrator!.round.rules.playerParty)
      .toEqual(initial.factoryRoundBattleOrchestrator!.round.rules.playerParty);
    expect(state.factoryRoundBattleOrchestrator!.round.rules.currentOpponent.party)
      .toEqual(initial.factoryRoundBattleOrchestrator!.round.rules.currentOpponent.party);
  });

  // ISSUES #87 option (c): the silver Frontier-Brain reveal is the one
  // committed compare window whose capture range crosses the ready
  // transition; only that route-level identity gets a calibrated offset.
  it("keys the silver-brain ready-lag offset off frontierBrain.status, not a battle-number/trace-name check", () => {
    const silverState = generatedRoundBattle7NolandRevealStage(
      createInitialState({ appRoute: "generated-orchestrator" }),
    );
    const silverIntro = silverState.factoryRoundBattleOrchestrator!.battleStartIntro!;
    expect(silverIntro.isSilverBrainReveal).toBe(true);
    expect(silverIntro.isCanonicalAnchorIntro).toBe(false);

    const goldState = generatedRoundBattle7NolandGoldRevealStage(
      createInitialState({ appRoute: "generated-orchestrator" }),
    );
    const goldIntro = goldState.factoryRoundBattleOrchestrator!.battleStartIntro!;
    expect(goldIntro.isSilverBrainReveal).toBe(false);
    expect(goldIntro.isGoldBrainReveal).toBe(true);
    expect(silverIntro.isGoldBrainReveal).toBe(false);

    // Step an intro through its own PAUSE_UNTIL_PRESS A edge (as soon as
    // input-ready, matching every other fixture's timing) to the first
    // elapsed tick where the command menu reads ready.
    function firstReadyElapsed(start: FactoryBattleStartIntroState): number {
      let intro = start;
      let pressed = false;
      for (let step = 0; step < 2000; step += 1) {
        if (generatedBattleStartCommandReady(intro)) return intro.elapsed;
        const pressA: boolean = !pressed && isGeneratedBattleIntroInputReady(intro);
        if (pressA) pressed = true;
        intro = advanceFactoryBattleStartIntro(intro, pressA ? new Set(["A"]) : new Set());
      }
      throw new Error("command-ready never fired within 2000 ticks");
    }

    const silverReadyElapsed = firstReadyElapsed(silverIntro);
    const unflaggedReadyElapsed = firstReadyElapsed({ ...silverIntro, isSilverBrainReveal: false });
    // MEASURED_SILVER_BRAIN_REVEAL_READY_LAG_OFFSET (battleScene.ts): the
    // dense-compare-calibrated constant this exact window needs.
    expect(silverReadyElapsed - unflaggedReadyElapsed).toBe(9);

    // The gold reveal (a different frontierBrain.status) gets its own,
    // independently-calibrated offset (MEASURED_GOLD_BRAIN_REVEAL_READY_
    // LAG_OFFSET) -- not silver's constant, and not zero.
    const goldReadyElapsed = firstReadyElapsed(goldIntro);
    const goldUnflaggedElapsed = firstReadyElapsed({ ...goldIntro, isGoldBrainReveal: false });
    expect(goldReadyElapsed - goldUnflaggedElapsed).toBe(7);

    // The two flags are keyed independently: forcing the *other* status's
    // flag onto a gold intro (with its own flag cleared) must not pull in
    // silver's constant -- proving this is a frontierBrain.status lookup,
    // not a battle-number/trace-name check the two routes could smuggle
    // past each other.
    const goldWithSilverFlag = firstReadyElapsed({
      ...goldIntro,
      isGoldBrainReveal: false,
      isSilverBrainReveal: true,
    });
    expect(goldWithSilverFlag - goldUnflaggedElapsed).toBe(9);
    expect(goldWithSilverFlag).not.toBe(goldReadyElapsed);
  });
});
