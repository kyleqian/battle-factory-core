import anchorState from "../data/gen/anchor-state.json" with { type: "json" };
import frontierMonsData from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import {
  acknowledgeFactorySwapPresentation,
  commitFactorySwapMutation,
  copyFactorySwapCursor,
  createFactorySwapState,
  handleFactorySwapInput,
  type FactoryRentalRoster,
  type FactorySwapInput,
  type FactorySwapMon,
  type FactorySwapParty,
  type FactorySwapPhase,
  type FactorySwapState,
} from "./factorySwap.ts";
import {
  BATTLE_1_CANONICAL_AMBIENT_GAP_STEPS,
  BATTLE_1_CANONICAL_OPPONENT_RNG_START,
  BATTLE_1_FRONTIER_MON_INDICES,
  generateBattle1OpponentTeam,
} from "./opponentGen.ts";
import {
  getMonPicVisual,
  type MonPicVisual,
} from "./monPic.ts";
import {
  activateSpeciesNameFade,
  advanceSpeciesNameFade,
  deactivateSpeciesNameFade,
  type SpeciesNameFadeState,
} from "./speciesNameFade.ts";
import { bgFadeY, objFadeY } from "./paletteFade.ts";
import {
  advanceBallAnim,
  ballAnimTile,
  initialMovingBallAnimState,
  type BallAnimState,
} from "./ballAnim.ts";

export type FactorySwapBallAnims = readonly [
  BallAnimState,
  BallAnimState,
  BallAnimState,
];

export interface FactorySwapPresentationState {
  readonly controller: FactorySwapState;
  /** SpriteCB_Pokeball state, in the three balls' gSprites/OAM order. */
  readonly ballAnims: FactorySwapBallAnims;
  /** Relative to the accepted postwin offer-YES edge. */
  readonly elapsed: number;
  /** Relative to the input edge which entered controller.phase. */
  readonly phaseElapsed: number;
  /**
   * Sprite-owned animation age created by the selected player's OpenMonPic.
   * It survives the B close and restored picker instead of being re-anchored
   * to either controller phase.
   */
  readonly selectedBallClock: number | null;
  readonly selectedBallIndex: 0 | 1 | 2 | null;
  /**
   * The single Swap_Task_FadeSpeciesName task. Popup entry only pauses its
   * RUN body; neither entry nor return reconstructs its internal cadence.
   */
  readonly speciesNameFade: SpeciesNameFadeState;
  /** Source callback reached after the exit fade has fully completed. */
  readonly fieldHandoff: "CB2_ReturnToFieldContinueScript" | null;
  /** Source callback/task owner for the normal-summary round trip. */
  readonly summaryCallback:
    | "Swap_Task_OpenSummaryScreen"
    | "CB2_InitSummaryScreen"
    | "Summary_Task_HandleInput"
    | "CloseSummaryScreen"
    | "CB2_InitSwapScreen"
    | "Swap_Task_HandleMenu"
    | null;
  readonly summaryMode: "SUMMARY_MODE_NORMAL" | null;
  readonly summaryCurMonIndex: 0 | 1 | 2 | null;
  readonly summaryMaxMonIndex: 2 | null;
  /** True after CB2_InitSwapScreen rebuilt the originating popup. */
  readonly returnedFromSummary: boolean;
  /** The duplicate-error task rebuilt the enemy picker on the prior frame. */
  readonly returnedFromDuplicate?: boolean;
  /**
   * Species whose graphics/window text were already loaded before a staged
   * logical roster change. Real picker tasks own this separately from party
   * data until a cursor-copy task replaces it.
   */
  readonly loadedDisplaySpecies?: string | null;
  /** Age since accepted summary B; rebuilt ball callbacks start at +41. */
  readonly summaryReturnClock?: number | null;
}

export interface FactorySwapBallCycleVisual {
  readonly centerX: number;
  readonly cycledToEnemy: boolean;
}

const anchor = anchorState as {
  rentals: Array<{
    species: string;
    frontierMonIndex: number;
    personality: number;
    ivs: Record<"hp" | "attack" | "defense" | "speed" | "spAttack" | "spDefense", number>;
    abilityNum: number;
    stats: { hp: number; maxHp: number };
  }>;
};
const frontierMons = (frontierMonsData as {
  entries: Array<{ index: number; species: string }>;
}).entries;
const speciesStats = (speciesStatsData as {
  species: Array<{ name: string; abilities: readonly string[] }>;
}).species;
const FACTORY_CHALLENGE_0_FIXED_IV = 3;

function uniformRentalIv(rental: (typeof anchor.rentals)[number]): number {
  const values = Object.values(rental.ivs);
  if (!values.every((iv) => iv === values[0])) {
    throw new Error(`Factory rental ${rental.species} does not have uniform IVs`);
  }
  return values[0]!;
}

function generatedAbilityNum(species: string, personality: number): number {
  const stats = speciesStats.find((entry) => entry.name === species);
  if (!stats) throw new Error(`Factory swap: missing generated species ${species}`);
  // CreateBoxMon: only species with a real second ability use personality bit 0.
  return stats.abilities[1] === "ABILITY_NONE" ? 0 : personality & 1;
}

import type {
  BattleParty,
  FactoryRentalParty,
} from "./battleScenario.ts";
import {
  createFactoryCorpusPartyMember,
} from "./factoryCorpusParty.ts";
import { factorySwapRoundDecision } from "./factorySwap.ts";
import {
  chooseRoundSwap,
  completeBattlePresentation,
  type RoundControllerState,
} from "./roundController.ts";

export interface FactorySwapPresentationParties {
  readonly playerRentalRecords: FactoryRentalParty;
  readonly playerParty: BattleParty;
  readonly opponentRentalRecords: FactoryRentalParty;
  readonly opponentParty: BattleParty;
}

/**
 * Rebuilds gSaveBlock2Ptr->frontier.rentalMons for the canonical post-battle-1
 * swap screen. Player records come from the drafted rental state; opponent
 * records come from the generated Frontier set corpus and the source-ported
 * CreateMonWithEVSpreadNatureOTID rejection loops.
 */
export function deriveCanonicalFactoryRentalRoster(): FactoryRentalRoster {
  const drafted = anchor.rentals.slice(0, 3).map((rental) => ({
    monId: rental.frontierMonIndex,
    personality: rental.personality,
    ivs: uniformRentalIv(rental),
    abilityNum: rental.abilityNum,
  }));
  const generatedOpponent = generateBattle1OpponentTeam(
    BATTLE_1_CANONICAL_OPPONENT_RNG_START,
    BATTLE_1_CANONICAL_AMBIENT_GAP_STEPS,
  );
  const offered = BATTLE_1_FRONTIER_MON_INDICES.map((monId, index) => {
    const set = frontierMons[monId];
    if (!set || set.index !== monId) {
      throw new Error(`Factory swap: missing generated Frontier set ${monId}`);
    }
    const personality = generatedOpponent.mons[index]!.personality;
    return {
      monId,
      personality,
      ivs: FACTORY_CHALLENGE_0_FIXED_IV,
      abilityNum: generatedAbilityNum(set.species, personality),
    };
  });
  return [...drafted, ...offered] as unknown as FactoryRentalRoster;
}

export const CANONICAL_FACTORY_RENTAL_ROSTER =
  deriveCanonicalFactoryRentalRoster();

function playerMon(index: number): FactorySwapMon {
  const source = anchor.rentals[index]!;
  return {
    id: source.species.replace("SPECIES_", "").toLowerCase(),
    species: source.species.replace("SPECIES_", ""),
    hp: source.stats.maxHp,
    maxHp: source.stats.maxHp,
    status: "none",
    personality: source.personality,
    abilityNum: source.abilityNum,
    friendship: 255,
  };
}

function offeredMon(
  id: string,
  species: string,
  rentalIndex: 3 | 4 | 5,
): FactorySwapMon {
  const rental = CANONICAL_FACTORY_RENTAL_ROSTER[rentalIndex];
  return {
    id,
    species,
    hp: 100,
    maxHp: 100,
    status: "none",
    personality: rental.personality,
    abilityNum: rental.abilityNum,
    friendship: 255,
  };
}

export const CANONICAL_SWAP_PLAYER_PARTY: FactorySwapParty = [
  playerMon(0),
  playerMon(1),
  playerMon(2),
];

export const CANONICAL_SWAP_ENEMY_PARTY: FactorySwapParty = [
  offeredMon("grovyle", "GROVYLE", 3),
  offeredMon("murkrow", "MURKROW", 4),
  offeredMon("pidgeotto", "PIDGEOTTO", 5),
];

export const FACTORY_SWAP_ENTRY_READY_DELAY = 99;
// Swap_Task_HandleChooseMons' STATE_CHOOSE_MONS_INIT activates the species-name
// breathe when `!gPaletteFade.active` (battle_factory_screen.c:2638-2643). The
// fade's visual settle (bgY 0 at elapsed 58, the FADE_IN math above) is NOT
// the activation edge: `softwareFadeFinishing` holds `gPaletteFade.active`
// TRUE for five further ticks before it clears (palette.c:807-823), so the
// activation the swap screen consumes lands at elapsed 63 (58 + 5). The app's
// activate call at this elapsed becomes effective one tick later (the same
// advance first no-ops on the inactive state, then activates), matching the
// oracle's first visible species-color step exactly.
export const FACTORY_SWAP_SPECIES_FADE_ACTIVATE_ELAPSED = 63;
const INITIAL_FACTORY_SWAP_SPECIES_FADE: SpeciesNameFadeState = {
  active: false,
  tState: "run",
  coeffDelay: 0,
  coeff: 0,
  fadeOut: true,
  delay: 0,
  renderCoeff: 0,
};

function initialFactorySwapBallAnims(): FactorySwapBallAnims {
  return [
    initialMovingBallAnimState(),
    initialMovingBallAnimState(),
    initialMovingBallAnimState(),
  ];
}
export const FACTORY_SWAP_PHASE_READY_DELAYS: Readonly<
  Partial<Record<FactorySwapPhase, number>>
> = {
  // +57 performs STATE_MENU_SHOW_OPTIONS -> STATE_MENU_HANDLE_INPUT. Since
  // JOY_NEW was already sampled by that task invocation, +58 is the first
  // physical edge that can be consumed.
  playerOptions: 58,
  enemyPicker: 199,
  // HandleYesNo reaches its input state at +63 after JOY_NEW was sampled;
  // +64 is the first physical prompt edge it can consume.
  acceptPrompt: 64,
  // +35 installs HandleYesNo input state after JOY_NEW was sampled; +36 is
  // the first physical prompt edge the task can consume.
  quitPrompt: 36,
  // OpenMonPic finishes and state 0 prints the error at +23; +24 is the
  // first physical A/B edge observed by state 1.
  duplicateSpecies: 24,
};

function factorySwapSpeciesName(speciesName: string): string {
  return speciesName.replace(/^SPECIES_/, "");
}

function factorySwapParty(
  records: FactoryRentalParty,
  battleParty: BattleParty,
  label: string,
): FactorySwapParty {
  return records.map((record, index): FactorySwapMon => {
    const member = createFactoryCorpusPartyMember(record);
    const battleMon = battleParty[index]!;
    const species = factorySwapSpeciesName(member.speciesName);
    if (factorySwapSpeciesName(battleMon.species) !== species) {
      throw new Error(
        `${label}[${index}] record species ${species} does not match battle party species ${battleMon.species}`,
      );
    }
    return {
      id: battleMon.id,
      species,
      hp: battleMon.hp,
      maxHp: battleMon.maxHp,
      status: battleMon.status,
      personality: member.personality,
      abilityNum: member.abilitySlot,
      friendship: member.friendship,
    };
  }) as unknown as FactorySwapParty;
}

function factorySwapRentalRoster(
  playerRentalRecords: FactoryRentalParty,
  opponentRentalRecords: FactoryRentalParty,
): FactoryRentalRoster {
  return [...playerRentalRecords, ...opponentRentalRecords].map((record) => ({
    monId: record.setId,
    personality: record.personality,
    ivs: record.fixedIv,
    abilityNum: record.abilitySlot,
  })) as unknown as FactoryRentalRoster;
}

/**
 * Generic generated-round entry point. The two BattleParty values retain the
 * round's live identity/HP/status, while the saved RentalMon records remain
 * the source of species, personality, ability, and swap-copy persistence.
 */
export function createFactorySwapPresentation(
  parties: FactorySwapPresentationParties,
): FactorySwapPresentationState {
  const controller = createFactorySwapState(
    factorySwapParty(
      parties.playerRentalRecords,
      parties.playerParty,
      "playerParty",
    ),
    factorySwapParty(
      parties.opponentRentalRecords,
      parties.opponentParty,
      "opponentParty",
    ),
    factorySwapRentalRoster(
      parties.playerRentalRecords,
      parties.opponentRentalRecords,
    ),
  );
  return {
    controller,
    ballAnims: initialFactorySwapBallAnims(),
    elapsed: 0,
    phaseElapsed: 0,
    selectedBallClock: null,
    selectedBallIndex: null,
    speciesNameFade: INITIAL_FACTORY_SWAP_SPECIES_FADE,
    fieldHandoff: null,
    summaryCallback: null,
    summaryMode: null,
    summaryCurMonIndex: null,
    summaryMaxMonIndex: null,
    returnedFromSummary: false,
    returnedFromDuplicate: false,
    loadedDisplaySpecies: null,
    summaryReturnClock: null,
  };
}

export function createCanonicalFactorySwapPresentation(): FactorySwapPresentationState {
  const records = CANONICAL_FACTORY_RENTAL_ROSTER.map((record) => ({
    setId: record.monId,
    personality: record.personality,
    fixedIv: record.ivs,
    abilitySlot: record.abilityNum as 0 | 1,
  }));
  return createFactorySwapPresentation({
    playerRentalRecords: records.slice(0, 3) as unknown as FactoryRentalParty,
    playerParty: CANONICAL_SWAP_PLAYER_PARTY,
    opponentRentalRecords: records.slice(3) as unknown as FactoryRentalParty,
    opponentParty: CANONICAL_SWAP_ENEMY_PARTY,
  });
}

/**
 * Consumes the round controller's pending swapOffer without acknowledging it.
 * Completion remains tied to the source copy boundary below.
 */
export function createPendingFactorySwapPresentation(
  round: RoundControllerState,
): FactorySwapPresentationState | null {
  const pending = round.presentation;
  if (pending === null || pending.command.type !== "swapOffer") return null;
  const playerRentalRecords = round.rules.playerRentalRecords;
  const opponentRentalRecords = round.rules.currentOpponent.rentalRecords;
  if (playerRentalRecords === null || opponentRentalRecords === undefined) {
    throw new Error(
      "a generated Factory swap presentation requires both full rental record parties",
    );
  }
  return createFactorySwapPresentation({
    playerRentalRecords,
    playerParty: round.rules.playerParty,
    opponentRentalRecords,
    opponentParty: round.rules.currentOpponent.party,
  });
}

/**
 * Source `CopySwappedMonData` -> round decision bridge. Calls before +21 are
 * no-ops; after the first submission the pending command is `swapResolved`,
 * making subsequent presentation ticks idempotent.
 */
export function submitFactorySwapRoundDecision(
  round: RoundControllerState,
  presentation: FactorySwapPresentationState,
): RoundControllerState {
  const pending = round.presentation;
  if (pending === null || pending.command.type !== "swapOffer") return round;
  const decision = factorySwapRoundDecision(presentation.controller);
  if (decision === null) return round;
  const acknowledged = completeBattlePresentation(round, {
    commandId: pending.command.commandId,
  });
  return chooseRoundSwap(acknowledged, decision);
}

function readyDelay(state: FactorySwapPresentationState): number | null {
  if (
    state.controller.phase === "complete" ||
    state.controller.phase === "acceptExit" ||
    state.controller.phase === "acceptReturn" ||
    state.controller.phase === "quitExit" ||
    state.controller.phase === "quitReturn" ||
    state.controller.phase === "summaryFade" ||
    state.controller.phase === "summaryReturn" ||
    state.controller.phase === "playerPickerReturn" ||
    state.controller.phase === "enemySwitch" ||
    state.controller.phase === "playerSwitch"
    || state.controller.phase === "duplicateReturn"
  ) return null;
  if (state.controller.phase === "playerPicker" && state.elapsed === state.phaseElapsed) {
    return FACTORY_SWAP_ENTRY_READY_DELAY;
  }
  if (
    state.controller.phase === "quitPrompt" &&
    state.controller.quitReturnPhase === "enemyPicker"
  ) {
    // The enemy screen staggers PKMN FOR SWAP and CANCEL by five task
    // frames. HandleYesNo is installed at +41, so +42 is its first edge.
    return 42;
  }
  return FACTORY_SWAP_PHASE_READY_DELAYS[state.controller.phase] ?? 0;
}

function advanceFactorySwapPresentationClocks(
  state: FactorySwapPresentationState,
): FactorySwapPresentationState {
  const elapsed = state.elapsed + 1;
  const phaseElapsed = state.phaseElapsed + 1;
  const selectedBallClock =
    state.selectedBallClock === null ? null : state.selectedBallClock + 1;
  const summaryReturnClock =
    state.summaryReturnClock == null ? null : state.summaryReturnClock + 1;
  let speciesNameFade = advanceSpeciesNameFade(state.speciesNameFade);
  if (elapsed === FACTORY_SWAP_SPECIES_FADE_ACTIVATE_ELAPSED) {
    speciesNameFade = activateSpeciesNameFade(speciesNameFade);
  }
  let controller = copyFactorySwapCursor(state.controller);
  const loadedDisplaySpecies =
    controller.displayCursor !== state.controller.displayCursor
      ? null
      : state.loadedDisplaySpecies;
  let fieldHandoff = state.fieldHandoff;
  let summaryCallback = state.summaryCallback;
  let summaryMode = state.summaryMode;
  let summaryCurMonIndex = state.summaryCurMonIndex;
  let summaryMaxMonIndex = state.summaryMaxMonIndex;
  let returnedFromSummary = state.returnedFromSummary;
  let returnedFromDuplicate = state.returnedFromDuplicate ?? false;
  if (controller.phase === "summaryFade") {
    if (phaseElapsed === 1) {
      summaryCallback = "Swap_Task_OpenSummaryScreen";
      summaryMode = "SUMMARY_MODE_NORMAL";
      summaryCurMonIndex = controller.cursor as 0 | 1 | 2;
      summaryMaxMonIndex = 2;
    } else if (phaseElapsed === 24) {
      summaryCallback = "CB2_InitSummaryScreen";
    } else if (phaseElapsed === 40) {
      summaryCallback = "Summary_Task_HandleInput";
    }
  }
  if (controller.phase === "summaryReturn") {
    if (phaseElapsed === 22) summaryCallback = "CB2_InitSwapScreen";
    if (phaseElapsed === 41) summaryCallback = "Swap_Task_HandleMenu";
    if (phaseElapsed >= 60) {
      controller = {
        ...controller,
        phase: "playerOptions",
        inputReady: false,
        actionsCount: 4,
        playerOptionCursor: 0,
        playerOptionDisplayCursor: 0,
        playerOptionCursorCopyPending: false,
      };
      returnedFromSummary = true;
      return {
        controller,
        elapsed,
        phaseElapsed: 0,
        selectedBallClock: null,
        selectedBallIndex: state.selectedBallIndex,
        speciesNameFade,
        fieldHandoff,
        summaryCallback,
        summaryMode,
        summaryCurMonIndex,
        summaryMaxMonIndex,
        returnedFromSummary,
        summaryReturnClock,
        loadedDisplaySpecies,
      };
    }
  }
  if (controller.phase === "quitExit" && phaseElapsed === 1) {
    controller = {
      ...controller,
      scriptResult: true,
      result: "keptParty",
    };
  }
  if (controller.phase === "quitExit" && phaseElapsed >= 22) {
    controller = {
      ...controller,
      phase: "complete",
      quitReturnPhase: null,
    };
    fieldHandoff = "CB2_ReturnToFieldContinueScript";
  }
  const quitReturnReady =
    controller.quitReturnPhase === "enemyPicker" ? 49 : 38;
  if (controller.phase === "quitReturn" && phaseElapsed >= quitReturnReady) {
    const returnPhase = controller.quitReturnPhase ?? "playerPicker";
    controller = acknowledgeFactorySwapPresentation({
      ...controller,
      phase: returnPhase,
      quitReturnPhase: null,
    });
    return {
      controller,
      elapsed,
      phaseElapsed: 2,
      selectedBallClock,
      selectedBallIndex: state.selectedBallIndex,
      speciesNameFade: activateSpeciesNameFade(speciesNameFade),
      fieldHandoff,
      summaryCallback,
      summaryMode,
      summaryCurMonIndex,
      summaryMaxMonIndex,
      returnedFromSummary,
      loadedDisplaySpecies,
    };
  }
  if (controller.phase === "acceptExit" && phaseElapsed === 20) {
    // Swap_Task_Exit state 0: FALSE means the player did swap.
    controller = { ...controller, scriptResult: false };
  }
  if (controller.phase === "acceptExit" && phaseElapsed === 21) {
    controller = commitFactorySwapMutation(controller);
  }
  if (controller.phase === "acceptExit" && phaseElapsed >= 41) {
    controller = { ...controller, phase: "complete" };
    fieldHandoff = "CB2_ReturnToFieldContinueScript";
  }
  if (controller.phase === "acceptReturn" && phaseElapsed >= 67) {
    controller = acknowledgeFactorySwapPresentation({
      ...controller,
      phase: "enemyPicker",
    });
    return {
      controller,
      elapsed,
      // Unlike the enemy-screen switch, this handoff has already restored
      // the cursor/species windows in transition state 7/8. Render it as the
      // settled picker while still accepting the same physical edge.
      phaseElapsed: 2,
      selectedBallClock,
      selectedBallIndex: state.selectedBallIndex,
      speciesNameFade,
      fieldHandoff,
      summaryCallback,
      summaryMode,
      summaryCurMonIndex,
      summaryMaxMonIndex,
      returnedFromSummary,
      loadedDisplaySpecies,
    };
  }
  // Swap_TaskCantHaveSameMons states 2..4: wait for CloseMonPic, restore the
  // instruction, restore the species window, then install HandleChooseMons.
  if (controller.phase === "duplicateReturn" && phaseElapsed >= 23) {
    controller = {
      ...controller,
      phase: "enemyPicker",
      inputReady: false,
    };
    returnedFromDuplicate = true;
    return {
      controller,
      elapsed,
      phaseElapsed: 0,
      selectedBallClock,
      selectedBallIndex: state.selectedBallIndex,
      speciesNameFade: activateSpeciesNameFade(speciesNameFade),
      fieldHandoff,
      summaryCallback,
      summaryMode,
      summaryCurMonIndex,
      summaryMaxMonIndex,
      returnedFromSummary,
      returnedFromDuplicate,
      summaryReturnClock,
      loadedDisplaySpecies,
    };
  }
  if (controller.phase === "enemySwitch" && phaseElapsed === 84) {
    controller = {
      ...controller,
      actionsCount: 5,
      cursor: 0,
      infoCursor: 0,
      displayCursor: 0,
      arrowCursor: 0,
      cursorCopyPending: false,
    };
    // Swap_Task_SwitchPartyScreen reuses the one existing species-name task,
    // resetting its fields for the enemy-side fade-in.
    speciesNameFade = {
      ...speciesNameFade,
      active: false,
      tState: "run",
      coeffDelay: 0,
      coeff: 6,
      fadeOut: false,
      delay: 0,
      renderCoeff: 16,
    };
  }
  if (controller.phase === "enemySwitch" && phaseElapsed >= 133) {
    controller = acknowledgeFactorySwapPresentation({
      ...controller,
      phase: "enemyPicker",
    });
    return {
      controller,
      elapsed,
      phaseElapsed: 0,
      selectedBallClock,
      selectedBallIndex: state.selectedBallIndex,
      speciesNameFade: {
        ...speciesNameFade,
        active: true,
      },
      fieldHandoff,
      summaryCallback,
      summaryMode,
      summaryCurMonIndex,
      summaryMaxMonIndex,
      returnedFromSummary,
      loadedDisplaySpecies,
    };
  }
  if (controller.phase === "playerSwitch" && phaseElapsed === 71) {
    controller = {
      ...controller,
      actionsCount: 4,
      cursor: 0,
      infoCursor: 0,
      displayCursor: 0,
      arrowCursor: 0,
      cursorCopyPending: false,
    };
    speciesNameFade = {
      ...speciesNameFade,
      active: false,
      tState: "run",
      coeffDelay: 0,
      coeff: 6,
      fadeOut: false,
      delay: 0,
      renderCoeff: 16,
    };
  }
  // ScreenInfoTransitionIn state 8 installs HandleChooseMons during +109.
  // JOY_NEW was already sampled, so only the following physical edge is
  // eligible for the reconstructed player picker.
  if (controller.phase === "playerSwitch" && phaseElapsed >= 109) {
    controller = {
      ...controller,
      phase: "playerPicker",
      inputReady: false,
      playerSwitchCompleted: true,
    };
    return {
      controller,
      elapsed,
      phaseElapsed: 0,
      selectedBallClock,
      selectedBallIndex: state.selectedBallIndex,
      speciesNameFade: {
        ...speciesNameFade,
        active: true,
      },
      fieldHandoff,
      summaryCallback,
      summaryMode,
      summaryCurMonIndex,
      summaryMaxMonIndex,
      returnedFromSummary,
      loadedDisplaySpecies,
    };
  }
  if (controller.phase === "playerPickerReturn" && phaseElapsed >= 55) {
    controller = {
      ...controller,
      phase: "playerPicker",
      inputReady: false,
    };
    return {
      controller,
      elapsed,
      phaseElapsed: 0,
      selectedBallClock,
      selectedBallIndex: state.selectedBallIndex,
      speciesNameFade,
      fieldHandoff,
      summaryCallback,
      summaryMode,
      summaryCurMonIndex,
      summaryMaxMonIndex,
      returnedFromSummary,
      loadedDisplaySpecies,
    };
  }
  // Swap_Task_ScreenInfoTransitionIn state 8 re-enables the existing task
  // one frame before its HandleChooseMons handoff.
  if (controller.phase === "playerPickerReturn" && phaseElapsed === 54) {
    speciesNameFade = activateSpeciesNameFade(speciesNameFade);
  }
  const advanced = {
    controller,
    elapsed,
    phaseElapsed,
    selectedBallClock,
    selectedBallIndex: state.selectedBallIndex,
    speciesNameFade,
    fieldHandoff,
    summaryCallback,
    summaryMode,
    summaryCurMonIndex,
    summaryMaxMonIndex,
    returnedFromSummary,
    returnedFromDuplicate,
    summaryReturnClock,
    loadedDisplaySpecies,
  };
  const delay = readyDelay(advanced);
  const effectiveDelay =
    controller.phase === "playerOptions" && returnedFromSummary
      ? 1
      : controller.phase === "enemyPicker" && returnedFromDuplicate
        ? 1
        : delay;
  if (effectiveDelay !== null && phaseElapsed >= effectiveDelay) {
    controller = acknowledgeFactorySwapPresentation(controller);
  }
  return { ...advanced, controller };
}

export interface FactorySwapPresentationAdvance {
  readonly presentation: FactorySwapPresentationState;
  readonly rngValue: number;
}

/**
 * Advances the generic swap-screen tasks and its three SpriteCB_Pokeball
 * callbacks. The caller owns the ambient VBlank Random() call and passes its
 * resulting cursor here; eligible selected-palette balls then consume their
 * own Random()%5 draws in sprite/OAM index order (0, 1, 2).
 *
 * Swap_InitAllSprites creates the sprites earlier in CB2 init, but their first
 * Swap_CB2 AnimateSprites pass is entry +43. Fresh sprites enter moving anim 1
 * without rolling; their first three rolls land only when that cycle ends at
 * +171. A summary return reconstructs every sprite and callback state.
 */
export function advanceFactorySwapPresentation(
  state: FactorySwapPresentationState,
  rngValue: number,
): FactorySwapPresentationAdvance {
  const clocked = advanceFactorySwapPresentationClocks(state);
  // Several source-task handoffs return a deliberately rebuilt presentation
  // object. Sprite state lives outside those task-local fields and survives
  // unless the summary callback explicitly reconstructs it below.
  let ballAnims: FactorySwapBallAnims = clocked.ballAnims ?? state.ballAnims;

  // CB2_InitSwapScreen state 6 creates a fresh three-sprite epoch. The
  // presentation's close-relative clock reaches that state at +40; its first
  // AnimateSprites pass follows at +41, yielding the already-proven first
  // visible moving tile on that same edge.
  if (
    clocked.controller.phase === "summaryReturn" &&
    clocked.summaryReturnClock === 40
  ) {
    ballAnims = initialFactorySwapBallAnims();
  }

  const initialEpochActive =
    clocked.elapsed >= 43 &&
    !clocked.controller.playerSwitchCompleted &&
    clocked.controller.phase !== "enemySwitch" &&
    clocked.controller.phase !== "playerSwitch" &&
    (
      clocked.controller.phase !== "summaryFade" ||
      clocked.phaseElapsed < 24
    ) &&
    clocked.controller.phase !== "summaryReturn";
  const summaryReturnEpochActive =
    clocked.controller.phase === "summaryReturn" &&
    (clocked.summaryReturnClock ?? -1) >= 41;
  const returnedSummaryEpochActive =
    clocked.returnedFromSummary &&
    clocked.controller.phase === "playerOptions";

  // Enemy-side balls have the gray palette, whose callback never rolls.
  // The existing source-relative slide-cycle reducer continues to own the
  // palette-transition window; this callback state owns settled selected
  // palettes and the reconstructed summary sibling path.
  const selectedPalette = !(
    clocked.controller.phase === "enemyPicker" ||
    clocked.controller.phase === "enemySwitch" ||
    clocked.controller.phase === "playerSwitch" ||
    clocked.controller.phase === "acceptPrompt" ||
    clocked.controller.phase === "acceptReturn" ||
    clocked.controller.phase === "acceptExit" ||
    clocked.controller.phase === "duplicateSpecies" ||
    clocked.controller.phase === "duplicateReturn" ||
    (
      (clocked.controller.phase === "quitPrompt" ||
        clocked.controller.phase === "quitReturn" ||
        clocked.controller.phase === "quitExit") &&
      clocked.controller.quitReturnPhase === "enemyPicker"
    )
  );

  if (
    selectedPalette &&
    (initialEpochActive || summaryReturnEpochActive || returnedSummaryEpochActive)
  ) {
    const next = [...ballAnims] as [BallAnimState, BallAnimState, BallAnimState];
    for (let i = 0; i < next.length; i += 1) {
      const result = advanceBallAnim(
        next[i]!,
        rngValue,
        false,
        false,
        true,
      );
      next[i] = result.state;
      rngValue = result.rngValue;
    }
    ballAnims = next;
  }

  return {
    presentation: { ...clocked, ballAnims },
    rngValue,
  };
}

/** Actual displayed tiles from each independent SpriteCB_Pokeball state. */
export function factorySwapBallTiles(
  state: FactorySwapPresentationState,
): readonly [0 | 16 | 32, 0 | 16 | 32, 0 | 16 | 32] {
  return state.ballAnims.map(ballAnimTile) as [
    0 | 16 | 32,
    0 | 16 | 32,
    0 | 16 | 32,
  ];
}

/** Direct OpenMonPic used by Swap_TaskCantHaveSameMons (no button teardown). */
export function factorySwapDuplicateMonPicVisual(
  phaseElapsed: number,
): MonPicVisual {
  const hidden: MonPicVisual = {
    flashWidth: 0,
    flashBlended: true,
    window: null,
    spriteVisible: false,
    menuTextVisible: false,
    menuHighlightVisible: false,
  };
  if (phaseElapsed < 2) return hidden;
  if (phaseElapsed < 14) {
    const flashWidths = [1, 1, 4, 4, 8, 8, 16, 16, 32, 32, 64, 64] as const;
    return {
      ...hidden,
      flashWidth: flashWidths[phaseElapsed - 2]!,
    };
  }
  const windows = [
    { top: 64, bottom: 65 },
    { top: 60, bottom: 69 },
    { top: 56, bottom: 73 },
    { top: 52, bottom: 77 },
    { top: 44, bottom: 85 },
    { top: 40, bottom: 89 },
    { top: 40, bottom: 89 },
  ] as const;
  if (phaseElapsed < 21) {
    return { ...hidden, window: windows[phaseElapsed - 14]! };
  }
  return {
    ...hidden,
    window: { top: 32, bottom: 96 },
    // Swap_CreateMonSprite's new OAM entry first reaches the framebuffer
    // three frames after the full window. If B is taken at the first ready
    // edge, this is the same frame CloseMonPic destroys the logical sprite,
    // so its one buffered OAM frame is still visible during return +0.
    spriteVisible: phaseElapsed >= 24,
  };
}

/** Error-response close owned entirely by Swap_TaskCantHaveSameMons. */
export function factorySwapDuplicateReturnMonPicVisual(
  phaseElapsed: number,
): MonPicVisual {
  const withoutPopup = (visual: MonPicVisual): MonPicVisual => ({
    ...visual,
    menuTextVisible: false,
    menuHighlightVisible: false,
  });
  if (phaseElapsed === 0) {
    return withoutPopup(
      getMonPicVisual({ phase: "open", elapsed: 0, variant: "B", blended: true }),
    );
  }
  if (phaseElapsed >= 21) {
    return withoutPopup(
      getMonPicVisual({ phase: "closed", elapsed: 0, variant: "B", blended: true }),
    );
  }
  return withoutPopup(
    getMonPicVisual({
      phase: "closing",
      elapsed: phaseElapsed - 1,
      variant: "B",
      blended: true,
    }),
  );
}

/** Accepted normal-summary B: CloseSummaryScreen will call CB2_InitSwapScreen. */
export function beginFactorySwapSummaryReturn(
  state: FactorySwapPresentationState,
): FactorySwapPresentationState {
  if (
    state.controller.phase !== "summaryFade" ||
    state.phaseElapsed < 63
  ) return state;
  return {
    ...state,
    controller: {
      ...state.controller,
      phase: "summaryReturn",
      inputReady: false,
    },
    phaseElapsed: 0,
    summaryCallback: "CloseSummaryScreen",
    summaryReturnClock: 0,
  };
}

/** Fresh Swap_InitAllSprites callback epoch during CB2_InitSwapScreen. */
export function factorySwapSummaryReturnBallTile(
  closeElapsed: number,
): 0 | 16 | 32 {
  let age = Math.max(0, closeElapsed - 41);
  const commands = [
    [16, 4],
    [0, 4],
    [32, 4],
    [0, 4],
    [16, 4],
    [0, 4],
    [32, 4],
    [0, 36],
  ] as const;
  for (const [tile, duration] of commands) {
    if (age < duration) return tile;
    age -= duration;
  }
  return 0;
}

export function handleFactorySwapPresentationInput(
  state: FactorySwapPresentationState,
  input: FactorySwapInput,
): FactorySwapPresentationState {
  const controller = handleFactorySwapInput(state.controller, input);
  if (controller === state.controller) return state;
  const enteredPlayerOptions =
    controller.phase === "playerOptions" &&
    state.controller.phase === "playerPicker";
  const leftPicker =
    (
      state.controller.phase === "playerPicker" ||
      state.controller.phase === "enemyPicker"
    ) &&
    controller.phase !== state.controller.phase;
  const pausedSpeciesName =
    enteredPlayerOptions || leftPicker
      ? deactivateSpeciesNameFade(state.speciesNameFade)
      : state.speciesNameFade;
  return {
    ...state,
    controller,
    phaseElapsed:
      controller.phase === state.controller.phase ? state.phaseElapsed : 0,
    selectedBallClock: enteredPlayerOptions ? 0 : state.selectedBallClock,
    selectedBallIndex: enteredPlayerOptions
      ? state.controller.cursor as 0 | 1 | 2
      : state.selectedBallIndex,
    speciesNameFade: pausedSpeciesName,
    summaryCallback:
      controller.phase === "summaryFade"
        ? "Swap_Task_OpenSummaryScreen"
        : state.summaryCallback,
    summaryMode:
      controller.phase === "summaryFade"
        ? "SUMMARY_MODE_NORMAL"
        : state.summaryMode,
    summaryCurMonIndex:
      controller.phase === "summaryFade"
        ? state.controller.cursor as 0 | 1 | 2
        : state.summaryCurMonIndex,
    summaryMaxMonIndex:
      controller.phase === "summaryFade" ? 2 : state.summaryMaxMonIndex,
  };
}

/** Selected-player ball epoch after A, before the option popup reveal. */
export function factorySwapPlayerOptionBallTile(
  phaseElapsed: number,
): 0 | 16 | 32 {
  const local = phaseElapsed - 7;
  if (local < 0) return 0;
  const commands = [
    [16, 8],
    [0, 8],
    [32, 8],
    [0, 8],
    [16, 8],
    [0, 8],
    [32, 8],
    [0, 8],
  ] as const;
  let age = local;
  for (const [tile, duration] of commands) {
    if (age < duration) return tile;
    age -= duration;
  }
  // This sprite owns a separately restarted animation clock after OpenMonPic.
  // Its loop begins three task ticks after the one-shot table completes.
  if (local < 66) return 0;
  const restartedCommands = [
    [16, 4],
    [0, 4],
    [32, 4],
    [0, 4],
    [16, 4],
    [0, 4],
    [32, 4],
    [0, 36],
    [16, 8],
    [0, 8],
    [32, 8],
    [0, 8],
    [16, 8],
    [0, 8],
    [32, 8],
    [0, 8],
  ] as const;
  let loopAge = local - 66;
  for (const [tile, duration] of restartedCommands) {
    if (loopAge < duration) return tile;
    loopAge -= duration;
  }
  return 0;
}

/**
 * `Swap_Task_ScreenInfoTransitionOut`'s PALNUM_FADE_TEXT fade, relative to
 * the accepted player-ball A edge. The delay and alternating two-frame
 * coefficients are pinned by the dense OFF trace; the coefficient values
 * are the source `BeginNormalPaletteFade(..., 0, 0, 16, target)` sequence.
 */
export function factorySwapActionFadeY(phaseElapsed: number): number {
  if (phaseElapsed < 6) return 0;
  return Math.min(16, (Math.floor((phaseElapsed - 6) / 2) + 1) * 2);
}

/**
 * CANCEL's source `tXIncrement=6` slide. The transition task creates the
 * child after the fade completes; its first visible movement is edge +27.
 */
export function factorySwapCancelButtonX(phaseElapsed: number): number {
  const steps = Math.max(0, Math.min(8, phaseElapsed - 26));
  return 192 + steps * 6;
}

/** Player-origin quit transition-out uses the same one-button source task. */
export const factorySwapQuitCancelButtonX = factorySwapCancelButtonX;
export const factorySwapQuitActionFadeY = factorySwapActionFadeY;

/** Enemy-origin quit uses ScreenInfoTransitionOut's two-button branch. */
export const factorySwapEnemyQuitPkmnButtonX = factorySwapAcceptPkmnButtonX;
export const factorySwapEnemyQuitCancelButtonX = factorySwapAcceptCancelButtonX;

export function factorySwapQuitYesNoVisual(
  phaseElapsed: number,
  enemyOrigin = false,
): { textVisible: boolean; highlightVisible: boolean } {
  const textStagger = enemyOrigin ? 6 : 0;
  const highlightStagger = enemyOrigin ? 6 : 0;
  return {
    textVisible: phaseElapsed >= 36 + textStagger,
    highlightVisible: phaseElapsed >= 37 + highlightStagger,
  };
}

/** Quit has no mon picture, so transition-in starts on response +1. */
export function factorySwapQuitReturnCancelButtonX(
  phaseElapsed: number,
): number {
  return factorySwapPlayerReturnCancelButtonX(phaseElapsed + 17);
}

export function factorySwapQuitReturnActionFadeY(
  phaseElapsed: number,
): number {
  const base = factorySwapPlayerReturnActionFadeY(phaseElapsed + 18);
  return phaseElapsed >= 13 && phaseElapsed <= 27 && phaseElapsed % 2 === 1
    ? Math.min(16, base + 2)
    : base;
}

/**
 * Enemy-origin quit has no mon picture to close. Its response enters the
 * existing two-button ScreenInfoTransitionIn immediately: PKMN FOR SWAP is
 * created at +1 and CANCEL after the source's ten-frame stagger.
 */
export function factorySwapEnemyQuitReturnPkmnButtonX(
  phaseElapsed: number,
): number {
  return factorySwapEnemyPkmnButtonX(phaseElapsed + 84);
}

export function factorySwapEnemyQuitReturnCancelButtonX(
  phaseElapsed: number,
): number {
  return factorySwapEnemyCancelButtonX(phaseElapsed + 84);
}

export function factorySwapEnemyQuitReturnActionFadeY(
  phaseElapsed: number,
): number {
  return factorySwapEnemyActionFadeY(phaseElapsed + 84);
}

const FACTORY_SWAP_QUIT_EXIT_FADE = {
  startDelay: 6,
  startY: 0,
  targetY: 16,
} as const;

export function factorySwapQuitExitBgFadeY(phaseElapsed: number): number {
  return bgFadeY(phaseElapsed, FACTORY_SWAP_QUIT_EXIT_FADE);
}

export function factorySwapQuitExitObjFadeY(phaseElapsed: number): number {
  return objFadeY(phaseElapsed, FACTORY_SWAP_QUIT_EXIT_FADE);
}

/**
 * Swap_Task_HandleMenu's shared OpenMonPic reveal. The transition-out child
 * completes at edge +33; its source affine flash becomes visible three ticks
 * later. This is the swap screen's first mon-picture open, so the affine
 * flash is still flat even though its task cadence matches variant B.
 */
export function factorySwapPlayerMonPicVisual(phaseElapsed: number): MonPicVisual {
  const elapsed = phaseElapsed - 33;
  if (elapsed < 0) {
    return getMonPicVisual({ phase: "closed", elapsed: 0, variant: "B", blended: false });
  }
  return getMonPicVisual({ phase: "opening", elapsed, variant: "B", blended: false });
}

export type FactorySwapPlayerReturnMechanism =
  | "Task_CloseMonPic"
  | "SpriteCB_CloseMonPic"
  | "Swap_Task_ScreenInfoTransitionIn"
  | "Swap_Task_HandleChooseMons";

/** Source callback owning each phase-relative part of the evidence-pinned B return. */
export function factorySwapPlayerReturnMechanism(
  phaseElapsed: number,
): FactorySwapPlayerReturnMechanism {
  if (phaseElapsed <= 7) return "Task_CloseMonPic";
  if (phaseElapsed <= 18) return "SpriteCB_CloseMonPic";
  if (phaseElapsed <= 54) return "Swap_Task_ScreenInfoTransitionIn";
  return "Swap_Task_HandleChooseMons";
}

/** CloseMonPic(..., TRUE), indexed from the accepted B edge. */
export function factorySwapPlayerReturnMonPicVisual(
  phaseElapsed: number,
): MonPicVisual {
  if (phaseElapsed >= 20) {
    return getMonPicVisual({
      phase: "closed",
      elapsed: 0,
      variant: "B",
      blended: true,
    });
  }
  const visual = getMonPicVisual({
    phase: "closing",
    elapsed: phaseElapsed,
    variant: "B",
    blended: true,
  });
  // Swap_ErasePopupMenu hides the cursor sprite on the accepted edge while
  // the popup text/window copy and front sprite remain visible until +1.
  return phaseElapsed === 0
    ? { ...visual, menuHighlightVisible: false }
    : visual;
}

/** CANCEL's source six-pixel slide back from x=240 after monPicAnimating clears. */
export function factorySwapPlayerReturnCancelButtonX(
  phaseElapsed: number,
): number {
  if (phaseElapsed < 21) return 240;
  return Math.max(192, 240 - (phaseElapsed - 20) * 6);
}

/**
 * PALNUM_FADE_TEXT's reverse transition. The child slide completes at +27;
 * the palette task then walks 16 -> 0 in the shared alternating cadence.
 */
export function factorySwapPlayerReturnActionFadeY(
  phaseElapsed: number,
): number {
  if (phaseElapsed < 31) return 16;
  return Math.max(0, 16 - (Math.floor((phaseElapsed - 31) / 2) + 1) * 2);
}

export type FactorySwapEnemySwitchMechanism =
  | "Task_CloseMonPic"
  | "SpriteCB_CloseMonPic"
  | "Swap_Task_SwitchPartyScreen"
  | "Swap_Task_ScreenInfoTransitionIn"
  | "Swap_Task_HandleChooseMons";

/** Source callback owning each phase-relative part of player -> enemy. */
export function factorySwapEnemySwitchMechanism(
  phaseElapsed: number,
): FactorySwapEnemySwitchMechanism {
  if (phaseElapsed <= 7) return "Task_CloseMonPic";
  if (phaseElapsed <= 18) return "SpriteCB_CloseMonPic";
  if (phaseElapsed <= 84) return "Swap_Task_SwitchPartyScreen";
  if (phaseElapsed <= 132) return "Swap_Task_ScreenInfoTransitionIn";
  return "Swap_Task_HandleChooseMons";
}

/**
 * Swap_Task_SlideCycleBalls, including its three independent tBallCycled
 * flags. The task's first visible movement is switch edge +24 and it
 * destroys itself after movement 28, when all three destinations settle.
 */
export function factorySwapEnemyBallCycleVisuals(
  phaseElapsed: number,
): readonly [
  FactorySwapBallCycleVisual,
  FactorySwapBallCycleVisual,
  FactorySwapBallCycleVisual,
] {
  const centers = [72, 120, 168];
  const cycled = [false, false, false];
  const movements = Math.max(0, Math.min(28, phaseElapsed - 23));
  for (let movement = 0; movement < movements; movement += 1) {
    let lastX = 0;
    for (let i = 2; i >= 0; i -= 1) {
      if (i === 2) {
        lastX = centers[i]!;
        centers[i]! += 10;
      } else {
        // The source stores this spacing in u8.
        const spacing = (lastX - centers[i]!) & 0xff;
        if (spacing === 16 || cycled[i + 1]) {
          lastX = centers[i]!;
          centers[i]! += 10;
        } else if (spacing > 16) {
          centers[i] = centers[i + 1]! - 48;
        }
      }
      if (cycled[i]) {
        const destination = i * 48 + 72;
        if (centers[i]! >= destination) centers[i] = destination;
      }
      if (centers[i]! - 16 > 240) {
        lastX = centers[i]!;
        centers[i] = -16;
        cycled[i] = true;
      }
    }
  }
  return centers.map((centerX, index) => ({
    centerX,
    cycledToEnemy: cycled[index]!,
  })) as unknown as readonly [
    FactorySwapBallCycleVisual,
    FactorySwapBallCycleVisual,
    FactorySwapBallCycleVisual,
  ];
}

/** First enemy action button's source six-pixel slide from x=240 to x=160. */
export function factorySwapEnemyPkmnButtonX(phaseElapsed: number): number {
  if (phaseElapsed < 88) return 240;
  if (phaseElapsed >= 101) return 160;
  return 240 - (phaseElapsed - 87) * 6;
}

/** CANCEL's delayed source six-pixel slide from x=240 to x=192. */
export function factorySwapEnemyCancelButtonX(phaseElapsed: number): number {
  if (phaseElapsed < 99) return 240;
  return Math.max(192, 240 - (phaseElapsed - 98) * 6);
}

/** Shared PALNUM_FADE_TEXT transition after both enemy buttons settle. */
export function factorySwapEnemyActionFadeY(phaseElapsed: number): number {
  return factorySwapPlayerReturnActionFadeY(phaseElapsed - 78);
}

/** Enemy ScreenInfoTransitionOut: PKMN FOR SWAP slides first at +27. */
export function factorySwapAcceptPkmnButtonX(phaseElapsed: number): number {
  return Math.min(240, 160 + Math.max(0, phaseElapsed - 26) * 6);
}

/** Enemy ScreenInfoTransitionOut: CANCEL follows after tSecondSlideDelay. */
export function factorySwapAcceptCancelButtonX(phaseElapsed: number): number {
  return Math.min(240, 192 + Math.max(0, phaseElapsed - 32) * 6);
}

/**
 * Swap_PrintMonSpeciesForTransition queues the selected species window on
 * the accepted picker edge. Its BG copy becomes visible against the prior
 * PALNUM_FADE_TEXT hardware palette for one VBlank before the copied
 * transition palette reaches hardware.
 */
export function factorySwapAcceptSpeciesRenderCoeff(
  phaseElapsed: number,
  settledCoeff: number,
): number {
  return phaseElapsed === 0 ? 15 : settledCoeff;
}

/**
 * Swap_ShowYesNoOptions writes the BG window/text in STATE_YESNO_SHOW.
 * The existing highlight sprites are made visible in the same task call,
 * but BuildOamBuffer has already run, so their first visible OAM is next tick.
 */
export function factorySwapAcceptYesNoVisual(
  phaseElapsed: number,
): { textVisible: boolean; highlightVisible: boolean } {
  return {
    textVisible: phaseElapsed >= 64,
    highlightVisible: phaseElapsed >= 65,
  };
}

/**
 * OpenMonPic(..., TRUE) created by Swap_AskAcceptMon at +41. This later
 * opening uses the already-configured blended flash. CreateSprite happens
 * after the screen's task/OAM epochs are already established, so its affine
 * opening is two presentation ticks ahead of the shared input-edge table.
 * At +64 HandleYesNo owns the open sprite and popup.
 */
export function factorySwapAcceptMonPicVisual(
  phaseElapsed: number,
): MonPicVisual {
  const elapsed = phaseElapsed - 41;
  if (elapsed < 0) {
    return getMonPicVisual({
      phase: "closed",
      elapsed: 0,
      variant: "B",
      blended: true,
    });
  }
  if (phaseElapsed >= 64) {
    return getMonPicVisual({
      phase: "open",
      elapsed: 0,
      variant: "B",
      blended: true,
    });
  }
  return getMonPicVisual({
    phase: "opening",
    elapsed: elapsed + 2,
    variant: "B",
    blended: true,
  });
}

/**
 * Swap_HandleAcceptMonResponse runs one task tick after the accepted YES
 * edge, then CloseMonPic(..., TRUE) follows the clean variant-B close.
 */
export function factorySwapAcceptExitMonPicVisual(
  phaseElapsed: number,
): MonPicVisual {
  if (phaseElapsed === 0) {
    return getMonPicVisual({
      phase: "open",
      elapsed: 0,
      variant: "B",
      blended: true,
    });
  }
  if (phaseElapsed >= 21) {
    return getMonPicVisual({
      phase: "closed",
      elapsed: 0,
      variant: "B",
      blended: true,
    });
  }
  return getMonPicVisual({
    phase: "closing",
    elapsed: phaseElapsed - 1,
    variant: "B",
    blended: true,
  });
}

/** Swap_Task_Exit's all-palette fade, relative to accepted YES. */
const FACTORY_SWAP_ACCEPT_EXIT_FADE = {
  startDelay: 25,
  startY: 0,
  targetY: 16,
} as const;

export function factorySwapAcceptExitBgFadeY(phaseElapsed: number): number {
  return bgFadeY(phaseElapsed, FACTORY_SWAP_ACCEPT_EXIT_FADE);
}

export function factorySwapAcceptExitObjFadeY(phaseElapsed: number): number {
  return objFadeY(phaseElapsed, FACTORY_SWAP_ACCEPT_EXIT_FADE);
}

export type FactorySwapAcceptExitMechanism =
  | "Swap_HandleAcceptMonResponse"
  | "Swap_Task_Exit"
  | "CB2_ReturnToFieldContinueScript";

export function factorySwapAcceptExitMechanism(
  phaseElapsed: number,
): FactorySwapAcceptExitMechanism {
  if (phaseElapsed === 0) return "Swap_HandleAcceptMonResponse";
  if (phaseElapsed < 41) return "Swap_Task_Exit";
  return "CB2_ReturnToFieldContinueScript";
}

export type FactorySwapAcceptReturnMechanism =
  | "Swap_HandleAcceptMonResponse"
  | "Task_CloseMonPic"
  | "SpriteCB_CloseMonPic"
  | "Swap_Task_ScreenInfoTransitionIn"
  | "Swap_Task_HandleChooseMons";

/** Source callback ownership relative to accepted A-on-NO or B. */
export function factorySwapAcceptReturnMechanism(
  phaseElapsed: number,
): FactorySwapAcceptReturnMechanism {
  if (phaseElapsed === 0) return "Swap_HandleAcceptMonResponse";
  if (phaseElapsed <= 8) return "Task_CloseMonPic";
  if (phaseElapsed <= 20) return "SpriteCB_CloseMonPic";
  if (phaseElapsed <= 66) return "Swap_Task_ScreenInfoTransitionIn";
  return "Swap_Task_HandleChooseMons";
}

/** The response callback uses the same CloseMonPic(..., TRUE) child as YES. */
export const factorySwapAcceptReturnMonPicVisual =
  factorySwapAcceptExitMonPicVisual;

/** Both enemy action buttons return through the generic transition-in task. */
export function factorySwapAcceptReturnPkmnButtonX(
  phaseElapsed: number,
): number {
  return factorySwapEnemyPkmnButtonX(phaseElapsed + 66);
}

export function factorySwapAcceptReturnCancelButtonX(
  phaseElapsed: number,
): number {
  return factorySwapEnemyCancelButtonX(phaseElapsed + 66);
}

export function factorySwapAcceptReturnActionFadeY(
  phaseElapsed: number,
): number {
  return factorySwapEnemyActionFadeY(phaseElapsed + 66);
}

/** The old player species is driven to black once the ball-cycle task starts. */
export function factorySwapEnemySpeciesRenderCoeff(phaseElapsed: number): number {
  if (phaseElapsed < 24) return 0;
  return Math.min(16, Math.floor((phaseElapsed - 20) / 4));
}

export type FactorySwapPlayerSwitchMechanism =
  | "Swap_Task_ScreenInfoTransitionOut"
  | "Swap_Task_SwitchPartyScreen"
  | "Swap_Task_ScreenInfoTransitionIn"
  | "Swap_Task_HandleChooseMons";

/** Source callback ownership relative to accepted enemy PKMN FOR SWAP A. */
export function factorySwapPlayerSwitchMechanism(
  phaseElapsed: number,
): FactorySwapPlayerSwitchMechanism {
  if (phaseElapsed <= 38) return "Swap_Task_ScreenInfoTransitionOut";
  if (phaseElapsed <= 71) return "Swap_Task_SwitchPartyScreen";
  if (phaseElapsed <= 108) return "Swap_Task_ScreenInfoTransitionIn";
  return "Swap_Task_HandleChooseMons";
}

/** Enemy-to-player uses the same cyclic three-ball task, 20 ticks later. */
export function factorySwapPlayerSwitchBallCycleVisuals(
  phaseElapsed: number,
): readonly [
  FactorySwapBallCycleVisual,
  FactorySwapBallCycleVisual,
  FactorySwapBallCycleVisual,
] {
  return factorySwapEnemyBallCycleVisuals(phaseElapsed - 21);
}

/** Player CANCEL transition-in begins at +72, after player actions install. */
export function factorySwapPlayerSwitchCancelButtonX(
  phaseElapsed: number,
): number {
  return factorySwapPlayerReturnCancelButtonX(phaseElapsed - 54);
}

export function factorySwapPlayerSwitchActionFadeY(
  phaseElapsed: number,
): number {
  return factorySwapPlayerReturnActionFadeY(phaseElapsed - 54);
}

function factorySwapMovingBallTile(age: number): 0 | 16 | 32 {
  if (age < 0) return 0;
  const commands = [
    [16, 4],
    [0, 4],
    [32, 4],
    [0, 4],
    [16, 4],
    [0, 4],
    [32, 4],
    [0, 36],
    [16, 8],
    [0, 8],
    [32, 8],
    [0, 8],
    [16, 8],
    [0, 8],
    [32, 8],
  ] as const;
  let remaining = age;
  for (const [tile, duration] of commands) {
    if (remaining < duration) return tile;
    remaining -= duration;
  }
  return 0;
}

/**
 * SpriteCB_Pokeball clocks after each gray enemy ball cycles back to the
 * selected player palette. Balls 2/1 start their moving table on their
 * staggered wrap frames; ball 0 resumes its retained 32-tick cooldown.
 */
export function factorySwapPlayerSwitchBallTiles(
  phaseElapsed: number,
): readonly [0 | 16 | 32, 0 | 16 | 32, 0 | 16 | 32] {
  return [
    factorySwapMovingBallTile(phaseElapsed - 95),
    factorySwapMovingBallTile(phaseElapsed - 58),
    factorySwapMovingBallTile(phaseElapsed - 53),
  ];
}
