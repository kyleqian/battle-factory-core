import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  LOBBY_SPAWN_TILE,
  advanceFactoryLobbyFreeRoam,
  createFactoryLobbyFreeRoamState,
  isFactoryLobbyCellWalkable,
  lobbyFreeRoamRomObject,
  type FactoryLobbyFreeRoamState,
} from "../src/engine/factoryLobbyFreeRoam.ts";
import { lobbyNpcTilesForPlayer, stepLobbyNpcsTick } from "../src/engine/lobbyNpcDriver.ts";
import { NPC_MAP_OFFSET, createLobbyNpcs, type LobbyNpc, type LobbyNpcsState } from "../src/engine/lobbyNpcs.ts";
import { renderFactoryTerminalField } from "../src/engine/factoryTerminalRender.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

type NpcRow = [number, number, number, number, number, number, number, number];
type Frame = [number, number, number, number, number, number, NpcRow, NpcRow];
interface Fixture {
  start: number;
  seedRng: number;
  seedPlayer: [number, number];
  seedWoman: NpcRow;
  seedFat: NpcRow;
  frames: Frame[];
}

const fx = JSON.parse(gunzipSync(readFileSync(new URL("./fixtures/lbw4/woman-block.json.gz", import.meta.url))).toString()) as Fixture;

function seedNpc(base: LobbyNpc, row: NpcRow): LobbyNpc {
  return { ...base, x: row[0], y: row[1], prevX: row[2], prevY: row[3], facing: row[4] as LobbyNpc["facing"], step: row[5], delay: row[6], walkFrames: 0, animIdx: row[7] };
}

function view(n: LobbyNpc): NpcRow {
  return [n.x, n.y, n.prevX, n.prevY, n.facing, n.step, n.step === 3 ? n.delay : 0, n.animIdx];
}

function expectedRow(row: NpcRow): NpcRow {
  return [row[0], row[1], row[2], row[3], row[4], row[5], row[5] === 3 ? row[6] : 0, row[7]];
}

function seedState(): { player: FactoryLobbyFreeRoamState; npcs: LobbyNpcsState } {
  const base = createLobbyNpcs();
  const woman = seedNpc(base.woman, fx.seedWoman);
  const fatMan = seedNpc(base.fatMan, fx.seedFat);
  const shown = (n: LobbyNpc) => ({ x: n.x, y: n.y, prevX: n.prevX, prevY: n.prevY, facing: n.facing, walkFrames: n.walkFrames, animIdx: n.animIdx });
  const npcs: LobbyNpcsState = { woman, fatMan, shownWoman: shown(woman), shownFatMan: shown(fatMan) };
  const [px, py] = fx.seedPlayer;
  const player = { ...createFactoryLobbyFreeRoamState(), x: px - NPC_MAP_OFFSET, y: py - NPC_MAP_OFFSET, facing: "south" as const };
  return { player, npcs };
}

describe("lbw4: the free-roam player and the wandering woman share the ROM's collision order", () => {
  it("replays the player's ROM object (cur / prv), both wanderers and the cursor on every frame (lbw4-woman-block-off)", () => {
    let { player, npcs } = seedState();
    let rng = fx.seedRng;
    let playerBlocked = 0;
    fx.frames.forEach((fr, i) => {
      const [down, romRng, pcx, pcy, ppx, ppy, w, m] = fr;
      const label = `frame ${fx.start + 1 + i}`;
      rng = advanceRngValue(rng);
      const before = npcs;
      player = advanceFactoryLobbyFreeRoam(player, { heldDirs: new Set(down === 1 ? (["south"] as const) : []), npcs: lobbyNpcTilesForPlayer(npcs) }) as FactoryLobbyFreeRoamState;
      const step = stepLobbyNpcsTick(npcs, rng, false, player);
      npcs = step.npcs;
      rng = step.rngValue;
      const o = lobbyFreeRoamRomObject(player, lobbyNpcTilesForPlayer(before)!.live);
      expect([o.x + NPC_MAP_OFFSET, o.y + NPC_MAP_OFFSET, o.prevX + NPC_MAP_OFFSET, o.prevY + NPC_MAP_OFFSET], `${label} player cur/prv`).toEqual([pcx, pcy, ppx, ppy]);
      expect(view(npcs.woman), `${label} woman`).toEqual(expectedRow(w));
      expect(view(npcs.fatMan), `${label} fat man`).toEqual(expectedRow(m));
      expect(rng, `${label} gRngValue`).toBe(romRng);
      if (player.bumpElapsed > 0 && player.facing === "south") {
        const ahead = { x: player.x, y: player.y + 1 };
        const live = lobbyNpcTilesForPlayer(before)!.live[0]!;
        if ((live.x === ahead.x && live.y === ahead.y) || (live.prevX === ahead.x && live.prevY === ahead.y)) playerBlocked += 1;
      }
    });
    expect(rng).toBe(fx.frames[fx.frames.length - 1]![1]);
    expect(playerBlocked, "the woman blocks the player's held DOWN at least once").toBeGreaterThan(0);
  });

  it("a wanderer's current or previous tile blocks the player; the spawn default keeps the old static cells", () => {
    const woman = { x: 3, y: 11, prevX: 3, prevY: 10 };
    expect(isFactoryLobbyCellWalkable(3, 11, [woman])).toBe(false);
    expect(isFactoryLobbyCellWalkable(3, 10, [woman])).toBe(false);
    expect(isFactoryLobbyCellWalkable(3, 9, [woman])).toBe(true);
    expect(isFactoryLobbyCellWalkable(3, 11)).toBe(false);
    expect(isFactoryLobbyCellWalkable(2, 11)).toBe(true);
    expect(isFactoryLobbyCellWalkable(LOBBY_SPAWN_TILE.x, LOBBY_SPAWN_TILE.y - 1)).toBe(false);
  });

  it("lobbyFreeRoamRomObject: moving = dest / origin, last step frame and rest = dest", () => {
    const idle = createFactoryLobbyFreeRoamState();
    const rest = lobbyFreeRoamRomObject(idle, []);
    expect(rest).toEqual({ x: idle.x, y: idle.y, prevX: idle.x, prevY: idle.y });
    const moving = { ...idle, stepRemaining: 8, stepFromX: idle.x, stepFromY: idle.y, stepDir: "south" as const };
    expect(lobbyFreeRoamRomObject(moving, [])).toEqual({ x: idle.x, y: idle.y + 1, prevX: idle.x, prevY: idle.y });
    const last = { ...moving, stepRemaining: 1 };
    expect(lobbyFreeRoamRomObject(last, [])).toEqual({ x: idle.x, y: idle.y + 1, prevX: idle.x, prevY: idle.y + 1 });
  });

  it("depth sort: the sprite drawn lower on the screen is in front, from live positions (SetObjectSubpriorityByElevation)", () => {
    const cam = { x: 0, y: 0 };
    const offscreen = { x: -64, y: -64, frame: 0, hFlip: false };
    const player = { x: 112, y: 56, frame: 0, hFlip: false };
    const px = (fb: Uint8Array, x: number, y: number) => [0, 1, 2].map((c) => fb[(y * 240 + x) * 4 + c]).join(",");
    const bg = renderFactoryTerminalField(0, 0, cam, offscreen, new Map([["woman", offscreen], ["fatMan", offscreen]]));
    const only = renderFactoryTerminalField(0, 0, cam, player, new Map([["woman", offscreen], ["fatMan", offscreen]]));
    const draw = (womanY: number) => {
      const woman = { x: 112, y: womanY, frame: 0, hFlip: false };
      const both = renderFactoryTerminalField(0, 0, cam, player, new Map([["woman", woman], ["fatMan", offscreen]]));
      const wOnly = renderFactoryTerminalField(0, 0, cam, offscreen, new Map([["woman", woman], ["fatMan", offscreen]]));
      return { both, wOnly };
    };
    const overlap = (womanY: number) => {
      const { both, wOnly } = draw(womanY);
      const cells: { x: number; y: number }[] = [];
      for (let y = Math.max(56, womanY); y < Math.min(88, womanY + 32); y += 1) {
        for (let x = 112; x < 128; x += 1) {
          if (px(only, x, y) !== px(bg, x, y) && px(wOnly, x, y) !== px(bg, x, y) && px(only, x, y) !== px(wOnly, x, y)) cells.push({ x, y });
        }
      }
      return { both, wOnly, cells };
    };
    for (const womanY of [64, 72, 48, 40]) {
      const { both, wOnly, cells } = overlap(womanY);
      expect(cells.length, `woman at y ${womanY} overlaps the player`).toBeGreaterThan(0);
      const womanInFront = womanY > 56;
      for (const { x, y } of cells) expect(px(both, x, y), `woman y ${womanY} (${x},${y})`).toBe(womanInFront ? px(wOnly, x, y) : px(only, x, y));
    }
  });
});
