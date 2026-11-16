import {
  advanceFactoryLobbyFreeRoam,
  createFactoryLobbyFreeRoamState,
  lobbyFreeRoamRomObject,
  type FactoryLobbyFreeRoamState,
  type LobbyDirection,
} from "../../src/engine/factoryLobbyFreeRoam.ts";
import { lobbyNpcTilesForPlayer, stepLobbyNpcsTick } from "../../src/engine/lobbyNpcDriver.ts";
import { NPC_MAP_OFFSET, createLobbyNpcs, type LobbyNpc, type LobbyNpcsState } from "../../src/engine/lobbyNpcs.ts";
import { advanceRngValue } from "../../src/engine/rng.ts";

export type NpcRow = [number, number, number, number, number, number, number, number];
/** [held mask (U D L R = 1 2 4 8), rng, player cur x/y, player prv x/y (grid), woman row, fat man row]. */
export type SweepFrame = [number, number, number, number, number, number, NpcRow, NpcRow];
export interface SweepFixture {
  name?: string;
  start: number;
  seedRng: number;
  seedPlayer: [number, number];
  seedFacing: number;
  seedWoman: NpcRow;
  seedFat: NpcRow;
  frames: SweepFrame[];
}

const FACING: Record<number, LobbyDirection> = { 1: "south", 2: "north", 3: "west", 4: "east" };

function seedNpc(base: LobbyNpc, row: NpcRow): LobbyNpc {
  return { ...base, x: row[0], y: row[1], prevX: row[2], prevY: row[3], facing: row[4] as LobbyNpc["facing"], step: row[5], delay: row[6], walkFrames: 0, animIdx: row[7] };
}

export function npcView(n: LobbyNpc): NpcRow {
  return [n.x, n.y, n.prevX, n.prevY, n.facing, n.step, n.step === 3 ? n.delay : 0, n.animIdx];
}

export function expectedNpcRow(row: NpcRow): NpcRow {
  return [row[0], row[1], row[2], row[3], row[4], row[5], row[5] === 3 ? row[6] : 0, row[7]];
}

export function heldDirs(mask: number): Set<LobbyDirection> {
  const out = new Set<LobbyDirection>();
  if (mask & 1) out.add("north");
  if (mask & 2) out.add("south");
  if (mask & 4) out.add("west");
  if (mask & 8) out.add("east");
  return out;
}

export interface ReplayFrame {
  readonly index: number;
  readonly player: FactoryLobbyFreeRoamState;
  readonly before: LobbyNpcsState;
  readonly npcs: LobbyNpcsState;
  readonly rng: number;
  readonly playerObject: [number, number, number, number];
}

/** Replays a fixture through the engine's player + Lobby NPC route; calls `visit` after every frame. */
export function replaySweepFixture(fx: SweepFixture, visit: (fr: ReplayFrame, row: SweepFrame) => void): void {
  const base = createLobbyNpcs();
  const woman = seedNpc(base.woman, fx.seedWoman);
  const fatMan = seedNpc(base.fatMan, fx.seedFat);
  const shown = (n: LobbyNpc) => ({ x: n.x, y: n.y, prevX: n.prevX, prevY: n.prevY, facing: n.facing, walkFrames: n.walkFrames, animIdx: n.animIdx });
  let npcs: LobbyNpcsState = { woman, fatMan, shownWoman: shown(woman), shownFatMan: shown(fatMan) };
  const [px, py] = fx.seedPlayer;
  let player: FactoryLobbyFreeRoamState = { ...createFactoryLobbyFreeRoamState(), x: px - NPC_MAP_OFFSET, y: py - NPC_MAP_OFFSET, facing: FACING[fx.seedFacing]! };
  let rng = fx.seedRng;
  fx.frames.forEach((row, index) => {
    rng = advanceRngValue(rng);
    const before = npcs;
    player = advanceFactoryLobbyFreeRoam(player, { heldDirs: heldDirs(row[0]), npcs: lobbyNpcTilesForPlayer(npcs) }) as FactoryLobbyFreeRoamState;
    const step = stepLobbyNpcsTick(npcs, rng, false, player);
    npcs = step.npcs;
    rng = step.rngValue;
    const o = lobbyFreeRoamRomObject(player, lobbyNpcTilesForPlayer(before)!.live);
    visit({ index, player, before, npcs, rng, playerObject: [o.x + NPC_MAP_OFFSET, o.y + NPC_MAP_OFFSET, o.prevX + NPC_MAP_OFFSET, o.prevY + NPC_MAP_OFFSET] }, row);
  });
}

/** The first frame where the engine departs from the ROM row, or null. */
export function firstMismatch(fx: SweepFixture): { index: number; what: string; got: unknown; want: unknown } | null {
  let bad: { index: number; what: string; got: unknown; want: unknown } | null = null;
  replaySweepFixture(fx, (fr, row) => {
    if (bad !== null) return;
    const [, romRng, pcx, pcy, ppx, ppy, w, m] = row;
    const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    if (!eq(fr.playerObject, [pcx, pcy, ppx, ppy])) bad = { index: fr.index, what: "player", got: fr.playerObject, want: [pcx, pcy, ppx, ppy] };
    else if (!eq(npcView(fr.npcs.woman), expectedNpcRow(w))) bad = { index: fr.index, what: "woman", got: npcView(fr.npcs.woman), want: expectedNpcRow(w) };
    else if (!eq(npcView(fr.npcs.fatMan), expectedNpcRow(m))) bad = { index: fr.index, what: "fat man", got: npcView(fr.npcs.fatMan), want: expectedNpcRow(m) };
    else if (fr.rng !== romRng) bad = { index: fr.index, what: "rng", got: fr.rng, want: romRng };
  });
  return bad;
}
