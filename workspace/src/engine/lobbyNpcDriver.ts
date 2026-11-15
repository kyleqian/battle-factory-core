// lbw3: the engine side of the Lobby NPC wander (lobbyNpcs.ts): the Lobby map as the NPCs see it, the player as an object event, and the
// script-lock timeline in ticks since the Lobby entry (docs/lbw3-lobby-npc-port.md).
import layoutData from "../data/gen/factory-lobby-terminal-layout.json" with { type: "json" };
import {
  LOBBY_SPAWN_TILE,
  lobbyFreeRoamRomObject,
  type FactoryLobbyFreeRoamState,
  type LobbyFreeRoamNpcTiles,
  type LobbyObjectTile,
} from "./factoryLobbyFreeRoam.ts";
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

/** The wanderers as map tiles (NPC grid - 7): what the player's collision check sees (factoryLobbyFreeRoam.ts). */
function npcTile(n: { x: number; y: number; prevX: number; prevY: number }): LobbyObjectTile {
  return { x: n.x - NPC_MAP_OFFSET, y: n.y - NPC_MAP_OFFSET, prevX: n.prevX - NPC_MAP_OFFSET, prevY: n.prevY - NPC_MAP_OFFSET };
}

/** The player's view of the wanderers at engine tick T: `live` = state before this tick's NPC step (end of tick T-1), `lagged` = end of T-2. */
export function lobbyNpcTilesForPlayer(npcs: LobbyNpcsState | null): LobbyFreeRoamNpcTiles | undefined {
  if (npcs === null) return undefined;
  return {
    live: [npcTile(npcs.woman), npcTile(npcs.fatMan)],
    lagged: [npcTile(npcs.shownWoman), npcTile(npcs.shownFatMan)],
  };
}

/** The player as the ROM's object event for the NPCs' step on this tick. */
function playerObject(player: FactoryLobbyFreeRoamState | null, npcs: LobbyNpcsState | null): LobbyNpcObjectTile {
  if (player === null) {
    const x = LOBBY_SPAWN_TILE.x + NPC_MAP_OFFSET;
    const y = LOBBY_SPAWN_TILE.y + NPC_MAP_OFFSET;
    return { x, y, prevX: x, prevY: y, elevation: 0 };
  }
  const o = lobbyFreeRoamRomObject(player, npcs === null ? [] : lobbyNpcTilesForPlayer(npcs)!.live);
  return { x: o.x + NPC_MAP_OFFSET, y: o.y + NPC_MAP_OFFSET, prevX: o.prevX + NPC_MAP_OFFSET, prevY: o.prevY + NPC_MAP_OFFSET, elevation: 0 };
}

/**
 * The ROM's collision inputs, in grid tiles (map + 7). Elevation is always 0 here (both wanderers have elevation 0, which never mismatches).
 */
export function lobbyNpcWorld(player: FactoryLobbyFreeRoamState | null, npcs: LobbyNpcsState | null = null): LobbyNpcWorld {
  return {
    isBlocked: (x, y) => {
      const mx = x - NPC_MAP_OFFSET;
      const my = y - NPC_MAP_OFFSET;
      if (mx < 0 || mx >= layout.width || my < 0 || my >= layout.height) return true;
      return layout.blocks[my * layout.width + mx]!.collision !== 0;
    },
    elevationAt: () => 0,
    objects: [
      playerObject(player, npcs),
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
  const state = npcs ?? createLobbyNpcs();
  return stepLobbyNpcs(state, rngValue, frozen, lobbyNpcWorld(player, state));
}
