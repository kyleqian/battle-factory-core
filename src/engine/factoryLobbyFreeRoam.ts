// Factory Lobby free-roam after the LOSS/RETIRE terminal's decline chain.
//
// The real game hands the player overworld control at the "We look forward
// to your next visit." dismiss (docs/factory-lobby-freeroam-ground-truth.md
// §2, tick 5093 of the loss timeline: box gone, player at map (4,8) facing
// NORTH). This module is that overworld: the measured walk cadence (§3a,
// 8-frame turn-in-place on a direction change, 16 frames per tile, a tap =
// exactly one tile, held = continuous walking), a FIXED camera (the lobby is
// 19 tiles wide vs the 240px screen, clamped at its leftmost position for
// every probed walk), and collision from the extracted layout grid (§3b)
// plus the standing NPC/attendant object cells and the door-mat divergence.
//
// Deliberate divergences (user decisions, 2026-08-05): the lobby is
// WALKABLE with no exit warp (the real game warps out through the (9,11)/
// (10,11) door mat, §3c — those two tiles are BLOCKED here instead), no PC
// interaction, and SILENT NPCs (A on an NPC is a no-op; the real game opens
// the attendant's welcome dialogue). The walk-cycle poses follow the source
// anim tables (sAnim_GoSouth/North/West/East, 8 ticks per pose); the
// in-place turn's own 2-pose 8-frame animation (measured §2) is rendered as
// the target direction's standing frame (named residual, no committed spec).

import layoutData from "../data/gen/factory-lobby-terminal-layout.json" with { type: "json" };

export type LobbyDirection = "north" | "south" | "west" | "east";

/** Frames of the in-place turn on a direction change (measured, §2/§3a). */
export const LOBBY_FREE_ROAM_TURN_FRAMES = 8;
/** Frames per tile at on-foot speed (measured: tile-edge to tile-edge, §3a). */
export const LOBBY_FREE_ROAM_TILE_FRAMES = 16;
/** Frames per walk-cycle pose (source sAnim_Go*: ANIMCMD_FRAME(..., 8)). */
export const LOBBY_FREE_ROAM_POSE_FRAMES = 8;
/** Free-roam spawn tile (map (4,8), §2); the follow-cam's scroll anchor. */
export const LOBBY_SPAWN_TILE = Object.freeze({ x: 4, y: 8 });

interface TerminalLayout {
  readonly width: number;
  readonly height: number;
  readonly blocks: readonly { readonly metatileId: number; readonly collision: number }[];
}

const layout = layoutData as TerminalLayout;

/**
 * Standing NPC / attendant object-event cells (map.json object_events).
 * Colliding with an object event is COLLISION_OBJECT_EVENT on a walkable
 * metatile — the doc's §3c probe pins the singles attendant blocking (4,7)
 * while (4,7)'s metatile is `.`.
 */
const LOBBY_NPC_CELLS: ReadonlySet<string> = new Set([
  "4,7", // singles attendant
  "14,7", // doubles attendant
  "3,11", // woman (wanders)
  "6,10", // fat man
  "14,11", // camper
  "13,11", // picnicker
]);

/**
 * Exit door-mat cells (9,11)+(10,11). In the REAL game these are walkable
 * metatiles that warp to MAP_BATTLE_FRONTIER_OUTSIDE_WEST (doc §3c, fade at
 * 5356). Deliberate no-exit divergence: the app BLOCKS them so no warp can
 * fire.
 */
const LOBBY_DOOR_MAT_CELLS: ReadonlySet<string> = new Set(["9,11", "10,11"]);

/** Map-grid collision: an out-of-map or layout-blocked cell is impassable. */
export function isFactoryLobbyCellWalkable(x: number, y: number): boolean {
  if (x < 0 || x >= layout.width || y < 0 || y >= layout.height) return false;
  if (layout.blocks[y * layout.width + x]!.collision !== 0) return false;
  const key = `${x},${y}`;
  if (LOBBY_NPC_CELLS.has(key)) return false;
  if (LOBBY_DOOR_MAT_CELLS.has(key)) return false;
  return true;
}

const DIR_DELTA: Record<LobbyDirection, { readonly dx: number; readonly dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
  east: { dx: 1, dy: 0 },
};

export interface FactoryLobbyFreeRoamState {
  /** Current tile (the tile just arrived at when idle). */
  readonly x: number;
  readonly y: number;
  readonly facing: LobbyDirection;
  /** Remaining in-place turn frames; 0 = not turning. */
  readonly turnRemaining: number;
  readonly turnTarget: LobbyDirection;
  /** Remaining pixels of the current tile step; 0 = idle. */
  readonly stepRemaining: number;
  /** Tile the current step departed from (position interpolates from here). */
  readonly stepFromX: number;
  readonly stepFromY: number;
  readonly stepDir: LobbyDirection;
  /**
   * Walk-cycle clock, advanced only while stepping (the source GO anims
   * restart at their walk-1 pose, so the turn never advances it).
   * `floor(animClock / 8) % 4` selects [walk1, stand, walk2, stand].
   */
  readonly animClock: number;
  /** Currently held direction (null when no D-pad button is held). */
  readonly heldDir: LobbyDirection | null;
  /**
   * Direction buffered for the overworld's one-frame press latency: the real
   * game renders the turn two ticks after the D-pad press (measured: DOWN
   * press 5172-5173, turn visible 5174-5181, §2), while the app edge-detects
   * one tick earlier. A fresh direction while idle is buffered here for
   * exactly one frame so the app's first movement render lands on the
   * oracle's canonical turn-start tick.
   */
  readonly pendingDir: LobbyDirection | null;
}

export function createFactoryLobbyFreeRoamState(): FactoryLobbyFreeRoamState {
  return Object.freeze({
    x: LOBBY_SPAWN_TILE.x,
    y: LOBBY_SPAWN_TILE.y,
    facing: "north",
    turnRemaining: 0,
    turnTarget: "north",
    stepRemaining: 0,
    stepFromX: LOBBY_SPAWN_TILE.x,
    stepFromY: LOBBY_SPAWN_TILE.y,
    stepDir: "north",
    animClock: 0,
    heldDir: null,
    pendingDir: null,
  });
}

function startStep(
  state: FactoryLobbyFreeRoamState,
  dir: LobbyDirection,
): FactoryLobbyFreeRoamState {
  const { dx, dy } = DIR_DELTA[dir];
  const targetX = state.x + dx;
  const targetY = state.y + dy;
  if (!isFactoryLobbyCellWalkable(targetX, targetY)) return state;
  return Object.freeze({
    ...state,
    stepRemaining: LOBBY_FREE_ROAM_TILE_FRAMES,
    stepFromX: state.x,
    stepFromY: state.y,
    stepDir: dir,
    facing: dir,
    pendingDir: null,
  });
}

export interface LobbyFreeRoamInput {
  readonly heldDirs: ReadonlySet<LobbyDirection>;
}

export function advanceFactoryLobbyFreeRoam(
  state: FactoryLobbyFreeRoamState,
  input: LobbyFreeRoamInput,
): FactoryLobbyFreeRoamState {
  // A single held direction; fixtures never press diagonals.
  const heldDir = input.heldDirs.values().next().value ?? null;
  if (state.turnRemaining > 0) {
    const turnRemaining = state.turnRemaining - 1;
    if (turnRemaining > 0) {
      return Object.freeze({ ...state, turnRemaining, heldDir, pendingDir: null });
    }
    const facing = state.turnTarget;
    // The turn only commits a step if its direction is STILL HELD when the
    // turn completes: a 2-frame tap turns in place and stands (oracle-probe:
    // beyond-boundary fixture's DOWN 5172-5173 turns 5174-5181 then idles at
    // (4,8) forever, VOFS flat 40), while a hold walks continuously. Holding
    // through the turn (>= the 8-frame turn) is the one-tile tap.
    if (heldDir === state.turnTarget) {
      return startStep({ ...state, facing, turnRemaining, heldDir }, facing);
    }
    return Object.freeze({
      ...state,
      facing,
      turnRemaining,
      heldDir,
      pendingDir: null,
    });
  }
  if (state.stepRemaining > 0) {
    const stepRemaining = state.stepRemaining - 1;
    if (stepRemaining > 0) {
      return Object.freeze({ ...state, stepRemaining, animClock: state.animClock + 1, heldDir, pendingDir: null });
    }
    const dx = DIR_DELTA[state.stepDir].dx;
    const dy = DIR_DELTA[state.stepDir].dy;
    const arrived: FactoryLobbyFreeRoamState = Object.freeze({
      ...state,
      x: state.x + dx,
      y: state.y + dy,
      stepRemaining: 0,
      animClock: state.animClock + 1,
      heldDir,
      pendingDir: null,
    });
    if (heldDir === null) return arrived;
    if (heldDir === state.stepDir) {
      return startStep(arrived, heldDir);
    }
    // Direction changed at the tile center: turn in place, then the committed
    // step (mirrors the fresh-press rule). Held-hold continuations do not
    // re-apply the press latency (the direction was already registered). The
    // walk-cycle clock resets: the source GO anims restart at their walk-1
    // pose when the direction changes (animNum + animCmdIndex 0).
    return Object.freeze({
      ...arrived,
      turnRemaining: LOBBY_FREE_ROAM_TURN_FRAMES,
      turnTarget: heldDir,
      animClock: 0,
    });
  }
  if (state.pendingDir !== null) {
    // The buffered press fires the turn/step now (frame two of the measured
    // press->visual latency window).
    if (state.pendingDir === state.facing) {
      return startStep(state, state.pendingDir);
    }
    return Object.freeze({
      ...state,
      turnRemaining: LOBBY_FREE_ROAM_TURN_FRAMES,
      turnTarget: state.pendingDir,
      animClock: 0,
      heldDir,
      pendingDir: null,
    });
  }
  if (heldDir === null) return state;
  // Fresh direction while idle: buffer it for the one-frame latency.
  return Object.freeze({ ...state, heldDir, pendingDir: heldDir });
}

export function isFactoryLobbyIdle(state: FactoryLobbyFreeRoamState): boolean {
  return state.turnRemaining === 0 && state.stepRemaining === 0;
}

/**
 * The player sprite's fixed screen position (docs/factory-lobby-freeroam-
 * ground-truth.md §5a, RAM-proved): the real overworld FOLLOW-camera keeps the
 * player OAM at (112,56) for every walk/turn frame and scrolls the field under
 * it instead (gSpriteCoordOffset cancels the sprite's 1px/frame logical
 * advance, sprite.c:349-350). The terminal's spawn view is the same camera at
 * the spawn tile, so this is also the terminal lock's byte-identical anchor.
 */
export const LOBBY_PLAYER_SCREEN_POS = Object.freeze({ x: 112, y: 56 });

/**
 * The player's world-space box-top position in map pixels, interpolated
 * 1px/frame across the current tile step (or the arrived tile when idle).
 */
export function lobbyFreeRoamPlayerWorldPx(
  state: FactoryLobbyFreeRoamState,
): { readonly x: number; readonly y: number } {
  if (state.stepRemaining === 0) {
    return { x: state.x * 16, y: state.y * 16 };
  }
  const progress = LOBBY_FREE_ROAM_TILE_FRAMES - state.stepRemaining;
  const { dx, dy } = DIR_DELTA[state.stepDir];
  return {
    x: state.stepFromX * 16 + dx * progress,
    y: state.stepFromY * 16 + dy * progress,
  };
}

/**
 * The follow-camera's field origin for the current free-roam state (§5a):
 * the field's scroll = the player's interpolated world position minus the
 * spawn tile, added to the terminal's spawn camera origin. The tilemap slice
 * advances one 16px tile per step (net 16px), the in-step sub-tile phase
 * slides 1px/frame, and the border blocks fill every out-of-map tile the
 * follow-cam reveals.
 */
export function lobbyFreeRoamCameraOrigin(
  state: FactoryLobbyFreeRoamState,
  spawnCameraOriginPx: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  const world = lobbyFreeRoamPlayerWorldPx(state);
  return {
    x: spawnCameraOriginPx.x + (world.x - LOBBY_SPAWN_TILE.x * 16),
    y: spawnCameraOriginPx.y + (world.y - LOBBY_SPAWN_TILE.y * 16),
  };
}

/** Player overworld frame index for the current pose (walking.png layout). */
export function lobbyFreeRoamPlayerFrame(state: FactoryLobbyFreeRoamState): number {
  if (state.turnRemaining > 0) {
    // The in-place turn is the fast GO anims' own 2-pose 8-frame animation
    // (docs/factory-lobby-freeroam-ground-truth.md §5b, RAM + byte-exact
    // pixel-proved): turn frames 1-4 draw the walk-2 pose (GO_FAST cmdIdx 2:
    // south sheet frame 4 / north 6 / west 8), turn frames 5-8 the standing
    // pose (GO_FAST cmdIdx 3: south 0 / north 1 / west 2). East reuses west
    // h-flipped (GO_FAST_EAST = GO_FAST_WEST hFlip).
    const walkTwo = state.turnRemaining > LOBBY_FREE_ROAM_TURN_FRAMES / 2;
    switch (state.turnTarget) {
      case "south": return walkTwo ? 4 : 0;
      case "north": return walkTwo ? 6 : 1;
      case "west": return walkTwo ? 8 : 2;
      case "east": return walkTwo ? 8 : 2;
    }
  }
  if (state.stepRemaining > 0) {
    const phase = Math.floor(state.animClock / LOBBY_FREE_ROAM_POSE_FRAMES) % 4;
    switch (state.facing) {
      case "south": return phase === 0 ? 3 : phase === 2 ? 4 : 0;
      case "north": return phase === 0 ? 5 : phase === 2 ? 6 : 1;
      case "west": return phase === 0 ? 7 : phase === 2 ? 8 : 2;
      case "east": return phase === 0 ? 7 : phase === 2 ? 8 : 2;
    }
  }
  switch (state.facing) {
    case "south": return 0;
    case "north": return 1;
    case "west": return 2;
    case "east": return 2;
  }
}

/** East reuses the west pose h-flipped (sAnim_GoEast / sAnim_FaceEast). */
export function lobbyFreeRoamPlayerFrameHFlipped(
  state: FactoryLobbyFreeRoamState,
): boolean {
  if (state.turnRemaining > 0) return state.turnTarget === "east";
  return state.facing === "east";
}
