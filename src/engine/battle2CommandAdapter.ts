import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
  type FactoryFullTurnDecisionRules,
} from "./factoryBattleScriptFullTurnDecision.ts";
import {
  createBattleCommandPresentation,
  type BattleCommandPresentationState,
} from "./battleCommandPresentation.ts";
import {
  createBattleResolutionPresentation,
  type BattleResolutionPresentationState,
} from "./battleResolutionPresentation.ts";
import type {
  BattleCommandRequest,
  BattleDecisionTransitionResult,
  BattleState,
} from "./battleDecisionBoundary.ts";

/**
 * ISSUES #39 rank 1 (docs/battle-scene-retirement-inventory.md): the typed
 * command/resolution owners (battleCommandPresentation.ts,
 * battleResolutionPresentation.ts) driven from the real kernel, replacing
 * the legacy fixtures (formerly battle2Turn1.ts, battle2ActionMenu.ts,
 * battle2OffScenario.ts, all deleted at the flip) that
 * battle2CommandPresentationForRender/drawBattle2RockSlideAttack
 * (battleScene.ts) used to hand-build from. Wired into the live render path;
 * this is production code, not a proof-of-concept.
 *
 * Real kernel facts, not fabricated: the same ONIX-vs-KABUTO config
 * `battle2-off-turn1-staged.json`'s app stage
 * (tools/compare/appTrace.ts:225-316) and
 * tests/battle2OffKernelSeamScout.test.ts already exercise. ONIX opens with
 * ROCK SLIDE (move slot 0); KABUTO replies with SAND-ATTACK (move slot 2).
 * ONIX's and KABUTO's personality bytes and ONIX's real bench (MAGBY/
 * BAYLEEF) are RAM-probed ground truth, docs/battle2-party-ground-truth.md.
 */
export const BATTLE2_TURN1_KERNEL_CONFIG: FactoryFullTurnConfig = Object.freeze({
  requestId: 1,
  rngSeed: 3530724670,
  player: Object.freeze({
    species: 95,
    personality: 1205102525,
    moveId: 157,
    moves: [157, 20, 225, 201] as const,
    pp: [10, 20, 20, 10] as const,
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
    types: ["TYPE_ROCK", "TYPE_GROUND"] as const,
  }),
  trainer: Object.freeze({
    species: 140,
    personality: 2507133325,
    moveId: 72,
    moves: [72, 246, 28, 182] as const,
    pp: [10, 5, 15, 10] as const,
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
    types: ["TYPE_ROCK", "TYPE_WATER"] as const,
  }),
  // Real player bench, RAM-probed (docs/battle2-party-ground-truth.md §4):
  // MAGBY (party slot 1, 138/138 HP) and BAYLEEF (slot 2, 153/153 HP), both
  // alive -- both `{kind:"switch",partyIndex:1|2}` are legal decisions here.
  playerBenchHp: [138, 153] as const,
  playerBenchOverride: [
    { species: 240, personality: 1534575931 },
    { species: 153, personality: 1550278706 },
  ] as const,
});

export const BATTLE2_TURN1_PLAYER_ROCK_SLIDE = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
export const BATTLE2_TURN1_TRAINER_SAND_ATTACK = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 2 as const,
  targetBattler: 0 as const,
});

/**
 * Confirm-relative OFF command durations for the sibling staged-turn
 * presentation (stagedBattleTurn.ts), summing to the source/RAM-pinned +405
 * next-controller readiness boundary. Formerly battle2OffScenario.ts
 * (retired at the #39 rank-1 flip); kept alongside the kernel config above
 * since both stage the same Battle-2 turn-1 kernel scenario.
 */
export const BATTLE2_OFF_TURN1_COMMAND_DURATIONS = [
  145, 1, 14, 100, 1, 50, 89, 4, 1,
] as const;

export type Battle2CommandAdapterKernel = Readonly<{
  initial: BattleState<FactoryFullTurnDecisionRules>;
  afterPlayer: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
}>;

/**
 * Runs the real kernel through request 1 (player ROCK SLIDE) then request 2
 * (trainer SAND-ATTACK), reaching request 3. Mirrors
 * tests/battle2OffKernelSeamScout.test.ts's own `runCanonicalBattle2Turn`
 * exactly, as production code the adapter functions below can share.
 */
export function stageBattle2Turn1Kernel(): Battle2CommandAdapterKernel {
  const initial = createFactoryFullTurnBattleState(BATTLE2_TURN1_KERNEL_CONFIG);
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: BATTLE2_TURN1_PLAYER_ROCK_SLIDE,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error(
      "battle2CommandAdapter: expected the trainer command boundary",
    );
  }
  const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: BATTLE2_TURN1_TRAINER_SAND_ATTACK,
  });
  if (transition.kind !== "decision-required") {
    throw new Error(
      "battle2CommandAdapter: expected the next player command boundary",
    );
  }
  return Object.freeze({ initial, afterPlayer, transition });
}

/**
 * Typed command-phase adapter driving
 * `battle2CommandPresentationForRender` (battleScene.ts): same shape it
 * used to hand-build from `BATTLE2_ACTION_MENU_MODEL`'s fixture, now sourced
 * from the live kernel request/rules. The lifecycle clock (phase/
 * phaseElapsed) stays legacy-owned -- A-confirm timing remains on the
 * established predecessor until a later slice owns that semantic handoff, so
 * this adapter is deliberately silent about phase timing and only supplies
 * field/request facts; the caller overlays lifecycle/cursor-display state.
 */
export function createBattle2CommandAdapterCommand(
  kernel: Battle2CommandAdapterKernel = stageBattle2Turn1Kernel(),
  initialFightCursor: 0 | 1 | 2 | 3 = 0,
): BattleCommandPresentationState {
  if (kernel.initial.boundary.kind !== "decision-required") {
    throw new Error(
      "battle2CommandAdapter: initial kernel state is not a command boundary",
    );
  }
  return createBattleCommandPresentation(
    kernel.initial.boundary.request as BattleCommandRequest,
    kernel.initial.rules.rulesContext,
    initialFightCursor,
  );
}

/**
 * Typed resolution-phase adapter driving
 * `drawBattle2RockSlideAttack`/`drawBattle2RockSlideTurn1Window`
 * (battleScene.ts): same shape those used to hand-build from
 * battle2Turn1.ts's hardcoded ROCK_SLIDE damage/HP/PP constants, now sourced
 * from the live kernel transition. Its command list also naturally covers
 * KABUTO's SAND-ATTACK reply -- real kernel content the legacy fixed-window
 * line range never rendered (it stopped at the opponent handoff tick); that
 * is additional coverage the flip leaves for a later window, not a
 * divergence to reconcile.
 */
export function createBattle2CommandAdapterResolution(
  kernel: Battle2CommandAdapterKernel = stageBattle2Turn1Kernel(),
  command: BattleCommandPresentationState = createBattle2CommandAdapterCommand(kernel),
): BattleResolutionPresentationState {
  if (kernel.initial.boundary.kind !== "decision-required") {
    throw new Error(
      "battle2CommandAdapter: initial kernel state is not a command boundary",
    );
  }
  if (kernel.afterPlayer.kind !== "decision-required") {
    throw new Error(
      "battle2CommandAdapter: afterPlayer kernel state is not a command boundary",
    );
  }
  return createBattleResolutionPresentation({
    sourceRequest: kernel.initial.boundary.request as BattleCommandRequest,
    sourceDecision: BATTLE2_TURN1_PLAYER_ROCK_SLIDE,
    beforeRules: kernel.afterPlayer.state.rules,
    transition: kernel.transition,
    fieldBoundary: command.field,
    confirmHandoff: Object.freeze({
      fightDisplayCursor: command.fightDisplayCursor,
      idleBounceElapsed: command.idleBounceElapsed,
    }),
    opponentTrainer: null,
  });
}
