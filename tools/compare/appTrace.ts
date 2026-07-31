// App-side trace renderer.
//
// Replays a trace against the real engine code (the same modules the Vite
// build ships) and returns raw RGBA frames for each captured frame, so
// tools/compare/run.ts can diff them against the oracle.
// Frame/input numbering is shared with the oracle contract; see
// docs/oracle-frame-semantics.md and traceReplay.ts.

import type { Trace } from "./oracleClient.ts";
import { createInitialState, render, tick } from "../../src/engine/core.ts";
import type { EngineState } from "../../src/engine/core.ts";
import { traceAdvances } from "./traceReplay.ts";
import { BATTLE2_OFF_TURN1_COMMAND_DURATIONS } from "../../src/engine/battle2OffScenario.ts";
import { createFactoryFullTurnBattleState } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { stageFactoryFullTurnBattle } from "../../src/engine/stagedBattleTurn.ts";
import {
  createSceneOnMovePresentation,
  ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
  ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createFactoryTerminalLossPresentation,
  createFactoryTerminalRoundWonPresentation,
} from "../../src/engine/factoryTerminalPresentation.ts";
import {
  createPostwinStateFromOpponentRentalRecords,
  type FactoryPostwinOpponentRentalRecords,
} from "../../src/engine/postwin.ts";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import {
  advanceFactoryRoundPresentation,
  beginFactoryRoundBattleStartIntro,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import type { FactoryRentalRecord } from "../../src/engine/battleScenario.ts";

export interface AppCapture {
  frame: number;
  /** Raw RGBA pixels, 240*160*4 bytes. */
  rgba: Buffer | Uint8Array;
}

type AppStage = (state: EngineState) => EngineState;

function createFactoryPostwinStage(
  opponentRentalRecords: FactoryPostwinOpponentRentalRecords,
): AppStage {
  return (state) => ({
    ...state,
    postwin: createPostwinStateFromOpponentRentalRecords(opponentRentalRecords),
  });
}

const CANONICAL_POSTWIN_OPPONENT_RECORDS = [
  { setId: 153, personality: 24, fixedIv: 3, abilitySlot: 0 },
  { setId: 179, personality: 19, fixedIv: 3, abilitySlot: 1 },
  { setId: 181, personality: 6, fixedIv: 3, abilitySlot: 0 },
] as const;

// Honest rung-8 generation output for seed 3. Its commentary is ROCK /
// unrestrained, differing in both classifications from the canonical
// no-favorite / weakening pages. This stage is app-visible even though no
// matching source-valid oracle field checkpoint exists yet.
const GENERATED_POSTWIN_ROCK_UNRESTRAINED_RECORDS = [
  { setId: 156, personality: 116865875, fixedIv: 3, abilitySlot: 1 },
  { setId: 180, personality: 1392861431, fixedIv: 3, abilitySlot: 0 },
  { setId: 122, personality: 3471709106, fixedIv: 3, abilitySlot: 0 },
] as const;

const generatedNatureByName = new Map(
  naturesData.natures.map((row) => [row.name, row.index]),
);

function generatedCommandRecord(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = generatedNatureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 31,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: 0x89ab_cdef,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function generatedBattleCommandStage(state: EngineState): EngineState {
  const playerRentalRecords = [
    generatedCommandRecord(664),
    generatedCommandRecord(678),
    generatedCommandRecord(527),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "battle-command-generated-off",
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        generatedCommandRecord(1),
        generatedCommandRecord(2),
        generatedCommandRecord(3),
      ],
    },
  });
  const commandId = orchestrator.round.presentation?.command.commandId;
  if (commandId === undefined) {
    throw new Error("generated command stage requires the battle-start command");
  }
  orchestrator = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(orchestrator, { commandId }),
  );
  return {
    ...state,
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: orchestrator.battle?.rng.value ?? state.rngValue,
  };
}

// Arbitrary (non-canonical) generated Factory opponent for the public dense
// intro comparison (docs/trainer-pic-off-window-scout.md §C/§D): trainerId 49
// (YOSHI) and opponent species COMBUSKEN/POLIWHIRL/PORYGON are whatever
// factoryOpponentGeneration.ts's own selectFactoryTrainer/GenerateOpponentMons
// port produces for rngValue 42, factoryWinStreak 0, battleIndex 0 (the
// non-reversed workflow: the tuple is read off the generator, not chosen to
// match a known trainer) — neither DESTIN(50) nor JENSON(58) nor the
// SHIZUKA(110) mapping fixture, and outside all three casts.
function generatedBattleStartIntroArbitraryStage(state: EngineState): EngineState {
  const playerRentalRecords = [
    generatedCommandRecord(110),
    generatedCommandRecord(130),
    generatedCommandRecord(150),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "factory-arbitrary-intro-yoshi-off",
    rngValue: 42,
    factoryWinStreak: 0,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        generatedCommandRecord(115),
        generatedCommandRecord(135),
        generatedCommandRecord(145),
      ],
    },
  });
  orchestrator = beginFactoryRoundBattleStartIntro(orchestrator);
  return {
    ...state,
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: orchestrator.battle?.rng.value ?? state.rngValue,
  };
}

/**
 * Named, dev-time-only staging registry. A stage may replace logical state at
 * a target boundary while the oracle still replays the untouched anchor
 * trace. Production code never imports this registry.
 */
const APP_STAGES: Readonly<Record<string, AppStage>> = {
  "battle-command-generated-off": generatedBattleCommandStage,
  "factory-arbitrary-intro-yoshi-off": generatedBattleStartIntroArbitraryStage,
  "factory-postwin-canonical-opponent-party":
    createFactoryPostwinStage(CANONICAL_POSTWIN_OPPONENT_RECORDS),
  "factory-postwin-generated-rock-unrestrained-opponent-party":
    createFactoryPostwinStage(GENERATED_POSTWIN_ROCK_UNRESTRAINED_RECORDS),
  "factory-swap-duplicate-species-enemy-picker": (state) => {
    if (!state.factorySwap) {
      throw new Error("duplicate-species stage requires the live Factory swap picker");
    }
    return {
      ...state,
      factorySwap: {
        ...state.factorySwap,
        // The stage is applied after frame 29935's deliberately rejected
        // install-edge A has already passed through tick().  Reconstruct the
        // source's now-settled HandleChooseMons callback before applying the
        // staged roster identity; otherwise the canonical GROVYLE route has
        // already entered acceptPrompt and this fixture never exercises the
        // live duplicate-species reducer at all.
        phaseElapsed: 0,
        speciesNameFade: {
          ...state.factorySwap.speciesNameFade,
          active: true,
        },
        loadedDisplaySpecies:
          state.factorySwap.controller.enemyParty[
            state.factorySwap.controller.displayCursor as 0 | 1 | 2
          ]?.species ?? null,
        controller: {
          ...state.factorySwap.controller,
          phase: "enemyPicker",
          inputReady: true,
          enemyMonId: null,
          enemyParty: [
            {
              ...state.factorySwap.controller.enemyParty[0],
              species: "MAGBY",
            },
            state.factorySwap.controller.enemyParty[1],
            state.factorySwap.controller.enemyParty[2],
          ],
        },
      },
    };
  },
  "battle2-off-turn1-before-confirm": (state) => ({
    ...state,
    rngMode: "frontierBattle",
    rngValue: 3530724670,
    battleControllerExecFlags: 1,
    battle2Turn1: null,
    stagedBattleTurn: stageFactoryFullTurnBattle(
      {
        initialState: createFactoryFullTurnBattleState({
          requestId: 1,
          rngSeed: 3530724670,
          player: {
            species: 95,
            moveId: 157,
            moves: [157, 20, 225, 201],
            pp: [10, 20, 20, 10],
            ability: 5,
            item: 142,
            friendship: 0,
            attack: 51,
            defense: 187,
            spAttack: 36,
            spDefense: 72,
            speed: 76,
            hp: 117,
            maxHp: 117,
            types: ["TYPE_ROCK", "TYPE_GROUND"],
          },
          trainer: {
            species: 140,
            moveId: 72,
            moves: [72, 246, 28, 182],
            pp: [10, 5, 15, 10],
            ability: 4,
            item: 142,
            friendship: 0,
            attack: 118,
            defense: 96,
            spAttack: 93,
            spDefense: 51,
            speed: 61,
            hp: 91,
            maxHp: 91,
            types: ["TYPE_ROCK", "TYPE_WATER"],
          },
        }),
        playerSubmission: {
          requestId: 1,
          side: "player",
          decision: {
            kind: "use-move",
            moveSlot: 0,
            targetBattler: 1,
          },
        },
        trainerSubmission: {
          requestId: 2,
          side: "trainer",
          decision: {
            kind: "use-move",
            moveSlot: 2,
            targetBattler: 0,
          },
        },
        battlers: [
          {
            battler: 0,
            name: "ONIX",
            moveNames: [
              "ROCK SLIDE",
              "BIND",
              "DRAGONBREATH",
              "SANDSTORM",
            ],
          },
          {
            battler: 1,
            name: "KABUTO",
            moveNames: [
              "MEGA DRAIN",
              "ANCIENTPOWER",
              "SAND-ATTACK",
              "PROTECT",
            ],
          },
        ],
      },
      // Confirm-relative OFF ledger: player resolution through +160,
      // opponent text/effect/stat message through +400, turn/menu gate +405.
      BATTLE2_OFF_TURN1_COMMAND_DURATIONS,
    ),
  }),
  "fire-punch-onix-grovyle-animation-owned": (state) => ({
    ...state,
    stagedBattleTurn: null,
    sceneOnPresentation: createSceneOnMovePresentation({
      move: "FIRE_PUNCH",
      ...ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
      resolutionProfile: ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
    }),
    rngMode: "frontierBattle",
  }),
  "factory-terminal-loss-cb2-load-map": (state) => ({
    ...state,
    factoryTerminal: createFactoryTerminalLossPresentation({
      type: "roundLost",
      commandId: 1,
      battleIndex: 0,
    }),
    rngMode: "vblank",
  }),
  "factory-terminal-round-won-cb2-load-map": (state) => ({
    ...state,
    factoryTerminal: createFactoryTerminalRoundWonPresentation({
      type: "roundCompleted",
      commandId: 1,
      battleIndex: 6,
    }),
    rngMode: "vblank",
  }),
};

export async function renderAppTrace(trace: Trace): Promise<AppCapture[]> {
  let state = createInitialState({ appRoute: trace.appRoute });
  const captureFrames = new Set(trace.captureFrames ?? []);
  const captures: AppCapture[] = [];
  let frame = 0;

  const applyStage = (): void => {
    if (!trace.appStage || trace.appStage.frame !== frame) return;
    const stage = APP_STAGES[trace.appStage.id];
    if (!stage) throw new Error(`unknown app stage ${trace.appStage.id}`);
    state = stage(state);
  };

  applyStage();
  if (captureFrames.has(frame)) captures.push({ frame, rgba: render(state) });

  for (const advance of traceAdvances(trace.segments)) {
    state = tick(state, advance.buttons);
    frame = advance.frame;
    applyStage();
    if (captureFrames.has(frame)) captures.push({ frame, rgba: render(state) });
  }

  return captures;
}
