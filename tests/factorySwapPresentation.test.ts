import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import {
  FACTORY_SWAP_ENTRY_READY_DELAY,
  advanceFactorySwapPresentation,
  createCanonicalFactorySwapPresentation,
  factorySwapActionFadeY,
  factorySwapAcceptCancelButtonX,
  factorySwapAcceptExitBgFadeY,
  factorySwapAcceptExitMechanism,
  factorySwapAcceptExitMonPicVisual,
  factorySwapAcceptExitObjFadeY,
  factorySwapAcceptMonPicVisual,
  factorySwapAcceptReturnActionFadeY,
  factorySwapAcceptReturnCancelButtonX,
  factorySwapAcceptReturnMechanism,
  factorySwapAcceptReturnPkmnButtonX,
  factorySwapAcceptPkmnButtonX,
  factorySwapAcceptSpeciesRenderCoeff,
  factorySwapAcceptYesNoVisual,
  factorySwapBallTile,
  factorySwapCancelButtonX,
  factorySwapEnemyActionFadeY,
  factorySwapEnemyBallCycleVisuals,
  factorySwapEnemyCancelButtonX,
  factorySwapEnemyPkmnButtonX,
  factorySwapEnemySwitchMechanism,
  factorySwapPlayerMonPicVisual,
  factorySwapPlayerOptionBallTile,
  factorySwapPlayerReturnActionFadeY,
  factorySwapPlayerReturnCancelButtonX,
  factorySwapPlayerReturnMechanism,
  factorySwapPlayerReturnMonPicVisual,
  handleFactorySwapPresentationInput,
  type FactorySwapPresentationState,
} from "../src/engine/factorySwapPresentation.ts";
import { factorySwapRoundDecision } from "../src/engine/factorySwap.ts";
import { INITIAL_POSTWIN_STATE } from "../src/engine/postwin.ts";
import {
  activateSpeciesNameFade,
  advanceSpeciesNameFade,
} from "../src/engine/speciesNameFade.ts";

function advance(
  state: FactorySwapPresentationState,
  frames: number,
): FactorySwapPresentationState {
  let next = state;
  for (let i = 0; i < frames; i += 1) {
    next = advanceFactorySwapPresentation(next);
  }
  return next;
}

function canonicalAcceptPromptReady(): FactorySwapPresentationState {
  let state = createCanonicalFactorySwapPresentation();
  state = advance(state, FACTORY_SWAP_ENTRY_READY_DELAY);
  state = handleFactorySwapPresentationInput(state, "A");
  state = advance(state, 58);
  state = handleFactorySwapPresentationInput(state, "DOWN");
  state = handleFactorySwapPresentationInput(state, "A");
  state = advance(state, 133);
  state = handleFactorySwapPresentationInput(state, "A");
  return advance(state, 64);
}

function offerState(cursor: 0 | 1) {
  const edge = 20_000;
  return {
    ...createInitialState(),
    postwin: {
      ...INITIAL_POSTWIN_STATE,
      elapsed: edge + 70,
      healDismissElapsed: edge - 1_000,
      continuationConfirmElapsed: edge - 500,
      dialoguePage: 4 as const,
      dialoguePageEdgeElapsed: edge,
      swapCursorPos: cursor,
      swapCursorDisplayPos: cursor,
    },
  };
}

describe("live Factory swap presentation adapter", () => {
  it("routes offer YES into the controller while preserving offer NO", () => {
    const accepted = tick(offerState(0), new Set(["A"]));
    expect(accepted.factorySwap).not.toBeNull();
    expect(accepted.factorySwap!.controller).toMatchObject({
      phase: "playerPicker",
      cursor: 0,
      inputReady: false,
    });
    expect(accepted.postwin!.swapDeclineElapsed).toBeNull();

    const declined = tick(offerState(1), new Set(["A"]));
    expect(declined.factorySwap).toBeNull();
    expect(declined.postwin!.swapDeclineElapsed).toBe(
      offerState(1).postwin!.elapsed + 1,
    );
  });

  it("acknowledges every canonical input gate from its own accepted edge", () => {
    let state = createCanonicalFactorySwapPresentation();
    state = advance(state, FACTORY_SWAP_ENTRY_READY_DELAY - 1);
    expect(state.controller.inputReady).toBe(false);
    expect(handleFactorySwapPresentationInput(state, "A")).toBe(state);

    state = advance(state, 1);
    state = handleFactorySwapPresentationInput(state, "A");
    expect(state).toMatchObject({
      phaseElapsed: 0,
      controller: { phase: "playerOptions", inputReady: false },
    });
    state = advance(state, 57);
    expect(state.controller.inputReady).toBe(false);
    expect(handleFactorySwapPresentationInput(state, "B")).toBe(state);
    state = advance(state, 1);
    expect(state.controller.inputReady).toBe(true);
    expect(state.controller.playerOptionCursor).toBe(0);
    expect(handleFactorySwapPresentationInput(state, "A").controller.phase)
      .toBe("summaryFade");
    expect(handleFactorySwapPresentationInput(state, "B").controller.phase)
      .toBe("playerPickerReturn");
    state = handleFactorySwapPresentationInput(state, "DOWN");
    expect(state.controller).toMatchObject({
      playerOptionCursor: 1,
      playerOptionDisplayCursor: 0,
    });
    state = advance(state, 1);
    expect(state.controller.playerOptionDisplayCursor).toBe(0);
    state = advance(state, 1);
    expect(state.controller.playerOptionDisplayCursor).toBe(1);
    state = handleFactorySwapPresentationInput(state, "A");
    expect(state.controller).toMatchObject({
      phase: "enemySwitch",
      playerMonId: 0,
      inputReady: false,
    });
  });

  it("accepts the first sampled B at playerOptions +58 and returns through the source callbacks to an input-ready picker", () => {
    let state = createCanonicalFactorySwapPresentation();
    state = advance(state, FACTORY_SWAP_ENTRY_READY_DELAY);
    state = handleFactorySwapPresentationInput(state, "A");
    state = advance(state, 57);

    expect(state).toMatchObject({
      phaseElapsed: 57,
      controller: { phase: "playerOptions", inputReady: false },
      selectedBallClock: 57,
    });
    expect(handleFactorySwapPresentationInput(state, "B")).toBe(state);

    state = advance(state, 1);
    state = handleFactorySwapPresentationInput(state, "B");
    expect(state).toMatchObject({
      phaseElapsed: 0,
      controller: { phase: "playerPickerReturn", inputReady: false },
      selectedBallClock: 58,
    });
    expect(factorySwapPlayerReturnMechanism(state.phaseElapsed))
      .toBe("Task_CloseMonPic");

    state = advance(state, 8);
    expect(factorySwapPlayerReturnMechanism(state.phaseElapsed))
      .toBe("SpriteCB_CloseMonPic");
    state = advance(state, 11);
    expect(state.phaseElapsed).toBe(19);
    expect(factorySwapPlayerReturnMechanism(state.phaseElapsed))
      .toBe("Swap_Task_ScreenInfoTransitionIn");

    state = advance(state, 35);
    expect(state).toMatchObject({
      phaseElapsed: 54,
      controller: { phase: "playerPickerReturn", inputReady: false },
      selectedBallClock: 112,
      speciesNameFade: { active: true },
    });
    state = advance(state, 1);
    expect(state).toMatchObject({
      phaseElapsed: 0,
      controller: {
        phase: "playerPicker",
        inputReady: false,
        cursor: 0,
      },
      selectedBallClock: 113,
    });
    expect(handleFactorySwapPresentationInput(state, "RIGHT")).toBe(state);

    state = advance(state, 1);
    expect(state.controller.inputReady).toBe(true);
    state = handleFactorySwapPresentationInput(state, "RIGHT");
    expect(state.controller).toMatchObject({
      cursor: 1,
      infoCursor: 0,
      displayCursor: 0,
    });
    state = advance(state, 1);
    expect(state.controller).toMatchObject({
      cursor: 1,
      infoCursor: 1,
      displayCursor: 0,
    });
  });

  it("keeps the selected-ball and species-breathe task clocks alive across B instead of restarting either epoch", () => {
    let state = createCanonicalFactorySwapPresentation();
    state = advance(state, FACTORY_SWAP_ENTRY_READY_DELAY);
    state = handleFactorySwapPresentationInput(state, "A");
    state = advance(state, 58);
    const beforeB = state;
    state = handleFactorySwapPresentationInput(state, "B");
    expect(state.selectedBallClock).toBe(beforeB.selectedBallClock);
    expect(state.speciesNameFade).toBe(beforeB.speciesNameFade);

    let expectedBreathe = beforeB.speciesNameFade;
    for (let age = 1; age <= 55; age += 1) {
      expectedBreathe = advanceSpeciesNameFade(expectedBreathe);
      if (age === 54) expectedBreathe = activateSpeciesNameFade(expectedBreathe);
    }
    state = advance(state, 55);
    expect(state.selectedBallClock).toBe(113);
    expect(state.speciesNameFade).toEqual(expectedBreathe);
  });

  it("pins the source moving-ball table to the relative entry epoch", () => {
    expect(factorySwapBallTile(42)).toBe(0);
    expect(factorySwapBallTile(43)).toBe(16);
    expect(factorySwapBallTile(47)).toBe(0);
    expect(factorySwapBallTile(51)).toBe(32);
    expect(factorySwapBallTile(59)).toBe(16);
    expect(factorySwapBallTile(67)).toBe(32);
    expect(factorySwapBallTile(75)).toBe(0);
    expect(factorySwapBallTile(190)).toBe(16);
    expect(factorySwapBallTile(196)).toBe(32);
    expect(factorySwapBallTile(203)).toBe(0);
    // The restarted source command stream is in its long still command here;
    // this used to incorrectly repeat the first four rocking commands.
    expect(factorySwapBallTile(204)).toBe(0);
    expect(factorySwapBallTile(212)).toBe(0);
    expect(factorySwapPlayerOptionBallTile(0)).toBe(0);
    expect(factorySwapPlayerOptionBallTile(6)).toBe(0);
    expect(factorySwapPlayerOptionBallTile(7)).toBe(16);
    expect(factorySwapPlayerOptionBallTile(14)).toBe(16);
    expect(factorySwapPlayerOptionBallTile(15)).toBe(0);
    expect(factorySwapPlayerOptionBallTile(23)).toBe(32);
    expect(factorySwapPlayerOptionBallTile(72)).toBe(0);
    expect(factorySwapPlayerOptionBallTile(73)).toBe(16);
    expect(factorySwapPlayerOptionBallTile(89)).toBe(16);
    expect(factorySwapPlayerOptionBallTile(99)).toBe(32);
    expect(factorySwapPlayerOptionBallTile(105)).toBe(0);
    expect(factorySwapPlayerOptionBallTile(113)).toBe(0);
  });

  it("pins the action-palette fade and six-pixel CANCEL slide to the player-options edge", () => {
    expect(factorySwapActionFadeY(5)).toBe(0);
    expect(factorySwapActionFadeY(6)).toBe(2);
    expect(factorySwapActionFadeY(7)).toBe(2);
    expect(factorySwapActionFadeY(20)).toBe(16);
    expect(factorySwapActionFadeY(40)).toBe(16);

    expect(factorySwapCancelButtonX(26)).toBe(192);
    expect(factorySwapCancelButtonX(27)).toBe(198);
    expect(factorySwapCancelButtonX(33)).toBe(234);
    expect(factorySwapCancelButtonX(34)).toBe(240);
  });

  it("pins the shared mon-picture reveal to the transition-relative epoch", () => {
    expect(factorySwapPlayerMonPicVisual(35).flashWidth).toBe(0);
    expect(factorySwapPlayerMonPicVisual(36)).toMatchObject({
      flashWidth: 1,
      flashBlended: false,
      window: null,
    });
    expect(factorySwapPlayerMonPicVisual(47).flashWidth).toBe(64);
    expect(factorySwapPlayerMonPicVisual(48).window).toEqual({ top: 64, bottom: 65 });
    expect(factorySwapPlayerMonPicVisual(49).window).toEqual({ top: 60, bottom: 69 });
    expect(factorySwapPlayerMonPicVisual(57).window).toEqual({ top: 32, bottom: 96 });
    expect(factorySwapPlayerMonPicVisual(57).spriteVisible).toBe(false);
    expect(factorySwapPlayerMonPicVisual(57).menuTextVisible).toBe(false);
    expect(factorySwapPlayerMonPicVisual(58)).toMatchObject({
      spriteVisible: true,
      menuTextVisible: true,
      menuHighlightVisible: false,
    });
    expect(factorySwapPlayerMonPicVisual(59)).toMatchObject({
      spriteVisible: true,
      menuTextVisible: true,
      menuHighlightVisible: true,
    });
  });

  it("pins the CloseMonPic contraction, background handoff, CANCEL slide, and reverse text fade phase-relatively", () => {
    expect(factorySwapPlayerReturnMonPicVisual(0)).toMatchObject({
      window: { top: 32, bottom: 96 },
      spriteVisible: true,
      menuTextVisible: true,
      menuHighlightVisible: false,
    });
    expect(factorySwapPlayerReturnMonPicVisual(1)).toMatchObject({
      window: { top: 36, bottom: 92 },
      spriteVisible: true,
      menuTextVisible: false,
      menuHighlightVisible: true,
    });
    expect(factorySwapPlayerReturnMonPicVisual(2)).toMatchObject({
      window: { top: 40, bottom: 88 },
      spriteVisible: false,
      menuHighlightVisible: false,
    });
    expect(factorySwapPlayerReturnMonPicVisual(7).window)
      .toEqual({ top: 60, bottom: 68 });
    expect(factorySwapPlayerReturnMonPicVisual(8).window)
      .toEqual({ top: 64, bottom: 65 });
    expect(factorySwapPlayerReturnMonPicVisual(9).window).toBeNull();
    expect(factorySwapPlayerReturnMonPicVisual(19).flashWidth).toBe(1);
    expect(factorySwapPlayerReturnMonPicVisual(20).flashWidth).toBe(0);

    expect(factorySwapPlayerReturnCancelButtonX(19)).toBe(240);
    expect(factorySwapPlayerReturnCancelButtonX(20)).toBe(240);
    expect(factorySwapPlayerReturnCancelButtonX(21)).toBe(234);
    expect(factorySwapPlayerReturnCancelButtonX(27)).toBe(198);
    expect(factorySwapPlayerReturnCancelButtonX(28)).toBe(192);

    expect(factorySwapPlayerReturnActionFadeY(30)).toBe(16);
    expect(factorySwapPlayerReturnActionFadeY(31)).toBe(14);
    expect(factorySwapPlayerReturnActionFadeY(32)).toBe(14);
    expect(factorySwapPlayerReturnActionFadeY(45)).toBe(0);
  });

  it("runs Swap_Task_SwitchPartyScreen into the five-action enemy HandleChooseMons boundary", () => {
    let state = createCanonicalFactorySwapPresentation();
    state = advance(state, FACTORY_SWAP_ENTRY_READY_DELAY);
    state = handleFactorySwapPresentationInput(state, "A");
    state = advance(state, 58);
    state = handleFactorySwapPresentationInput(state, "DOWN");
    state = advance(state, 2);
    state = handleFactorySwapPresentationInput(state, "A");
    expect(state).toMatchObject({
      phaseElapsed: 0,
      controller: {
        phase: "enemySwitch",
        actionsCount: 3,
        playerMonId: 0,
        inputReady: false,
      },
    });
    expect(state.controller.enemyParty.map(({ species }) => species)).toEqual([
      "GROVYLE",
      "MURKROW",
      "PIDGEOTTO",
    ]);
    const selectedBallClock = state.selectedBallClock;

    state = advance(state, 83);
    expect(state.controller.actionsCount).toBe(3);
    state = advance(state, 1);
    expect(state.controller).toMatchObject({
      phase: "enemySwitch",
      actionsCount: 5,
      cursor: 0,
      inputReady: false,
    });

    state = advance(state, 48);
    expect(state.phaseElapsed).toBe(132);
    expect(handleFactorySwapPresentationInput(state, "RIGHT")).toBe(state);
    state = advance(state, 1);
    expect(state).toMatchObject({
      phaseElapsed: 0,
      controller: {
        phase: "enemyPicker",
        actionsCount: 5,
        inputReady: true,
      },
    });
    state = handleFactorySwapPresentationInput(state, "RIGHT");
    expect(state.controller).toMatchObject({
      cursor: 1,
      infoCursor: 0,
      displayCursor: 0,
    });
    state = advance(state, 1);
    expect(state.controller).toMatchObject({
      cursor: 1,
      infoCursor: 1,
      displayCursor: 0,
    });
    state = advance(state, 1);
    expect(state.controller.displayCursor).toBe(1);
    expect(state.selectedBallClock).toBe((selectedBallClock ?? 0) + 135);
  });

  it("rejects the adjacent early enemy A, accepts the first picker A, and gates the GROVYLE prompt through HandleYesNo", () => {
    let state = createCanonicalFactorySwapPresentation();
    state = advance(state, FACTORY_SWAP_ENTRY_READY_DELAY);
    state = handleFactorySwapPresentationInput(state, "A");
    state = advance(state, 58);
    state = handleFactorySwapPresentationInput(state, "DOWN");
    state = advance(state, 2);
    state = handleFactorySwapPresentationInput(state, "A");

    state = advance(state, 132);
    expect(state).toMatchObject({
      phaseElapsed: 132,
      controller: { phase: "enemySwitch", inputReady: false },
    });
    expect(handleFactorySwapPresentationInput(state, "A")).toBe(state);

    state = advance(state, 1);
    expect(state.controller).toMatchObject({
      phase: "enemyPicker",
      inputReady: true,
      cursor: 0,
    });
    state = handleFactorySwapPresentationInput(state, "A");
    expect(state).toMatchObject({
      phaseElapsed: 0,
      controller: {
        phase: "acceptPrompt",
        enemyMonId: 0,
        yesNoCursor: 0,
        inputReady: false,
      },
      speciesNameFade: { active: false },
    });
    expect(state.controller.enemyParty[0].species).toBe("GROVYLE");

    state = advance(state, 63);
    expect(state.controller.inputReady).toBe(false);
    expect(handleFactorySwapPresentationInput(state, "A")).toBe(state);
    state = advance(state, 1);
    expect(state).toMatchObject({
      phaseElapsed: 64,
      controller: { phase: "acceptPrompt", inputReady: true },
    });
  });

  it("pins the source transition-out slides and GROVYLE OpenMonPic boundary phase-relatively", () => {
    expect(factorySwapAcceptPkmnButtonX(26)).toBe(160);
    expect(factorySwapAcceptPkmnButtonX(27)).toBe(166);
    expect(factorySwapAcceptPkmnButtonX(40)).toBe(240);
    expect(factorySwapAcceptCancelButtonX(32)).toBe(192);
    expect(factorySwapAcceptCancelButtonX(33)).toBe(198);
    expect(factorySwapAcceptCancelButtonX(40)).toBe(240);
    expect(factorySwapAcceptMonPicVisual(41).flashWidth).toBe(0);
    expect(factorySwapAcceptMonPicVisual(42)).toMatchObject({
      flashWidth: 1,
      flashBlended: true,
    });
    expect(factorySwapAcceptMonPicVisual(44).flashWidth).toBe(4);
    expect(factorySwapAcceptMonPicVisual(55).window).toEqual({
      top: 60,
      bottom: 69,
    });
    expect(factorySwapAcceptMonPicVisual(64)).toMatchObject({
      window: { top: 32, bottom: 96 },
      spriteVisible: true,
    });
    expect(factorySwapAcceptSpeciesRenderCoeff(0, 6)).toBe(15);
    expect(factorySwapAcceptSpeciesRenderCoeff(1, 6)).toBe(6);
    expect(factorySwapAcceptYesNoVisual(63)).toEqual({
      textVisible: false,
      highlightVisible: false,
    });
    expect(factorySwapAcceptYesNoVisual(64)).toEqual({
      textVisible: true,
      highlightVisible: false,
    });
    expect(factorySwapAcceptYesNoVisual(65)).toEqual({
      textVisible: true,
      highlightVisible: true,
    });
  });

  it("runs default YES through the source-owned accept/exit boundaries without early mutation", () => {
    let state = createCanonicalFactorySwapPresentation();
    state = advance(state, FACTORY_SWAP_ENTRY_READY_DELAY);
    state = handleFactorySwapPresentationInput(state, "A");
    state = advance(state, 58);
    state = handleFactorySwapPresentationInput(state, "DOWN");
    state = advance(state, 2);
    state = handleFactorySwapPresentationInput(state, "A");
    state = advance(state, 133);
    state = handleFactorySwapPresentationInput(state, "A");
    state = advance(state, 63);

    const early = handleFactorySwapPresentationInput(state, "A");
    expect(early).toBe(state);
    expect(state.controller.playerParty[0].species).toBe("ONIX");

    state = advance(state, 1);
    state = handleFactorySwapPresentationInput(state, "A");
    expect(state).toMatchObject({
      phaseElapsed: 0,
      controller: {
        phase: "acceptExit",
        playerMonId: 0,
        enemyMonId: 0,
        scriptResult: null,
        mutationCommitted: false,
        result: null,
      },
      fieldHandoff: null,
    });
    expect(factorySwapAcceptExitMechanism(0))
      .toBe("Swap_HandleAcceptMonResponse");
    expect(state.controller.playerParty[0].species).toBe("ONIX");
    expect(factorySwapRoundDecision(state.controller)).toBeNull();

    state = advance(state, 19);
    expect(state.controller).toMatchObject({
      scriptResult: null,
      mutationCommitted: false,
      result: null,
    });
    expect(state.controller.playerParty[0].species).toBe("ONIX");

    state = advance(state, 1);
    expect(state.phaseElapsed).toBe(20);
    expect(state.controller).toMatchObject({
      scriptResult: false,
      mutationCommitted: false,
      result: null,
    });
    expect(state.controller.playerParty[0].species).toBe("ONIX");

    state = advance(state, 1);
    expect(state.phaseElapsed).toBe(21);
    expect(state.controller).toMatchObject({
      phase: "acceptExit",
      scriptResult: false,
      mutationCommitted: true,
      result: "accepted",
    });
    expect(state.controller.playerParty[0]).toMatchObject({
      id: "grovyle",
      species: "GROVYLE",
      personality: 1094072807,
      friendship: 0,
    });
    expect(state.controller.rentalMons[0]).toMatchObject({
      monId: 188,
      personality: 1094072807,
      ivs: 3,
      abilityNum: 0,
    });
    expect(factorySwapRoundDecision(state.controller)).toEqual({
      type: "accept",
      playerPartyIndex: 0,
      opponentPartyIndex: 0,
    });

    state = advance(state, 19);
    expect(state).toMatchObject({
      phaseElapsed: 40,
      controller: { phase: "acceptExit" },
      fieldHandoff: null,
    });
    state = advance(state, 1);
    expect(state).toMatchObject({
      phaseElapsed: 41,
      controller: { phase: "complete", result: "accepted" },
      fieldHandoff: "CB2_ReturnToFieldContinueScript",
    });
    expect(factorySwapAcceptExitMechanism(41))
      .toBe("CB2_ReturnToFieldContinueScript");
  });

  it.each([
    ["A on NO", "NO"],
    ["B", "B"],
  ] as const)(
    "%s returns at response +67 with identity preserved and a fresh input gate",
    (_label, branch) => {
      let state = canonicalAcceptPromptReady();
      const playerBefore = structuredClone(state.controller.playerParty);
      const rentalsBefore = structuredClone(state.controller.rentalMons);
      if (branch === "NO") {
        state = handleFactorySwapPresentationInput(state, "DOWN");
        state = advance(state, 19);
        state = handleFactorySwapPresentationInput(state, "A");
      } else {
        state = advance(state, 20);
        state = handleFactorySwapPresentationInput(state, "B");
      }
      expect(state).toMatchObject({
        phaseElapsed: 0,
        controller: {
          phase: "acceptReturn",
          inputReady: false,
          playerMonId: 0,
          enemyMonId: 0,
          mutationCommitted: false,
          result: null,
        },
        fieldHandoff: null,
      });
      expect(state.controller.playerParty).toEqual(playerBefore);
      expect(state.controller.rentalMons).toEqual(rentalsBefore);
      expect(factorySwapRoundDecision(state.controller)).toBeNull();

      state = advance(state, 66);
      expect(state.controller.phase).toBe("acceptReturn");
      expect(state.controller.inputReady).toBe(false);
      expect(handleFactorySwapPresentationInput(state, "RIGHT")).toBe(state);
      expect(factorySwapAcceptReturnMechanism(66))
        .toBe("Swap_Task_ScreenInfoTransitionIn");

      state = advance(state, 1);
      expect(state).toMatchObject({
        controller: {
          phase: "enemyPicker",
          inputReady: true,
          cursor: 0,
          playerMonId: 0,
          enemyMonId: 0,
          mutationCommitted: false,
          result: null,
        },
        fieldHandoff: null,
      });
      expect(state.controller.playerParty).toEqual(playerBefore);
      expect(state.controller.rentalMons).toEqual(rentalsBefore);
      expect(factorySwapRoundDecision(state.controller)).toBeNull();
      const moved = handleFactorySwapPresentationInput(state, "RIGHT");
      expect(moved.controller.cursor).toBe(1);
    },
  );

  it("pins the NO/B close and two-button transition clocks to the response edge", () => {
    expect(factorySwapAcceptReturnMechanism(0))
      .toBe("Swap_HandleAcceptMonResponse");
    expect(factorySwapAcceptReturnMechanism(1)).toBe("Task_CloseMonPic");
    expect(factorySwapAcceptReturnMechanism(20)).toBe("SpriteCB_CloseMonPic");
    expect(factorySwapAcceptReturnMechanism(21))
      .toBe("Swap_Task_ScreenInfoTransitionIn");
    expect(factorySwapAcceptReturnMechanism(67))
      .toBe("Swap_Task_HandleChooseMons");
    expect(factorySwapAcceptReturnPkmnButtonX(21)).toBe(240);
    expect(factorySwapAcceptReturnPkmnButtonX(22)).toBe(234);
    expect(factorySwapAcceptReturnCancelButtonX(32)).toBe(240);
    expect(factorySwapAcceptReturnCancelButtonX(33)).toBe(234);
    expect(factorySwapAcceptReturnActionFadeY(42)).toBe(16);
    expect(factorySwapAcceptReturnActionFadeY(43)).toBe(14);
  });

  it("pins the accepted mon-picture close and exit fade to the response edge", () => {
    expect(factorySwapAcceptExitMonPicVisual(0)).toMatchObject({
      window: { top: 32, bottom: 96 },
      spriteVisible: true,
    });
    expect(factorySwapAcceptExitMonPicVisual(1)).toMatchObject({
      window: { top: 32, bottom: 96 },
      spriteVisible: true,
    });
    expect(factorySwapAcceptExitMonPicVisual(2).window)
      .toEqual({ top: 36, bottom: 92 });
    expect(factorySwapAcceptExitMonPicVisual(20).flashWidth).toBe(1);
    expect(factorySwapAcceptExitMonPicVisual(21).flashWidth).toBe(0);
    expect(factorySwapAcceptExitMechanism(1)).toBe("Swap_Task_Exit");
    expect(factorySwapAcceptExitMechanism(40)).toBe("Swap_Task_Exit");
    expect(factorySwapAcceptExitBgFadeY(24)).toBe(0);
    expect(factorySwapAcceptExitObjFadeY(25)).toBe(0);
    expect(factorySwapAcceptExitBgFadeY(25)).toBe(2);
    expect(factorySwapAcceptExitBgFadeY(39)).toBe(16);
    expect(factorySwapAcceptExitObjFadeY(40)).toBe(16);
  });

  it("pins the source-named enemy switch callbacks, independent ball cycles, and two-button transition", () => {
    expect(factorySwapEnemySwitchMechanism(0)).toBe("Task_CloseMonPic");
    expect(factorySwapEnemySwitchMechanism(8)).toBe("SpriteCB_CloseMonPic");
    expect(factorySwapEnemySwitchMechanism(19))
      .toBe("Swap_Task_SwitchPartyScreen");
    expect(factorySwapEnemySwitchMechanism(85))
      .toBe("Swap_Task_ScreenInfoTransitionIn");
    expect(factorySwapEnemySwitchMechanism(133))
      .toBe("Swap_Task_HandleChooseMons");

    expect(factorySwapEnemyBallCycleVisuals(23)).toEqual([
      { centerX: 72, cycledToEnemy: false },
      { centerX: 120, cycledToEnemy: false },
      { centerX: 168, cycledToEnemy: false },
    ]);
    expect(factorySwapEnemyBallCycleVisuals(32)).toEqual([
      { centerX: 162, cycledToEnemy: false },
      { centerX: 210, cycledToEnemy: false },
      { centerX: -16, cycledToEnemy: true },
    ]);
    expect(factorySwapEnemyBallCycleVisuals(37).map((ball) => ball.cycledToEnemy))
      .toEqual([false, true, true]);
    expect(factorySwapEnemyBallCycleVisuals(42).map((ball) => ball.cycledToEnemy))
      .toEqual([true, true, true]);
    expect(factorySwapEnemyBallCycleVisuals(51).map((ball) => ball.centerX))
      .toEqual([72, 120, 168]);

    expect(factorySwapEnemyPkmnButtonX(87)).toBe(240);
    expect(factorySwapEnemyPkmnButtonX(88)).toBe(234);
    expect(factorySwapEnemyPkmnButtonX(101)).toBe(160);
    expect(factorySwapEnemyCancelButtonX(98)).toBe(240);
    expect(factorySwapEnemyCancelButtonX(99)).toBe(234);
    expect(factorySwapEnemyCancelButtonX(106)).toBe(192);
    expect(factorySwapEnemyActionFadeY(108)).toBe(16);
    expect(factorySwapEnemyActionFadeY(109)).toBe(14);
    expect(factorySwapEnemyActionFadeY(123)).toBe(0);
  });
});
