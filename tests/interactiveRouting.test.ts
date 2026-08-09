import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TICK0 as BATTLE_SCENE_TICK0 } from "../src/engine/battleScene.ts";
import {
  createInitialState,
  render,
  tick,
  type EngineState,
} from "../src/engine/core.ts";
import {
  ANCHOR_BATTLE_1_BATTLE_INIT_RNG_VALUE,
  ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
  ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
  ANCHOR_BATTLE_1_PERSONALITIES,
  ANCHOR_BATTLE_1_SELECTION_RNG_VALUE,
  createFactoryAnchorSession,
} from "../src/engine/factoryAnchorSession.ts";
import { generateFactoryOpponent } from "../src/engine/factoryOpponentGeneration.ts";
import { selectedRentalParty } from "../src/engine/factoryDraftScreen.ts";
import {
  factoryBattleStartIntroPhase,
} from "../src/engine/factoryBattleStartIntro.ts";
import { factoryBattleStartField } from "../src/engine/factoryBattleStartPresentation.ts";
import {
  advanceFactoryRoundPresentation,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  factoryBattleStartPresentationForState,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  advanceRoundController,
  completeBattlePresentation,
  resolveRoundBattle,
} from "../src/engine/roundController.ts";
import type { BattleParty } from "../src/engine/battleScenario.ts";
import { INITIAL_POSTWIN_STATE, POSTWIN_CONTINUATION_INPUT_READY_DELAY } from "../src/engine/postwin.ts";
import {
  BATTLE_2_SCENE_HANDOFF_ELAPSED,
  WARP_FADE_TO_ROOM_ELAPSED,
} from "../src/engine/battleRoom.ts";
import { createPendingFactorySwapPresentation } from "../src/engine/factorySwapPresentation.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  CANONICAL_DESTIN_PRESENTATION,
  CANONICAL_JENSON_PRESENTATION,
} from "../src/engine/factoryTrainerPresentation.ts";
import {
  createFactoryTerminalLossPresentation,
  createFactoryTerminalRoundWonPresentation,
} from "../src/engine/factoryTerminalPresentation.ts";

const HANDOFF_ELAPSED = BATTLE_SCENE_TICK0 - 843;

function selectedIdsForSlots(
  first: number,
  second: number,
  third: number,
): number[] {
  const selectedIds = [0, 0, 0, 0, 0, 0];
  selectedIds[first] = 1;
  selectedIds[second] = 2;
  selectedIds[third] = 3;
  return selectedIds;
}

function atBattleHandoff(
  options: Parameters<typeof createInitialState>[0],
  selectedIds: number[],
) {
  const state = createInitialState(options);
  return {
    ...state,
    draftScreen: { ...state.draftScreen, selectedIds },
    rngValue: 2_100_355_878,
    battle1OpponentConstructionRngValues:
      ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
    battleRoom: {
      phase: "settled" as const,
      elapsed: HANDOFF_ELAPSED - 1,
      trainerPresentation: CANONICAL_DESTIN_PRESENTATION,
    },
  };
}

function accelerateWinToSwapOffer(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const start = state.round.presentation?.command;
  if (start?.type !== "battleStart") throw new Error("expected battleStart");
  let round = advanceRoundController(
    completeBattlePresentation(state.round, { commandId: start.commandId }),
  );
  const playerParty = round.rules.playerParty.map((member) => ({
    ...member,
    hp: Math.max(1, member.maxHp - 17),
    status: "burn" as const,
  })) as unknown as BattleParty;
  const opponentParty = round.rules.currentOpponent.party.map((member) => ({
    ...member,
    hp: 0,
  })) as unknown as BattleParty;
  round = resolveRoundBattle(round, {
    outcome: "win",
    playerParty,
    opponentParty,
    rngValue: round.rules.rngValue,
  });
  let next: FactoryRoundBattleOrchestratorState = {
    ...state,
    round,
    battle: null,
    battleCommandPresentation: null,
    battleResolutionPresentation: null,
    activeBattleCallStart: null,
  };
  const won = next.round.presentation!.command;
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(next, { commandId: won.commandId }),
  );
}

function accelerateWinToNextBattle(
  state: FactoryRoundBattleOrchestratorState,
  decision: Parameters<typeof chooseFactoryRoundSwap>[1],
): FactoryRoundBattleOrchestratorState {
  let next = accelerateWinToSwapOffer(state);
  const offer = next.round.presentation!.command;
  next = chooseFactoryRoundSwap(
    completeFactoryRoundPresentation(next, { commandId: offer.commandId }),
    decision,
  );
  const resolved = next.round.presentation!.command;
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(next, {
      commandId: resolved.commandId,
    }),
  );
}

function accelerateCurrentBattleOutcome(
  state: FactoryRoundBattleOrchestratorState,
  outcome: "win" | "loss",
): FactoryRoundBattleOrchestratorState {
  const start = state.round.presentation?.command;
  if (start?.type !== "battleStart") throw new Error("expected battleStart");
  const active = advanceRoundController(
    completeBattlePresentation(state.round, { commandId: start.commandId }),
  );
  const round = resolveRoundBattle(active, {
    outcome,
    playerParty: active.rules.playerParty,
    opponentParty: active.rules.currentOpponent.party,
    rngValue: active.rules.rngValue,
  });
  return {
    ...state,
    round,
    battle: null,
    battleCommandPresentation: null,
    battleResolutionPresentation: null,
    activeBattleCallStart: null,
  };
}

function routePendingStartThroughRoom(
  orchestrator: FactoryRoundBattleOrchestratorState,
): EngineState {
  let state: EngineState = {
    ...createInitialState({ appRoute: "generated-orchestrator" }),
    postwin: INITIAL_POSTWIN_STATE,
    prebattleRoom: {
      phase: "warpFade",
      elapsed: WARP_FADE_TO_ROOM_ELAPSED - 1,
    },
    factoryRoundBattleOrchestrator: orchestrator,
  };
  state = tick(state, new Set());
  const expectedTrainer = factoryBattleStartPresentationForState(
    orchestrator,
  )!.opponentTrainer;
  expect(state.battleRoom?.trainerPresentation).toEqual(expectedTrainer);
  state = {
    ...state,
    battleRoom: {
      ...state.battleRoom!,
      phase: "settled",
      elapsed: BATTLE_2_SCENE_HANDOFF_ELAPSED - 1,
    },
  };
  state = tick(state, new Set());
  expect(state.battleRoom).toBeNull();
  expect(state.battleScene).toBeNull();
  expect(state.postwin).toBeNull();
  expect(state.factoryRoundBattleOrchestrator!.battleStartIntro!.command)
    .toEqual(factoryBattleStartPresentationForState(orchestrator));
  return state;
}

describe("interactive battle routing", () => {
  it("adapts exact compact rental sources in pick-rank order", () => {
    const anchor = createInitialState();
    const haunterFirst = {
      ...anchor.draftScreen,
      selectedIds: selectedIdsForSlots(4, 0, 2),
    };
    expect(selectedRentalParty(haunterFirst)).toEqual([
      anchor.draftScreen.rentals[4]!.source,
      anchor.draftScreen.rentals[0]!.source,
      anchor.draftScreen.rentals[2]!.source,
    ]);
    expect(haunterFirst.rentals[4]!.name).toBe("HAUNTER");

    const differentOrder = {
      ...anchor.draftScreen,
      selectedIds: selectedIdsForSlots(5, 3, 1),
    };
    expect(selectedRentalParty(differentOrder)).toEqual([
      anchor.draftScreen.rentals[5]!.source,
      anchor.draftScreen.rentals[3]!.source,
      anchor.draftScreen.rentals[1]!.source,
    ]);
  });

  it("uses the generated owner by default and keeps canonical explicit", () => {
    expect(createInitialState().appRoute).toBe("generated-orchestrator");
    const before = atBattleHandoff(
      { appRoute: "canonical-recorded" },
      selectedIdsForSlots(4, 0, 2),
    );
    expect(before.appRoute).toBe("canonical-recorded");
    const after = tick(before, new Set());
    expect(after.battleRoom).toBeNull();
    expect(after.battleScene).not.toBeNull();
    expect(after.factoryRoundBattleOrchestrator).toBeNull();
  });

  it("keeps browser startup and reset on the generated default route", () => {
    const mainSource = readFileSync(
      new URL("../src/main.ts", import.meta.url),
      "utf8",
    );
    expect(mainSource.match(/\bcreateInitialState\(\)/g)).toHaveLength(2);
    expect(mainSource).not.toContain("canonical-recorded");
  });

  it("routes a different lead and decision from its own species, moves, and PP", () => {
    let state = tick(
      atBattleHandoff(
        {},
        selectedIdsForSlots(0, 2, 4),
      ),
      new Set(),
    );
    const start = state.factoryRoundBattleOrchestrator!;
    expect(start.round.rules.playerRentalRecords![0]).toEqual(
      state.draftScreen.rentals[0]!.source,
    );
    expect(start.battleStartIntro!.command.parties.player[0]).toMatchObject({
      species: 95,
      moves: [157, 20, 225, 201],
      pp: [10, 20, 20, 10],
    });
    while (
      factoryBattleStartIntroPhase(
        state.factoryRoundBattleOrchestrator!.battleStartIntro!,
      ) !== "awaiting-acknowledgement"
    ) {
      state = tick(state, new Set());
    }
    state = tick(state, new Set(["A"]));
    while (state.factoryRoundBattleOrchestrator!.battleStartIntro !== null) {
      state = tick(state, new Set());
    }
    while (
      state.factoryRoundBattleOrchestrator!.battleCommandPresentation!
        .lifecycle.phase !== "action-menu"
    ) {
      state = tick(state, new Set());
    }
    state = tick(state, new Set(["A"]));
    const commandPhase = () =>
      state.factoryRoundBattleOrchestrator!.battleCommandPresentation!
        .lifecycle.phase;
    while (
      commandPhase() !== "fight-menu"
    ) {
      state = tick(state, new Set());
    }
    state = tick(state, new Set(["DOWN"]));
    state = tick(state, new Set());
    state = tick(state, new Set(["A"]));

    const resolution =
      state.factoryRoundBattleOrchestrator!.battleResolutionPresentation!;
    expect(resolution.sourceDecision).toEqual({
      kind: "use-move",
      moveSlot: 2,
      targetBattler: 1,
    });
    expect(resolution.field.player).toMatchObject({
      name: "ONIX",
      moveIds: [157, 20, 225, 201],
      currentPP: [10, 20, 20, 10],
    });
    expect(
      resolution.pendingBattle.rules.rulesContext.battlers[0].pp,
    ).toEqual([10, 20, 19, 10]);
  });

  it("runs the exact HAUNTER anchor turn through source-selected FURY CUTTER for one damage", () => {
    const trace = JSON.parse(readFileSync(
      new URL(
        "../tools/compare/traces/interactive-haunter-shadow-punch-off.json",
        import.meta.url,
      ),
      "utf8",
    )) as {
      segments: readonly { frames: number; buttons?: readonly string[] }[];
    };
    let state = createInitialState({ appRoute: "generated-orchestrator" });
    for (const segment of trace.segments) {
      for (let frame = 0; frame < segment.frames; frame += 1) {
        state = tick(
          state,
          new Set(segment.buttons ?? []) as ReadonlySet<
            Parameters<typeof tick>[1] extends ReadonlySet<infer Button> ? Button : never
          >,
        );
      }
    }

    const rules =
      state.factoryRoundBattleOrchestrator!.battle!.rules.rulesContext;
    expect(rules.battlers.slice(0, 2).map(({ species, hp, maxHP }) => ({
      species,
      hp,
      maxHP,
    }))).toEqual([
      { species: 93, hp: 137, maxHP: 138 },
      { species: 278, hp: 89, maxHP: 143 },
    ]);
    expect(rules.battlers[0].pp).toEqual([19, 10, 10, 5]);
    expect(rules.battlers[1].pp).toEqual([19, 5, 15, 15]);
    expect(rules.battlers[1].furyCutterCounter).toBe(1);
  });

  it("installs only the source-pinned generated owner with HAUNTER first", () => {
    const before = atBattleHandoff(
      { appRoute: "generated-orchestrator" },
      selectedIdsForSlots(4, 0, 2),
    );
    const after = tick(before, new Set());
    expect(after.battleRoom).toBeNull();
    expect(after.battleScene).toBeNull();
    expect(after.battleSetup).toBeNull();
    expect(after.factoryRoundBattleOrchestrator).not.toBeNull();
    const orchestrator = after.factoryRoundBattleOrchestrator!;
    expect(factoryBattleStartIntroPhase(orchestrator.battleStartIntro!))
      .toBe("handoff");
    expect(orchestrator.round.presentation?.command.type).toBe("battleStart");
    expect(orchestrator.battle).toBeNull();
    expect(orchestrator.battleCommandPresentation).toBeNull();
    expect(orchestrator.round.rules.playerRentalRecords).toEqual([
      before.draftScreen.rentals[4]!.source,
      before.draftScreen.rentals[0]!.source,
      before.draftScreen.rentals[2]!.source,
    ]);
    expect(orchestrator.opponentGenerations[0]!.trainerId).toBe(50);
    expect(orchestrator.opponentGenerations[0]!.opponents.map(({ setId }) => setId))
      .toEqual([188, 184, 135]);
    expect(orchestrator.opponentGenerations[0]!.opponents.map(({ personality }) => personality))
      .toEqual(ANCHOR_BATTLE_1_PERSONALITIES);
    expect(orchestrator.opponentGenerations[0]!.opponents.map((opponent) => ({
      setId: opponent.setId,
      personality: opponent.personality,
      fixedIv: opponent.fixedIv,
      abilitySlot: opponent.abilitySlot,
      otId: opponent.otId,
      speciesName: opponent.speciesName,
      itemId: opponent.itemId,
      nature: opponent.nature,
      member: {
        species: opponent.member.species,
        moves: opponent.member.moves,
        pp: opponent.member.pp,
        hp: opponent.member.hp,
        stats: [
          opponent.member.attack, opponent.member.defense, opponent.member.speed,
          opponent.member.spAttack, opponent.member.spDefense,
        ],
        ability: opponent.member.ability,
      },
    }))).toEqual([
      {
        setId: 188, personality: 1_094_072_807, fixedIv: 3, abilitySlot: 0,
        otId: 416_049_562, speciesName: "SPECIES_GROVYLE", itemId: 179, nature: 7,
        member: {
          species: 278, moves: [210, 283, 280, 104], pp: [20, 5, 15, 15],
          hp: 143, stats: [103, 56, 90, 91, 71], ability: 65,
        },
      },
      {
        setId: 184, personality: 3_475_344_024, fixedIv: 3, abilitySlot: 0,
        otId: 416_049_562, speciesName: "SPECIES_MURKROW", itemId: 221, nature: 24,
        member: {
          species: 198, moves: [185, 19, 259, 269], pp: [20, 15, 15, 20],
          hp: 142, stats: [91, 69, 97, 91, 69], ability: 15,
        },
      },
      {
        setId: 135, personality: 3_971_699_699, fixedIv: 3, abilitySlot: 0,
        otId: 416_049_562, speciesName: "SPECIES_PIDGEOTTO", itemId: 180, nature: 24,
        member: {
          species: 17, moves: [332, 98, 297, 28], pp: [20, 30, 15, 15],
          hp: 156, stats: [98, 61, 77, 56, 56], ability: 51,
        },
      },
    ]);
    expect(factoryBattleStartPresentationForState(orchestrator)?.opponentTrainer)
      .toEqual(before.battleRoom!.trainerPresentation);
    expect(orchestrator.round.rules.currentOpponent).toMatchObject({
      id: "factory-trainer-50",
      trainerName: "DESTIN",
    });
    expect(orchestrator.round.rules.currentOpponent.rentalRecords)
      .toEqual(orchestrator.opponentGenerations[0]!.opponents);
    expect(orchestrator.round.rules.rngValue).toBe(
      ANCHOR_BATTLE_1_BATTLE_INIT_RNG_VALUE,
    );
    expect(orchestrator.rngSegments.map(
      ({ kind, rngBefore, rngAfter, callEnd, callStart }) =>
        [kind, rngBefore, rngAfter, callEnd - callStart],
    )).toEqual([
      ["opponent-selection", 1_172_530_733, 3_145_421_632, 5],
      ["opponent-construction", 2_074_070_560, 1_094_078_808, 56],
      ["opponent-construction", 3_372_555_893, 3_475_319_573, 32],
      ["opponent-construction", 1_792_028_978, 3_971_701_576, 190],
    ]);
  });

  it("keeps battleStart pending until intro readiness, then settles the same field", () => {
    let state = tick(
      atBattleHandoff(
        { appRoute: "generated-orchestrator" },
        selectedIdsForSlots(4, 0, 2),
      ),
      new Set(),
    );
    const frozen = state.factoryRoundBattleOrchestrator!.battleStartIntro!.command;
    while (
      factoryBattleStartIntroPhase(
        state.factoryRoundBattleOrchestrator!.battleStartIntro!,
      ) !== "awaiting-acknowledgement"
    ) {
      state = tick(state, new Set());
    }
    expect(state.factoryRoundBattleOrchestrator!.round.presentation?.command.type)
      .toBe("battleStart");
    expect(state.factoryRoundBattleOrchestrator!.battle).toBeNull();

    state = tick(state, new Set(["A"]));
    expect(state.factoryRoundBattleOrchestrator!.round.presentation?.command.type)
      .toBe("battleStart");
    while (state.factoryRoundBattleOrchestrator!.battleStartIntro !== null) {
      state = tick(state, new Set());
    }

    const orchestrator = state.factoryRoundBattleOrchestrator!;
    expect(orchestrator.round.presentation).toBeNull();
    expect(orchestrator.battle).not.toBeNull();
    expect(orchestrator.battleCommandPresentation!.lifecycle).toEqual({
      phase: "action-menu",
      phaseElapsed: 0,
    });
    expect(orchestrator.battleCommandPresentation!.idleBounceElapsed).toBe(0);
    expect(orchestrator.battleCommandPresentation!.field).toEqual(
      factoryBattleStartField(frozen),
    );
  });

  it("captures the three live construction epochs before spending their draws", () => {
    let state: EngineState = {
      ...createInitialState({ appRoute: "generated-orchestrator" }),
      rngValue: 932_779_073,
      battleRoom: {
        phase: "msgboxClosing" as const,
        elapsed: 3,
        trainerPresentation: CANONICAL_DESTIN_PRESENTATION,
      },
    };
    state = tick(state, new Set());
    expect(state.battle1OpponentConstructionRngValues).toEqual([
      ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES[0],
    ]);
    for (let i = 0; i < 11; i += 1) state = tick(state, new Set());
    expect(state.battle1OpponentConstructionRngValues).toEqual(
      ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES.slice(0, 2),
    );
    for (let i = 0; i < 7; i += 1) state = tick(state, new Set());
    expect(state.battle1OpponentConstructionRngValues)
      .toEqual(ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES);
  });

  it("is draw-sensitive at construction and rejects a room/opponent mismatch", () => {
    const anchor = createInitialState();
    const playerRentalRecords = selectedRentalParty({
      ...anchor.draftScreen,
      selectedIds: selectedIdsForSlots(4, 0, 2),
    });
    const savedRentalRecords = anchor.draftScreen.rentals.map(({ source }) => source);
    const shifted = createFactoryAnchorSession({
      playerRentalRecords,
      savedRentalRecords,
      roomTrainer: CANONICAL_DESTIN_PRESENTATION,
      constructionRngValues: [
        advanceRngValue(ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES[0]),
        ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES[1],
        ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES[2],
      ],
      freshBattleRngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    });
    expect(shifted.opponentGenerations[0]!.opponents.map(({ personality }) => personality))
      .not.toEqual(ANCHOR_BATTLE_1_PERSONALITIES);
    expect(() => createFactoryAnchorSession({
      playerRentalRecords,
      savedRentalRecords,
      roomTrainer: CANONICAL_JENSON_PRESENTATION,
      constructionRngValues: ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
      freshBattleRngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    })).toThrow(/room trainer 58 does not match generated opponent 50/);
  });

  it("cannot substitute the post-transition cursor for pre-anchor selection", () => {
    const input = {
      factoryWinStreak: 0,
      battleIndex: 0,
      storedTrainerIds: [],
      savedRentalSetIds: [156, 149, 180, 153, 179, 181],
      playerTrainerId: 416_049_562,
      battleTowerLevel50WinStreak: 0,
      constructionRngValue: ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES[0],
    };
    const selectedBeforeAnchor = generateFactoryOpponent({
      ...input,
      rngValue: ANCHOR_BATTLE_1_SELECTION_RNG_VALUE,
    });
    const wronglyReselectedAtHandoff = generateFactoryOpponent({
      ...input,
      rngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    });
    expect([
      selectedBeforeAnchor.trainerId,
      ...selectedBeforeAnchor.opponents.map(({ setId }) => setId),
    ]).toEqual([50, 188, 184, 135]);
    expect([
      wronglyReselectedAtHandoff.trainerId,
      ...wronglyReselectedAtHandoff.opponents.map(({ setId }) => setId),
    ]).not.toEqual([50, 188, 184, 135]);
  });

  it("feeds postwin decline and accepted copy results into the generated owner", () => {
    const anchor = createInitialState();
    const initial = createFactoryAnchorSession({
      playerRentalRecords: selectedRentalParty({
        ...anchor.draftScreen,
        selectedIds: selectedIdsForSlots(4, 0, 2),
      }),
      savedRentalRecords: anchor.draftScreen.rentals.map(({ source }) => source),
      roomTrainer: CANONICAL_DESTIN_PRESENTATION,
      constructionRngValues: ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
      freshBattleRngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    });
    const declineOffer = accelerateWinToSwapOffer(initial);
    let declined = tick({
      ...createInitialState({ appRoute: "generated-orchestrator" }),
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: 20_000,
        dialoguePage: 4,
        dialoguePageEdgeElapsed: 19_000,
        swapCursorPos: 1,
        swapCursorDisplayPos: 1,
      },
      factoryRoundBattleOrchestrator: declineOffer,
    }, new Set(["A"]));
    expect(declined.factoryRoundBattleOrchestrator!.round.rules.lastSwap)
      .toEqual({ type: "decline" });
    expect(declined.factoryRoundBattleOrchestrator!.round.rules.battleIndex)
      .toBe(1);
    expect(declined.factoryRoundBattleOrchestrator!.round.presentation?.command.type)
      .toBe("battleStart");

    const acceptOffer = accelerateWinToSwapOffer(initial);
    const pendingSwap = createPendingFactorySwapPresentation(
      acceptOffer.round,
    )!;
    let accepted: EngineState = {
      ...createInitialState({ appRoute: "generated-orchestrator" }),
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: 20_000,
        dialoguePage: 4,
        dialoguePageEdgeElapsed: 19_000,
        swapCursorPos: 0,
        swapCursorDisplayPos: 0,
      },
      factorySwap: {
        ...pendingSwap,
        phaseElapsed: 20,
        controller: {
          ...pendingSwap.controller,
          phase: "acceptExit",
          playerMonId: 0,
          enemyMonId: 0,
          scriptResult: false,
        },
      },
      factoryRoundBattleOrchestrator: acceptOffer,
    };
    accepted = tick(accepted, new Set());
    expect(accepted.factoryRoundBattleOrchestrator!.round.rules.lastSwap)
      .toEqual({
        type: "accept",
        playerPartyIndex: 0,
        opponentPartyIndex: 0,
      });
    expect(accepted.factoryRoundBattleOrchestrator!.round.presentation?.command.type)
      .toBe("swapResolved");
    for (let elapsed = 21; elapsed < 41; elapsed += 1) {
      accepted = tick(accepted, new Set());
    }
    expect(accepted.factorySwap?.fieldHandoff)
      .toBe("CB2_ReturnToFieldContinueScript");
    accepted = tick(accepted, new Set());
    expect(accepted.factorySwap).toBeNull();
    expect(accepted.factoryRoundBattleOrchestrator!.round.rules.battleIndex)
      .toBe(1);
    expect(accepted.factoryRoundBattleOrchestrator!.round.presentation?.command.type)
      .toBe("battleStart");
    expect(accepted.postwin!.swapDeclineElapsed).not.toBeNull();
  });

  it("hands a completed kept-party swap to the generated round owner", () => {
    const anchor = createInitialState();
    const orchestrator = accelerateWinToSwapOffer(createFactoryAnchorSession({
      playerRentalRecords: selectedRentalParty({
        ...anchor.draftScreen,
        selectedIds: selectedIdsForSlots(4, 0, 2),
      }),
      savedRentalRecords: anchor.draftScreen.rentals.map(({ source }) => source),
      roomTrainer: CANONICAL_DESTIN_PRESENTATION,
      constructionRngValues: ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
      freshBattleRngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    }));
    const pendingSwap = createPendingFactorySwapPresentation(
      orchestrator.round,
    )!;
    const partyBefore = orchestrator.round.rules.playerParty;
    const state: EngineState = {
      ...createInitialState({ appRoute: "generated-orchestrator" }),
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: 20_000,
        dialoguePage: 4,
        dialoguePageEdgeElapsed: 19_000,
        swapCursorPos: 0,
        swapCursorDisplayPos: 0,
      },
      factorySwap: {
        ...pendingSwap,
        phaseElapsed: 22,
        fieldHandoff: "CB2_ReturnToFieldContinueScript",
        controller: {
          ...pendingSwap.controller,
          phase: "complete",
          scriptResult: true,
          result: "keptParty",
        },
      },
      factoryRoundBattleOrchestrator: orchestrator,
    };

    const next = tick(state, new Set());
    expect(next.factorySwap).toBeNull();
    expect(next.factoryRoundBattleOrchestrator!.round.rules.lastSwap)
      .toEqual({ type: "decline" });
    expect(next.factoryRoundBattleOrchestrator!.round.rules.battleIndex)
      .toBe(1);
    expect(next.factoryRoundBattleOrchestrator!.round.presentation?.command.type)
      .toBe("battleStart");
    expect(next.factoryRoundBattleOrchestrator!.round.rules.playerParty.map(
      ({ id, species }) => ({ id, species }),
    )).toEqual(partyBefore.map(({ id, species }) => ({ id, species })));
    expect(next.factoryRoundBattleOrchestrator!.round.rules.playerParty.every(
      ({ hp, maxHp, status }) => hp === maxHp && status === "none",
    )).toBe(true);
    expect(next.postwin!.swapDeclineElapsed).not.toBeNull();
  });

  it("pre-generates the next opponent when the generated route accepts GO ON", () => {
    const anchor = createInitialState();
    let orchestrator = createFactoryAnchorSession({
      playerRentalRecords: selectedRentalParty({
        ...anchor.draftScreen,
        selectedIds: selectedIdsForSlots(4, 0, 2),
      }),
      savedRentalRecords: anchor.draftScreen.rentals.map(({ source }) => source),
      roomTrainer: CANONICAL_DESTIN_PRESENTATION,
      constructionRngValues: ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
      freshBattleRngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    });
    const start = orchestrator.round.presentation?.command;
    if (start?.type !== "battleStart") throw new Error("expected battleStart");
    const active = advanceRoundController(
      completeBattlePresentation(orchestrator.round, { commandId: start.commandId }),
    );
    const won = resolveRoundBattle(active, {
      outcome: "win",
      playerParty: active.rules.playerParty,
      opponentParty: active.rules.currentOpponent.party,
      rngValue: active.rules.rngValue,
    });
    orchestrator = {
      ...orchestrator,
      round: won,
      battle: null,
      battleCommandPresentation: null,
      battleResolutionPresentation: null,
      activeBattleCallStart: null,
    };
    expect(orchestrator.round.rules.phase).toBe("presentingBattleWin");
    expect(orchestrator.round.presentation?.command.type).toBe("battleWon");
    expect(orchestrator.pendingNextOpponent).toBeNull();

    let engine: EngineState = {
      ...createInitialState({ appRoute: "generated-orchestrator" }),
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: 20_000,
        healDismissElapsed:
          20_000 - POSTWIN_CONTINUATION_INPUT_READY_DELAY,
        continuationCursorPos: 0 as const,
      },
      factoryRoundBattleOrchestrator: orchestrator,
    };
    // The continuation menu is input-ready; the held GO ON A pre-generates
    // battleIndex+1 at the scouting transition (source `AskSwapMon`), before
    // any swap decision.
    engine = tick(engine, new Set(["A"]));
    expect(engine.postwin?.dialoguePage).toBe(1);
    const preGenerated = engine.factoryRoundBattleOrchestrator!;
    expect(preGenerated.pendingNextOpponent).not.toBeNull();
    expect(preGenerated.round.rules.phase).toBe("presentingBattleWin");
    expect(preGenerated.round.rules.battleIndex).toBe(0);
    expect(preGenerated.round.rules.currentOpponent).toBe(
      orchestrator.round.rules.currentOpponent,
    );
  });

  it("reuses one generated room/intro/start lifecycle at battle indexes 1 and 5", () => {
    const anchor = createInitialState();
    let orchestrator = createFactoryAnchorSession({
      playerRentalRecords: selectedRentalParty({
        ...anchor.draftScreen,
        selectedIds: selectedIdsForSlots(4, 0, 2),
      }),
      savedRentalRecords: anchor.draftScreen.rentals.map(({ source }) => source),
      roomTrainer: CANONICAL_DESTIN_PRESENTATION,
      constructionRngValues: ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
      freshBattleRngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    });
    const acceptedRecord =
      orchestrator.round.rules.currentOpponent.rentalRecords![0]!;
    orchestrator = accelerateWinToNextBattle(orchestrator, {
      type: "accept",
      playerPartyIndex: 0,
      opponentPartyIndex: 0,
    });
    const battle1 = orchestrator;
    expect(battle1.round.rules.battleIndex).toBe(1);
    expect(battle1.round.rules.playerRentalRecords![0]).toEqual(acceptedRecord);
    expect(battle1.round.rules.playerParty.every(
      ({ hp, maxHp, status }) => hp === maxHp && status === "none",
    )).toBe(true);

    for (let index = 1; index < 5; index += 1) {
      orchestrator = accelerateWinToNextBattle(
        orchestrator,
        { type: "decline" },
      );
    }
    const battle5 = orchestrator;
    expect(battle5.round.rules.battleIndex).toBe(5);
    expect(battle5.round.rules.playerRentalRecords![0]).toEqual(acceptedRecord);
    expect(battle5.round.rules.playerParty.every(
      ({ hp, maxHp, status }) => hp === maxHp && status === "none",
    )).toBe(true);
    const trainerIds = battle5.opponentGenerations.map(({ trainerId }) => trainerId);
    expect(new Set(trainerIds).size).toBe(trainerIds.length);
    for (let index = 1; index < battle5.rngSegments.length; index += 1) {
      expect(battle5.rngSegments[index]!.callStart)
        .toBe(battle5.rngSegments[index - 1]!.callEnd);
    }

    const reentered1 = routePendingStartThroughRoom(battle1);
    const reentered5 = routePendingStartThroughRoom(battle5);
    expect([
      reentered1.factoryRoundBattleOrchestrator!.battleStartIntro!.command
        .battleIndex,
      reentered5.factoryRoundBattleOrchestrator!.battleStartIntro!.command
        .battleIndex,
    ]).toEqual([1, 5]);
    expect([
      factoryBattleStartIntroPhase(
        reentered1.factoryRoundBattleOrchestrator!.battleStartIntro!,
      ),
      factoryBattleStartIntroPhase(
        reentered5.factoryRoundBattleOrchestrator!.battleStartIntro!,
      ),
    ]).toEqual(["handoff", "handoff"]);
  });

  it.each([0, 5])(
    "routes a generated loss at battle index %i into the terminal owner and acknowledges its round",
    (lossIndex) => {
      const anchor = createInitialState();
      let orchestrator = createFactoryAnchorSession({
        playerRentalRecords: selectedRentalParty({
          ...anchor.draftScreen,
          selectedIds: selectedIdsForSlots(4, 0, 2),
        }),
        savedRentalRecords: anchor.draftScreen.rentals.map(({ source }) => source),
        roomTrainer: CANONICAL_DESTIN_PRESENTATION,
        constructionRngValues: ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
        freshBattleRngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
      });
      for (let index = 0; index < lossIndex; index += 1) {
        orchestrator = accelerateWinToNextBattle(
          orchestrator,
          { type: "decline" },
        );
      }
      orchestrator = accelerateCurrentBattleOutcome(orchestrator, "loss");
      const command = orchestrator.round.presentation!.command;
      expect(command).toMatchObject({ type: "roundLost", battleIndex: lossIndex });
      if (command.type !== "roundLost") throw new Error("expected roundLost");

      let engine: EngineState = {
        ...createInitialState({ appRoute: "generated-orchestrator" }),
        factoryRoundBattleOrchestrator: orchestrator,
        factoryTerminal: null,
      };
      const draftFallback = render({
        ...engine,
        factoryRoundBattleOrchestrator: null,
      });
      expect(render(engine)).not.toEqual(draftFallback);

      engine = tick(engine, new Set());
      expect(engine.factoryTerminal).toMatchObject({
        commandId: command.commandId,
        battleIndex: lossIndex,
        profile: { outcome: "loss" },
        age: 1,
      });
      engine = {
        ...engine,
        factoryTerminal: {
          ...createFactoryTerminalLossPresentation(command),
          age: 287,
          firstPageReleaseAge: 171,
          secondPageReleaseAge: 238,
        },
      };
      engine = tick(engine, new Set());
      expect(engine.factoryTerminal).toMatchObject({
        completed: true,
        partyRestored: true,
      });
      expect(
        engine.factoryRoundBattleOrchestrator!.round.presentation,
      ).toMatchObject({
        completed: true,
        command: { type: "roundLost", battleIndex: lossIndex },
      });
      expect(engine.roundController).toBeNull();
    },
  );

  it("discovers round completion only after the generated battle at index 6 and acknowledges that owner", () => {
    const anchor = createInitialState();
    let orchestrator = createFactoryAnchorSession({
      playerRentalRecords: selectedRentalParty({
        ...anchor.draftScreen,
        selectedIds: selectedIdsForSlots(4, 0, 2),
      }),
      savedRentalRecords: anchor.draftScreen.rentals.map(({ source }) => source),
      roomTrainer: CANONICAL_DESTIN_PRESENTATION,
      constructionRngValues: ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
      freshBattleRngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    });
    for (let index = 0; index < 6; index += 1) {
      const won = accelerateWinToSwapOffer(orchestrator);
      expect(won.round.presentation?.command.type).toBe("swapOffer");
      orchestrator = accelerateWinToNextBattle(
        orchestrator,
        { type: "decline" },
      );
      expect(orchestrator.round.rules.battleIndex).toBe(index + 1);
      expect(orchestrator.round.presentation?.command.type).toBe("battleStart");
    }
    orchestrator = accelerateCurrentBattleOutcome(orchestrator, "win");
    const command = orchestrator.round.presentation!.command;
    expect(command).toMatchObject({ type: "roundCompleted", battleIndex: 6 });
    if (command.type !== "roundCompleted") {
      throw new Error("expected roundCompleted");
    }

    let engine: EngineState = {
      ...createInitialState({ appRoute: "generated-orchestrator" }),
      factoryRoundBattleOrchestrator: orchestrator,
      factoryTerminal: null,
    };
    const draftFallback = render({
      ...engine,
      factoryRoundBattleOrchestrator: null,
    });
    expect(render(engine)).not.toEqual(draftFallback);
    engine = tick(engine, new Set());
    expect(engine.factoryTerminal).toMatchObject({
      commandId: command.commandId,
      battleIndex: 6,
      profile: { outcome: "roundWon" },
      age: 1,
    });
    engine = {
      ...engine,
      factoryTerminal: {
        ...createFactoryTerminalRoundWonPresentation(command),
        age: 3548,
        congratulationsReleaseAge: 300,
        awardScrollReleaseAge: 1100,
        awardReleaseAge: 2200,
        displayedBattlePoints: 3,
        exchangeReleaseAge: 3500,
      },
    };
    engine = tick(engine, new Set());
    expect(engine.factoryTerminal).toMatchObject({
      completed: true,
      partyRestored: true,
    });
    expect(
      engine.factoryRoundBattleOrchestrator!.round.presentation,
    ).toMatchObject({
      completed: true,
      command: { type: "roundCompleted", battleIndex: 6 },
    });
    expect(engine.roundController).toBeNull();
  });
});
