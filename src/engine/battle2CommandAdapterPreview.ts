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
 * Pre-flip equivalence adapter, ISSUES #39 rank 1
 * (docs/battle-scene-retirement-inventory.md). NOT wired into any render
 * path -- the main-lane flip performs the actual dispatcher redirect and
 * legacy deletions. This file only proves the typed command/resolution
 * owners (battleCommandPresentation.ts, battleResolutionPresentation.ts)
 * can be driven from the real kernel and land on the same facts the legacy
 * fixtures (battle2Turn1.ts, battle2ActionMenu.ts, battle2OffScenario.ts,
 * battleScene.ts:6639-7041) currently hardcode.
 *
 * Real kernel facts, not fabricated: the same ONIX-vs-KABUTO config
 * `battle2-off-turn1-staged.json`'s app stage
 * (tools/compare/appTrace.ts:225-316) and
 * tests/battle2OffKernelSeamScout.test.ts already exercise. ONIX opens with
 * ROCK SLIDE (move slot 0); KABUTO replies with SAND-ATTACK (move slot 2).
 */
export const BATTLE2_TURN1_KERNEL_CONFIG: FactoryFullTurnConfig = Object.freeze({
  requestId: 1,
  rngSeed: 3530724670,
  player: Object.freeze({
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
  }),
  trainer: Object.freeze({
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
  }),
}) as FactoryFullTurnConfig;

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

export type Battle2CommandAdapterPreviewKernel = Readonly<{
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
export function stageBattle2Turn1Kernel(): Battle2CommandAdapterPreviewKernel {
  const initial = createFactoryFullTurnBattleState(BATTLE2_TURN1_KERNEL_CONFIG);
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: BATTLE2_TURN1_PLAYER_ROCK_SLIDE,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error(
      "battle2CommandAdapterPreview: expected the trainer command boundary",
    );
  }
  const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: BATTLE2_TURN1_TRAINER_SAND_ATTACK,
  });
  if (transition.kind !== "decision-required") {
    throw new Error(
      "battle2CommandAdapterPreview: expected the next player command boundary",
    );
  }
  return Object.freeze({ initial, afterPlayer, transition });
}

/**
 * Typed command-phase adapter: same shape
 * `battle2CommandPresentationForRender` (battleScene.ts:6714-6800) hand-
 * builds from `BATTLE2_ACTION_MENU_MODEL`'s fixture, but sourced from the
 * live kernel request/rules instead. The lifecycle clock (phase/
 * phaseElapsed) stays legacy-owned for this slice -- rank 1's own note is
 * that A-confirm timing remains on the established predecessor until a
 * later slice owns that semantic handoff, so this adapter is deliberately
 * silent about phase timing and only asserts field/request equivalence.
 */
export function createBattle2CommandAdapterPreviewCommand(
  kernel: Battle2CommandAdapterPreviewKernel = stageBattle2Turn1Kernel(),
  initialFightCursor: 0 | 1 | 2 | 3 = 0,
): BattleCommandPresentationState {
  if (kernel.initial.boundary.kind !== "decision-required") {
    throw new Error(
      "battle2CommandAdapterPreview: initial kernel state is not a command boundary",
    );
  }
  return createBattleCommandPresentation(
    kernel.initial.boundary.request as BattleCommandRequest,
    kernel.initial.rules.rulesContext,
    initialFightCursor,
  );
}

/**
 * Typed resolution-phase adapter: same shape
 * `drawBattle2RockSlideAttack`/`drawBattle2RockSlideTurn1Window`
 * (battleScene.ts:6880-6972) hand-build from `battle2Turn1.ts`'s hardcoded
 * ROCK_SLIDE damage/HP/PP constants, but sourced from the live kernel
 * transition instead. Its command list also naturally covers KABUTO's
 * SAND-ATTACK reply -- real kernel content the cited legacy line range
 * (battleScene.ts:6639-7041) does not render at all today, since that
 * range stops at the opponent handoff tick. That is additional coverage
 * the flip can use later, not a divergence to reconcile.
 */
export function createBattle2CommandAdapterPreviewResolution(
  kernel: Battle2CommandAdapterPreviewKernel = stageBattle2Turn1Kernel(),
  command: BattleCommandPresentationState = createBattle2CommandAdapterPreviewCommand(kernel),
): BattleResolutionPresentationState {
  if (kernel.initial.boundary.kind !== "decision-required") {
    throw new Error(
      "battle2CommandAdapterPreview: initial kernel state is not a command boundary",
    );
  }
  if (kernel.afterPlayer.kind !== "decision-required") {
    throw new Error(
      "battle2CommandAdapterPreview: afterPlayer kernel state is not a command boundary",
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
