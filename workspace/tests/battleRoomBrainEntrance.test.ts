// Walk-up build step B1: Tier-1 tests for the Frontier-Brain BattleRoom
// entrance branch (src/engine/battleRoom.ts's brain* phases) - Noland
// visible from warp-in at (7,9), the "Get a move on!" box, the simultaneous
// Noland/player/decoy walk-in, and the six scientists turning. Pinned
// against src/data/gen/factory-brain-walkup-script.json (source truth) and
// battle-room-layout.json (the scientist positions the ordinary path's own
// renderer already ground-truths - reused verbatim by this branch, see
// scripts.inc: `ScientistsFaceBattle` is the SAME call for both paths).
// Silver/gold speech (B2) is explicitly out of scope - this pin only
// verifies the entrance settles into a named seam ("brainSettled").
import { describe, expect, it } from "vitest";
import walkup from "../src/data/gen/factory-brain-walkup-script.json" with { type: "json" };
import layout from "../src/data/gen/battle-room-layout.json" with { type: "json" };
import {
  advanceBattleRoom,
  battleRoomQuote,
  battleRoomQuoteInputReady,
  battleRoomStateForOpponent,
  battleRoomMsgboxClosingPhase,
  BRAIN_MOVEMENT_SETTLE_ELAPSED,
  BRAIN_MSGBOX_APPEAR_ELAPSED,
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
  type BattleRoomState,
} from "../src/engine/battleRoom.ts";
import type { BattleOpponent } from "../src/engine/battleScenario.ts";

const entranceScene = walkup.scenes.battleRoomEntrance;

function brainOpponent(): BattleOpponent {
  return {
    id: "noland",
    trainerName: "NOLAND",
    party: [] as unknown as BattleOpponent["party"],
    frontierBrain: { status: "silver" },
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

  it("box stays hidden through the room fade-in, appears at BRAIN_MSGBOX_APPEAR_ELAPSED, prints, then holds idle until the player's A press - no movement happens yet", () => {
    let state: BattleRoomState = createBrainWalkupBattleRoomState();
    expect(msgboxVisual(state)).toEqual({ visible: false, chars: 0 });
    expect(entryStep(0).camPanY).toBe(0);

    for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED; i += 1) {
      state = advanceBattleRoom(state);
    }
    expect(state.phase).toBe("brainMsgboxIdle");
    expect(msgboxVisual(state)).toEqual({ visible: true, chars: BRAIN_MSGBOX_PRINT_TICKS });
    expect(battleRoomQuoteInputReady(state)).toBe(true);

    // Idling holds byte-identical (no timer-driven auto-advance).
    const held = advanceBattleRoom(state);
    expect(held).toEqual(state);
  });

  it("A press on the idle box starts the close, then the shared movement phase, settling into the named 'brainSettled' seam for B2", () => {
    let state: BattleRoomState = createBrainWalkupBattleRoomState();
    for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED; i += 1) state = advanceBattleRoom(state);
    expect(battleRoomQuoteInputReady(state)).toBe(true);

    // core.ts's own A-press idiom: transition directly to the closing phase.
    expect(battleRoomMsgboxClosingPhase(state)).toBe("brainMsgboxClosing");
    state = { ...state, phase: battleRoomMsgboxClosingPhase(state), elapsed: 0 };

    for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) state = advanceBattleRoom(state);
    expect(state.phase).toBe("brainMoving");
    expect(msgboxVisual(state)).toEqual({ visible: false, chars: 0 });

    for (let i = 0; i < BRAIN_MOVEMENT_SETTLE_ELAPSED; i += 1) state = advanceBattleRoom(state);
    expect(state.phase).toBe("brainSettled");
    expect(state.elapsed).toBe(0);
    // The seam is stable - ticking further just ages it, no speech starts.
    const aged = advanceBattleRoom(state);
    expect(aged.phase).toBe("brainSettled");
    expect(aged.elapsed).toBe(1);
    expect(msgboxVisual(aged)).toEqual({ visible: false, chars: 0 });
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
    // his face_left settle pose and drifts by the remaining pan.
    expect(BRAIN_MOVEMENT_SETTLE_ELAPSED).toBeGreaterThan(ENTRY_SETTLE_ELAPSED);
    const settled = nolandStep(BRAIN_MOVEMENT_SETTLE_ELAPSED);
    expect(settled.frame).toBe(2);
    expect(settled.hFlip).toBe(false);
    expect(settled.screenY).toBe(OPPONENT_SETTLED_SCREEN_Y);
  });

  it("scientists turn during brainMoving via the exact same scientistTurnFrame the ordinary path already ground-truths", () => {
    expect(scientistTurnFrame(0)).toEqual({ frame: 0, turned: false });
    expect(scientistTurnFrame(BRAIN_MOVEMENT_SETTLE_ELAPSED)).toEqual({ frame: 2, turned: true });
  });

  it("brain box print duration matches 1 tick/char over the JSON text, appearing once the room fade-in settles (dense-compare-measured, see battleRoom.ts doc)", () => {
    expect(BRAIN_MSGBOX_APPEAR_ELAPSED).toBe(24);
    expect(BRAIN_MSGBOX_PRINT_TICKS).toBe(BRAIN_MSGBOX_LINE1.length + BRAIN_MSGBOX_LINE2.length);
    expect(BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED).toBe(BRAIN_MSGBOX_APPEAR_ELAPSED + BRAIN_MSGBOX_PRINT_TICKS);
  });
});
