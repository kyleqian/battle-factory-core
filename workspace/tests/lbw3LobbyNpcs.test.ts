import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  createLobbyNpcs,
  stepLobbyNpcs,
  type LobbyNpc,
  type LobbyNpcObjectTile,
  type LobbyNpcWorld,
} from "../src/engine/lobbyNpcs.ts";

type NpcRow = [number, number, number, number, number, number, number, number, number];
type Frame = [number, number, number, number, number, number, number, number, number, NpcRow, NpcRow];
interface Fixture {
  trace: string;
  spawnFrame: number;
  seedRng: number;
  finalRng: number;
  grid: { width: number; height: number; blocks: number[] };
  staticSets: number[][][];
  seedWoman: NpcRow;
  seedFat: NpcRow;
  frames: Frame[];
}

const TRACES = [
  "lbra-loss-off",
  "lbra-forfeit-off",
  "lbra-retire-off",
  "lbrd-won-no-off",
  "lbrd-won-yes-off",
  "lbrd-won-attendant-off",
];

// sAnimTable_Standard order: face S, N, W, E then go S, N, W, E
const ANIM_FACING: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 1, 5: 2, 6: 3, 7: 4 };

function load(trace: string): Fixture {
  return JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/lbw3/${trace}.json.gz`, import.meta.url))).toString()) as Fixture;
}

function gridWorld(fx: Fixture, objects: readonly LobbyNpcObjectTile[]): LobbyNpcWorld {
  const { width, height, blocks } = fx.grid;
  const block = (x: number, y: number): number | null => (x >= 0 && x < width && y >= 0 && y < height ? blocks[y * width + x]! : null);
  return {
    isBlocked: (x, y) => {
      const b = block(x, y);
      return b === null || b === 0x3ff || ((b >> 10) & 3) !== 0;
    },
    elevationAt: (x, y) => {
      const b = block(x, y);
      return b === null || b === 0x3ff ? 0 : b >> 12;
    },
    objects,
  };
}

function view(n: LobbyNpc): NpcRow {
  // [cx, cy, px, py, face, typeFuncId, delay (only while counting), animCmdIndex]; animNum is the facing-derived anim, checked separately
  return [n.x, n.y, n.prevX, n.prevY, n.facing, n.step, n.step === 3 ? n.delay : 0, 0, n.animIdx];
}

function expected(row: NpcRow): NpcRow {
  return [row[0], row[1], row[2], row[3], row[4], row[5], row[5] === 3 ? row[6] : 0, 0, row[8]];
}

describe("lbw3 lobby NPC wander replays the ROM's per-frame NPC state and cursor", () => {
  it("seeds the lbw1 'Initial NPC state' table", () => {
    for (const trace of TRACES) {
      const fx = load(trace);
      const n = createLobbyNpcs();
      expect(view(n.woman), trace).toEqual(expected(fx.seedWoman));
      expect(view(n.fatMan), trace).toEqual(expected(fx.seedFat));
    }
  });

  for (const trace of TRACES) {
    it(`${trace}: every frame's tiles, facing, sTypeFuncId, delay, anim index and gRngValue`, () => {
      const fx = load(trace);
      let npcs = createLobbyNpcs();
      let rng = fx.seedRng;
      let romRng = fx.seedRng;
      let romDraws = 0;
      let npcDraws = 0;
      fx.frames.forEach((fr, i) => {
        const [run, frozen, cnt, setIdx, pcx, pcy, ppx, ppy, pelev, w, m] = fr;
        const objects: LobbyNpcObjectTile[] = [
          { x: pcx, y: pcy, prevX: ppx, prevY: ppy, elevation: pelev },
          ...fx.staticSets[setIdx]!.map(([x, y, px, py, elevation]) => ({ x: x!, y: y!, prevX: px!, prevY: py!, elevation: elevation! })),
        ];
        rng = advanceRngValue(rng);
        const before = rng;
        const step = stepLobbyNpcs(npcs, rng, run === 0 || frozen === 1, gridWorld(fx, objects));
        npcs = step.npcs;
        rng = step.rngValue;
        // the ROM's draw counter (cnt) is cumulative: replay its LCG position and compare the full 32-bit value every frame
        for (; romDraws < cnt; romDraws += 1) romRng = advanceRngValue(romRng);
        if (rng !== before) npcDraws += 1;
        const label = `${trace} frame ${fx.spawnFrame + 1 + i}`;
        expect(view(npcs.woman), `${label} woman`).toEqual(expected(w));
        expect(view(npcs.fatMan), `${label} fat man`).toEqual(expected(m));
        expect(rng, `${label} gRngValue`).toBe(romRng);
        expect(npcs.woman.facing === ANIM_FACING[w[7]!] || w[7]! > 3, `${label} woman anim ${w[7]} vs facing ${npcs.woman.facing}`).toBe(true);
      });
      expect(rng, `${trace} final gRngValue`).toBe(fx.finalRng);
      expect(npcDraws).toBeGreaterThan(0);
    });
  }
});
