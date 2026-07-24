import anchorState from "../data/gen/anchor-state.json" with { type: "json" };
import rentalFixture from "../data/gen/battle1-swap-rentalmons-dump.json" with { type: "json" };
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

export interface FactorySwapPresentationState {
  readonly controller: FactorySwapState;
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
}

export interface FactorySwapBallCycleVisual {
  readonly centerX: number;
  readonly cycledToEnemy: boolean;
}

const anchor = anchorState as {
  rentals: Array<{
    species: string;
    personality: number;
    abilityNum: number;
    stats: { hp: number; maxHp: number };
  }>;
};
const rentalMons = (
  rentalFixture as unknown as {
    yesBranch: { ticks: Record<string, { rentalMons: FactoryRentalRoster }> };
  }
).yesBranch.ticks["29601"]!.rentalMons;

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
  const rental = rentalMons[rentalIndex];
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
export const FACTORY_SWAP_SPECIES_FADE_ACTIVATE_ELAPSED = 59;
const INITIAL_FACTORY_SWAP_SPECIES_FADE: SpeciesNameFadeState = {
  active: false,
  tState: "run",
  coeffDelay: 0,
  coeff: 0,
  fadeOut: true,
  delay: 0,
  renderCoeff: 0,
};
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
  duplicateSpecies: 99,
};

export function createCanonicalFactorySwapPresentation(): FactorySwapPresentationState {
  return {
    controller: createFactorySwapState(
      CANONICAL_SWAP_PLAYER_PARTY,
      CANONICAL_SWAP_ENEMY_PARTY,
      rentalMons,
    ),
    elapsed: 0,
    phaseElapsed: 0,
    selectedBallClock: null,
    selectedBallIndex: null,
    speciesNameFade: INITIAL_FACTORY_SWAP_SPECIES_FADE,
    fieldHandoff: null,
  };
}

function readyDelay(state: FactorySwapPresentationState): number | null {
  if (
    state.controller.phase === "complete" ||
    state.controller.phase === "acceptExit" ||
    state.controller.phase === "acceptReturn" ||
    state.controller.phase === "quitExit" ||
    state.controller.phase === "quitReturn" ||
    state.controller.phase === "summaryFade" ||
    state.controller.phase === "playerPickerReturn" ||
    state.controller.phase === "enemySwitch" ||
    state.controller.phase === "playerSwitch"
  ) return null;
  if (state.controller.phase === "playerPicker" && state.elapsed === state.phaseElapsed) {
    return FACTORY_SWAP_ENTRY_READY_DELAY;
  }
  return FACTORY_SWAP_PHASE_READY_DELAYS[state.controller.phase] ?? 0;
}

export function advanceFactorySwapPresentation(
  state: FactorySwapPresentationState,
): FactorySwapPresentationState {
  const elapsed = state.elapsed + 1;
  const phaseElapsed = state.phaseElapsed + 1;
  const selectedBallClock =
    state.selectedBallClock === null ? null : state.selectedBallClock + 1;
  let speciesNameFade = advanceSpeciesNameFade(state.speciesNameFade);
  if (elapsed === FACTORY_SWAP_SPECIES_FADE_ACTIVATE_ELAPSED) {
    speciesNameFade = activateSpeciesNameFade(speciesNameFade);
  }
  let controller = copyFactorySwapCursor(state.controller);
  let fieldHandoff = state.fieldHandoff;
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
  if (controller.phase === "quitReturn" && phaseElapsed >= 38) {
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
  };
  const delay = readyDelay(advanced);
  if (delay !== null && phaseElapsed >= delay) {
    controller = acknowledgeFactorySwapPresentation(controller);
  }
  return { ...advanced, controller };
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
  };
}

/** sAnim_Swap_Pokeball_Moving, relative to the entry adapter's sprite epoch. */
export function factorySwapBallTile(elapsed: number): 0 | 16 | 32 {
  const local = elapsed - 43;
  if (local < 0) return 0;
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
    [0, 8],
  ] as const;
  // SpriteCB_Pokeball restarts the complete source animation after animEnded,
  // including its long still command; it does not loop only the first four
  // rocking commands.
  let age = local <= 128 ? local : local - 129;
  for (const [tile, duration] of commands) {
    if (age < duration) return tile;
    age -= duration;
  }
  return 0;
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

export function factorySwapQuitYesNoVisual(
  phaseElapsed: number,
): { textVisible: boolean; highlightVisible: boolean } {
  return {
    textVisible: phaseElapsed >= 36,
    highlightVisible: phaseElapsed >= 37,
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
