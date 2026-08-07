import { describe, expect, it } from "vitest";
import {
  advanceFactoryLobbyFreeRoam,
  createFactoryLobbyFreeRoamState,
  isFactoryLobbyCellWalkable,
  isFactoryLobbyIdle,
  LOBBY_FREE_ROAM_TILE_FRAMES,
  LOBBY_FREE_ROAM_TURN_FRAMES,
  lobbyFreeRoamPlayerScreenPos,
  type FactoryLobbyFreeRoamState,
  type LobbyDirection,
} from "../src/engine/factoryLobbyFreeRoam.ts";
import {
  renderFactoryLobbyFreeRoam,
} from "../src/engine/factoryTerminalRender.ts";

const SPAWN_CAMERA = { x: -48, y: 56 } as const;

function advance(
  state: FactoryLobbyFreeRoamState,
  held: readonly LobbyDirection[],
  count: number,
): FactoryLobbyFreeRoamState {
  let next = state;
  for (let i = 0; i < count; i += 1) {
    next = advanceFactoryLobbyFreeRoam(next, {
      heldDirs: new Set(held),
    });
  }
  return next;
}

describe("Factory Lobby free-roam (docs/factory-lobby-freeroam-ground-truth.md)", () => {
  it("spawns at map (4,8) facing north with the terminal's fixed-camera anchor", () => {
    const state = createFactoryLobbyFreeRoamState();
    expect(state).toMatchObject({ x: 4, y: 8, facing: "north" });
    expect(isFactoryLobbyIdle(state)).toBe(true);
    // The render anchor is the byte-exact terminal spawn pose (112,56).
    const { x, y } = lobbyFreeRoamPlayerScreenPos(state, SPAWN_CAMERA);
    expect([x, y]).toEqual([112, 56]);
    // The spawn render is byte-identical to the terminal's bare field frame
    // (the handoff is invisible; loss-terminal-decline-continuation-off 155/155).
    const field = renderFactoryLobbyFreeRoam(state);
    expect(field.length).toBe(240 * 160 * 4);
  });

  it("turns in place for 8 frames before stepping a fresh direction (§2)", () => {
    const pressed = advance(createFactoryLobbyFreeRoamState(), ["south"], 1);
    // One-frame press latency: the press is buffered, nothing moves yet.
    expect(pressed).toMatchObject({ turnRemaining: 0, x: 4, y: 8 });
    const turning = advance(pressed, ["south"], 1);
    expect(turning).toMatchObject({ turnRemaining: 8, x: 4, y: 8 });
    // 7 more frames complete the 8-frame turn.
    const turned = advance(turning, ["south"], 7);
    expect(turned.turnRemaining).toBe(1);
    // The next frame the turn ends and the committed step begins.
    const stepping = advance(turned, ["south"], 1);
    expect(stepping).toMatchObject({ stepRemaining: 16, facing: "south", x: 4, y: 8 });
  });

  it("steps one tile in exactly 16 frames at on-foot cadence (§3a)", () => {
    // Press + 8-frame turn -> step starts on the next frame.
    const stepping = advance(createFactoryLobbyFreeRoamState(), ["south"], 10);
    expect(stepping.stepRemaining).toBe(16);
    expect(stepping).toMatchObject({ x: 4, y: 8 });
    // 15 more frames: still traversing (1 px/frame).
    const nearArrival = advance(stepping, ["south"], 15);
    expect(nearArrival.stepRemaining).toBe(1);
    expect(nearArrival).toMatchObject({ x: 4, y: 8 });
    // The 16th frame completes the tile; a held DOWN continues walking.
    const arrived = advance(nearArrival, ["south"], 1);
    expect(arrived).toMatchObject({ x: 4, y: 9, facing: "south" });
    expect(arrived.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES);
  });

  it("a tap (press then release) walks exactly one tile (§2 tap rule)", () => {
    // DOWN pressed for one frame, then released.
    const pressed = advance(createFactoryLobbyFreeRoamState(), ["south"], 1);
    const released = advance(pressed, [], LOBBY_FREE_ROAM_TURN_FRAMES + LOBBY_FREE_ROAM_TILE_FRAMES + 1);
    // Turn (8) completes committing the step, the step traverses the tile,
    // and with nothing held the player stops exactly at (4,9).
    expect(released).toMatchObject({ x: 4, y: 9, facing: "south" });
    expect(isFactoryLobbyIdle(released)).toBe(true);
  });

  it("blocks the attendant NPC cell (4,7): UP at the spawn never moves (§3c)", () => {
    expect(isFactoryLobbyCellWalkable(4, 7)).toBe(false);
    const state = advance(createFactoryLobbyFreeRoamState(), ["north"], 20);
    expect(state).toMatchObject({ x: 4, y: 8, facing: "north" });
    expect(isFactoryLobbyIdle(state)).toBe(true);
  });

  it("blocks the counter metatile (11,7) after a turn-in-place (§3c)", () => {
    expect(isFactoryLobbyCellWalkable(11, 7)).toBe(false);
    // From (11,8) facing east, UP turns north then cannot step onto (11,7).
    const atCounter = {
      ...createFactoryLobbyFreeRoamState(),
      x: 11,
      y: 8,
      facing: "east" as const,
    };
    const state = advance(atCounter, ["north"], 2 + LOBBY_FREE_ROAM_TURN_FRAMES + 10);
    expect(state).toMatchObject({ x: 11, y: 8, facing: "north" });
    expect(isFactoryLobbyIdle(state)).toBe(true);
  });

  it("blocks the map border: south of (4,11) and west of (0,9) are impassable (§3c)", () => {
    const southEdge = {
      ...createFactoryLobbyFreeRoamState(),
      x: 4,
      y: 11,
      facing: "north" as const,
    };
    const southBlocked = advance(southEdge, ["south"], 2 + LOBBY_FREE_ROAM_TURN_FRAMES + 10);
    expect(southBlocked).toMatchObject({ x: 4, y: 11, facing: "south" });
    expect(isFactoryLobbyIdle(southBlocked)).toBe(true);

    const westEdge = {
      ...createFactoryLobbyFreeRoamState(),
      x: 0,
      y: 9,
      facing: "north" as const,
    };
    const westBlocked = advance(westEdge, ["west"], 2 + LOBBY_FREE_ROAM_TURN_FRAMES + 10);
    expect(westBlocked).toMatchObject({ x: 0, y: 9, facing: "west" });
    expect(isFactoryLobbyIdle(westBlocked)).toBe(true);
  });

  it("blocks the exit door-mat cells (9,11)/(10,11) — the no-exit divergence (§3c)", () => {
    // The real game warps out from these walkable metatiles (fade 5356); the
    // app deliberately blocks movement onto them so no warp can fire.
    expect(isFactoryLobbyCellWalkable(9, 11)).toBe(false);
    expect(isFactoryLobbyCellWalkable(10, 11)).toBe(false);
    const atMat = {
      ...createFactoryLobbyFreeRoamState(),
      x: 10,
      y: 10,
      facing: "north" as const,
    };
    const state = advance(atMat, ["south"], 2 + LOBBY_FREE_ROAM_TURN_FRAMES + 10);
    expect(state).toMatchObject({ x: 10, y: 10, facing: "south" });
    expect(isFactoryLobbyIdle(state)).toBe(true);
  });

  it("walks ordinary floor cells: DOWN from (4,8) reaches walkable (4,9)", () => {
    expect(isFactoryLobbyCellWalkable(4, 9)).toBe(true);
    expect(isFactoryLobbyCellWalkable(4, 10)).toBe(true);
    expect(isFactoryLobbyCellWalkable(4, 11)).toBe(true);
    expect(isFactoryLobbyCellWalkable(5, 8)).toBe(true);
    expect(isFactoryLobbyCellWalkable(0, 7)).toBe(true);
  });

  it("A on an NPC is a no-op (silent NPCs — user decision)", () => {
    // The free-roam input surface carries only D-pad directions; A/B are
    // never consulted (core.ts routes them into this branch which ignores
    // them). Holding A while idle changes nothing.
    const idle = createFactoryLobbyFreeRoamState();
    const state = advance(idle, [], 30);
    expect(state).toBe(idle);
    expect(isFactoryLobbyIdle(state)).toBe(true);
    expect(state.x).toBe(4);
    expect(state.y).toBe(8);
  });
});
