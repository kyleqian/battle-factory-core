import { describe, expect, it } from "vitest";
import {
  advanceFactoryLobbyFreeRoam,
  createFactoryLobbyFreeRoamState,
  isFactoryLobbyCellWalkable,
  isFactoryLobbyIdle,
  lobbyFreeRoamCameraOrigin,
  lobbyFreeRoamPlayerFrame,
  lobbyFreeRoamPlayerFrameHFlipped,
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
import {
  createLobbyNpcs,
  lobbyNpcDraw,
  stepLobbyNpcs,
  NPC_EAST,
  NPC_NORTH,
  NPC_SOUTH,
  type LobbyNpcDraw,
  type LobbyNpcsState,
} from "../src/engine/lobbyNpcs.ts";
import { lobbyNpcWorld } from "../src/engine/lobbyNpcDriver.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

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

const EAST_IDLE_WOMAN: LobbyNpcsState = {
  ...createLobbyNpcs(),
  shownWoman: { x: 11, y: 18, prevX: 11, prevY: 18, facing: NPC_EAST, walkFrames: 0, animIdx: 3 },
};

interface WalkScenario {
  readonly dir: number;
  readonly fromX: number;
  readonly fromY: number;
  readonly preFacing: number;
  readonly preIdx: number;
  readonly first: boolean;
}

/** Search seeds for a free-running woman whose walk matches `sc`; return her drawn sprite from the walk's first tick for 46 ticks. */
function womanWalkDraws(sc: WalkScenario): LobbyNpcDraw[] | null {
  const world = lobbyNpcWorld(null);
  for (let seed = 1; seed <= 6000; seed += 1) {
    let rng = seed;
    let npcs = createLobbyNpcs();
    let prev = npcs.woman;
    let found = -1;
    const draws: LobbyNpcDraw[] = [];
    for (let j = 0; j < 900; j += 1) {
      rng = advanceRngValue(rng);
      const r = stepLobbyNpcs(npcs, rng, false, world);
      npcs = r.npcs;
      rng = r.rngValue;
      const w = npcs.woman;
      if (found < 0) {
        const started = prev.walkFrames === 0 && w.walkFrames > 0;
        if (started) {
          const ok =
            w.facing === sc.dir && prev.x === sc.fromX && prev.y === sc.fromY && prev.facing === sc.preFacing && prev.animIdx === sc.preIdx;
          if (!ok && sc.first) break;
          if (ok) found = j;
        }
      }
      if (found >= 0) {
        draws.push(lobbyNpcDraw(npcs.shownWoman));
        if (draws.length === 46) return draws;
      }
      prev = w;
    }
  }
  return null;
}

// lbw3: the retired hard-coded woman schedule (docs/factory-lobby-freeroam-ground-truth.md §6d, pixel-verified on loss-beyond-boundary-off / loss-lobby-walk-off),
// kept ONLY as the oracle the state-driven NPC drawing (lobbyNpcs.ts) is checked against.
/**
 * The wandering-woman NPC (OBJ_EVENT_GFX_WOMAN_1, MOVEMENT_TYPE_WANDER_AROUND,
 * map-json spawn (3,11)) leaves her spawn during the free-roam Lobby window.
 * A general WanderAround model is out of scope (ISSUES #55 ambient RNG
 * stream); this is the bounded per-trace schedule table from
 * docs/factory-lobby-freeroam-ground-truth.md §6d, RAM-measured tick-by-tick
 * (twice-run byte-identical on both committed lobby fixtures) and keyed to
 * the canonical oracle ticks. Returns the woman's world box-top px (the
 * app's own render anchor: tile*16 − cameraOrigin − 16) plus the
 * woman_1.png sheet frame, or null for a tick that keeps her static at her
 * map-json tile (no override).
 *
 * Tick windows (all canonical):
 *  - ≤5184 idle SOUTH at (3,11), world (104,160)
 *  - 5185-5200 NORTH walk (3,10), world y = 161−(T−5184), anim5 cmdIdx 2 then
 *    3 → sheet frames 6 (north walk2) then 1 (north stand), sAnim_GoNorth.
 *    NOTE: the rendered box-top lags the §6a logical table by 1px through the
 *    walk and the settle tick (RAM-probe world box-top = logical, but the
 *    OAM/rendered position is +1; measured pixel-exact on 5186-5205) — so
 *    y here is the RENDERED world box-top.
 *  - 5201-5295 idle NORTH at (3,10), world (104,144), frozen 5/3 (frame 1)
 *  - 5296-5311 SOUTH walk (3,11), world y = 145+(T−5296), anim4 cmdIdx 0 then
 *    1 → sheet frames 3 (south walk1) then 0 (south stand), sAnim_GoSouth
 *  - 5312-5406 idle SOUTH at (3,11), world (104,160)
 *  - 5407-5421 EAST walk (4,11), world x = 105+(T−5407), anim7 cmdIdx 2 then
 *    3 → sheet frames 8 then 2 h-flipped (sAnim_GoEast)
 *  - ≥5422 idle EAST at (4,11), world (120,160)
 */
interface WomanNpcAtTick {
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly hFlip: boolean;
}

function womanAtTick(tick: number): WomanNpcAtTick | null {
  if (tick <= 5184) return null;
  if (tick <= 5200) {
    // North walk 5185-5200: anim5 cmdIdx 2 (sheet frame 6, walk2) then
    // cmdIdx 3 (sheet frame 1, stand). The RENDERED pose lags the RAM cmdIdx
    // by one frame (the same lag as the player's walk cycle): 5185 still shows
    // the pre-walk south standing pose (frame 0), walk2 renders 5186-5193 and
    // stand 5194-5200 (pixel-verified on the walk fixture).
    // Rendered y = 161−(T−5184) (the +1 render lag through the walk + settle
    // tick).
    const frame = tick >= 5194 ? 1 : tick === 5185 ? 0 : 6;
    return { x: 104, y: 161 - (tick - 5184), frame, hFlip: false };
  }
  if (tick <= 5295) return { x: 104, y: 144, frame: 1, hFlip: false };
  if (tick <= 5311) {
    // South walk 5296-5311: anim4 cmdIdx 0 (sheet frame 3, walk1) then
    // cmdIdx 1 (sheet frame 0, stand), rendered one frame later: 5296 keeps
    // the pre-walk north standing pose (frame 1), walk1 renders 5297-5304 and
    // stand 5305-5311. Rendered y = 144+(T−5296) — the same 1px render lag
    // the north walk carries (the oracle draws the walking woman 1px above
    // the logical schedule; docs §8c).
    const frame = tick >= 5305 ? 0 : tick === 5296 ? 1 : 3;
    return { x: 104, y: 144 + (tick - 5296), frame, hFlip: false };
  }
  if (tick <= 5406) return { x: 104, y: 160, frame: 0, hFlip: false };
  if (tick <= 5422) {
    // East walk 5407-5422: anim7 cmdIdx 2 (sheet frame 8, walk2 h-flipped)
    // then cmdIdx 3 (sheet frame 2, stand h-flipped), rendered one frame
    // later: 5407 keeps the pre-walk south standing pose (frame 0, not
    // h-flipped), walk2 renders 5408-5415, stand 5416-5422. Rendered x =
    // 104+(T−5407) — the same 1px render lag class as the south walk's y
    // (the oracle's drawn box is 1px left of the logical schedule; docs §8b);
    // the lag persists through the 5422 settle tick (measured: oracle 5422
    // drawn box x is 1px left of the 5430+ idle).
    const frame = tick >= 5416 ? 2 : tick === 5407 ? 0 : 8;
    const hFlip = tick > 5407;
    return { x: 104 + (tick - 5407), y: 160, frame, hFlip };
  }
  return { x: 120, y: 160, frame: 2, hFlip: true };
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
    const field = renderFactoryLobbyFreeRoam(state, null);
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
    // (buffered) + step start at 15 + 1 step frame = 3 advances (lbw4: the
    // buffered idle press starts its step the next tick, ROM-exact).
    const west = advance(
      { ...createFactoryLobbyFreeRoamState(), facing: "west" as const },
      ["west"],
      3,
    );
    expect(west.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES - 2);
    expect(lobbyFreeRoamCameraOrigin(west, SPAWN_CAMERA)).toEqual({ x: -48 - 2, y: 56 });
    // North: camera origin y decreases. (From (4,8) north is blocked by the
    // attendant NPC, so start one tile south on the walkable floor and assert
    // the 1px delta against the non-spawn tile's own anchor.)
    const northIdle = { ...createFactoryLobbyFreeRoamState(), x: 3, y: 9, facing: "north" as const };
    const northBase = lobbyFreeRoamCameraOrigin(northIdle, SPAWN_CAMERA);
    const north = advance(northIdle, ["north"], 3);
    expect(north.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES - 2);
    const northCam = lobbyFreeRoamCameraOrigin(north, SPAWN_CAMERA);
    expect(northCam.x).toBe(northBase.x);
    expect(northCam.y).toBe(northBase.y - 2);
    // East: camera origin x increases.
    const east = advance(
      { ...createFactoryLobbyFreeRoamState(), facing: "east" as const },
      ["east"],
      3,
    );
    expect(east.stepRemaining).toBe(LOBBY_FREE_ROAM_TILE_FRAMES - 2);
    expect(lobbyFreeRoamCameraOrigin(east, SPAWN_CAMERA)).toEqual({ x: -48 + 2, y: 56 });
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
    // lbw5: the first pose of a fresh walk follows the GO anim's idle command index (idleIdx), which every turn and tile step toggles:
    // the walk's tile steps and this turn leave it at 1 -> walk-2 (west frame 8). (The ROM does not turn at all on a direction change while
    // moving; this pin only documents the engine's own turn path.)
    expect(stepping.idleIdx).toBe(1);
    expect(lobbyFreeRoamPlayerFrame(stepping)).toBe(8);
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
  it("lobbyNpcDraw reproduces the retired womanAtTick table on a north / south / east walk (the table is the oracle)", () => {
    const scenarios = [
      { name: "north (5185)", t0: 5185, dir: NPC_NORTH, fromX: 10, fromY: 18, preFacing: NPC_SOUTH, preIdx: 1, first: true },
      { name: "south (5296)", t0: 5296, dir: NPC_SOUTH, fromX: 10, fromY: 17, preFacing: NPC_NORTH, preIdx: 3, first: false },
      { name: "east (5407)", t0: 5407, dir: NPC_EAST, fromX: 10, fromY: 18, preFacing: NPC_SOUTH, preIdx: 1, first: false },
    ] as const;
    for (const sc of scenarios) {
      const draws = womanWalkDraws(sc);
      expect(draws, sc.name).not.toBeNull();
      // 16 walk frames then >= 30 idle frames (the shortest delay is 32): all inside the oracle's window.
      expect(draws!.length).toBe(46);
      draws!.forEach((d, i) => {
        const o = womanAtTick(sc.t0 + i);
        expect(o, `${sc.name} T=${sc.t0 + i}`).not.toBeNull();
        expect({ x: d.x + 56, y: d.y, frame: d.frame, hFlip: d.hFlip }, `${sc.name} T=${sc.t0 + i}`).toEqual({
          x: o!.x,
          y: o!.y,
          frame: o!.frame,
          hFlip: o!.hFlip ?? false,
        });
      });
    }
  });

  it("the oracle table itself: idle before the first walk", () => {
    expect(womanAtTick(5093)).toBeNull();
    expect(womanAtTick(5184)).toBeNull();
    expect(womanAtTick(5423)).toMatchObject({ x: 120, y: 160, frame: 2, hFlip: true });
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
    // lbw4: the GO anim index advances every 16-frame cycle (2, 3, 0, 1 = walk-2, stand, walk-1, stand) and
    // the rendered pose lags the RAM index by one frame, so the stand pose starts at bumpElapsed 18.
    const cycleTwo = advance(cycleLast, ["south"], 2);
    expect(cycleTwo.bumpElapsed).toBe(LOBBY_FREE_ROAM_BUMP_FRAMES + 2);
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

  it("drawNpc's h-flip mirrors the WHOLE 16px frame, not each 8px tile (§8b)", () => {
    // The ROM OAM h-flip swaps the frame's tile columns AND mirrors within
    // each column. The idle-east woman (tick 5423, frame 2 h-flipped) at the
    // spawn camera renders at screen (112,104): frame row 12 (palette row 4
    // of the top-left tile) is [0,0,0,0,13,13,12,12 | 12,12,12,13,0,0,0,0].
    // Whole-frame flip maps dest col c -> source col 15-c:
    //   dest [0,0,0,0,13,12,12,12,12,12,13,13,0,0,0,0]
    // Per-tile mirror maps dest c -> tile-local 7-(c%8):
    //   dest [12,12,13,13,0,0,0,0 | 0,0,0,0,13,12,12,12]
    // Frame palette index 12 = (123,115,66), 13 = (57,57,24).
    const fb = renderFactoryLobbyFreeRoam(createFactoryLobbyFreeRoamState(), EAST_IDLE_WOMAN);
    const pixel = (x: number, y: number): [number, number, number, number] => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!, fb[i + 3]!];
    };
    // Whole-frame dest row 12: [0,0,0,0,13,12,12,12,12,12,13,13,0,0,0,0].
    // Screen x = 112 + dest col; y = 104 + 12 = 116.
    // dest cols 4-11 are opaque for the whole-frame flip: 13=(57,57,24),
    // 12=(123,115,66). The per-tile mirror would leave cols 4-11 transparent
    // (their 13/12 ink lands at cols 0-3/12-15 instead).
    expect(pixel(116, 116)).toEqual([57, 57, 24, 255]);   // dest 4 = 13
    expect(pixel(117, 116)).toEqual([123, 115, 66, 255]); // dest 5 = 12
    expect(pixel(120, 116)).toEqual([123, 115, 66, 255]); // dest 8 = 12
    expect(pixel(123, 116)).toEqual([57, 57, 24, 255]);   // dest 11 = 13
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
