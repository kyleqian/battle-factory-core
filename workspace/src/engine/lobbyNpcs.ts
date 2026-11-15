// lbw3 (ISSUES #221 E4): the Battle Factory Lobby's two RNG-drawing field NPCs, ported from
// reference/pokeemerald/src/event_object_movement.c (docs/lbw3-lobby-npc-port.md): the woman (MOVEMENT_TYPE_WANDER_AROUND,
// MovementType_WanderAround_Step0-6, :2566-2630) and the fat man (MOVEMENT_TYPE_LOOK_AROUND, MovementType_LookAround_Step0-4,
// :2860-2890). Per frame the ROM draws the VBlank Random() first (the caller's job), then runs the woman (sprite 2), then the fat man
// (sprite 5), each `while (callback())` (UpdateObjectEventCurrentMovement :4929) unless frozen. Coordinates are the ROM's grid tiles
// (map + 7). Pure: no engine imports beyond the LCG.
import { advanceRngValue } from "./rng.ts";

/** gStandardDirections order is S, N, W, E; the ROM's direction ids. */
export const NPC_SOUTH = 1;
export const NPC_NORTH = 2;
export const NPC_WEST = 3;
export const NPC_EAST = 4;
export type NpcDir = 1 | 2 | 3 | 4;
const STANDARD_DIRECTIONS: readonly NpcDir[] = [NPC_SOUTH, NPC_NORTH, NPC_WEST, NPC_EAST];
/** sMovementDelaysMedium. */
const DELAYS_MEDIUM = [32, 64, 96, 128] as const;
/** sStepTimes[MOVE_SPEED_NORMAL]: frames per tile. */
export const NPC_WALK_FRAMES = 16;
/** Frames per walk-cycle pose (sAnim_Go*: ANIMCMD_FRAME(..., 8)). */
const NPC_WALK_POSE_FRAMES = 8;
/** Grid tile = map tile + MAP_OFFSET (7). */
export const NPC_MAP_OFFSET = 7;

export interface LobbyNpc {
  readonly kind: "woman" | "fatMan";
  readonly initialX: number;
  readonly initialY: number;
  readonly rangeX: number;
  readonly rangeY: number;
  readonly elevation: number;
  readonly x: number;
  readonly y: number;
  readonly prevX: number;
  readonly prevY: number;
  /** facingDirection == movementDirection throughout (SetObjectEventDirection sets both). */
  readonly facing: NpcDir;
  /** sprite->sTypeFuncId. */
  readonly step: number;
  /** sprite->data[3], the SetMovementDelay counter. */
  readonly delay: number;
  /** Frames of the in-flight WALK_NORMAL action already run (0 = none; the 16th frame completes it). */
  readonly walkFrames: number;
  /** sprite->animCmdIndex of the Go anim (0..3): 1 / 3 after a face action or a walk's end; 2 / 0 during a walk (first / second half). */
  readonly animIdx: number;
}

/** What the renderer sees: the NPC as of the END OF THE PREVIOUS TICK (the OAM lags the callbacks by one frame, measured in the walk fixtures). */
export interface LobbyNpcShown {
  readonly x: number;
  readonly y: number;
  readonly prevX: number;
  readonly prevY: number;
  readonly facing: NpcDir;
  readonly walkFrames: number;
  readonly animIdx: number;
}

export interface LobbyNpcsState {
  readonly woman: LobbyNpc;
  readonly fatMan: LobbyNpc;
  readonly shownWoman: LobbyNpcShown;
  readonly shownFatMan: LobbyNpcShown;
}

/** Everything a wanderer collides with that is not the other wanderer: the map grid and the player / static object events. */
export interface LobbyNpcWorld {
  /** MapGridGetCollisionAt || GetMapBorderIdAt == CONNECTION_INVALID (an out-of-map tile). */
  isBlocked(x: number, y: number): boolean;
  /** MapGridGetElevationAt. */
  elevationAt(x: number, y: number): number;
  /** Other active object events (the player, the attendants, the camper, the picnicker): current and previous tile. */
  readonly objects: readonly LobbyNpcObjectTile[];
}

export interface LobbyNpcObjectTile {
  readonly x: number;
  readonly y: number;
  readonly prevX: number;
  readonly prevY: number;
  readonly elevation: number;
}

function newNpc(kind: LobbyNpc["kind"], x: number, y: number): LobbyNpc {
  return Object.freeze({
    kind,
    initialX: x,
    initialY: y,
    rangeX: 1,
    rangeY: 1,
    elevation: 0,
    x,
    y,
    prevX: x,
    prevY: y,
    facing: NPC_SOUTH,
    step: 0,
    delay: 0,
    walkFrames: 0,
    animIdx: 0,
  });
}

function shownOf(n: LobbyNpc): LobbyNpcShown {
  return Object.freeze({
    x: n.x,
    y: n.y,
    prevX: n.prevX,
    prevY: n.prevY,
    facing: n.facing,
    walkFrames: n.walkFrames,
    animIdx: n.animIdx,
  });
}

/** The Lobby map-load state (lbw1 "Initial NPC state", identical on all six traces): woman (10,18), fat man (13,17), facing SOUTH, Step 0. */
export function createLobbyNpcs(): LobbyNpcsState {
  const woman = newNpc("woman", 10, 18);
  const fatMan = newNpc("fatMan", 13, 17);
  return Object.freeze({ woman, fatMan, shownWoman: shownOf(woman), shownFatMan: shownOf(fatMan) });
}

function moveCoords(d: NpcDir, x: number, y: number): [number, number] {
  switch (d) {
    case NPC_SOUTH: return [x, y + 1];
    case NPC_NORTH: return [x, y - 1];
    case NPC_WEST: return [x - 1, y];
    default: return [x + 1, y];
  }
}

/** IsCoordOutsideObjectEventMovementRange (:4676). */
function outsideRange(n: LobbyNpc, x: number, y: number): boolean {
  if (n.rangeX !== 0 && (n.initialX - n.rangeX > x || n.initialX + n.rangeX < x)) return true;
  if (n.rangeY !== 0 && (n.initialY - n.rangeY > y || n.initialY + n.rangeY < y)) return true;
  return false;
}

/** GetCollisionAtCoords (:4659), 0 = COLLISION_NONE; 1 outside range, 2 impassable, 3 elevation mismatch, 4 object event. Directional-impassable metatile behaviours are not modelled (the Lobby has none near her range; unproven). */
export function lobbyNpcCollisionInDirection(
  n: LobbyNpc,
  d: NpcDir,
  other: LobbyNpc,
  world: LobbyNpcWorld,
): number {
  const [x, y] = moveCoords(d, n.x, n.y);
  if (outsideRange(n, x, y)) return 1;
  if (world.isBlocked(x, y)) return 2;
  // IsElevationMismatchAt: elevation 0 never mismatches; map elevation 0 / 15 never does either.
  const me = world.elevationAt(x, y);
  if (n.elevation !== 0 && me !== 0 && me !== 15 && n.elevation !== me) return 3;
  const compatible = (a: number, b: number): boolean => a === 0 || b === 0 || a === b;
  for (const o of [...world.objects, otherTile(other)]) {
    if (((o.x === x && o.y === y) || (o.prevX === x && o.prevY === y)) && compatible(n.elevation, o.elevation)) return 4;
  }
  return 0;
}

function otherTile(n: LobbyNpc): LobbyNpcObjectTile {
  return { x: n.x, y: n.y, prevX: n.prevX, prevY: n.prevY, elevation: n.elevation };
}

class Draw {
  rngValue: number;
  constructor(rngValue: number) {
    this.rngValue = rngValue;
  }
  /** Random(): one LCG step, the upper 16 bits. */
  next(): number {
    this.rngValue = advanceRngValue(this.rngValue);
    return this.rngValue >>> 16;
  }
}

/** FaceDirection -> SetStepAnim: the cmd index becomes the stand pose (1, or 3 if it was past 1). */
function faceAnimIdx(idx: number): number {
  return idx <= 1 ? 1 : 3;
}

/** SetStepAnimHandleAlternation: 1 -> 2 (walk2), 3 -> 0 (walk1); 0 / 2 unchanged. */
function walkAnimIdx(idx: number): number {
  if (idx === 1) return 2;
  if (idx === 3) return 0;
  return idx;
}

/** One WanderAround callback; returns whether `while (callback())` loops again. */
function womanCallback(w: LobbyNpc, fat: LobbyNpc, world: LobbyNpcWorld, rng: Draw): { npc: LobbyNpc; again: boolean } {
  switch (w.step) {
    case 0:
      return { npc: { ...w, step: 1 }, again: true };
    case 1:
      return { npc: { ...w, step: 2 }, again: true };
    case 2: {
      // Step1 queued a face action; it executes (and finishes) in this callback: FaceDirection, then the delay draw.
      const delay = DELAYS_MEDIUM[rng.next() % 4]!;
      return { npc: { ...w, prevX: w.x, prevY: w.y, animIdx: faceAnimIdx(w.animIdx), delay, step: 3 }, again: true };
    }
    case 3: {
      const delay = w.delay - 1;
      if (delay === 0) return { npc: { ...w, delay, step: 4 }, again: true };
      return { npc: { ...w, delay }, again: false };
    }
    case 4: {
      const facing = STANDARD_DIRECTIONS[rng.next() & 3]!;
      const turned = { ...w, facing };
      return { npc: { ...turned, step: lobbyNpcCollisionInDirection(turned, facing, fat, world) !== 0 ? 1 : 5 }, again: true };
    }
    case 5:
      return { npc: { ...w, step: 6 }, again: true };
    case 6: {
      let n = w;
      if (n.walkFrames === 0) {
        // MovementAction_WalkNormal*_Step0: InitMovementNormal.
        const [nx, ny] = moveCoords(n.facing, n.x, n.y);
        n = { ...n, prevX: n.x, prevY: n.y, x: nx, y: ny, animIdx: walkAnimIdx(n.animIdx) };
      }
      const walkFrames = n.walkFrames + 1;
      // The anim advances to the second pose after 8 frames and stays at the last one when the step ends (animPaused).
      const animIdx = walkFrames === NPC_WALK_POSE_FRAMES + 1 ? n.animIdx + 1 : n.animIdx;
      if (walkFrames >= NPC_WALK_FRAMES) {
        return { npc: { ...n, prevX: n.x, prevY: n.y, walkFrames: 0, animIdx, step: 1 }, again: false };
      }
      return { npc: { ...n, walkFrames, animIdx }, again: false };
    }
    default:
      throw new Error(`WanderAround Step${w.step}`);
  }
}

/** One LookAround callback (the fat man never walks and never collides; ObjectEventIsTrainerAndCloseToPlayer and TryGetTrainerEncounterDirection are inert for trainerType NONE). */
function fatManCallback(n: LobbyNpc, rng: Draw): { npc: LobbyNpc; again: boolean } {
  switch (n.step) {
    case 0:
      return { npc: { ...n, step: 1 }, again: true };
    case 1:
      return { npc: { ...n, step: 2 }, again: true };
    case 2: {
      const delay = DELAYS_MEDIUM[rng.next() % 4]!;
      return { npc: { ...n, prevX: n.x, prevY: n.y, animIdx: faceAnimIdx(n.animIdx), delay, step: 3 }, again: false };
    }
    case 3: {
      const delay = n.delay - 1;
      if (delay === 0) return { npc: { ...n, delay, step: 4 }, again: true };
      return { npc: { ...n, delay }, again: false };
    }
    case 4:
      return { npc: { ...n, facing: STANDARD_DIRECTIONS[rng.next() & 3]!, step: 1 }, again: true };
    default:
      throw new Error(`LookAround Step${n.step}`);
  }
}

/**
 * One frame of the Lobby's field NPCs after the frame's VBlank draw. `frozen` = every object event frozen (lockall): no callbacks, no
 * draws, the state is kept. The rendered snapshot always follows the state of the previous tick.
 */
export function stepLobbyNpcs(
  npcs: LobbyNpcsState,
  rngValue: number,
  frozen: boolean,
  world: LobbyNpcWorld,
): { readonly npcs: LobbyNpcsState; readonly rngValue: number } {
  const shownWoman = shownOf(npcs.woman);
  const shownFatMan = shownOf(npcs.fatMan);
  if (frozen) return { npcs: Object.freeze({ ...npcs, shownWoman, shownFatMan }), rngValue };
  const rng = new Draw(rngValue);
  let woman = npcs.woman;
  let fatMan = npcs.fatMan;
  for (let guard = 0; ; guard += 1) {
    if (guard > 20) throw new Error("WanderAround callback loop");
    const r = womanCallback(woman, fatMan, world, rng);
    woman = Object.freeze(r.npc);
    if (!r.again) break;
  }
  for (let guard = 0; ; guard += 1) {
    if (guard > 20) throw new Error("LookAround callback loop");
    const r = fatManCallback(fatMan, rng);
    fatMan = Object.freeze(r.npc);
    if (!r.again) break;
  }
  return { npcs: Object.freeze({ woman, fatMan, shownWoman, shownFatMan }), rngValue: rng.rngValue };
}

/** The Go anim frames per direction: [walk1, stand, walk2, stand] (sAnim_GoSouth / North / West; East reuses West h-flipped). */
const GO_FRAMES: Readonly<Record<NpcDir, readonly number[]>> = {
  [NPC_SOUTH]: [3, 0, 4, 0],
  [NPC_NORTH]: [5, 1, 6, 1],
  [NPC_WEST]: [7, 2, 8, 2],
  [NPC_EAST]: [7, 2, 8, 2],
};
const STAND_FRAME: Readonly<Record<NpcDir, number>> = { [NPC_SOUTH]: 0, [NPC_NORTH]: 1, [NPC_WEST]: 2, [NPC_EAST]: 2 };

export interface LobbyNpcDraw {
  /** Box-left / feet-anchored top in MAP pixels (tile * 16, the sprite's 16x32 box top = tile * 16 - 16). */
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly hFlip: boolean;
}

/** The sprite as drawn: the previous tick's state. While a walk is in flight the sprite is `walkFrames` px along its step. */
export function lobbyNpcDraw(shown: LobbyNpcShown): LobbyNpcDraw {
  const walking = shown.walkFrames > 0;
  const frame = walking ? GO_FRAMES[shown.facing][shown.animIdx]! : STAND_FRAME[shown.facing];
  let px = (shown.x - NPC_MAP_OFFSET) * 16;
  let py = (shown.y - NPC_MAP_OFFSET) * 16;
  if (walking) {
    const [dx, dy] = moveCoords(shown.facing, 0, 0);
    px = (shown.prevX - NPC_MAP_OFFSET) * 16 + dx * shown.walkFrames;
    py = (shown.prevY - NPC_MAP_OFFSET) * 16 + dy * shown.walkFrames;
  }
  return { x: px, y: py - 16, frame, hFlip: shown.facing === NPC_EAST };
}
