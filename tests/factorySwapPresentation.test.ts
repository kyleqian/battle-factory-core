import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import {
  FACTORY_SWAP_ENTRY_READY_DELAY,
  FACTORY_SWAP_PHASE_READY_DELAYS,
  advanceFactorySwapPresentation,
  createCanonicalFactorySwapPresentation,
  factorySwapActionFadeY,
  factorySwapBallTile,
  factorySwapCancelButtonX,
  factorySwapPlayerOptionBallTile,
  handleFactorySwapPresentationInput,
  type FactorySwapPresentationState,
} from "../src/engine/factorySwapPresentation.ts";
import { INITIAL_POSTWIN_STATE } from "../src/engine/postwin.ts";

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
    state = advance(
      state,
      FACTORY_SWAP_PHASE_READY_DELAYS.playerOptions!,
    );
    state = handleFactorySwapPresentationInput(state, "DOWN");
    state = handleFactorySwapPresentationInput(state, "A");
    expect(state.controller).toMatchObject({
      phase: "enemyPicker",
      playerMonId: 0,
      inputReady: false,
    });

    state = advance(state, FACTORY_SWAP_PHASE_READY_DELAYS.enemyPicker!);
    state = handleFactorySwapPresentationInput(state, "A");
    expect(state.controller.phase).toBe("acceptPrompt");
    state = advance(state, FACTORY_SWAP_PHASE_READY_DELAYS.acceptPrompt!);
    state = handleFactorySwapPresentationInput(state, "A");
    expect(state.controller).toMatchObject({
      phase: "complete",
      result: "accepted",
    });
    expect(state.controller.playerParty.map(({ species }) => species)).toEqual([
      "GROVYLE",
      "MAGBY",
      "BAYLEEF",
    ]);
  });

  it("pins the source moving-ball table to the relative entry epoch", () => {
    expect(factorySwapBallTile(42)).toBe(0);
    expect(factorySwapBallTile(43)).toBe(16);
    expect(factorySwapBallTile(47)).toBe(0);
    expect(factorySwapBallTile(51)).toBe(32);
    expect(factorySwapBallTile(59)).toBe(16);
    expect(factorySwapBallTile(67)).toBe(32);
    expect(factorySwapBallTile(75)).toBe(0);
    expect(factorySwapPlayerOptionBallTile(0)).toBe(0);
    expect(factorySwapPlayerOptionBallTile(6)).toBe(0);
    expect(factorySwapPlayerOptionBallTile(7)).toBe(16);
    expect(factorySwapPlayerOptionBallTile(14)).toBe(16);
    expect(factorySwapPlayerOptionBallTile(15)).toBe(0);
    expect(factorySwapPlayerOptionBallTile(23)).toBe(32);
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
});
