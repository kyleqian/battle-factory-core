import { describe, expect, it } from "vitest";
import {
  advanceFactoryLobbyFreeRoam,
  createFactoryLobbyFreeRoamState,
  isFactoryLobbyCellWalkable,
  isFactoryLobbyIdle,
  lobbyFreeRoamCameraOrigin,
  lobbyFreeRoamPlayerFrame,
  lobbyFreeRoamPlayerFrameHFlipped,
  womanAtTick,
  LOBBY_PLAYER_SCREEN_POS,
  LOBBY_FREE_ROAM_TILE_FRAMES,
  LOBBY_FREE_ROAM_TURN_FRAMES,
  LOBBY_FREE_ROAM_BUMP_FRAMES,
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
    // The follow-camera at the spawn tile equals the terminal's own, so the
    // player anchor is the byte-exact terminal spawn position (112,56).
    const camera = lobbyFreeRoamCameraOrigin(state, SPAWN_CAMERA);
    expect(camera).toEqual(SPAWN_CAMERA);
    expect([LOBBY_PLAYER_SCREEN_POS.x, LOBBY_PLAYER_SCREEN_POS.y]).toEqual([112, 56]);
    // The spawn render is byte-identical to the terminal's bare field frame
    // (the handoff is invisible; loss-terminal-decline-continuation-off 155/155).
    const field = renderFactoryLobbyFreeRoam(state, 5093);
    expect(field.length).toBe(240 * 160 * 4);
  });

  it("follow-cam: the player stays at fixed (112,56) while the field scrolls 1px/frame south (§5a)", () => {
    // The real overworld follow-camera: player OAM fixed, field slides under
    // it. South step boundary frames f05182 (k=1) and f05197 (k=16) differ by
    // the full 16px net scroll per tile (probe VOFS 41→56).
    const stepping = advance(createFactoryLobbyFreeRoamState(), ["south"], 10);
    // 2-frame press latency + 8-frame turn -> step started at frame 10 with
    // its FIRST pixel (the oracle's turn's last rendered frame occupies the
    // RAM step-1 start tick, so the visible walk begins on the commit frame).
    expect(stepping.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES - 1);
    // Progress 1: camera advanced 1px.
    expect(lobbyFreeRoamCameraOrigin(stepping, SPAWN_CAMERA)).toEqual({ x: -48, y: 56 + 1 });
    // Mid-step k: camera origin y advanced (16 - stepRemaining) px (field
    // slides under a fixed player).
    const mid = advance(stepping, ["south"], 5);
    expect(mid.stepRemaining).toBe(10);
    expect(lobbyFreeRoamCameraOrigin(mid, SPAWN_CAMERA)).toEqual({ x: -48, y: 56 + 6 });
    // The player screen anchor never moves.
    expect(LOBBY_PLAYER_SCREEN_POS).toEqual({ x: 112, y: 56 });
    // Arrival: the tilemap slice advanced the full net 16px and, with DOWN
    // still held, the next tile step re-arms on the arrival frame (progress 0
    // = the arrived tile's full displacement).
    const arrived = advance(mid, ["south"], 10);
    expect(arrived).toMatchObject({ x: 4, y: 9, stepRemaining: LOBBY_FREE_ROAM_TILE_FRAMES });
    expect(lobbyFreeRoamCameraOrigin(arrived, SPAWN_CAMERA)).toEqual({ x: -48, y: 56 + 16 });
  });

  it("follow-cam: the field scrolls along the direction of travel (west/east/north) (§5a)", () => {
    // Each player already faces its walk direction, so no turn: press
    // (buffered) + step start + 1 step frame = 3 advances.
    const west = advance(
      { ...createFactoryLobbyFreeRoamState(), facing: "west" as const },
      ["west"],
      3,
    );
    expect(west.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES - 1);
    expect(lobbyFreeRoamCameraOrigin(west, SPAWN_CAMERA)).toEqual({ x: -48 - 1, y: 56 });
    // North: camera origin y decreases. (From (4,8) north is blocked by the
    // attendant NPC, so start one tile south on the walkable floor and assert
    // the 1px delta against the non-spawn tile's own anchor.)
    const northIdle = { ...createFactoryLobbyFreeRoamState(), x: 3, y: 9, facing: "north" as const };
    const northBase = lobbyFreeRoamCameraOrigin(northIdle, SPAWN_CAMERA);
    const north = advance(northIdle, ["north"], 3);
    expect(north.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES - 1);
    const northCam = lobbyFreeRoamCameraOrigin(north, SPAWN_CAMERA);
    expect(northCam.x).toBe(northBase.x);
    expect(northCam.y).toBe(northBase.y - 1);
    // East: camera origin x increases.
    const east = advance(
      { ...createFactoryLobbyFreeRoamState(), facing: "east" as const },
      ["east"],
      3,
    );
    expect(east.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES - 1);
    expect(lobbyFreeRoamCameraOrigin(east, SPAWN_CAMERA)).toEqual({ x: -48 + 1, y: 56 });
  });

  it("turn poses: walk-2 for turn frames 1-4, standing pose for frames 5-8 (§5b)", () => {
    // South turn: GO_FAST_SOUTH sheet frames 4 (walk-2) then 0 (stand),
    // byte-proved 0px diff against the oracle (5174-5177 vs 5178-5181).
    const turning = advance(createFactoryLobbyFreeRoamState(), ["south"], 2);
    expect(turning.turnRemaining).toBe(8);
    expect(lobbyFreeRoamPlayerFrame(turning)).toBe(4);
    const turnFrame4 = advance(turning, ["south"], 3);
    expect(turnFrame4.turnRemaining).toBe(5);
    expect(lobbyFreeRoamPlayerFrame(turnFrame4)).toBe(4);
    const turnFrame5 = advance(turnFrame4, ["south"], 1);
    expect(turnFrame5.turnRemaining).toBe(4);
    expect(lobbyFreeRoamPlayerFrame(turnFrame5)).toBe(0);
    const turnFrame8 = advance(turnFrame5, ["south"], 3);
    expect(turnFrame8.turnRemaining).toBe(1);
    expect(lobbyFreeRoamPlayerFrame(turnFrame8)).toBe(0);
    // North: 6 then 1; west: 8 then 2; east: 8 h-flipped then 2 h-flipped.
    const north = advance({ ...createFactoryLobbyFreeRoamState(), facing: "south" as const }, ["north"], 2);
    expect(lobbyFreeRoamPlayerFrame(north)).toBe(6);
    expect(lobbyFreeRoamPlayerFrame(advance(north, ["north"], 4))).toBe(1);
    const west = advance({ ...createFactoryLobbyFreeRoamState(), facing: "south" as const }, ["west"], 2);
    expect(lobbyFreeRoamPlayerFrame(west)).toBe(8);
    expect(lobbyFreeRoamPlayerFrameHFlipped(west)).toBe(false);
    expect(lobbyFreeRoamPlayerFrame(advance(west, ["west"], 4))).toBe(2);
    const east = advance({ ...createFactoryLobbyFreeRoamState(), facing: "south" as const }, ["east"], 2);
    expect(lobbyFreeRoamPlayerFrame(east)).toBe(8);
    expect(lobbyFreeRoamPlayerFrameHFlipped(east)).toBe(true);
    expect(lobbyFreeRoamPlayerFrame(advance(east, ["east"], 4))).toBe(2);
    expect(lobbyFreeRoamPlayerFrameHFlipped(advance(east, ["east"], 4))).toBe(true);
  });

  it("resets the walk cycle after a turn (source GO anims restart at walk-1)", () => {
    // After walking (animClock > 0) a held direction change only turns once
    // the current step reaches its tile center; the next step's first pose is
    // walk-1 again, not the accumulated phase.
    const walked = advance(createFactoryLobbyFreeRoamState(), ["south"], 2 + LOBBY_FREE_ROAM_TURN_FRAMES + 20);
    expect(walked.stepRemaining).toBeGreaterThan(0);
    expect(walked.animClock).toBeGreaterThan(8);
    const turning = advance(walked, ["west"], walked.stepRemaining);
    expect(turning.turnRemaining).toBe(8);
    expect(turning.animClock).toBe(0);
    const stepping = advance(turning, ["west"], LOBBY_FREE_ROAM_TURN_FRAMES);
    expect(stepping.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES - 1);
    expect(lobbyFreeRoamPlayerFrame(stepping)).toBe(7);
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
    // The next frame the turn ends and the committed step begins (its first
    // pixel lands on this same frame).
    const stepping = advance(turned, ["south"], 1);
    expect(stepping).toMatchObject({ stepRemaining: LOBBY_FREE_ROAM_TILE_FRAMES - 1, facing: "south", x: 4, y: 8 });
  });

  it("steps one tile in exactly 16 frames at on-foot cadence (§3a)", () => {
    // Press + 8-frame turn -> step starts on the next frame (first pixel).
    const stepping = advance(createFactoryLobbyFreeRoamState(), ["south"], 10);
    expect(stepping.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES - 1);
    expect(stepping).toMatchObject({ x: 4, y: 8 });
    // 14 more frames: still traversing (1 px/frame).
    const nearArrival = advance(stepping, ["south"], 14);
    expect(nearArrival.stepRemaining).toBe(1);
    expect(nearArrival).toMatchObject({ x: 4, y: 8 });
    // The 15th frame completes the tile; a held DOWN continues walking.
    const arrived = advance(nearArrival, ["south"], 1);
    expect(arrived).toMatchObject({ x: 4, y: 9, facing: "south" });
    expect(arrived.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES);
  });

  it("a 2-frame tap turns in place and stands; a hold through the turn walks one tile", () => {
    // Oracle-probed (beyond-boundary fixture, DOWN 5172-5173 then release):
    // the turn animates 5174-5181 at (4,8) and the player NEVER walks — a
    // step only commits if the direction is still held when the turn ends.
    const pressed = advance(createFactoryLobbyFreeRoamState(), ["south"], 1);
    const turning = advance(pressed, [], 1);
    expect(turning.turnRemaining).toBe(8);
    const released = advance(turning, [], LOBBY_FREE_ROAM_TURN_FRAMES);
    expect(released).toMatchObject({ x: 4, y: 8, facing: "south" });
    expect(released.stepRemaining).toBe(0);
    expect(isFactoryLobbyIdle(released)).toBe(true);
    // Holding through the turn (>= 8 frames) commits the step.
    const held = advance(pressed, ["south"], LOBBY_FREE_ROAM_TURN_FRAMES + 1);
    expect(held).toMatchObject({ x: 4, y: 8, facing: "south", stepRemaining: LOBBY_FREE_ROAM_TILE_FRAMES - 1 });
    const arrived = advance(held, [], LOBBY_FREE_ROAM_TILE_FRAMES);
    expect(arrived).toMatchObject({ x: 4, y: 9, facing: "south" });
    expect(isFactoryLobbyIdle(arrived)).toBe(true);
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
  it("womanAtTick: the wandering woman's north-walk boundary ticks (§6a/§6d)", () => {
    // ≤5184 idle SOUTH at spawn (3,11) — no override (static map-json tile).
    expect(womanAtTick(5093)).toBeNull();
    expect(womanAtTick(5184)).toBeNull();
    // 5185-5200: NORTH walk; RENDERED box-top y = 161−(T−5184) (the §6a
    // logical table lags the OAM by 1px through the walk + settle tick,
    // pixel-verified), walk2 then stand pose. The rendered POSE lags the RAM
    // cmdIdx by one frame: 5185 keeps the pre-walk south standing pose,
    // walk2 renders 5186-5193 and stand 5194-5200.
    expect(womanAtTick(5185)).toMatchObject({ x: 104, y: 160, frame: 0, hFlip: false });
    expect(womanAtTick(5186)).toMatchObject({ y: 159, frame: 6 });
    expect(womanAtTick(5192)).toMatchObject({ y: 153, frame: 6 });
    expect(womanAtTick(5193)).toMatchObject({ y: 152, frame: 6 });
    expect(womanAtTick(5194)).toMatchObject({ y: 151, frame: 1 });
    expect(womanAtTick(5199)).toMatchObject({ y: 146, frame: 1 });
    expect(womanAtTick(5200)).toMatchObject({ y: 145, frame: 1 });
    // ≥5201 idle NORTH at (3,10), world (104,144), frozen standing pose.
    expect(womanAtTick(5201)).toMatchObject({ x: 104, y: 144, frame: 1 });
    expect(womanAtTick(5254)).toMatchObject({ x: 104, y: 144, frame: 1 });
  });

  it("womanAtTick: the walk fixture's south + east extra movements (§6d)", () => {
    // SOUTH walk (3,10)→(3,11) 5296-5311: world y = 145+(T−5296), rendered
    // pose one frame behind the RAM cmdIdx (5296 keeps the idle-north pose,
    // walk1 5297-5304, stand 5305-5311).
    expect(womanAtTick(5296)).toMatchObject({ x: 104, y: 145, frame: 1 });
    expect(womanAtTick(5297)).toMatchObject({ x: 104, y: 146, frame: 3 });
    expect(womanAtTick(5303)).toMatchObject({ y: 152, frame: 3 });
    expect(womanAtTick(5304)).toMatchObject({ y: 153, frame: 3 });
    expect(womanAtTick(5305)).toMatchObject({ y: 154, frame: 0 });
    expect(womanAtTick(5311)).toMatchObject({ y: 160, frame: 0 });
    // EAST walk (3,11)→(4,11) 5407-5421: world x = 105+(T−5407), rendered
    // pose one frame behind (5407 keeps the south standing pose, walk2
    // 5408-5415 h-flipped, stand 5416-5421 h-flipped).
    expect(womanAtTick(5407)).toMatchObject({ x: 105, y: 160, frame: 0, hFlip: false });
    expect(womanAtTick(5408)).toMatchObject({ x: 106, frame: 8, hFlip: true });
    expect(womanAtTick(5414)).toMatchObject({ x: 112, frame: 8 });
    expect(womanAtTick(5415)).toMatchObject({ x: 113, frame: 8 });
    expect(womanAtTick(5416)).toMatchObject({ x: 114, frame: 2 });
    expect(womanAtTick(5421)).toMatchObject({ x: 119, frame: 2 });
    expect(womanAtTick(5422)).toMatchObject({ x: 120, y: 160, frame: 2, hFlip: true });
    expect(womanAtTick(5472)).toMatchObject({ x: 120, frame: 2 });
  });

  it("hold-into-block then release + re-press: the new direction is honored (§7g)", () => {
    // Regression pin for the stale-pendingDir freeze: holding DOWN at (4,11)
    // (blocked border) runs the act-25 bump with a monotonic 16-frame cycle
    // (never re-buffering a press), releasing settles at the cycle boundary,
    // and a subsequent UP press starts its turn/step on the canonical ticks.
    const blocked = {
      ...createFactoryLobbyFreeRoamState(),
      x: 4,
      y: 11,
      facing: "south" as const,
    };
    // Frame 1 enters the bump; pose alternates walk-2 (cycle 0) / stand
    // (cycle 1) between 16-frame cycles (§7b: 5229-5244 anim 4/2, 5245-5260
    // anim 4/3 for the south hold).
    const bumped = advance(blocked, ["south"], 1);
    expect(bumped).toMatchObject({
      x: 4,
      y: 11,
      facing: "south",
      pendingDir: null,
      bumpElapsed: 1,
    });
    // The rendered bump pose lags the RAM cycle by one frame: the first bump
    // frame still shows the pre-bump standing pose; walk-2 renders cycle 0's
    // remaining frames.
    expect(lobbyFreeRoamPlayerFrame(bumped)).toBe(0);
    const cycleLast = advance(bumped, ["south"], LOBBY_FREE_ROAM_BUMP_FRAMES - 1);
    expect(cycleLast.bumpElapsed).toBe(LOBBY_FREE_ROAM_BUMP_FRAMES);
    expect(lobbyFreeRoamPlayerFrame(cycleLast)).toBe(4);
    const cycleTwo = advance(cycleLast, ["south"], 1);
    expect(cycleTwo.bumpElapsed).toBe(LOBBY_FREE_ROAM_BUMP_FRAMES + 1);
    expect(lobbyFreeRoamPlayerFrame(cycleTwo)).toBe(0);
    // Held for many frames: still bumping in place, never re-armed.
    const longHold = advance(cycleTwo, ["south"], 40);
    expect(longHold.bumpElapsed).toBeGreaterThan(LOBBY_FREE_ROAM_BUMP_FRAMES);
    expect(longHold).toMatchObject({ x: 4, y: 11, facing: "south", pendingDir: null });
    expect(lobbyFreeRoamPlayerFrameHFlipped(longHold)).toBe(false);
    // Release: the current cycle completes, then settles.
    const stillBumping = advance(
      longHold,
      [],
      LOBBY_FREE_ROAM_BUMP_FRAMES - (longHold.bumpElapsed % LOBBY_FREE_ROAM_BUMP_FRAMES) - 1,
    );
    expect(stillBumping.bumpElapsed).toBeGreaterThan(0);
    const settled = advance(stillBumping, [], 2);
    expect(settled.bumpElapsed).toBe(0);
    expect(isFactoryLobbyIdle(settled)).toBe(true);
    expect(settled).toMatchObject({ x: 4, y: 11, facing: "south" });
    // The fresh NORTH press is honored on the canonical ticks: buffered on
    // frame one, turn on frame two (8 frames), committed step at frame 10.
    const pressed = advance(settled, ["north"], 1);
    expect(pressed).toMatchObject({ turnRemaining: 0, pendingDir: "north" });
    const turning = advance(pressed, ["north"], 1);
    expect(turning).toMatchObject({ turnRemaining: LOBBY_FREE_ROAM_TURN_FRAMES });
    const turnDone = advance(turning, ["north"], LOBBY_FREE_ROAM_TURN_FRAMES - 1);
    expect(turnDone.turnRemaining).toBe(1);
    const stepping = advance(turnDone, ["north"], 1);
    expect(stepping).toMatchObject({ stepRemaining: LOBBY_FREE_ROAM_TILE_FRAMES - 1, facing: "north", x: 4, y: 11 });
  });

  it("a refused step leaves pendingDir null and never re-arms the blocked hold (§7g)", () => {
    // Direct pin on the stale-buffer shape: even if a press for a blocked
    // cell is somehow buffered, the refused step clears it (startStep's
    // refusal) and the held direction can never re-arm a future press.
    const stale = {
      ...createFactoryLobbyFreeRoamState(),
      x: 4,
      y: 11,
      facing: "south" as const,
      heldDir: "south" as const,
      pendingDir: "south" as const,
    };
    const refused = advance(stale, ["south"], 1);
    expect(refused.pendingDir).toBeNull();
    expect(refused.bumpElapsed).toBe(1);
    // Holding south at the border for many more frames keeps the press null
    // and keeps bumping — the pre-fix behavior re-buffered every frame and
    // swallowed the next press forever.
    const afterHold = advance(refused, ["south"], 40);
    expect(afterHold.pendingDir).toBeNull();
    expect(afterHold.bumpElapsed).toBeGreaterThan(1);
    expect(afterHold).toMatchObject({ x: 4, y: 11, facing: "south" });
    expect(afterHold.stepRemaining).toBe(0);
  });
});
