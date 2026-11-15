// lbw3: the engine side of the Lobby NPC wander (lobbyNpcs.ts): the Lobby map as the NPCs see it, the player as an object event, and the
// script-lock timeline in ticks since the Lobby entry (docs/lbw3-lobby-npc-port.md).
import layoutData from "../data/gen/factory-lobby-terminal-layout.json" with { type: "json" };
import { LOBBY_SPAWN_TILE, type FactoryLobbyFreeRoamState } from "./factoryLobbyFreeRoam.ts";
import {
  NPC_MAP_OFFSET,
  createLobbyNpcs,
  stepLobbyNpcs,
  type LobbyNpcObjectTile,
  type LobbyNpcWorld,
  type LobbyNpcsState,
} from "./lobbyNpcs.ts";

interface TerminalLayout {
  readonly width: number;
  readonly height: number;
  readonly blocks: readonly { readonly collision: number }[];
}
const layout = layoutData as TerminalLayout;

/** The Lobby's other object events (map.json: singles / doubles attendant, camper, picnicker), map tiles; none of them ever moves while the NPCs run. */
const STATIC_OBJECT_TILES: readonly (readonly [number, number])[] = [
  [4, 7],
  [14, 7],
  [14, 11],
  [13, 11],
];

/**
 * lbw1: the ROM runs the field NPCs on exactly two ticks of the entry script (entry + 34 and entry + 35, the gap between two script locks);
 * every other tick from entry + 11 to the final `releaseall` they are frozen (lockall), and before entry + 11 the map is not yet running.
 */
export const LOBBY_NPC_SCRIPT_UNFROZEN_TICKS: readonly number[] = [34, 35];

export function lobbyNpcsScriptFrozen(ticksSinceEntry: number): boolean {
  return !LOBBY_NPC_SCRIPT_UNFROZEN_TICKS.includes(ticksSinceEntry);
}

const STEP_DELTA = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] } as const;

/** The player as the ROM's object event: while a step is in flight the current tile is already the destination, the previous tile the origin. */
function playerObject(player: FactoryLobbyFreeRoamState | null): LobbyNpcObjectTile {
  const x = player?.x ?? LOBBY_SPAWN_TILE.x;
  const y = player?.y ?? LOBBY_SPAWN_TILE.y;
  const [dx, dy] = player !== null && player.stepRemaining > 0 ? STEP_DELTA[player.stepDir] : [0, 0];
  return {
    x: x + dx + NPC_MAP_OFFSET,
    y: y + dy + NPC_MAP_OFFSET,
    prevX: x + NPC_MAP_OFFSET,
    prevY: y + NPC_MAP_OFFSET,
    elevation: 0,
  };
}

/**
 * The ROM's collision inputs, in grid tiles (map + 7). Elevation is always 0 here (both wanderers have elevation 0, which never mismatches).
 */
export function lobbyNpcWorld(player: FactoryLobbyFreeRoamState | null): LobbyNpcWorld {
  return {
    isBlocked: (x, y) => {
      const mx = x - NPC_MAP_OFFSET;
      const my = y - NPC_MAP_OFFSET;
      if (mx < 0 || mx >= layout.width || my < 0 || my >= layout.height) return true;
      return layout.blocks[my * layout.width + mx]!.collision !== 0;
    },
    elevationAt: () => 0,
    objects: [
      playerObject(player),
      ...STATIC_OBJECT_TILES.map(([x, y]) => ({ x: x + NPC_MAP_OFFSET, y: y + NPC_MAP_OFFSET, prevX: x + NPC_MAP_OFFSET, prevY: y + NPC_MAP_OFFSET, elevation: 0 })),
    ],
  };
}

/** One engine tick of the Lobby NPCs after the tick's VBlank draw: seeds the state at the first call (the Lobby map load), then `stepLobbyNpcs`. */
export function stepLobbyNpcsTick(
  npcs: LobbyNpcsState | null,
  rngValue: number,
  frozen: boolean,
  player: FactoryLobbyFreeRoamState | null,
): { readonly npcs: LobbyNpcsState; readonly rngValue: number } {
  return stepLobbyNpcs(npcs ?? createLobbyNpcs(), rngValue, frozen, lobbyNpcWorld(player));
}
