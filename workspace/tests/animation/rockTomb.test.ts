import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  reduceRockTomb,
  rockTombSettledRocksForPainter,
  rockTombTargetDisplayX2,
} from "../../src/animation/rockTomb.ts";

type Row = Record<string, any>;

const archives = [
  ["player-back", "tools/compare/evidence/rock-tomb-player-dense-state.json.gz", 8, 1],
  ["opponent-front", "tools/compare/evidence/rock-tomb-opponent-dense-state.json.gz", 6, 0],
] as const;

const stable = (value: any): any => Array.isArray(value) ? value.map(stable)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(stable(a)) === JSON.stringify(stable(b));

function sourceProjection(row: Row, audio: readonly unknown[]): unknown {
  return {
    scriptOffset: row.scriptOffset,
    visualTaskCount: row.visualTaskCount,
    rocks: row.sprites
      .filter((sprite: Row) => sprite.template?.symbol === "gRockTombRockSpriteTemplate")
      .map((sprite: Row) => ({
        slot: sprite.slot,
        x2: sprite.x2,
        y2: sprite.y2,
        data: sprite.data.slice(0, 4),
        invisible: Boolean(sprite.invisible),
      })),
    redX: (() => {
      const sprite = row.sprites.find(
        (candidate: Row) => candidate.template?.symbol === "gRedXSpriteTemplate",
      );
      return sprite === undefined ? null : {
        slot: sprite.slot,
        data: sprite.data.slice(0, 4),
        invisible: Boolean(sprite.invisible),
      };
    })(),
    tasks: row.tasks.map((task: Row) => ({
      name: task.func.symbol,
      data: task.data.slice(0, 8),
    })),
    targetX2: row.battlerSprites.target.x2,
    battleBg3: row.battleBg3,
    audio,
  };
}

function reducerProjection(state: ReturnType<typeof reduceRockTomb>[number]): unknown {
  return {
    scriptOffset: state.scriptOffset,
    visualTaskCount: state.visualTaskCount,
    rocks: state.rocks,
    redX: state.redX,
    tasks: state.tasks,
    targetX2: state.targetX2,
    battleBg3: state.battleBg3,
    audio: state.audio,
  };
}

function audioForAge(age: number): readonly unknown[] {
  // The retained SE surface keeps the active song header, so repeated
  // Strength writes are not detectable by a header transition alone.  The
  // source script's four vertical-shake call sites are the event contract.
  if (age === 36 || age === 56 || age === 76 || age === 96) {
    return [{ song: "SE_M_STRENGTH", pan: "target" }];
  }
  if (age === 122) return [{ song: "SE_M_HYPER_BEAM", pan: "target" }];
  return [];
}

describe("MOVE_ROCK_TOMB source-relative reducer", () => {
  for (const [orientation, archive, targetSpriteSlot, targetInitialX2] of archives) {
    it(`matches every retained ${orientation} source row`, () => {
      const probe = JSON.parse(gunzipSync(readFileSync(archive)).toString("utf8"));
      const rows = probe.frames as Row[];
      const first = rows[0]!;
      const states = reduceRockTomb({
        targetSpriteSlot,
        targetInitialX2,
        targetCenter: { x: first.battlerSprites.target.x, y: first.battlerSprites.target.y },
      });
      expect(states).toHaveLength(174);
      let matching = 0;
      for (const [age, row] of rows.entries()) {
        const expected = sourceProjection(row, audioForAge(age));
        expect(reducerProjection(states[age]!)).toEqual(expected);
        matching += 1;
      }
      expect(matching).toBe(174);
      expect(states.at(-1)).toMatchObject({ active: false, visualTaskCount: 0, tasks: [] });
    });
  }

  it("pins the bilateral source/display transfer and immutable-state surfaces", () => {
    let immutableRows = 0;
    let hardwareOamRows = 0;
    let hardwareMatrixRows = 0;
    let hardwarePaletteRows = 0;
    for (const [, archive] of archives) {
      const rows = JSON.parse(gunzipSync(readFileSync(archive)).toString("utf8")).frames as Row[];
      const immutable = JSON.stringify(rows[0]!.immutableState);
      for (let age = 0; age < rows.length; age += 1) {
        if (JSON.stringify(rows[age]!.immutableState) === immutable) immutableRows += 1;
        if (age === 0) continue;
        if (same(rows[age]!.hardwareOam, rows[age - 1]!.softwareOam)) hardwareOamRows += 1;
        if (same(rows[age]!.hardwareMatrices, rows[age - 1]!.softwareMatrices)) hardwareMatrixRows += 1;
        if (same(rows[age]!.hardwarePalette, rows[age - 1]!.fadedPalette)) hardwarePaletteRows += 1;
      }
    }
    expect(immutableRows).toBe(348);
    expect(hardwareOamRows).toBe(346);
    expect(hardwareMatrixRows).toBe(346);
    expect(hardwarePaletteRows).toBe(346);
  });

  it("pins Rock Tomb's move-local late transfer and OAM tie order", () => {
    for (const [, archive, targetSpriteSlot, targetInitialX2] of archives) {
      const rows = JSON.parse(gunzipSync(readFileSync(archive)).toString("utf8")).frames as Row[];
      const config = {
        targetSpriteSlot,
        targetInitialX2,
        targetCenter: { x: rows[0]!.battlerSprites.target.x, y: rows[0]!.battlerSprites.target.y },
      };
      const states = reduceRockTomb(config);
      const firstRedXAge = states.findIndex((state) => state.redX !== null);
      expect(firstRedXAge).toBeGreaterThan(0);
      expect(rockTombTargetDisplayX2(firstRedXAge, config)).toBe(
        states[firstRedXAge - 1]!.targetX2,
      );
      expect(rockTombTargetDisplayX2(firstRedXAge + 1, config)).toBe(
        states[firstRedXAge + 3]!.targetX2,
      );
      const tailAge = states.find(
        (state) => state.tasks.some(
          (task) => task.name === "AnimTask_ShakeMon_Step" && task.data[1] === 1,
        ),
      )!.age;
      expect(rockTombTargetDisplayX2(tailAge, config)).toBe(3);
      expect(rockTombTargetDisplayX2(tailAge + 1, config)).toBe(3);
      expect(rockTombTargetDisplayX2(tailAge + 2, config)).toBe(0);

      const firstFourthSettled = states.find(
        (state) => state.rocks.some((rock) => rock.slot === 7 && rock.y2 === 1),
      )!;
      expect(rockTombSettledRocksForPainter(firstFourthSettled).map((rock) => rock.slot))
        .toEqual([7, 3, 4]);
      const following = states[firstFourthSettled.age + 1]!;
      expect(rockTombSettledRocksForPainter(following).map((rock) => rock.slot))
        .toEqual([3, 4, 7]);
    }
  });
});
