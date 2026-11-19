// Walk-up build step B1: Tier-1 tests for the Frontier-Brain BattleRoom
// entrance branch (src/engine/battleRoom.ts's brain* phases) - Noland
// visible from warp-in at (7,9), the "Get a move on!" box, the simultaneous
// Noland/player/decoy walk-in, and the six scientists turning. Pinned
// against src/data/gen/factory-brain-walkup-script.json (source truth) and
// battle-room-layout.json (the scientist positions the ordinary path's own
// renderer already ground-truths - reused verbatim by this branch, see
// scripts.inc: `ScientistsFaceBattle` is the SAME call for both paths).
// Silver/gold speech itself is pinned separately in
// tests/battleRoomBrainSpeech.test.ts (walk-up build step B2) - this file's
// own "settles into 'brainSettled'" test now also confirms the seam hands
// off into that step's speech machine, since B2 built on top of it.
import { describe, expect, it } from "vitest";
import walkup from "../src/data/gen/factory-brain-walkup-script.json" with { type: "json" };
import layout from "../src/data/gen/battle-room-layout.json" with { type: "json" };
import {
  advanceBattleRoom,
  battleRoomQuote,
  battleRoomQuoteInputReady,
  battleRoomStateForOpponent,
  battleRoomAcceptedState,
  battleRoomMsgboxClosingPhase,
  BRAIN_MSGBOX_ACCEPT_ELAPSED,
  BRAIN_MOVEMENT_CLOCK_OFFSET,
  BRAIN_MOVEMENT_SETTLE_ELAPSED,
  BRAIN_MSGBOX_APPEAR_ELAPSED,
  BRAIN_MSGBOX_CLOSE_WIPE_MOVING_HOLD_TICKS,
  BRAIN_MSGBOX_LINE1,
  BRAIN_MSGBOX_LINE2,
  BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED,
  BRAIN_MSGBOX_PRINT_TICKS,
  createBrainWalkupBattleRoomState,
  entryStep,
  ENTRY_SETTLE_ELAPSED,
  INITIAL_BATTLE_2_ROOM_STATE,
  MSGBOX_CLOSE_TICKS,
  msgboxVisual,
  NOLAND_IDLE_FRAME,
  NOLAND_INITIAL_SCREEN_Y,
  NOLAND_WALK_PX,
  nolandStep,
  OPPONENT_SETTLED_SCREEN_Y,
  scientistTurnFrame,
  SPEECH_APPEAR_ELAPSED,
  type BattleRoomState,
} from "../src/engine/battleRoom.ts";
import { renderBattleRoomBrainEntranceScene } from "../src/engine/battleRoomRender.ts";
import type { BattleOpponent } from "../src/engine/battleScenario.ts";
import { frontierTransitionPresentationForTableIndex } from "../src/engine/battleTransition.ts";

const entranceScene = walkup.scenes.battleRoomEntrance;

function brainOpponent(
  status: Exclude<BattleOpponent["frontierBrain"], undefined>["status"] = "silver",
  transitionPresentation?: Exclude<BattleOpponent["frontierBrain"], undefined>["transitionPresentation"],
): BattleOpponent {
  return {
    id: "noland",
    trainerName: "NOLAND",
    party: [] as unknown as BattleOpponent["party"],
    frontierBrain: { status, transitionPresentation },
  };
}

function ordinaryOpponent(): BattleOpponent {
  return {
    id: "ordinary",
    trainerName: "DESTIN",
    party: [] as unknown as BattleOpponent["party"],
  };
}

describe("Frontier-Brain BattleRoom entrance (walk-up build step B1)", () => {
  it("pins the box text verbatim against the JSON's Text_GetAMoveOn page", () => {
    const event = entranceScene.events[0] as { pages: readonly string[] };
    expect(event.pages).toEqual(["Hey, hey!\\nGet a move on!"]);
    expect(`${BRAIN_MSGBOX_LINE1}\\n${BRAIN_MSGBOX_LINE2}`).toBe(event.pages[0]);
    expect(BRAIN_MSGBOX_LINE1).toBe("Hey, hey!");
    expect(BRAIN_MSGBOX_LINE2).toBe("Get a move on!");
    const state = createBrainWalkupBattleRoomState();
    expect(battleRoomQuote(state)).toEqual([BRAIN_MSGBOX_LINE1, BRAIN_MSGBOX_LINE2]);
  });

  it("pins Noland's placement at (7,9), visible from start, distinct from the ordinary opponent's hidden (7,1)", () => {
    const placement = entranceScene.placement;
    expect(placement.position).toEqual({ x: 7, y: 9 });
    expect(placement.visibleFromStart).toBe(true);
    expect(placement.brainGfx).toMatchObject({ gfx: "OBJ_EVENT_GFX_NOLAND", female: false });
    expect(placement.ordinaryOpponentContrast.hiddenStartPosition).toEqual({ x: 7, y: 1 });
  });

  it("pins Noland's own walk (walk_up x3, face_left) against the JSON's movement step list", () => {
    const noland = entranceScene.events.find(
      (e) => e.kind === "movement" && (e as { subject?: string }).subject === "noland",
    ) as { steps: readonly string[] };
    expect(noland.steps).toEqual(["walk_up", "walk_up", "walk_up", "face_left"]);
    const walkUpCount = noland.steps.filter((s) => s === "walk_up").length;
    expect(NOLAND_WALK_PX).toBe(walkUpCount * 16);
  });

  it("pins the decoy/player walk-in (walk_up x5, face_right) - the SAME movement label/step count the ordinary path's own entryStep already ground-truths", () => {
    const player = entranceScene.events.find(
      (e) => e.kind === "movement" && (e as { subject?: string }).subject === "player",
    ) as { steps: readonly string[]; label: string };
    const decoy = entranceScene.events.find(
      (e) => e.kind === "movement" && (e as { subject?: string }).subject === "playerDecoy",
    ) as { steps: readonly string[]; label: string };
    expect(player.steps).toEqual(["walk_up", "walk_up", "walk_up", "walk_up", "walk_up", "face_right"]);
    expect(decoy.steps).toEqual(player.steps);
    expect(decoy.label).toBe(player.label);
  });

  it("pins all 6 scientist positions/turn directions - the SAME call the ordinary path's own renderer already ground-truths via battle-room-layout.json", () => {
    const call = entranceScene.events.find((e) => e.kind === "call") as { scientists: readonly { localId: string; position: { x: number; y: number }; facingTurn: string }[] };
    expect(call.scientists).toHaveLength(6);
    const layoutById = new Map(layout.objects.scientists.map((s) => [s.localId, s]));
    const idOf = (localId: string) => Number(localId.replace("LOCALID_FACTORY_BATTLE_SCIENTIST_", ""));
    for (const scientist of call.scientists) {
      const layoutRow = layoutById.get(idOf(scientist.localId));
      expect(layoutRow, `no battle-room-layout.json row for ${scientist.localId}`).toBeDefined();
      expect(layoutRow!.tile).toEqual(scientist.position);
      expect(layoutRow!.turn).toBe(scientist.facingTurn === "right" ? "east" : "west");
    }
  });

  it("branch selection: brain opponents take the brain entrance, ordinary opponents take the existing ordinary shape unchanged", () => {
    const brainState = battleRoomStateForOpponent(brainOpponent());
    expect(brainState.frontierBrainWalkup).toBe(true);
    expect(brainState.phase).toBe("brainEntering");

    const ordinaryState = battleRoomStateForOpponent(ordinaryOpponent());
    expect(ordinaryState.frontierBrainWalkup).toBeUndefined();
    expect(ordinaryState).toEqual({ ...INITIAL_BATTLE_2_ROOM_STATE, trainerPresentation: undefined });

    // No opponent at all (undefined) also takes the ordinary shape - never a
    // battle-number/trace-name branch, only the field's presence matters.
    expect(battleRoomStateForOpponent(undefined).frontierBrainWalkup).toBeUndefined();
  });

  it("brainSpeechTier follows BattleNoland's switch (scripts.inc:113-117): silver and streak take the silver lines, gold and streak-long the gold lines (fix 48)", () => {
    expect(battleRoomStateForOpponent(brainOpponent("silver")).brainSpeechTier).toBe("silver");
    expect(battleRoomStateForOpponent(brainOpponent("gold")).brainSpeechTier).toBe("gold");
    expect(battleRoomStateForOpponent(brainOpponent("streak")).brainSpeechTier).toBe("silver");
    expect(battleRoomStateForOpponent(brainOpponent("streak-long")).brainSpeechTier).toBe("gold");
  });

  it("the return battles (streak, streak-long) never show the first speech, heard or not; silver and gold show it until heard (fix 48)", () => {
    for (const status of ["streak", "streak-long"] as const) {
      expect(battleRoomStateForOpponent(brainOpponent(status), undefined, false).brainSpeechFirstEncounter).toBe(false);
    }
    for (const status of ["silver", "gold"] as const) {
      expect(battleRoomStateForOpponent(brainOpponent(status), undefined, false).brainSpeechFirstEncounter).toBe(true);
      expect(battleRoomStateForOpponent(brainOpponent(status), undefined, true).brainSpeechFirstEncounter).toBe(false);
    }
  });

  it("S3 (docs/brain-transition-wiring-design.md): transitionPresentation is carried directly from opponent.frontierBrain.transitionPresentation onto the constructed room at construction time - never drawn here, and undefined (not defaulted to a fallback family) when the opponent never precomputed one", () => {
    const presentation = frontierTransitionPresentationForTableIndex(5);
    expect(
      battleRoomStateForOpponent(brainOpponent("silver", presentation)).transitionPresentation,
    ).toBe(presentation);
    expect(
      createBrainWalkupBattleRoomState(undefined, false, "silver", presentation).transitionPresentation,
    ).toBe(presentation);

    // No precomputed presentation (e.g. a fixture-only BattleOpponent that
    // never ran generateOpponentFor) - stays undefined, not a fallback
    // family, so core.ts's own `frontierTransitionRenderKind(undefined,
    // "circlesMeet")` fallback is what applies downstream, unperturbed.
    expect(battleRoomStateForOpponent(brainOpponent("silver")).transitionPresentation).toBeUndefined();
  });

  it("box stays hidden through the room fade-in, appears at BRAIN_MSGBOX_APPEAR_ELAPSED, prints, then holds idle until the player's A press - no movement happens yet", () => {
    let state: BattleRoomState = createBrainWalkupBattleRoomState();
    expect(msgboxVisual(state)).toEqual({ visible: false, chars: 0 });
    expect(entryStep(0).camPanY).toBe(0);

    for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED; i += 1) {
      state = advanceBattleRoom(state);
    }
    expect(state.phase).toBe("brainMsgboxIdle");
    expect(msgboxVisual(state)).toEqual({ visible: true, chars: BRAIN_MSGBOX_PRINT_TICKS });
    // MSGBOX_DEFAULT's end: a press is taken from three frames after the last character (ROM: last character 346, first press 349;
    // docs/parity-mac/noland-room-scenes.md). Idling never moves on by itself; the picture holds.
    expect(battleRoomQuoteInputReady(state)).toBe(false);
    for (let i = 0; i < BRAIN_MSGBOX_ACCEPT_ELAPSED; i += 1) state = advanceBattleRoom(state);
    expect(battleRoomQuoteInputReady(state)).toBe(true);
    const held = advanceBattleRoom(state);
    expect(held.phase).toBe("brainMsgboxIdle");
    expect(msgboxVisual(held)).toEqual(msgboxVisual(state));
  });

  it("A press on the idle box starts the close, then the shared movement phase, settling into the named 'brainSettled' seam for B2", () => {
    let state: BattleRoomState = createBrainWalkupBattleRoomState();
    for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED + BRAIN_MSGBOX_ACCEPT_ELAPSED; i += 1) state = advanceBattleRoom(state);
    expect(battleRoomQuoteInputReady(state)).toBe(true);

    // The press goes straight into the movement (closemessage, then applymovement: ROM press 349, box on 349-350, the walk from 351).
    expect(battleRoomMsgboxClosingPhase(state)).toBe("brainMoving");
    state = battleRoomAcceptedState(state);
    expect(state.phase).toBe("brainMoving");
    // CLOSE WIPE (battleRoom.ts's BRAIN_MSGBOX_CLOSE_WIPE_MOVING_HOLD_TICKS
    // doc, oracle-probed against factory-brain-silver-walkup-entrance-03-off
    // .json): the box's own on-screen clear lags this phase's own state
    // transition by two elapsed ticks - it lingers through brainMoving's own
    // still-RAM-flat elapsed 0-1, only clearing once the room visibly starts
    // moving at elapsed 2.
    expect(state.elapsed).toBe(0);
    expect(msgboxVisual(state)).toEqual({ visible: true, chars: BRAIN_MSGBOX_PRINT_TICKS });
    state = advanceBattleRoom(state);
    expect(state.elapsed).toBe(1);
    expect(msgboxVisual(state)).toEqual({ visible: true, chars: BRAIN_MSGBOX_PRINT_TICKS });
    state = advanceBattleRoom(state);
    expect(state.elapsed).toBe(BRAIN_MSGBOX_CLOSE_WIPE_MOVING_HOLD_TICKS);
    expect(msgboxVisual(state)).toEqual({ visible: false, chars: 0 });

    for (let i = state.elapsed; i < BRAIN_MOVEMENT_SETTLE_ELAPSED; i += 1) state = advanceBattleRoom(state);
    expect(state.phase).toBe("brainSettled");
    expect(state.elapsed).toBe(0);
    // Walk-up build step B2 hooked this seam: ticking SPEECH_APPEAR_ELAPSED+1
    // further now hands off into the speech machine
    // (tests/battleRoomBrainSpeech.test.ts owns its own pin) instead of aging
    // "brainSettled" forever.
    let aged = state;
    for (let i = 0; i <= SPEECH_APPEAR_ELAPSED; i += 1) aged = advanceBattleRoom(aged);
    expect(aged.phase).toBe("brainSpeech");
  });

  it("Noland faces the player (frame 0), not the decoy's own north-facing idle frame, before his own walk begins (dense-compare-measured)", () => {
    expect(NOLAND_IDLE_FRAME).toBe(0);
  });

  it("Noland's own walk stays in lockstep with the decoy's camera-pan clock, then settles at the ordinary opponent's own settle Y (both park at tile (7,6))", () => {
    expect(nolandStep(0)).toEqual({ frame: entryStep(0).decoyFrame, hFlip: false, screenY: NOLAND_INITIAL_SCREEN_Y });
    // While Noland's own 3-tile walk is still in progress, he mirrors the
    // decoy's own walk frame (same sAnimTable_Standard GoNorth column) and
    // does not yet drift on screen (camPanY < NOLAND_WALK_PX).
    const midWalk = nolandStep(20);
    expect(entryStep(20).camPanY).toBeLessThan(NOLAND_WALK_PX);
    expect(midWalk).toEqual({ frame: entryStep(20).decoyFrame, hFlip: false, screenY: NOLAND_INITIAL_SCREEN_Y });
    // Once the camera pan outruns Noland's own (now-finished) walk, he holds
    // his face_left settle pose and drifts by the remaining pan. Renderer
    // callers feed `entryStep`/`nolandStep`/`scientistTurnFrame` the SHIFTED
    // clock (`elapsed + BRAIN_MOVEMENT_CLOCK_OFFSET`, see that constant's own
    // doc) - the settle boundary only lines up past `ENTRY_SETTLE_ELAPSED`
    // once shifted the same way.
    expect(BRAIN_MOVEMENT_SETTLE_ELAPSED + BRAIN_MOVEMENT_CLOCK_OFFSET).toBeGreaterThan(ENTRY_SETTLE_ELAPSED);
    const settled = nolandStep(BRAIN_MOVEMENT_SETTLE_ELAPSED + BRAIN_MOVEMENT_CLOCK_OFFSET);
    expect(settled.frame).toBe(2);
    expect(settled.hFlip).toBe(false);
    expect(settled.screenY).toBe(OPPONENT_SETTLED_SCREEN_Y);
  });

  it("scientists turn during brainMoving via the exact same scientistTurnFrame the ordinary path already ground-truths (fed the shifted clock, same as the settle check above)", () => {
    expect(scientistTurnFrame(0)).toEqual({ frame: 0, turned: false });
    expect(scientistTurnFrame(BRAIN_MOVEMENT_SETTLE_ELAPSED + BRAIN_MOVEMENT_CLOCK_OFFSET)).toEqual({ frame: 2, turned: true });
  });

  it("BRAIN_MOVEMENT_CLOCK_OFFSET re-bases this window's own elapsed=0 (closemessage dismiss) onto entryStep's RAM-tick clock - RAM-measured (tools/probe/probe-factory-brain-silver-entrance-movement-ram.py): pan is flat through the tick before movement starts, then a clean 1px/tick ramp identical to the ordinary path's own ENTRY_STEPS shape, just starting BRAIN_MOVEMENT_CLOCK_OFFSET ticks later in that shared table", () => {
    expect(BRAIN_MOVEMENT_CLOCK_OFFSET).toBe(22);
    // elapsed=0 (this window) and elapsed=1 both land on the still-flat lead-in.
    expect(entryStep(0 + BRAIN_MOVEMENT_CLOCK_OFFSET).camPanY).toBe(0);
    expect(entryStep(1 + BRAIN_MOVEMENT_CLOCK_OFFSET).camPanY).toBe(1);
    // RAM-sampled mid-ramp point (frame 1030 of the dense fixture): pan 71.
    expect(entryStep(71 + BRAIN_MOVEMENT_CLOCK_OFFSET).camPanY).toBe(71);
    // Pan caps at 80 (NOLAND_WALK_PX * 5/3) once the decoy/player's own
    // 5-tile walk finishes, one tick before ENTRY_STEPS' own settle row.
    expect(entryStep(80 + BRAIN_MOVEMENT_CLOCK_OFFSET).camPanY).toBe(80);
  });

  it("walk-up build step B1c mid-ramp fix: the render's own movementElapsed clock is one tick AHEAD of state.elapsed while brainMoving is in progress - RAM-measured (tools/probe/probe-factory-brain-silver-entrance-movement-ram.py's extended OAM/coordOffset fields): the walk/pan stays flat for the FIRST TWO brainMoving ticks (state.elapsed 0 and 1 both RAM-measure camPanY=0), so those two ticks render byte-identical, still-flat frames; the ramp's first real +1px tick is state.elapsed 2, not 1", () => {
    let state: BattleRoomState = createBrainWalkupBattleRoomState();
    for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED + BRAIN_MSGBOX_ACCEPT_ELAPSED; i += 1) state = advanceBattleRoom(state);
    state = battleRoomAcceptedState(state);
    expect(state.phase).toBe("brainMoving");
    expect(state.elapsed).toBe(0);

    const tick0 = { ...state, elapsed: 0 };
    const tick1 = { ...state, elapsed: 1 };
    const tick2 = { ...state, elapsed: 2 };
    const fb0 = new Uint8Array(240 * 160 * 4);
    const fb1 = new Uint8Array(240 * 160 * 4);
    const fb2 = new Uint8Array(240 * 160 * 4);
    renderBattleRoomBrainEntranceScene(fb0, tick0);
    renderBattleRoomBrainEntranceScene(fb1, tick1);
    renderBattleRoomBrainEntranceScene(fb2, tick2);
    expect(fb1).toEqual(fb0);
    expect(fb2).not.toEqual(fb1);
  });

  it("single-tick boundary family pair B (docs/single-tick-boundary-family-probe.md): brainSettled's own FIRST render tick lags its movement clock by -1, mirroring brainMoving's own convention above - the scientists still show scientistTurnFrame's transient pose (byte-identical to the last brainMoving tick) instead of jumping straight to the settled clamp; the transition tick itself (BRAIN_MOVEMENT_SETTLE_ELAPSED, unmoved) only settles visually on the NEXT tick", () => {
    let state: BattleRoomState = createBrainWalkupBattleRoomState();
    for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED; i += 1) state = advanceBattleRoom(state);
    state = { ...state, phase: battleRoomMsgboxClosingPhase(state), elapsed: 0 };
    for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) state = advanceBattleRoom(state);
    expect(state.phase).toBe("brainMoving");

    const tickLastMoving = { ...state, elapsed: BRAIN_MOVEMENT_SETTLE_ELAPSED - 1 };
    const tickSettled0 = { ...state, phase: "brainSettled" as const, elapsed: 0 };
    const tickSettled1 = { ...state, phase: "brainSettled" as const, elapsed: 1 };
    const fbLastMoving = new Uint8Array(240 * 160 * 4);
    const fbSettled0 = new Uint8Array(240 * 160 * 4);
    const fbSettled1 = new Uint8Array(240 * 160 * 4);
    renderBattleRoomBrainEntranceScene(fbLastMoving, tickLastMoving);
    renderBattleRoomBrainEntranceScene(fbSettled0, tickSettled0);
    renderBattleRoomBrainEntranceScene(fbSettled1, tickSettled1);

    expect(fbSettled0).toEqual(fbLastMoving);
    expect(fbSettled1).not.toEqual(fbSettled0);
  });

  it("brain box print duration matches 1 tick/char over the JSON text, appearing once the room fade-in settles (dense-compare-measured, see battleRoom.ts doc)", () => {
    expect(BRAIN_MSGBOX_APPEAR_ELAPSED).toBe(24);
    expect(BRAIN_MSGBOX_PRINT_TICKS).toBe(BRAIN_MSGBOX_LINE1.length + BRAIN_MSGBOX_LINE2.length);
    expect(BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED).toBe(BRAIN_MSGBOX_APPEAR_ELAPSED + BRAIN_MSGBOX_PRINT_TICKS);
  });
});
